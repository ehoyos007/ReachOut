import { create } from "zustand";
import type {
  Setting,
  SettingKey,
  TwilioSettings,
  SendGridSettings,
  AllSettings,
  TestResult,
  UpdateSettingsInput,
} from "@/types/settings";
import {
  settingsToObject,
  settingsToProviderConfig,
  isProviderConfigured,
} from "@/types/settings";
import {
  getSettings as fetchSettingsFromDb,
  getSetting as fetchSettingFromDb,
  updateSetting as updateSettingInDb,
  updateSettings as updateSettingsInDb,
} from "@/lib/supabase";

interface SettingsState {
  // Data
  settings: Setting[];
  settingsMap: Record<SettingKey, string>;
  providerConfig: AllSettings;

  // Provider status
  isTwilioConfigured: boolean;
  isSendGridConfigured: boolean;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isTesting: boolean;

  // Test results
  twilioTestResult: TestResult | null;
  sendgridTestResult: TestResult | null;

  // Error state
  error: string | null;

  // Actions
  fetchSettings: () => Promise<void>;
  updateSetting: (key: SettingKey, value: string) => Promise<boolean>;
  updateMultipleSettings: (settings: UpdateSettingsInput[]) => Promise<boolean>;

  // Test actions
  testTwilioConnection: () => Promise<TestResult>;
  testSendGridConnection: () => Promise<TestResult>;
  clearTestResults: () => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
}

const initialProviderConfig: AllSettings = {
  twilio: {
    account_sid: "",
    auth_token: "",
    phone_number: "",
  },
  sendgrid: {
    api_key: "",
    from_email: "",
    from_name: "",
  },
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Initial data
  settings: [],
  settingsMap: {} as Record<SettingKey, string>,
  providerConfig: initialProviderConfig,

  // Initial provider status
  isTwilioConfigured: false,
  isSendGridConfigured: false,

  // Initial loading states
  isLoading: false,
  isSaving: false,
  isTesting: false,

  // Initial test results
  twilioTestResult: null,
  sendgridTestResult: null,

  // Initial error state
  error: null,

  // =============================================================================
  // Fetch Actions
  // =============================================================================

  fetchSettings: async () => {
    set({ isLoading: true, error: null });

    try {
      const settings = await fetchSettingsFromDb();
      const settingsMap = settingsToObject(settings);
      const providerConfig = settingsToProviderConfig(settings);

      set({
        settings,
        settingsMap,
        providerConfig,
        isTwilioConfigured: isProviderConfigured(settingsMap, "twilio"),
        isSendGridConfigured: isProviderConfigured(settingsMap, "sendgrid"),
        isLoading: false,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch settings";
      set({ error: message, isLoading: false });
    }
  },

  // =============================================================================
  // Update Actions
  // =============================================================================

  updateSetting: async (key: SettingKey, value: string) => {
    set({ isSaving: true, error: null });

    try {
      await updateSettingInDb(key, value);

      // Update local state
      set((state) => {
        const newSettingsMap = { ...state.settingsMap, [key]: value };
        const newSettings = state.settings.map((s) =>
          s.key === key ? { ...s, value } : s
        );
        const providerConfig = settingsToProviderConfig(newSettings);

        return {
          settings: newSettings,
          settingsMap: newSettingsMap,
          providerConfig,
          isTwilioConfigured: isProviderConfigured(newSettingsMap, "twilio"),
          isSendGridConfigured: isProviderConfigured(newSettingsMap, "sendgrid"),
          isSaving: false,
        };
      });

      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update setting";
      set({ error: message, isSaving: false });
      return false;
    }
  },

  updateMultipleSettings: async (updates: UpdateSettingsInput[]) => {
    set({ isSaving: true, error: null });

    try {
      await updateSettingsInDb(updates);

      // Update local state
      set((state) => {
        const newSettingsMap = { ...state.settingsMap };
        updates.forEach(({ key, value }) => {
          newSettingsMap[key] = value;
        });

        const newSettings = state.settings.map((s) => {
          const update = updates.find((u) => u.key === s.key);
          return update ? { ...s, value: update.value } : s;
        });

        const providerConfig = settingsToProviderConfig(newSettings);

        return {
          settings: newSettings,
          settingsMap: newSettingsMap,
          providerConfig,
          isTwilioConfigured: isProviderConfigured(newSettingsMap, "twilio"),
          isSendGridConfigured: isProviderConfigured(newSettingsMap, "sendgrid"),
          isSaving: false,
        };
      });

      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update settings";
      set({ error: message, isSaving: false });
      return false;
    }
  },

  // =============================================================================
  // Test Actions
  // =============================================================================

  testTwilioConnection: async () => {
    set({ isTesting: true, twilioTestResult: null });

    try {
      const { providerConfig } = get();

      // Call the test API endpoint
      const response = await fetch("/api/settings/test-twilio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(providerConfig.twilio),
      });

      const result: TestResult = await response.json();

      set({ twilioTestResult: result, isTesting: false });
      return result;
    } catch (error) {
      const result: TestResult = {
        success: false,
        message: "Failed to test Twilio connection",
        details: error instanceof Error ? error.message : "Unknown error",
      };
      set({ twilioTestResult: result, isTesting: false });
      return result;
    }
  },

  testSendGridConnection: async () => {
    set({ isTesting: true, sendgridTestResult: null });

    try {
      const { providerConfig } = get();

      // Call the test API endpoint
      const response = await fetch("/api/settings/test-sendgrid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(providerConfig.sendgrid),
      });

      const result: TestResult = await response.json();

      set({ sendgridTestResult: result, isTesting: false });
      return result;
    } catch (error) {
      const result: TestResult = {
        success: false,
        message: "Failed to test SendGrid connection",
        details: error instanceof Error ? error.message : "Unknown error",
      };
      set({ sendgridTestResult: result, isTesting: false });
      return result;
    }
  },

  clearTestResults: () => {
    set({ twilioTestResult: null, sendgridTestResult: null });
  },

  // =============================================================================
  // Error Handling
  // =============================================================================

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// =============================================================================
// Selectors
// =============================================================================

export const selectTwilioSettings = (state: SettingsState): TwilioSettings => {
  return state.providerConfig.twilio;
};

export const selectSendGridSettings = (
  state: SettingsState
): SendGridSettings => {
  return state.providerConfig.sendgrid;
};

export const selectIsAnyProviderConfigured = (
  state: SettingsState
): boolean => {
  return state.isTwilioConfigured || state.isSendGridConfigured;
};

export const selectAreBothProvidersConfigured = (
  state: SettingsState
): boolean => {
  return state.isTwilioConfigured && state.isSendGridConfigured;
};
