// =============================================================================
// Sender Identity Types
// =============================================================================

export type SenderChannel = "sms" | "email";

/**
 * Email sender identity stored in settings
 */
export interface SenderEmail {
  id: string;
  email: string;
  name: string;
  is_default: boolean;
  verified: boolean;
  created_at: string;
}

/**
 * Phone sender identity stored in settings
 */
export interface SenderPhone {
  id: string;
  phone: string;
  label: string;
  is_default: boolean;
  created_at: string;
}

/**
 * Union type for any sender identity
 */
export type SenderIdentity = SenderEmail | SenderPhone;

// =============================================================================
// Input Types
// =============================================================================

export interface CreateSenderEmailInput {
  email: string;
  name: string;
  is_default?: boolean;
}

export interface UpdateSenderEmailInput {
  id: string;
  email?: string;
  name?: string;
  is_default?: boolean;
  verified?: boolean;
}

export interface CreateSenderPhoneInput {
  phone: string;
  label: string;
  is_default?: boolean;
}

export interface UpdateSenderPhoneInput {
  id: string;
  phone?: string;
  label?: string;
  is_default?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the default email sender from a list
 */
export function getDefaultSenderEmail(senders: SenderEmail[]): SenderEmail | null {
  return senders.find((s) => s.is_default) || senders[0] || null;
}

/**
 * Get the default phone sender from a list
 */
export function getDefaultSenderPhone(senders: SenderPhone[]): SenderPhone | null {
  return senders.find((s) => s.is_default) || senders[0] || null;
}

/**
 * Format sender email for display (e.g., "Support <support@company.com>")
 */
export function formatSenderEmail(sender: SenderEmail): string {
  if (sender.name) {
    return `${sender.name} <${sender.email}>`;
  }
  return sender.email;
}

/**
 * Format sender phone for display (e.g., "Main Line (+1 555-123-4567)")
 */
export function formatSenderPhone(sender: SenderPhone): string {
  if (sender.label) {
    return `${sender.label} (${sender.phone})`;
  }
  return sender.phone;
}

/**
 * Check if a sender identity is an email sender
 */
export function isSenderEmail(sender: SenderIdentity): sender is SenderEmail {
  return "email" in sender;
}

/**
 * Check if a sender identity is a phone sender
 */
export function isSenderPhone(sender: SenderIdentity): sender is SenderPhone {
  return "phone" in sender;
}
