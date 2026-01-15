"use client";

import { useState, useRef } from "react";
import {
  AlertCircle,
  Loader2,
  User,
  Phone,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import type { ContactWithRelations } from "@/types/contact";
import { getContactDisplayName } from "@/types/contact";

interface BulkSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContacts: ContactWithRelations[];
  onSendSms: (message: string, contactIds: string[]) => Promise<{ sent: number; failed: number }>;
}

// Placeholders for message personalization
const PLACEHOLDERS = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "full_name", label: "Full Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
];

// Calculate SMS segments (GSM-7 vs Unicode)
function calculateSmsSegments(text: string): { segments: number; encoding: string; charCount: number } {
  // GSM-7 basic character set (subset for detection)
  const gsm7Regex = /^[\x00-\x7F\n\r]+$/;
  const isGsm7 = gsm7Regex.test(text);

  const charCount = text.length;

  if (isGsm7) {
    // GSM-7: 160 chars per segment, 153 if multipart
    if (charCount <= 160) {
      return { segments: 1, encoding: "GSM-7", charCount };
    }
    return { segments: Math.ceil(charCount / 153), encoding: "GSM-7", charCount };
  } else {
    // Unicode (UCS-2): 70 chars per segment, 67 if multipart
    if (charCount <= 70) {
      return { segments: 1, encoding: "Unicode", charCount };
    }
    return { segments: Math.ceil(charCount / 67), encoding: "Unicode", charCount };
  }
}

// Replace placeholders with contact data
function resolvePlaceholders(template: string, contact: ContactWithRelations): string {
  let result = template;

  result = result.replace(/\{\{first_name\}\}/gi, contact.first_name || "");
  result = result.replace(/\{\{last_name\}\}/gi, contact.last_name || "");
  result = result.replace(
    /\{\{full_name\}\}/gi,
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") || ""
  );
  result = result.replace(/\{\{email\}\}/gi, contact.email || "");
  result = result.replace(/\{\{phone\}\}/gi, contact.phone || "");

  return result;
}

export function BulkSmsModal({
  isOpen,
  onClose,
  selectedContacts,
  onSendSms,
}: BulkSmsModalProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter contacts with phone numbers
  const contactsWithPhone = selectedContacts.filter((c) => c.phone);
  const contactsWithoutPhone = selectedContacts.filter((c) => !c.phone);

  // Sample contact for preview
  const sampleContact = contactsWithPhone[0];

  // Calculate SMS info
  const smsInfo = calculateSmsSegments(message);
  const previewMessage = sampleContact ? resolvePlaceholders(message, sampleContact) : message;
  const previewSmsInfo = calculateSmsSegments(previewMessage);

  const handleInsertPlaceholder = (placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = message;

    const newText =
      text.substring(0, start) + `{{${placeholder}}}` + text.substring(end);

    setMessage(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + placeholder.length + 4;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleSend = async () => {
    if (!message.trim() || contactsWithPhone.length === 0) return;

    setIsSending(true);
    setResult(null);

    try {
      const sendResult = await onSendSms(
        message,
        contactsWithPhone.map((c) => c.id)
      );
      setResult(sendResult);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    onClose();
    setMessage("");
    setResult(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Send Bulk SMS</DialogTitle>
          <DialogDescription>
            Send an SMS message to {contactsWithPhone.length} contact
            {contactsWithPhone.length !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          // Results View
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-center">
              {result.failed === 0 ? (
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-yellow-600" />
                </div>
              )}
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium">
                {result.failed === 0 ? "Messages Sent!" : "Messages Partially Sent"}
              </h3>
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  {result.sent} sent
                </span>
                {result.failed > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle className="w-4 h-4" />
                    {result.failed} failed
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-center">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        ) : (
          // Compose View
          <div className="py-4 space-y-4">
            {/* Warning for contacts without phone */}
            {contactsWithoutPhone.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Missing Phone Numbers</AlertTitle>
                <AlertDescription>
                  {contactsWithoutPhone.length} contact
                  {contactsWithoutPhone.length !== 1 ? "s" : ""} do not have a
                  phone number and will be skipped.
                </AlertDescription>
              </Alert>
            )}

            {/* Message Composer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sms-message">Message</Label>
                <div className="flex gap-1">
                  {PLACEHOLDERS.map((p) => (
                    <Button
                      key={p.key}
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => handleInsertPlaceholder(p.key)}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                ref={textareaRef}
                id="sms-message"
                placeholder="Type your message here. Use placeholders like {{first_name}} for personalization."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {smsInfo.charCount} characters &middot; {smsInfo.segments} segment
                  {smsInfo.segments !== 1 ? "s" : ""} ({smsInfo.encoding})
                </span>
                <span>
                  Total: ~{smsInfo.segments * contactsWithPhone.length} SMS
                </span>
              </div>
            </div>

            {/* Preview */}
            {message && sampleContact && (
              <div className="space-y-2">
                <Label>Preview (for {getContactDisplayName(sampleContact)})</Label>
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                        <Phone className="w-3 h-3" />
                        {sampleContact.phone}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{previewMessage}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {previewSmsInfo.charCount} chars &middot;{" "}
                        {previewSmsInfo.segments} segment
                        {previewSmsInfo.segments !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recipients Summary */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Badge variant="secondary">{contactsWithPhone.length}</Badge>
              <span>
                recipient{contactsWithPhone.length !== 1 ? "s" : ""} will receive
                this message
              </span>
            </div>
          </div>
        )}

        {!result && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isSending}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={
                !message.trim() || contactsWithPhone.length === 0 || isSending
              }
            >
              {isSending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send to {contactsWithPhone.length} Contact
              {contactsWithPhone.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default BulkSmsModal;
