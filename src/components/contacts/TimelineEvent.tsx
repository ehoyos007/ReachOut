"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TimelineEventIcon } from "./TimelineEventIcon";
import type { TimelineEvent as TimelineEventType } from "@/types/timeline";
import {
  EVENT_TYPE_CONFIG,
  type TagEventMetadata,
  type StatusChangeMetadata,
  type CallEventMetadata,
} from "@/types/timeline";
import {
  truncateContent,
  getEventTitle,
  formatEventTime,
  formatFullTimestamp,
  formatCallDuration,
  isInboundEvent,
} from "@/lib/timeline-utils";
import { MESSAGE_STATUS_DISPLAY } from "@/types/message";

interface TimelineEventProps {
  event: TimelineEventType;
  isLast?: boolean;
}

export function TimelineEvent({ event, isLast = false }: TimelineEventProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const config = EVENT_TYPE_CONFIG[event.event_type];
  const isInbound = isInboundEvent(event);
  const title = getEventTitle(event);

  // Truncate content for preview
  const { text: previewText, isTruncated } =
    event.content ? truncateContent(event.content, 150) : { text: "", isTruncated: false };

  // Determine background color based on event category
  const getBgColor = () => {
    if (isInbound) return "bg-gray-50";
    if (config.category === "message") return "bg-blue-50/50";
    if (config.category === "system") return "bg-purple-50/50";
    return "bg-white";
  };

  // Get message status icon
  const getStatusIcon = () => {
    if (!event.message) return null;

    const status = event.message.status;
    switch (status) {
      case "delivered":
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "sent":
        return <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />;
      case "failed":
      case "bounced":
        return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      case "scheduled":
        return <Clock className="h-3.5 w-3.5 text-purple-500" />;
      case "queued":
      case "sending":
        return <Clock className="h-3.5 w-3.5 text-gray-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="relative flex gap-3 pb-4">
      {/* Vertical line (spine) */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200" />
      )}

      {/* Event dot */}
      <div
        className={cn(
          "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-white",
          isInbound ? "border-gray-300" : "border-blue-300"
        )}
      >
        <TimelineEventIcon eventType={event.event_type} size="sm" />
      </div>

      {/* Event content */}
      <div
        className={cn(
          "flex-1 rounded-lg border p-3 cursor-pointer transition-colors",
          getBgColor(),
          isExpanded ? "ring-2 ring-blue-200" : "hover:bg-opacity-80"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900">{title}</span>
            {event.message && (
              <div className="flex items-center gap-1">
                {getStatusIcon()}
                <span className="text-xs text-gray-500">
                  {MESSAGE_STATUS_DISPLAY[event.message.status]}
                </span>
              </div>
            )}
            {isInbound && (
              <Badge variant="secondary" className="text-xs">
                Received
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-gray-500">
              {formatEventTime(event.created_at)}
            </span>
            {(isTruncated || event.message) && (
              isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )
            )}
          </div>
        </div>

        {/* Content preview */}
        {previewText && !isExpanded && (
          <p className="mt-1.5 text-sm text-gray-600 line-clamp-2">
            {previewText}
          </p>
        )}

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-3 space-y-3 border-t pt-3">
            {/* Full content */}
            {event.content && (
              <div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {event.content}
                </p>
              </div>
            )}

            {/* Message-specific details */}
            {event.message && (
              <div className="space-y-2 text-xs text-gray-500">
                {event.message.subject && (
                  <p>
                    <span className="font-medium">Subject:</span>{" "}
                    {event.message.subject}
                  </p>
                )}
                {event.message.from_identity && (
                  <p>
                    <span className="font-medium">From:</span>{" "}
                    {event.message.from_identity.address}
                  </p>
                )}
                {event.message.provider_error && (
                  <p className="text-red-600">
                    <span className="font-medium">Error:</span>{" "}
                    {event.message.provider_error}
                  </p>
                )}
                {event.message.sent_at && (
                  <p>
                    <span className="font-medium">Sent:</span>{" "}
                    {formatFullTimestamp(event.message.sent_at)}
                  </p>
                )}
                {event.message.delivered_at && (
                  <p>
                    <span className="font-medium">Delivered:</span>{" "}
                    {formatFullTimestamp(event.message.delivered_at)}
                  </p>
                )}
              </div>
            )}

            {/* Call metadata */}
            {(event.event_type === "call_inbound" ||
              event.event_type === "call_outbound") && (
              <div className="space-y-1 text-xs text-gray-500">
                {(event.metadata as CallEventMetadata).duration_seconds && (
                  <p>
                    <span className="font-medium">Duration:</span>{" "}
                    {formatCallDuration(
                      (event.metadata as CallEventMetadata).duration_seconds
                    )}
                  </p>
                )}
                {(event.metadata as CallEventMetadata).outcome && (
                  <p>
                    <span className="font-medium">Outcome:</span>{" "}
                    {(event.metadata as CallEventMetadata).outcome}
                  </p>
                )}
              </div>
            )}

            {/* Tag metadata */}
            {(event.event_type === "tag_added" ||
              event.event_type === "tag_removed") && (
              <div className="flex items-center gap-2">
                <Badge
                  style={{
                    backgroundColor:
                      (event.metadata as TagEventMetadata).tag_color ||
                      "#6366f1",
                  }}
                  className="text-white"
                >
                  {(event.metadata as TagEventMetadata).tag_name}
                </Badge>
              </div>
            )}

            {/* Status change metadata */}
            {event.event_type === "status_changed" && (
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline">
                  {(event.metadata as StatusChangeMetadata).old_status}
                </Badge>
                <span className="text-gray-400">→</span>
                <Badge variant="default">
                  {(event.metadata as StatusChangeMetadata).new_status}
                </Badge>
              </div>
            )}

            {/* Created by */}
            {event.created_by && (
              <p className="text-xs text-gray-400">
                By: {event.created_by}
              </p>
            )}

            {/* Full timestamp */}
            <p className="text-xs text-gray-400">
              {formatFullTimestamp(event.created_at)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
