"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ContactEventType, CallEventMetadata } from "@/types/timeline";

interface LogEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  onEventLogged?: () => void;
}

type LogEventType =
  | "note_added"
  | "call_inbound"
  | "call_outbound"
  | "manual_message";

const EVENT_TYPE_OPTIONS: { value: LogEventType; label: string }[] = [
  { value: "note_added", label: "Note" },
  { value: "call_outbound", label: "Outgoing Call" },
  { value: "call_inbound", label: "Incoming Call" },
  { value: "manual_message", label: "Manual Message (external)" },
];

const CALL_OUTCOME_OPTIONS = [
  { value: "connected", label: "Connected" },
  { value: "voicemail", label: "Left Voicemail" },
  { value: "no_answer", label: "No Answer" },
  { value: "busy", label: "Busy" },
  { value: "other", label: "Other" },
];

export function LogEventModal({
  open,
  onOpenChange,
  contactId,
  onEventLogged,
}: LogEventModalProps) {
  const [eventType, setEventType] = useState<LogEventType>("note_added");
  const [content, setContent] = useState("");
  const [direction, setDirection] = useState<"inbound" | "outbound">("outbound");
  const [callDuration, setCallDuration] = useState("");
  const [callOutcome, setCallOutcome] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCallEvent =
    eventType === "call_inbound" || eventType === "call_outbound";
  const isManualMessage = eventType === "manual_message";

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError("Content is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build metadata
      const metadata: Record<string, unknown> = {};

      if (isCallEvent) {
        if (callDuration) {
          // Parse duration (support formats like "4:32" or "272")
          const parts = callDuration.split(":");
          let seconds = 0;
          if (parts.length === 2) {
            seconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
          } else {
            seconds = parseInt(callDuration, 10);
          }
          if (!isNaN(seconds)) {
            (metadata as CallEventMetadata).duration_seconds = seconds;
          }
        }
        if (callOutcome) {
          (metadata as CallEventMetadata).outcome =
            callOutcome as CallEventMetadata["outcome"];
        }
      }

      if (isManualMessage) {
        metadata.channel = "other";
      }

      // Build request body
      const body: {
        event_type: ContactEventType;
        content: string;
        direction?: "inbound" | "outbound";
        metadata?: Record<string, unknown>;
        created_at?: string;
      } = {
        event_type: eventType,
        content: content.trim(),
      };

      // Add direction for calls and manual messages
      if (isCallEvent) {
        body.direction = eventType === "call_inbound" ? "inbound" : "outbound";
      } else if (isManualMessage) {
        body.direction = direction;
      }

      if (Object.keys(metadata).length > 0) {
        body.metadata = metadata;
      }

      // Handle backdating
      if (eventDate) {
        body.created_at = new Date(eventDate).toISOString();
      }

      const response = await fetch(`/api/contacts/${contactId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to log event");
      }

      // Reset form and close
      resetForm();
      onEventLogged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEventType("note_added");
    setContent("");
    setDirection("outbound");
    setCallDuration("");
    setCallOutcome("");
    setEventDate("");
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Event</DialogTitle>
          <DialogDescription>
            Document an interaction that happened outside the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Event Type */}
          <div className="space-y-2">
            <Label htmlFor="event-type">Event Type</Label>
            <Select
              value={eventType}
              onValueChange={(value) => setEventType(value as LogEventType)}
            >
              <SelectTrigger id="event-type">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Direction (for manual messages) */}
          {isManualMessage && (
            <div className="space-y-2">
              <Label htmlFor="direction">Direction</Label>
              <Select
                value={direction}
                onValueChange={(value) =>
                  setDirection(value as "inbound" | "outbound")
                }
              >
                <SelectTrigger id="direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Outbound (Sent)</SelectItem>
                  <SelectItem value="inbound">Inbound (Received)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Call-specific fields */}
          {isCallEvent && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="call-duration">
                  Duration (mm:ss or seconds)
                </Label>
                <Input
                  id="call-duration"
                  placeholder="e.g., 4:32 or 272"
                  value={callDuration}
                  onChange={(e) => setCallDuration(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="call-outcome">Outcome</Label>
                <Select value={callOutcome} onValueChange={setCallOutcome}>
                  <SelectTrigger id="call-outcome">
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    {CALL_OUTCOME_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">
              {isCallEvent
                ? "Call Notes"
                : isManualMessage
                  ? "Message Content"
                  : "Note"}
            </Label>
            <Textarea
              id="content"
              placeholder={
                isCallEvent
                  ? "Enter call notes..."
                  : isManualMessage
                    ? "Enter the message content..."
                    : "Enter your note..."
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
          </div>

          {/* Event Date (for backdating) */}
          <div className="space-y-2">
            <Label htmlFor="event-date">
              Date & Time{" "}
              <span className="text-gray-400 font-normal">
                (optional, defaults to now)
              </span>
            </Label>
            <Input
              id="event-date"
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>

          {/* Error message */}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Log Event"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
