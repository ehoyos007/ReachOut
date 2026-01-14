"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  Mail,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMessageStore } from "@/lib/store/messageStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import type { Message, MessageChannel, SendMessageInput } from "@/types/message";
import {
  MESSAGE_STATUS_DISPLAY,
  getTimeAgo,
} from "@/types/message";

interface MessageThreadProps {
  contactId: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactName?: string;
}

export function MessageThread({
  contactId,
  contactEmail,
  contactPhone,
  contactName = "this contact",
}: MessageThreadProps) {
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeChannel, setComposeChannel] = useState<MessageChannel>("sms");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  const {
    contactMessages,
    isLoading,
    isSending,
    error,
    fetchMessagesByContact,
    sendMessage,
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
    setComposeSubject("");
    setComposeBody("");
    setComposeOpen(true);
  };

  const handleSend = async () => {
    if (!composeBody.trim()) return;

    const input: SendMessageInput = {
      contact_id: contactId,
      channel: composeChannel,
      body: composeBody,
    };

    if (composeChannel === "email" && composeSubject) {
      input.subject = composeSubject;
    }

    const result = await sendMessage(input);
    if (result) {
      setComposeOpen(false);
      setComposeBody("");
      setComposeSubject("");
    }
  };

  const canSendSms = isTwilioConfigured && !!contactPhone;
  const canSendEmail = isSendGridConfigured && !!contactEmail;

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
      default:
        return <CheckCircle2 className="w-3 h-3 text-gray-400" />;
    }
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
                      message.direction === "outbound"
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
                      <span>{getTimeAgo(message.created_at)}</span>
                      {message.direction === "outbound" && (
                        <div className="flex items-center gap-1">
                          {getStatusIcon(message.status)}
                          <span>{MESSAGE_STATUS_DISPLAY[message.status]}</span>
                        </div>
                      )}
                    </div>

                    {/* Error Message */}
                    {message.provider_error && (
                      <p className="text-xs text-red-300 mt-1">
                        Error: {message.provider_error}
                      </p>
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

      {/* Compose Message Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {composeChannel === "sms" ? (
                <MessageSquare className="w-5 h-5" />
              ) : (
                <Mail className="w-5 h-5" />
              )}
              Send {composeChannel === "sms" ? "SMS" : "Email"}
            </DialogTitle>
            <DialogDescription>
              Send a message to {contactName}
              {composeChannel === "sms" && contactPhone && (
                <span className="block text-xs mt-1">To: {contactPhone}</span>
              )}
              {composeChannel === "email" && contactEmail && (
                <span className="block text-xs mt-1">To: {contactEmail}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {composeChannel === "email" && (
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Enter email subject"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder={
                  composeChannel === "sms"
                    ? "Type your SMS message..."
                    : "Type your email message..."
                }
                rows={5}
              />
              {composeChannel === "sms" && (
                <p className="text-xs text-gray-500">
                  {composeBody.length} characters
                  {composeBody.length > 160 && (
                    <span className="text-amber-600">
                      {" "}
                      ({Math.ceil(composeBody.length / 153)} segments)
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setComposeOpen(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !composeBody.trim()}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send {composeChannel === "sms" ? "SMS" : "Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
