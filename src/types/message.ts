// =============================================================================
// Message Types
// =============================================================================

export type MessageChannel = "sms" | "email";
export type MessageDirection = "inbound" | "outbound";
export type MessageStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "failed"
  | "bounced";

export interface Message {
  id: string;
  contact_id: string;
  channel: MessageChannel;
  direction: MessageDirection;
  subject: string | null; // For email only
  body: string;
  status: MessageStatus;
  provider_id: string | null; // Twilio SID or SendGrid message ID
  provider_error: string | null;
  template_id: string | null;
  workflow_execution_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Database Types (Supabase)
// =============================================================================

export interface DbMessage {
  id: string;
  contact_id: string;
  channel: string;
  direction: string;
  subject: string | null;
  body: string;
  status: string;
  provider_id: string | null;
  provider_error: string | null;
  template_id: string | null;
  workflow_execution_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Message with Contact (for thread display)
// =============================================================================

export interface MessageWithContact extends Message {
  contact?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  };
}

// =============================================================================
// Form/Input Types
// =============================================================================

export interface SendMessageInput {
  contact_id: string;
  channel: MessageChannel;
  subject?: string | null; // Required for email
  body: string;
  template_id?: string | null;
}

export interface CreateMessageInput {
  contact_id: string;
  channel: MessageChannel;
  direction: MessageDirection;
  subject?: string | null;
  body: string;
  status?: MessageStatus;
  provider_id?: string | null;
  provider_error?: string | null;
  template_id?: string | null;
  workflow_execution_id?: string | null;
}

export interface UpdateMessageInput {
  id: string;
  status?: MessageStatus;
  provider_id?: string | null;
  provider_error?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  failed_at?: string | null;
}

// =============================================================================
// Filter Types
// =============================================================================

export interface MessageFilters {
  contact_id?: string;
  channel?: MessageChannel;
  direction?: MessageDirection;
  status?: MessageStatus;
  dateFrom?: string;
  dateTo?: string;
}

// =============================================================================
// Pagination Types
// =============================================================================

export interface MessagePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// =============================================================================
// Constants
// =============================================================================

export const MESSAGE_STATUS_DISPLAY: Record<MessageStatus, string> = {
  queued: "Queued",
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  failed: "Failed",
  bounced: "Bounced",
};

export const MESSAGE_STATUS_COLORS: Record<
  MessageStatus,
  { bg: string; text: string }
> = {
  queued: { bg: "bg-gray-100", text: "text-gray-700" },
  sending: { bg: "bg-blue-100", text: "text-blue-700" },
  sent: { bg: "bg-blue-100", text: "text-blue-700" },
  delivered: { bg: "bg-green-100", text: "text-green-700" },
  failed: { bg: "bg-red-100", text: "text-red-700" },
  bounced: { bg: "bg-orange-100", text: "text-orange-700" },
};

export const MESSAGE_DIRECTION_DISPLAY: Record<MessageDirection, string> = {
  inbound: "Received",
  outbound: "Sent",
};

export const MESSAGE_CHANNEL_DISPLAY: Record<MessageChannel, string> = {
  sms: "SMS",
  email: "Email",
};

// =============================================================================
// Twilio Types
// =============================================================================

export interface TwilioSettings {
  account_sid: string;
  auth_token: string;
  phone_number: string;
}

export interface TwilioSendResult {
  success: boolean;
  sid?: string;
  error?: string;
  errorCode?: string;
}

export interface TwilioWebhookPayload {
  MessageSid: string;
  AccountSid: string;
  MessagingServiceSid?: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  NumSegments?: string;
  SmsStatus?: string;
  MessageStatus?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

export interface TwilioStatusCallback {
  MessageSid: string;
  MessageStatus: "queued" | "sent" | "delivered" | "undelivered" | "failed";
  ErrorCode?: string;
  ErrorMessage?: string;
}

// =============================================================================
// SendGrid Types
// =============================================================================

export interface SendGridSettings {
  api_key: string;
  from_email: string;
  from_name: string;
}

export interface SendGridSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SendGridInboundPayload {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  headers?: string;
  envelope?: string;
}

export interface SendGridEventPayload {
  email: string;
  timestamp: number;
  event:
    | "processed"
    | "dropped"
    | "delivered"
    | "deferred"
    | "bounce"
    | "open"
    | "click"
    | "spamreport"
    | "unsubscribe";
  sg_message_id: string;
  reason?: string;
  status?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Map Twilio status to our message status
 */
export function mapTwilioStatus(
  twilioStatus: string
): MessageStatus {
  const statusMap: Record<string, MessageStatus> = {
    queued: "queued",
    sending: "sending",
    sent: "sent",
    delivered: "delivered",
    undelivered: "failed",
    failed: "failed",
  };
  return statusMap[twilioStatus] || "failed";
}

/**
 * Map SendGrid event to our message status
 */
export function mapSendGridStatus(
  event: string
): MessageStatus {
  const statusMap: Record<string, MessageStatus> = {
    processed: "sending",
    delivered: "delivered",
    dropped: "failed",
    deferred: "sending",
    bounce: "bounced",
  };
  return statusMap[event] || "sent";
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "");

  // Format as (XXX) XXX-XXXX for US numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Return original if not a standard format
  return phone;
}

/**
 * Normalize phone number for storage/comparison
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, "");

  // Ensure US numbers start with +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+${cleaned}`;
  }
  if (!cleaned.startsWith("+")) {
    return `+${cleaned}`;
  }

  return cleaned;
}

/**
 * Check if a message is in a terminal state
 */
export function isTerminalStatus(status: MessageStatus): boolean {
  return ["delivered", "failed", "bounced"].includes(status);
}

/**
 * Get a human-readable time ago string
 */
export function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }

  return date.toLocaleDateString();
}
