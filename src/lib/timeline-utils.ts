/**
 * Timeline Utilities
 *
 * Helper functions for date grouping, formatting, and merging timeline events
 * from multiple data sources (messages table + contact_events table).
 */

import { Message } from "@/types/message";
import {
  ContactEvent,
  TimelineEvent,
  TimelineDateGroup,
  TimelineEventType,
  MessageEventType,
} from "@/types/timeline";

// =============================================================================
// Date Formatting
// =============================================================================

/**
 * Format a date for the timeline header
 * Returns "Today", "Yesterday", or formatted date (e.g., "Jan 12, 2025")
 */
export function formatDateHeader(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  // Reset time to compare dates only
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateDay.getTime() === today.getTime()) {
    return "Today";
  }
  if (dateDay.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }

  // For dates within the current year, omit the year
  const options: Intl.DateTimeFormatOptions =
    date.getFullYear() === now.getFullYear()
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" };

  return date.toLocaleDateString("en-US", options);
}

/**
 * Format a timestamp for display within an event
 * Recent: "2 hours ago", Older: "3:45 PM"
 */
export function formatEventTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Within the last hour: show minutes ago
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 1) return "just now";
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  // Within today: show hours ago
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (eventDay.getTime() === today.getTime()) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  // For older dates: show time
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format a full timestamp (date + time)
 */
export function formatFullTimestamp(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Get ISO date string (YYYY-MM-DD) for grouping
 */
export function getDateKey(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split("T")[0];
}

// =============================================================================
// Event Type Helpers
// =============================================================================

/**
 * Derive the event type from a message
 */
export function getMessageEventType(message: Message): MessageEventType {
  const { channel, direction } = message;

  if (channel === "sms") {
    return direction === "outbound" ? "sms_sent" : "sms_received";
  }
  return direction === "outbound" ? "email_sent" : "email_received";
}

/**
 * Check if an event type represents a message
 */
export function isMessageEvent(eventType: TimelineEventType): boolean {
  return ["sms_sent", "sms_received", "email_sent", "email_received"].includes(
    eventType
  );
}

/**
 * Check if an event is inbound/received
 */
export function isInboundEvent(event: TimelineEvent): boolean {
  if (event.direction === "inbound") return true;
  return ["sms_received", "email_received", "call_inbound"].includes(
    event.event_type
  );
}

/**
 * Check if an event is outbound/sent
 */
export function isOutboundEvent(event: TimelineEvent): boolean {
  if (event.direction === "outbound") return true;
  return [
    "sms_sent",
    "email_sent",
    "call_outbound",
    "manual_message",
  ].includes(event.event_type);
}

// =============================================================================
// Event Normalization
// =============================================================================

/**
 * Convert a Message to a TimelineEvent
 */
export function normalizeMessage(message: Message): TimelineEvent {
  return {
    id: message.id,
    contact_id: message.contact_id,
    event_type: getMessageEventType(message),
    content: message.body,
    direction: message.direction,
    metadata: {},
    created_by: message.from_identity?.address || null,
    created_at: message.created_at,
    message: {
      id: message.id,
      subject: message.subject,
      status: message.status,
      source: message.source,
      channel: message.channel,
      provider_id: message.provider_id,
      provider_error: message.provider_error,
      from_identity: message.from_identity,
      template_id: message.template_id,
      workflow_execution_id: message.workflow_execution_id,
      scheduled_at: message.scheduled_at,
      sent_at: message.sent_at,
      delivered_at: message.delivered_at,
      failed_at: message.failed_at,
    },
  };
}

/**
 * Convert a ContactEvent to a TimelineEvent
 */
export function normalizeContactEvent(event: ContactEvent): TimelineEvent {
  return {
    id: event.id,
    contact_id: event.contact_id,
    event_type: event.event_type,
    content: event.content,
    direction: event.direction,
    metadata: event.metadata,
    created_by: event.created_by,
    created_at: event.created_at,
  };
}

/**
 * Normalize an array of messages to timeline events
 */
export function normalizeMessages(messages: Message[]): TimelineEvent[] {
  return messages.map(normalizeMessage);
}

/**
 * Normalize an array of contact events to timeline events
 */
export function normalizeContactEvents(
  events: ContactEvent[]
): TimelineEvent[] {
  return events.map(normalizeContactEvent);
}

// =============================================================================
// Event Merging and Sorting
// =============================================================================

/**
 * Merge and sort events from multiple sources
 * Returns events sorted by created_at descending (most recent first)
 */
export function mergeAndSortEvents(
  messages: Message[],
  contactEvents: ContactEvent[]
): TimelineEvent[] {
  const normalizedMessages = normalizeMessages(messages);
  const normalizedEvents = normalizeContactEvents(contactEvents);

  const merged = [...normalizedMessages, ...normalizedEvents];

  // Sort by created_at descending
  merged.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return merged;
}

/**
 * Create a "created" event from contact creation timestamp
 */
export function createContactCreatedEvent(
  contactId: string,
  createdAt: string
): TimelineEvent {
  return {
    id: `created-${contactId}`,
    contact_id: contactId,
    event_type: "created",
    content: null,
    direction: null,
    metadata: {},
    created_by: null,
    created_at: createdAt,
  };
}

// =============================================================================
// Date Grouping
// =============================================================================

/**
 * Group timeline events by date
 * Returns groups sorted by date descending (most recent first)
 */
export function groupEventsByDate(events: TimelineEvent[]): TimelineDateGroup[] {
  const groups = new Map<string, TimelineEvent[]>();

  // Group events by date key
  for (const event of events) {
    const dateKey = getDateKey(event.created_at);
    const existing = groups.get(dateKey) || [];
    existing.push(event);
    groups.set(dateKey, existing);
  }

  // Convert to array of date groups
  const result: TimelineDateGroup[] = [];
  for (const [dateKey, groupEvents] of Array.from(groups.entries())) {
    // Events within each group are already sorted (from mergeAndSortEvents)
    result.push({
      date: dateKey,
      label: formatDateHeader(dateKey),
      events: groupEvents,
    });
  }

  // Sort groups by date descending
  result.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return result;
}

// =============================================================================
// Content Formatting
// =============================================================================

/**
 * Truncate content for preview display
 */
export function truncateContent(
  content: string | null,
  maxLength: number = 150
): { text: string; isTruncated: boolean } {
  if (!content) {
    return { text: "", isTruncated: false };
  }

  // Normalize whitespace
  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return { text: normalized, isTruncated: false };
  }

  // Truncate at word boundary
  const truncated = normalized.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const cutoff = lastSpace > maxLength - 30 ? lastSpace : maxLength;

  return {
    text: normalized.substring(0, cutoff) + "...",
    isTruncated: true,
  };
}

/**
 * Generate event title/summary based on event type and metadata
 */
export function getEventTitle(event: TimelineEvent): string {
  switch (event.event_type) {
    case "sms_sent":
      return "SMS Sent";
    case "sms_received":
      return "SMS Received";
    case "email_sent":
      return event.message?.subject
        ? `Email Sent: ${event.message.subject}`
        : "Email Sent";
    case "email_received":
      return event.message?.subject
        ? `Email Received: ${event.message.subject}`
        : "Email Received";
    case "call_inbound":
      return "Incoming Call";
    case "call_outbound":
      return "Outgoing Call";
    case "note_added":
      return "Note Added";
    case "tag_added": {
      const tagMeta = event.metadata as { tag_name?: string };
      return tagMeta.tag_name ? `Tag Added: ${tagMeta.tag_name}` : "Tag Added";
    }
    case "tag_removed": {
      const tagMeta = event.metadata as { tag_name?: string };
      return tagMeta.tag_name
        ? `Tag Removed: ${tagMeta.tag_name}`
        : "Tag Removed";
    }
    case "status_changed": {
      const statusMeta = event.metadata as {
        old_status?: string;
        new_status?: string;
      };
      if (statusMeta.old_status && statusMeta.new_status) {
        return `Status: ${formatStatus(statusMeta.old_status)} → ${formatStatus(statusMeta.new_status)}`;
      }
      return "Status Changed";
    }
    case "created":
      return "Contact Created";
    case "manual_message":
      return "Manual Message Logged";
    default:
      return "Event";
  }
}

/**
 * Format status for display (capitalize)
 */
function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
}

/**
 * Get call duration display string
 */
export function formatCallDuration(seconds: number | undefined): string {
  if (!seconds || seconds < 0) return "";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

// =============================================================================
// Filter Helpers
// =============================================================================

/**
 * Filter events by type
 */
export function filterEventsByType(
  events: TimelineEvent[],
  types: TimelineEventType[]
): TimelineEvent[] {
  if (types.length === 0) return events;
  return events.filter((event) => types.includes(event.event_type));
}

/**
 * Filter events by date range
 */
export function filterEventsByDateRange(
  events: TimelineEvent[],
  startDate?: string,
  endDate?: string
): TimelineEvent[] {
  return events.filter((event) => {
    const eventDate = new Date(event.created_at);

    if (startDate && eventDate < new Date(startDate)) {
      return false;
    }
    if (endDate && eventDate > new Date(endDate)) {
      return false;
    }

    return true;
  });
}
