"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  Mail,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Calendar,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ComposeMessageModal } from "@/components/messaging";
import { useMessageStore } from "@/lib/store/messageStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import type { Message, MessageChannel } from "@/types/message";
import type { ContactWithRelations, CustomField } from "@/types/contact";
import {
  MESSAGE_STATUS_DISPLAY,
  getTimeAgo,
} from "@/types/message";

interface MessageThreadProps {
  contactId: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactName?: string;
  contact?: ContactWithRelations;
  customFields?: CustomField[];
}

export function MessageThread({
  contactId,
  contactEmail,
  contactPhone,
  contactName = "this contact",
  contact,
  customFields = [],
}: MessageThreadProps) {
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeChannel, setComposeChannel] = useState<MessageChannel>("sms");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelingMessage, setCancelingMessage] = useState<Message | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  const {
    contactMessages,
    isLoading,
    error,
    fetchMessagesByContact,
    clearError,
  } = useMessageStore();

  const {
    isTwilioConfigured,
    isSendGridConfigured,
    fetchSettings,
  } = useSettingsStore();

  const messages = contactMessages[contactId] || [];

  useEffect(() => {
    fetchMessagesByContact(contactId);
    fetchSettings();
  }, [contactId, fetchMessagesByContact, fetchSettings]);

  const handleRefresh = () => {
    fetchMessagesByContact(contactId);
  };

  const openCompose = (channel: MessageChannel) => {
    setComposeChannel(channel);
    setComposeOpen(true);
  };

  const handleCancelScheduled = async () => {
    if (!cancelingMessage) return;

    setIsCanceling(true);

    try {
      const response = await fetch(`/api/messages/scheduled/${cancelingMessage.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to cancel message");
      }

      // Refresh messages to reflect the cancellation
      fetchMessagesByContact(contactId);
      setCancelDialogOpen(false);
      setCancelingMessage(null);
    } catch (err) {
      // Show error in the thread error area
      console.error("Failed to cancel scheduled message:", err);
    } finally {
      setIsCanceling(false);
    }
  };

  // Create a minimal contact object if full contact not provided
  const contactForModal: ContactWithRelations = contact || {
    id: contactId,
    first_name: contactName?.split(" ")[0] || null,
    last_name: contactName?.split(" ").slice(1).join(" ") || null,
    email: contactEmail || null,
    phone: contactPhone || null,
    status: "new" as const,
    do_not_contact: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: [],
    custom_fields: [],
  };

  const canSendSms = isTwilioConfigured && !!(contactPhone || contact?.phone);
  const canSendEmail = isSendGridConfigured && !!(contactEmail || contact?.email);

  const getStatusIcon = (status: Message["status"]) => {
    switch (status) {
      case "delivered":
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case "failed":
      case "bounced":
        return <XCircle className="w-3 h-3 text-red-500" />;
      case "queued":
      case "sending":
        return <Clock className="w-3 h-3 text-blue-500" />;
      case "scheduled":
        return <Calendar className="w-3 h-3 text-purple-500" />;
      default:
        return <CheckCircle2 className="w-3 h-3 text-gray-400" />;
    }
  };

  // Format scheduled time
  const formatScheduledTime = (scheduledAt: string | null) => {
    if (!scheduledAt) return null;
    const date = new Date(scheduledAt);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeStr = date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (date.toDateString() === now.toDateString()) {
      return `Today at ${timeStr}`;
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${timeStr}`;
    }

    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <>
      <Card data-message-thread>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Message History
              </CardTitle>
              <CardDescription>
                View all SMS and email communications with this contact
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
              <button className="ml-2 underline" onClick={clearError}>
                Dismiss
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                No messages yet
              </h3>
              <p className="text-sm text-gray-500 max-w-xs mb-4">
                Start a conversation by sending an SMS or email to {contactName}.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openCompose("sms")}
                  disabled={!canSendSms}
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Send SMS
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openCompose("email")}
                  disabled={!canSendEmail}
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Send Email
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.direction === "outbound" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.status === "scheduled"
                        ? "bg-purple-100 text-purple-900 border-2 border-dashed border-purple-300"
                        : message.direction === "outbound"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {/* Channel Badge */}
                    <div className="flex items-center gap-2 mb-1">
                      {message.channel === "sms" ? (
                        <MessageSquare className="w-3 h-3" />
                      ) : (
                        <Mail className="w-3 h-3" />
                      )}
                      <span className="text-xs opacity-75 uppercase">
                        {message.channel}
                      </span>
                      {message.direction === "inbound" && (
                        <Badge variant="secondary" className="text-xs py-0">
                          Received
                        </Badge>
                      )}
                    </div>

                    {/* Email Subject */}
                    {message.channel === "email" && message.subject && (
                      <p className="font-medium text-sm mb-1">{message.subject}</p>
                    )}

                    {/* Message Body */}
                    <p className="text-sm whitespace-pre-wrap">{message.body}</p>

                    {/* Footer: Time + Status */}
                    <div className="flex items-center gap-2 mt-2 text-xs opacity-75">
                      {message.status === "scheduled" && message.scheduled_at ? (
                        <span>Scheduled: {formatScheduledTime(message.scheduled_at)}</span>
                      ) : (
                        <span>{getTimeAgo(message.created_at)}</span>
                      )}
                      {message.direction === "outbound" && (
                        <div className="flex items-center gap-1">
                          {getStatusIcon(message.status)}
                          <span>{MESSAGE_STATUS_DISPLAY[message.status]}</span>
                        </div>
                      )}
                    </div>

                    {/* Sender Identity */}
                    {message.from_identity && (
                      <p className="text-xs opacity-60 mt-1">
                        From: {message.from_identity.address}
                      </p>
                    )}

                    {/* Error Message */}
                    {message.provider_error && (
                      <p className="text-xs text-red-300 mt-1">
                        Error: {message.provider_error}
                      </p>
                    )}

                    {/* Cancel button for scheduled messages */}
                    {message.status === "scheduled" && (
                      <button
                        onClick={() => {
                          setCancelingMessage(message);
                          setCancelDialogOpen(true);
                        }}
                        className="flex items-center gap-1 mt-2 text-xs opacity-75 hover:opacity-100 underline"
                      >
                        <X className="w-3 h-3" />
                        Cancel scheduled
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Send Buttons (shown when there are messages) */}
          {messages.length > 0 && (
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openCompose("sms")}
                disabled={!canSendSms}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Send SMS
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openCompose("email")}
                disabled={!canSendEmail}
              >
                <Mail className="w-4 h-4 mr-1" />
                Send Email
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compose Message Modal */}
      <ComposeMessageModal
        open={composeOpen}
        onOpenChange={setComposeOpen}
        contact={contactForModal}
        initialChannel={composeChannel}
        customFields={customFields}
      />

      {/* Cancel Scheduled Message Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Scheduled Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this scheduled message? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {cancelingMessage && (
            <div className="py-4">
              <div className="border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  {cancelingMessage.channel === "sms" ? (
                    <Badge variant="secondary" className="gap-1">
                      <MessageSquare className="w-3 h-3" />
                      SMS
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Mail className="w-3 h-3" />
                      Email
                    </Badge>
                  )}
                  {cancelingMessage.scheduled_at && (
                    <span className="text-xs text-muted-foreground">
                      {formatScheduledTime(cancelingMessage.scheduled_at)}
                    </span>
                  )}
                </div>
                {cancelingMessage.channel === "email" && cancelingMessage.subject && (
                  <p className="font-medium text-sm mb-1">{cancelingMessage.subject}</p>
                )}
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {cancelingMessage.body}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={isCanceling}
            >
              Keep Message
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelScheduled}
              disabled={isCanceling}
            >
              {isCanceling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cancel Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
