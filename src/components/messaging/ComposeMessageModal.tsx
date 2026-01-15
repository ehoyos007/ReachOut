"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare,
  Mail,
  Send,
  Loader2,
  Calendar,
} from "lucide-react";
import { PlaceholderInserter } from "./PlaceholderInserter";
import { MessagePreview } from "./MessagePreview";
import { TemplateSelector } from "./TemplateSelector";
import { SaveTemplateDialog } from "./SaveTemplateDialog";
import { SenderSelector } from "./SenderSelector";
import { SchedulePicker } from "./SchedulePicker";
import { useMessageStore } from "@/lib/store/messageStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { calculateSmsSegments } from "@/types/template";
import type { MessageChannel, SendMessageInput } from "@/types/message";
import type { ContactWithRelations, CustomField } from "@/types/contact";
import type { Template } from "@/types/template";

interface ComposeMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ContactWithRelations;
  initialChannel?: MessageChannel;
  customFields?: CustomField[];
}

export function ComposeMessageModal({
  open,
  onOpenChange,
  contact,
  initialChannel = "sms",
  customFields = [],
}: ComposeMessageModalProps) {
  // Form state
  const [channel, setChannel] = useState<MessageChannel>(initialChannel);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [senderId, setSenderId] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Ref for textarea cursor position
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Store hooks
  const { sendMessage, isSending, error, clearError } = useMessageStore();
  const { isTwilioConfigured, isSendGridConfigured } = useSettingsStore();

  // Reset form when modal opens/closes or channel changes
  useEffect(() => {
    if (open) {
      setChannel(initialChannel);
      setSubject("");
      setBody("");
      setSenderId(null);
      setScheduledAt(null);
      setSelectedTemplateId(null);
      clearError();
    }
  }, [open, initialChannel, clearError]);

  // Check if we can send via this channel
  const canSendSms = isTwilioConfigured && !!contact.phone;
  const canSendEmail = isSendGridConfigured && !!contact.email;

  // Calculate SMS info
  const smsInfo = channel === "sms" ? calculateSmsSegments(body) : null;

  // Handle placeholder insertion at cursor position
  const handleInsertPlaceholder = useCallback((placeholder: string) => {
    const textarea = bodyRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = body.slice(0, start) + placeholder + body.slice(end);
      setBody(newBody);

      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    } else {
      // Fallback: append to end
      setBody(body + placeholder);
    }
  }, [body]);

  // Handle template selection
  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplateId(template.id);
    setBody(template.body);
    if (template.subject) {
      setSubject(template.subject);
    }
  };

  // Handle channel change
  const handleChannelChange = (newChannel: string) => {
    setChannel(newChannel as MessageChannel);
    setSelectedTemplateId(null);
    setSenderId(null);
    // Keep body and subject for convenience
  };

  // Handle send
  const handleSend = async () => {
    if (!body.trim()) return;

    const input: SendMessageInput = {
      contact_id: contact.id,
      channel,
      body: body.trim(),
    };

    if (channel === "email" && subject) {
      input.subject = subject.trim();
    }

    if (senderId) {
      input.from_identity_id = senderId;
    }

    if (scheduledAt) {
      input.scheduled_at = scheduledAt;
    }

    const result = await sendMessage(input);
    if (result) {
      onOpenChange(false);
    }
  };

  // Contact display info
  const contactName =
    contact.first_name && contact.last_name
      ? `${contact.first_name} ${contact.last_name}`
      : contact.first_name || contact.last_name || contact.email || contact.phone || "Contact";

  const isScheduled = !!scheduledAt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {channel === "sms" ? (
              <MessageSquare className="w-5 h-5" />
            ) : (
              <Mail className="w-5 h-5" />
            )}
            Compose Message
          </DialogTitle>
          <DialogDescription>
            Send a message to {contactName}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
            <button className="ml-2 underline" onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* Recipient */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">To:</span>
            <span className="font-medium">{contactName}</span>
            {channel === "email" && contact.email && (
              <span className="text-muted-foreground">&lt;{contact.email}&gt;</span>
            )}
            {channel === "sms" && contact.phone && (
              <span className="text-muted-foreground">{contact.phone}</span>
            )}
          </div>

          {/* Channel Tabs */}
          <Tabs value={channel} onValueChange={handleChannelChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sms" disabled={!canSendSms}>
                <MessageSquare className="w-4 h-4 mr-2" />
                SMS
              </TabsTrigger>
              <TabsTrigger value="email" disabled={!canSendEmail}>
                <Mail className="w-4 h-4 mr-2" />
                Email
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* From Sender */}
          <div className="space-y-2">
            <Label>From</Label>
            <SenderSelector
              channel={channel}
              selectedId={senderId}
              onSelect={setSenderId}
              disabled={isSending}
            />
          </div>

          <Separator />

          {/* Template Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Template</Label>
              <SaveTemplateDialog
                channel={channel}
                body={body}
                subject={channel === "email" ? subject : undefined}
                disabled={isSending || !body.trim()}
                onSaved={(id) => setSelectedTemplateId(id)}
              />
            </div>
            <TemplateSelector
              channel={channel}
              selectedTemplateId={selectedTemplateId}
              onSelect={handleTemplateSelect}
              disabled={isSending}
            />
          </div>

          <Separator />

          {/* Subject (Email only) */}
          {channel === "email" && (
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject"
                disabled={isSending}
              />
            </div>
          )}

          {/* Message Body */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="body">Message</Label>
              <PlaceholderInserter
                onInsert={handleInsertPlaceholder}
                customFields={customFields}
                disabled={isSending}
              />
            </div>
            <Textarea
              id="body"
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                channel === "sms"
                  ? "Type your SMS message..."
                  : "Type your email message..."
              }
              rows={6}
              disabled={isSending}
              className="resize-none"
            />
            {smsInfo && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{smsInfo.charactersUsed} characters</span>
                <span className="text-muted-foreground/50">|</span>
                <span>
                  {smsInfo.segments} segment{smsInfo.segments !== 1 ? "s" : ""}
                </span>
                {smsInfo.isUnicode && (
                  <>
                    <span className="text-muted-foreground/50">|</span>
                    <span className="text-amber-600">Unicode encoding</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Message Preview */}
          <MessagePreview
            body={body}
            subject={channel === "email" ? subject : undefined}
            channel={channel}
            contact={contact}
            defaultOpen={false}
          />

          <Separator />

          {/* Schedule */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Schedule
            </Label>
            <SchedulePicker
              scheduledAt={scheduledAt}
              onChange={setScheduledAt}
              disabled={isSending}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !body.trim() || (channel === "sms" && !canSendSms) || (channel === "email" && !canSendEmail)}
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isScheduled ? "Scheduling..." : "Sending..."}
              </>
            ) : (
              <>
                {isScheduled ? (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule {channel === "sms" ? "SMS" : "Email"}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send {channel === "sms" ? "SMS" : "Email"}
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
