import { create } from "zustand";
import type { PreviewPreferences } from "@/types/settings";
import { DEFAULT_PREVIEW_PREFERENCES } from "@/types/settings";
import {
  getPreviewPreferences as fetchPreferencesFromDb,
  updatePreviewPreferences as updatePreferencesInDb,
} from "@/lib/supabase";

// =============================================================================
// Types
// =============================================================================

interface PreviewState {
  // Data
  preferences: PreviewPreferences;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;

  // Error state
  error: string | null;

  // Actions
  fetchPreferences: () => Promise<void>;
  updatePreferences: (updates: Partial<PreviewPreferences>) => Promise<void>;
  updateSmsPhone: (phone: string | null) => Promise<void>;
  updateEmailAddress: (email: string | null) => Promise<void>;
  updateTestData: (data: Record<string, string>) => Promise<void>;
  updateSingleTestValue: (key: string, value: string) => Promise<void>;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
}

// =============================================================================
// Store
// =============================================================================

export const usePreviewStore = create<PreviewState>((set, get) => ({
  // Initial data
  preferences: { ...DEFAULT_PREVIEW_PREFERENCES },

  // Initial loading states
  isLoading: false,
  isSaving: false,

  // Initial error state
  error: null,

  // =============================================================================
  // Fetch Action
  // =============================================================================

  fetchPreferences: async () => {
    set({ isLoading: true, error: null });

    try {
      const preferences = await fetchPreferencesFromDb();
      set({ preferences, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch preview preferences";
      set({ error: message, isLoading: false });
    }
  },

  // =============================================================================
  // Update Actions
  // =============================================================================

  updatePreferences: async (updates: Partial<PreviewPreferences>) => {
    set({ isSaving: true, error: null });

    try {
      const updated = await updatePreferencesInDb(updates);
      set({ preferences: updated, isSaving: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update preview preferences";
      set({ error: message, isSaving: false });
    }
  },

  updateSmsPhone: async (phone: string | null) => {
    const { updatePreferences } = get();
    await updatePreferences({ sms_phone: phone });
  },

  updateEmailAddress: async (email: string | null) => {
    const { updatePreferences } = get();
    await updatePreferences({ email_address: email });
  },

  updateTestData: async (data: Record<string, string>) => {
    const { updatePreferences } = get();
    await updatePreferences({ test_data: data });
  },

  updateSingleTestValue: async (key: string, value: string) => {
    const { preferences, updatePreferences } = get();
    await updatePreferences({
      test_data: {
        ...preferences.test_data,
        [key]: value,
      },
    });
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

/**
 * Get the default SMS preview phone
 */
export const selectSmsPhone = (state: PreviewState): string | null => {
  return state.preferences.sms_phone;
};

/**
 * Get the default email preview address
 */
export const selectEmailAddress = (state: PreviewState): string | null => {
  return state.preferences.email_address;
};

/**
 * Get test data
 */
export const selectTestData = (state: PreviewState): Record<string, string> => {
  return state.preferences.test_data;
};

/**
 * Get a specific test data value
 */
export const selectTestDataValue = (
  state: PreviewState,
  key: string
): string | undefined => {
  return state.preferences.test_data[key];
};
