// =============================================================================
// Settings Types
// =============================================================================

export interface Setting {
  id: string;
  key: string;
  value: string;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Database Types (Supabase)
// =============================================================================

export interface DbSetting {
  id: string;
  key: string;
  value: string;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Settings Keys
// =============================================================================

export type SettingKey =
  | "twilio_account_sid"
  | "twilio_auth_token"
  | "twilio_phone_number"
  | "sendgrid_api_key"
  | "sendgrid_from_email"
  | "sendgrid_from_name"
  | "sender_emails"
  | "sender_phones"
  | "preview_preferences";

export const SETTING_KEYS: SettingKey[] = [
  "twilio_account_sid",
  "twilio_auth_token",
  "twilio_phone_number",
  "sendgrid_api_key",
  "sendgrid_from_email",
  "sendgrid_from_name",
  "sender_emails",
  "sender_phones",
  "preview_preferences",
];

// =============================================================================
// Settings Configuration
// =============================================================================

export interface SettingConfig {
  key: SettingKey;
  label: string;
  description: string;
  placeholder: string;
  isSecret: boolean;
  provider: "twilio" | "sendgrid";
  required: boolean;
  validation?: RegExp;
  validationMessage?: string;
}

export const SETTINGS_CONFIG: SettingConfig[] = [
  // Twilio Settings
  {
    key: "twilio_account_sid",
    label: "Account SID",
    description: "Your Twilio Account SID (starts with AC)",
    placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    isSecret: false,
    provider: "twilio",
    required: true,
    validation: /^AC[a-f0-9]{32}$/i,
    validationMessage: "Account SID must start with AC followed by 32 characters",
  },
  {
    key: "twilio_auth_token",
    label: "Auth Token",
    description: "Your Twilio Auth Token",
    placeholder: "Enter your auth token",
    isSecret: true,
    provider: "twilio",
    required: true,
    validation: /^[a-f0-9]{32}$/i,
    validationMessage: "Auth Token must be 32 characters",
  },
  {
    key: "twilio_phone_number",
    label: "Phone Number",
    description: "Your Twilio phone number (with country code)",
    placeholder: "+1234567890",
    isSecret: false,
    provider: "twilio",
    required: true,
    validation: /^\+[1-9]\d{1,14}$/,
    validationMessage: "Phone number must be in E.164 format (e.g., +1234567890)",
  },
  // SendGrid Settings
  {
    key: "sendgrid_api_key",
    label: "API Key",
    description: "Your SendGrid API Key (starts with SG.)",
    placeholder: "SG.xxxxxxxxxxxxxxxxxxxx",
    isSecret: true,
    provider: "sendgrid",
    required: true,
    validation: /^SG\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/,
    validationMessage: "API Key must be a valid SendGrid API key (starts with SG.)",
  },
  {
    key: "sendgrid_from_email",
    label: "From Email",
    description: "Default sender email address",
    placeholder: "hello@yourdomain.com",
    isSecret: false,
    provider: "sendgrid",
    required: true,
    validation: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    validationMessage: "Must be a valid email address",
  },
  {
    key: "sendgrid_from_name",
    label: "From Name",
    description: "Default sender display name",
    placeholder: "Your Company",
    isSecret: false,
    provider: "sendgrid",
    required: false,
  },
];

// =============================================================================
// Grouped Settings Types
// =============================================================================

export interface TwilioSettings {
  account_sid: string;
  auth_token: string;
  phone_number: string;
}

export interface SendGridSettings {
  api_key: string;
  from_email: string;
  from_name: string;
}

export interface AllSettings {
  twilio: TwilioSettings;
  sendgrid: SendGridSettings;
}

// =============================================================================
// Test Result Types
// =============================================================================

export interface TestResult {
  success: boolean;
  message: string;
  details?: string;
}

export interface TwilioTestResult extends TestResult {
  accountName?: string;
  phoneNumberVerified?: boolean;
}

export interface SendGridTestResult extends TestResult {
  senderVerified?: boolean;
}

// =============================================================================
// Preview Preferences Types
// =============================================================================

export interface PreviewPreferences {
  /** Default phone number for SMS previews */
  sms_phone: string | null;
  /** Default email address for email previews */
  email_address: string | null;
  /** Custom test data for variable substitution */
  test_data: Record<string, string>;
}

export const DEFAULT_PREVIEW_PREFERENCES: PreviewPreferences = {
  sms_phone: null,
  email_address: null,
  test_data: {},
};

// =============================================================================
// Form Types
// =============================================================================

export interface UpdateSettingsInput {
  key: SettingKey;
  value: string;
}

export interface BatchUpdateSettingsInput {
  settings: UpdateSettingsInput[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get settings config for a specific key
 */
export function getSettingConfig(key: SettingKey): SettingConfig | undefined {
  return SETTINGS_CONFIG.find((config) => config.key === key);
}

/**
 * Get all settings configs for a provider
 */
export function getProviderSettings(
  provider: "twilio" | "sendgrid"
): SettingConfig[] {
  return SETTINGS_CONFIG.filter((config) => config.provider === provider);
}

/**
 * Validate a setting value
 */
export function validateSettingValue(
  key: SettingKey,
  value: string
): { valid: boolean; message?: string } {
  const config = getSettingConfig(key);

  if (!config) {
    return { valid: false, message: "Unknown setting key" };
  }

  // Check required
  if (config.required && !value.trim()) {
    return { valid: false, message: `${config.label} is required` };
  }

  // Skip validation if empty and not required
  if (!value.trim() && !config.required) {
    return { valid: true };
  }

  // Check pattern
  if (config.validation && !config.validation.test(value)) {
    return { valid: false, message: config.validationMessage };
  }

  return { valid: true };
}

/**
 * Mask a secret value for display
 */
export function maskSecretValue(value: string, visibleChars: number = 4): string {
  if (!value || value.length <= visibleChars) {
    return "••••••••";
  }
  return value.slice(0, visibleChars) + "••••••••";
}

/**
 * Check if all required settings for a provider are configured
 */
export function isProviderConfigured(
  settings: Record<SettingKey, string>,
  provider: "twilio" | "sendgrid"
): boolean {
  const providerSettings = getProviderSettings(provider);
  return providerSettings
    .filter((config) => config.required)
    .every((config) => settings[config.key]?.trim());
}

/**
 * Convert settings array to grouped object
 */
export function settingsToObject(settings: Setting[]): Record<SettingKey, string> {
  const result: Record<string, string> = {};
  for (const setting of settings) {
    result[setting.key] = setting.value;
  }
  return result as Record<SettingKey, string>;
}

/**
 * Convert settings array to structured provider objects
 */
export function settingsToProviderConfig(settings: Setting[]): AllSettings {
  const obj = settingsToObject(settings);
  return {
    twilio: {
      account_sid: obj.twilio_account_sid || "",
      auth_token: obj.twilio_auth_token || "",
      phone_number: obj.twilio_phone_number || "",
    },
    sendgrid: {
      api_key: obj.sendgrid_api_key || "",
      from_email: obj.sendgrid_from_email || "",
      from_name: obj.sendgrid_from_name || "",
    },
  };
}
