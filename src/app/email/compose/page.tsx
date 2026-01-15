"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Users,
  User,
  Mail,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplateSelector } from "@/components/email/TemplateSelector";
import { TemplateVariableForm } from "@/components/email/TemplateVariableForm";
import { TemplatePreview } from "@/components/email/TemplatePreview";
import { useSendGridTemplates } from "@/hooks/useSendGridTemplates";
import { useTemplateDetails } from "@/hooks/useTemplateDetails";
import { useSendTemplateEmail } from "@/hooks/useSendTemplateEmail";
import { validateVariables, buildDynamicData } from "@/utils/templateParser";
import type { Contact } from "@/types/contact";

// Loading fallback for Suspense boundary
function ComposeEmailLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-1 h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
          <Skeleton className="h-[500px] w-full" />
        </div>
      </main>
    </div>
  );
}

// Main page component wrapped in Suspense
export default function ComposeEmailPage() {
  return (
    <Suspense fallback={<ComposeEmailLoading />}>
      <ComposeEmailContent />
    </Suspense>
  );
}

// Content component that uses useSearchParams
function ComposeEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL params for pre-selecting contacts
  const contactIdsParam = searchParams.get("contacts");

  // Template state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [previewContactIndex, setPreviewContactIndex] = useState(0);

  // Contact state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  // Send state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    message: string;
    totalSent?: number;
    totalFailed?: number;
  } | null>(null);

  // Hooks
  const {
    templates,
    isLoading: isLoadingTemplates,
    error: templatesError,
    lastSyncedAt,
    refresh: refreshTemplates,
  } = useSendGridTemplates();

  const {
    template,
    activeVersion,
    variables,
    isLoading: isLoadingDetails,
    error: detailsError,
  } = useTemplateDetails(selectedTemplateId);

  const {
    isSending,
    sendToContact,
    sendBatch,
    clearError: clearSendError,
  } = useSendTemplateEmail();

  // Fetch contacts from URL params
  useEffect(() => {
    if (!contactIdsParam) return;

    const fetchContacts = async () => {
      setIsLoadingContacts(true);
      try {
        const ids = contactIdsParam.split(",").filter(Boolean);
        const contactPromises = ids.map((id) =>
          fetch(`/api/contacts/${id}`).then((r) => r.json())
        );
        const results = await Promise.all(contactPromises);
        const validContacts = results
          .filter((r) => r.contact)
          .map((r) => r.contact);
        setContacts(validContacts);
      } catch (error) {
        console.error("Failed to fetch contacts:", error);
      } finally {
        setIsLoadingContacts(false);
      }
    };

    fetchContacts();
  }, [contactIdsParam]);

  // Clear variable values when template changes
  useEffect(() => {
    setVariableValues({});
  }, [selectedTemplateId]);

  // Validation
  const validation = variables.length > 0
    ? validateVariables(variables, variableValues)
    : { valid: true, missing: [] };

  const canSend =
    selectedTemplateId &&
    contacts.length > 0 &&
    validation.valid &&
    !isSending;

  // Handle send
  const handleSend = useCallback(async () => {
    if (!selectedTemplateId || contacts.length === 0) return;

    setShowConfirmDialog(false);
    setSendResult(null);
    clearSendError();

    try {
      if (contacts.length === 1) {
        // Single send
        const contact = contacts[0];
        const dynamicData = buildDynamicData(variables, variableValues, contact);

        const result = await sendToContact({
          templateId: selectedTemplateId,
          contactId: contact.id,
          dynamicData,
          subject: activeVersion?.subject,
        });

        setSendResult({
          success: result.success,
          message: result.success
            ? "Email sent successfully!"
            : result.error?.message || "Failed to send email",
        });
      } else {
        // Batch send
        const recipients = contacts.map((contact) => ({
          contactId: contact.id,
          dynamicData: buildDynamicData(variables, variableValues, contact),
        }));

        const result = await sendBatch({
          templateId: selectedTemplateId,
          recipients,
          subject: activeVersion?.subject,
        });

        setSendResult({
          success: result.totalSent > 0,
          message:
            result.totalFailed === 0
              ? `Successfully sent ${result.totalSent} emails!`
              : `Sent ${result.totalSent} emails, ${result.totalFailed} failed.`,
          totalSent: result.totalSent,
          totalFailed: result.totalFailed,
        });
      }
    } catch (error) {
      setSendResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }, [
    selectedTemplateId,
    contacts,
    variables,
    variableValues,
    activeVersion,
    sendToContact,
    sendBatch,
    clearSendError,
  ]);

  // Get contact display name
  const getContactName = (contact: Contact) => {
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
    return name || contact.email || "Unknown";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Compose Email</h1>
              <p className="text-sm text-muted-foreground">
                Send personalized emails using SendGrid templates
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={!canSend}
              className="gap-2"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send {contacts.length > 1 ? `(${contacts.length})` : ""}
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {/* Send result alert */}
        {sendResult && (
          <Alert
            className="mb-6"
            variant={sendResult.success ? "default" : "destructive"}
          >
            {sendResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle>{sendResult.success ? "Success" : "Error"}</AlertTitle>
            <AlertDescription>
              {sendResult.message}
              {sendResult.success && (
                <div className="mt-2">
                  <Link href="/messages/sent">
                    <Button variant="outline" size="sm">
                      View Sent Messages
                    </Button>
                  </Link>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column: Template selection and variables */}
          <div className="space-y-6">
            {/* Contacts card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recipients</CardTitle>
                  <Link href="/contacts">
                    <Button variant="ghost" size="sm" className="h-8">
                      <Users className="mr-2 h-4 w-4" />
                      Select Contacts
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingContacts ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="text-center py-4">
                    <Users className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      No contacts selected.{" "}
                      <Link href="/contacts" className="text-primary hover:underline">
                        Select contacts
                      </Link>{" "}
                      to send to.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {contacts.length === 1 ? (
                          <>
                            <User className="mr-1 h-3 w-3" />
                            {getContactName(contacts[0])}
                          </>
                        ) : (
                          <>
                            <Users className="mr-1 h-3 w-3" />
                            {contacts.length} contacts selected
                          </>
                        )}
                      </Badge>
                    </div>
                    {contacts.length > 1 && (
                      <div className="flex flex-wrap gap-1">
                        {contacts.slice(0, 5).map((contact) => (
                          <Badge key={contact.id} variant="outline" className="text-xs">
                            {getContactName(contact)}
                          </Badge>
                        ))}
                        {contacts.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{contacts.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Template selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Template</CardTitle>
              </CardHeader>
              <CardContent>
                <TemplateSelector
                  templates={templates}
                  selectedTemplateId={selectedTemplateId}
                  onSelect={setSelectedTemplateId}
                  isLoading={isLoadingTemplates}
                  error={templatesError}
                  lastSyncedAt={lastSyncedAt}
                  onRefresh={refreshTemplates}
                />
              </CardContent>
            </Card>

            {/* Variable form */}
            {selectedTemplateId && (
              <>
                {isLoadingDetails ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Template Variables</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ) : detailsError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{detailsError}</AlertDescription>
                  </Alert>
                ) : (
                  <TemplateVariableForm
                    variables={variables}
                    values={variableValues}
                    onChange={setVariableValues}
                    selectedContacts={contacts}
                    disabled={isSending}
                  />
                )}
              </>
            )}
          </div>

          {/* Right column: Preview */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            {selectedTemplateId && activeVersion?.html_content ? (
              <TemplatePreview
                htmlContent={activeVersion.html_content}
                subject={activeVersion.subject || ""}
                variables={variableValues}
                selectedContacts={contacts}
                previewContactIndex={previewContactIndex}
                onPreviewContactChange={setPreviewContactIndex}
              />
            ) : (
              <Card className="h-[500px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Mail className="mx-auto h-12 w-12 opacity-50" />
                  <p className="mt-4">Select a template to preview</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Confirmation dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email?</DialogTitle>
            <DialogDescription>
              You are about to send {contacts.length === 1 ? "an email" : `${contacts.length} emails`} using
              the template &ldquo;{template?.name || "Selected template"}&rdquo;.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recipients:</span>
                <span className="font-medium">{contacts.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Template:</span>
                <span className="font-medium">{template?.name}</span>
              </div>
              {!validation.valid && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Missing required variables: {validation.missing.join(", ")}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={!validation.valid || isSending}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Confirm Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
