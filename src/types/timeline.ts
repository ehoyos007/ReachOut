/**
 * Timeline Types
 *
 * Unified event structure for the contact activity timeline.
 * Events are sourced from both the messages table and contact_events table,
 * then merged and sorted chronologically.
 */

import { MessageFromIdentity, MessageStatus } from "./message";

// Event types that come from the contact_events table
export type ContactEventType =
  | "note_added"
  | "tag_added"
  | "tag_removed"
  | "status_changed"
  | "call_inbound"
  | "call_outbound"
  | "manual_message"
  | "created";

// Event types derived from the messages table
export type MessageEventType =
  | "sms_sent"
  | "sms_received"
  | "email_sent"
  | "email_received";

// All possible timeline event types
export type TimelineEventType = ContactEventType | MessageEventType;

/**
 * Metadata structures for different event types
 */
export interface TagEventMetadata {
  tag_id: string;
  tag_name: string;
  tag_color?: string;
}

export interface StatusChangeMetadata {
  old_status: string;
  new_status: string;
}

export interface CallEventMetadata {
  duration_seconds?: number;
  outcome?: "connected" | "voicemail" | "no_answer" | "busy" | "other";
  notes?: string;
}

export interface ManualMessageMetadata {
  channel?: "sms" | "email" | "other";
  external_id?: string;
}

// Union type for all metadata variants
export type TimelineEventMetadata =
  | TagEventMetadata
  | StatusChangeMetadata
  | CallEventMetadata
  | ManualMessageMetadata
  | Record<string, unknown>;

/**
 * Database record from contact_events table
 */
export interface ContactEvent {
  id: string;
  contact_id: string;
  event_type: ContactEventType;
  content: string | null;
  direction: "inbound" | "outbound" | null;
  metadata: TimelineEventMetadata;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Unified timeline event (normalized from messages or contact_events)
 */
export interface TimelineEvent {
  id: string;
  contact_id: string;
  event_type: TimelineEventType;
  content: string | null;
  direction: "inbound" | "outbound" | null;
  metadata: TimelineEventMetadata;
  created_by: string | null;
  created_at: string;

  // Message-specific fields (only present for message events)
  message?: {
    id: string;
    subject: string | null;
    status: MessageStatus;
    channel: "sms" | "email";
    provider_id: string | null;
    provider_error: string | null;
    from_identity: MessageFromIdentity | null;
    template_id: string | null;
    workflow_execution_id: string | null;
    scheduled_at: string | null;
    sent_at: string | null;
    delivered_at: string | null;
    failed_at: string | null;
  };
}

/**
 * Paginated timeline response
 */
export interface TimelineResponse {
  events: TimelineEvent[];
  hasMore: boolean;
  nextCursor: string | null; // ISO timestamp of oldest event in current batch
}

/**
 * Input for creating a new contact event
 */
export interface CreateContactEventInput {
  contact_id: string;
  event_type: ContactEventType;
  content?: string;
  direction?: "inbound" | "outbound";
  metadata?: TimelineEventMetadata;
  created_by?: string;
  created_at?: string; // For backdating events
}

/**
 * Timeline fetch options
 */
export interface TimelineQueryOptions {
  contactId: string;
  before?: string; // Cursor for pagination (ISO timestamp)
  limit?: number; // Default 30
  eventTypes?: TimelineEventType[]; // Filter by event types
}

/**
 * Date group for timeline UI rendering
 */
export interface TimelineDateGroup {
  date: string; // ISO date string (YYYY-MM-DD)
  label: string; // "Today", "Yesterday", "Jan 12, 2025"
  events: TimelineEvent[];
}

/**
 * Event type configuration for UI rendering
 */
export interface EventTypeConfig {
  type: TimelineEventType;
  label: string;
  icon: string; // Lucide icon name
  colorClass: string; // Tailwind color class
  category: "message" | "call" | "note" | "system";
}

/**
 * Event type configurations map
 */
export const EVENT_TYPE_CONFIG: Record<TimelineEventType, EventTypeConfig> = {
  sms_sent: {
    type: "sms_sent",
    label: "SMS Sent",
    icon: "MessageSquare",
    colorClass: "text-blue-600",
    category: "message",
  },
  sms_received: {
    type: "sms_received",
    label: "SMS Received",
    icon: "MessageSquare",
    colorClass: "text-gray-600",
    category: "message",
  },
  email_sent: {
    type: "email_sent",
    label: "Email Sent",
    icon: "Mail",
    colorClass: "text-blue-600",
    category: "message",
  },
  email_received: {
    type: "email_received",
    label: "Email Received",
    icon: "Mail",
    colorClass: "text-gray-600",
    category: "message",
  },
  call_inbound: {
    type: "call_inbound",
    label: "Incoming Call",
    icon: "PhoneIncoming",
    colorClass: "text-green-600",
    category: "call",
  },
  call_outbound: {
    type: "call_outbound",
    label: "Outgoing Call",
    icon: "PhoneOutgoing",
    colorClass: "text-green-600",
    category: "call",
  },
  note_added: {
    type: "note_added",
    label: "Note Added",
    icon: "StickyNote",
    colorClass: "text-yellow-600",
    category: "note",
  },
  tag_added: {
    type: "tag_added",
    label: "Tag Added",
    icon: "Tag",
    colorClass: "text-purple-600",
    category: "system",
  },
  tag_removed: {
    type: "tag_removed",
    label: "Tag Removed",
    icon: "X",
    colorClass: "text-purple-600",
    category: "system",
  },
  status_changed: {
    type: "status_changed",
    label: "Status Changed",
    icon: "RefreshCw",
    colorClass: "text-orange-600",
    category: "system",
  },
  created: {
    type: "created",
    label: "Contact Created",
    icon: "UserPlus",
    colorClass: "text-indigo-600",
    category: "system",
  },
  manual_message: {
    type: "manual_message",
    label: "Manual Message",
    icon: "PenLine",
    colorClass: "text-slate-600",
    category: "message",
  },
};
