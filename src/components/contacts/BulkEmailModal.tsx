"use client";

import { useState, useRef } from "react";
import {
  AlertCircle,
  Loader2,
  User,
  Mail,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ContactWithRelations } from "@/types/contact";
import { getContactDisplayName } from "@/types/contact";

interface BulkEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContacts: ContactWithRelations[];
  onSendEmail: (
    subject: string,
    body: string,
    contactIds: string[]
  ) => Promise<{ sent: number; failed: number }>;
}

// Placeholders for message personalization
const PLACEHOLDERS = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "full_name", label: "Full Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
];

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

export function BulkEmailModal({
  isOpen,
  onClose,
  selectedContacts,
  onSendEmail,
}: BulkEmailModalProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"compose" | "preview">("compose");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  // Filter contacts with email addresses
  const contactsWithEmail = selectedContacts.filter((c) => c.email);
  const contactsWithoutEmail = selectedContacts.filter((c) => !c.email);

  // Sample contact for preview
  const sampleContact = contactsWithEmail[0];

  // Preview with resolved placeholders
  const previewSubject = sampleContact ? resolvePlaceholders(subject, sampleContact) : subject;
  const previewBody = sampleContact ? resolvePlaceholders(body, sampleContact) : body;

  const handleInsertPlaceholder = (placeholder: string, target: "subject" | "body") => {
    const ref = target === "subject" ? subjectRef : bodyRef;
    const value = target === "subject" ? subject : body;
    const setValue = target === "subject" ? setSubject : setBody;
    const input = ref.current;

    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;

    const newText =
      value.substring(0, start) + `{{${placeholder}}}` + value.substring(end);

    setValue(newText);

    // Restore cursor position
    setTimeout(() => {
      input.focus();
      const newPosition = start + placeholder.length + 4;
      input.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || contactsWithEmail.length === 0) return;

    setIsSending(true);
    setResult(null);

    try {
      const sendResult = await onSendEmail(
        subject,
        body,
        contactsWithEmail.map((c) => c.id)
      );
      setResult(sendResult);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSubject("");
    setBody("");
    setResult(null);
    setActiveTab("compose");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Bulk Email</DialogTitle>
          <DialogDescription>
            Send an email to {contactsWithEmail.length} contact
            {contactsWithEmail.length !== 1 ? "s" : ""}.
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
                {result.failed === 0 ? "Emails Sent!" : "Emails Partially Sent"}
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
            {/* Warning for contacts without email */}
            {contactsWithoutEmail.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Missing Email Addresses</AlertTitle>
                <AlertDescription>
                  {contactsWithoutEmail.length} contact
                  {contactsWithoutEmail.length !== 1 ? "s" : ""} do not have an
                  email address and will be skipped.
                </AlertDescription>
              </Alert>
            )}

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "compose" | "preview")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="compose">Compose</TabsTrigger>
                <TabsTrigger value="preview" disabled={!subject || !body}>
                  Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="compose" className="space-y-4 mt-4">
                {/* Subject */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-subject">Subject</Label>
                    <div className="flex gap-1">
                      {PLACEHOLDERS.slice(0, 3).map((p) => (
                        <Button
                          key={p.key}
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => handleInsertPlaceholder(p.key, "subject")}
                        >
                          {p.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Input
                    ref={subjectRef}
                    id="email-subject"
                    placeholder="Enter email subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                {/* Body */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-body">Body</Label>
                    <div className="flex gap-1">
                      {PLACEHOLDERS.map((p) => (
                        <Button
                          key={p.key}
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => handleInsertPlaceholder(p.key, "body")}
                        >
                          {p.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Textarea
                    ref={bodyRef}
                    id="email-body"
                    placeholder="Type your email message here. Use placeholders like {{first_name}} for personalization."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={8}
                    className="resize-none"
                  />
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                {sampleContact && (
                  <div className="border rounded-lg overflow-hidden">
                    {/* Email Header */}
                    <div className="bg-gray-50 p-4 border-b">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {getContactDisplayName(sampleContact)}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {sampleContact.email}
                          </div>
                        </div>
                      </div>
                      <div className="text-lg font-medium">{previewSubject}</div>
                    </div>

                    {/* Email Body */}
                    <div className="p-4 bg-white">
                      <p className="whitespace-pre-wrap text-sm">{previewBody}</p>
                    </div>

                    {/* Preview Note */}
                    <div className="bg-blue-50 p-3 border-t border-blue-100 text-sm text-blue-700">
                      This is a preview for{" "}
                      <strong>{getContactDisplayName(sampleContact)}</strong>.
                      Each recipient will see their personalized version.
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Recipients Summary */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Badge variant="secondary">{contactsWithEmail.length}</Badge>
              <span>
                recipient{contactsWithEmail.length !== 1 ? "s" : ""} will receive
                this email
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
                !subject.trim() ||
                !body.trim() ||
                contactsWithEmail.length === 0 ||
                isSending
              }
            >
              {isSending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send to {contactsWithEmail.length} Contact
              {contactsWithEmail.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default BulkEmailModal;
