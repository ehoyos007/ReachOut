"use client";

import { useState, useEffect } from "react";
import { Plus, RefreshCw, Loader2, MessageSquare, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TimelineEvent } from "./TimelineEvent";
import { LogEventModal } from "./LogEventModal";
import { ComposeMessageModal } from "@/components/messaging";
import { useContactTimeline } from "@/hooks/useContactTimeline";
import { useSettingsStore } from "@/lib/store/settingsStore";
import type { ContactWithRelations, CustomField } from "@/types/contact";
import type { MessageChannel } from "@/types/message";

interface ContactTimelineProps {
  contactId: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactName?: string;
  contactCreatedAt?: string;
  contact?: ContactWithRelations;
  customFields?: CustomField[];
  // Props for opening compose modal with pre-filled content (e.g., for resend)
  initialComposeOpen?: boolean;
  initialComposeChannel?: MessageChannel;
  initialComposeBody?: string;
  initialComposeSubject?: string;
  onComposeClose?: () => void;
}

export function ContactTimeline({
  contactId,
  contactEmail,
  contactPhone,
  contactName = "this contact",
  contactCreatedAt,
  contact,
  customFields = [],
  initialComposeOpen = false,
  initialComposeChannel = "sms",
  initialComposeBody = "",
  initialComposeSubject = "",
  onComposeClose,
}: ContactTimelineProps) {
  const [logEventOpen, setLogEventOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeChannel, setComposeChannel] = useState<MessageChannel>("sms");
  const [composeBody, setComposeBody] = useState("");
  const [composeSubject, setComposeSubject] = useState("");

  // Handle initial compose state (e.g., from URL params for resend)
  useEffect(() => {
    if (initialComposeOpen && contact) {
      setComposeChannel(initialComposeChannel);
      setComposeBody(initialComposeBody);
      setComposeSubject(initialComposeSubject);
      setComposeOpen(true);
    }
  }, [initialComposeOpen, initialComposeChannel, initialComposeBody, initialComposeSubject, contact]);

  const { isTwilioConfigured, isSendGridConfigured } = useSettingsStore();

  const {
    dateGroups,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useContactTimeline({
    contactId,
    contactCreatedAt,
    initialLimit: 30,
  });

  const canSendSms = isTwilioConfigured && contactPhone;
  const canSendEmail = isSendGridConfigured && contactEmail;

  // Handle compose modal
  const handleCompose = (channel: MessageChannel) => {
    setComposeChannel(channel);
    setComposeBody(""); // Reset body when opening normally
    setComposeSubject(""); // Reset subject when opening normally
    setComposeOpen(true);
  };

  // After sending a message, refresh the timeline
  const handleMessageSent = () => {
    refresh();
  };

  // After logging an event, refresh the timeline
  const handleEventLogged = () => {
    setLogEventOpen(false);
    refresh();
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Activity Timeline</CardTitle>
              <CardDescription>
                All interactions with {contactName}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={refresh}
                disabled={isLoading}
                title="Refresh timeline"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLogEventOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Log Event
              </Button>
            </div>
          </div>

          {/* Send message buttons */}
          <div className="flex gap-2 mt-3">
            <Button
              variant="default"
              size="sm"
              disabled={!canSendSms}
              onClick={() => handleCompose("sms")}
              title={
                !isTwilioConfigured
                  ? "Configure Twilio in Settings"
                  : !contactPhone
                    ? "No phone number"
                    : "Send SMS"
              }
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Send SMS
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!canSendEmail}
              onClick={() => handleCompose("email")}
              title={
                !isSendGridConfigured
                  ? "Configure SendGrid in Settings"
                  : !contactEmail
                    ? "No email address"
                    : "Send Email"
              }
            >
              <Mail className="h-4 w-4 mr-1" />
              Send Email
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Error state */}
          {error && (
            <div className="text-center py-8 text-red-600">
              <p>Error loading timeline: {error.message}</p>
              <Button variant="link" onClick={refresh} className="mt-2">
                Try again
              </Button>
            </div>
          )}

          {/* Loading state */}
          {isLoading && !error && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && dateGroups.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900">
                No activity yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Start by sending a message or logging an event.
              </p>
              <div className="flex justify-center gap-2 mt-4">
                {canSendSms && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCompose("sms")}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Send SMS
                  </Button>
                )}
                {canSendEmail && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCompose("email")}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Send Email
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLogEventOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Log Event
                </Button>
              </div>
            </div>
          )}

          {/* Timeline */}
          {!isLoading && !error && dateGroups.length > 0 && (
            <div className="space-y-6">
              {dateGroups.map((group) => (
                <div key={group.date}>
                  {/* Date header */}
                  <div className="sticky top-0 z-10 bg-white py-2 -mx-1 px-1">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {group.label}
                      </span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                  </div>

                  {/* Events in this date group */}
                  <div className="mt-3">
                    {group.events.map((event, index) => (
                      <TimelineEvent
                        key={event.id}
                        event={event}
                        isLast={
                          index === group.events.length - 1 &&
                          group === dateGroups[dateGroups.length - 1]
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Load more button */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load Earlier Events"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Event Modal */}
      <LogEventModal
        open={logEventOpen}
        onOpenChange={setLogEventOpen}
        contactId={contactId}
        onEventLogged={handleEventLogged}
      />

      {/* Compose Message Modal */}
      {contact && (
        <ComposeMessageModal
          open={composeOpen}
          onOpenChange={(open) => {
            setComposeOpen(open);
            if (!open) {
              handleMessageSent();
              // Clear initial compose values and notify parent
              setComposeBody("");
              setComposeSubject("");
              onComposeClose?.();
            }
          }}
          initialChannel={composeChannel}
          initialBody={composeBody}
          initialSubject={composeSubject}
          contact={contact}
          customFields={customFields}
        />
      )}
    </>
  );
}
