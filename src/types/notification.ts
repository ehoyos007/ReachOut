// Notification types for ReachOut

export type NotificationType =
  | "inbound_sms"
  | "inbound_email"
  | "workflow_completed"
  | "workflow_failed"
  | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  contact_id: string | null;
  message_id: string | null;
  workflow_id: string | null;
  title: string;
  body: string | null;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NotificationWithRelations extends Notification {
  contact?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

export interface CreateNotificationInput {
  type: NotificationType;
  contact_id?: string | null;
  message_id?: string | null;
  workflow_id?: string | null;
  title: string;
  body?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateNotificationInput {
  id: string;
  is_read?: boolean;
  read_at?: string | null;
}

// Helper to get notification icon based on type
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case "inbound_sms":
      return "💬";
    case "inbound_email":
      return "📧";
    case "workflow_completed":
      return "✅";
    case "workflow_failed":
      return "❌";
    case "system":
      return "🔔";
    default:
      return "🔔";
  }
}

// Helper to get notification type label
export function getNotificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case "inbound_sms":
      return "New SMS";
    case "inbound_email":
      return "New Email";
    case "workflow_completed":
      return "Workflow Complete";
    case "workflow_failed":
      return "Workflow Failed";
    case "system":
      return "System";
    default:
      return "Notification";
  }
}
