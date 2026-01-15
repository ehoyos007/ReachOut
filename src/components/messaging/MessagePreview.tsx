"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Eye, AlertCircle } from "lucide-react";
import {
  replacePlaceholders,
  validatePlaceholders,
  calculateSmsSegments,
  contactWithCustomFieldsToPlaceholderValues,
  getSamplePlaceholderValues,
} from "@/types/template";
import type { ContactWithRelations } from "@/types/contact";
import type { TemplateChannel } from "@/types/template";

interface MessagePreviewProps {
  body: string;
  subject?: string;
  channel: TemplateChannel;
  contact?: ContactWithRelations | null;
  defaultOpen?: boolean;
}

export function MessagePreview({
  body,
  subject,
  channel,
  contact,
  defaultOpen = false,
}: MessagePreviewProps) {
  // Get placeholder values from contact or use sample values
  const placeholderValues = useMemo(() => {
    if (contact) {
      return contactWithCustomFieldsToPlaceholderValues({
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        custom_fields: contact.custom_fields,
      });
    }
    return getSamplePlaceholderValues();
  }, [contact]);

  // Replace placeholders in body and subject
  const resolvedBody = useMemo(
    () => replacePlaceholders(body, placeholderValues),
    [body, placeholderValues]
  );

  const resolvedSubject = useMemo(
    () => (subject ? replacePlaceholders(subject, placeholderValues) : ""),
    [subject, placeholderValues]
  );

  // Validate placeholders
  const bodyValidation = useMemo(
    () => validatePlaceholders(body, placeholderValues),
    [body, placeholderValues]
  );

  const subjectValidation = useMemo(
    () => (subject ? validatePlaceholders(subject, placeholderValues) : { valid: true, missing: [] }),
    [subject, placeholderValues]
  );

  const allMissing = Array.from(new Set([...bodyValidation.missing, ...subjectValidation.missing]));

  // Calculate SMS segments if SMS channel
  const smsInfo = useMemo(() => {
    if (channel !== "sms") return null;
    return calculateSmsSegments(resolvedBody);
  }, [channel, resolvedBody]);

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group w-full">
        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
        <Eye className="h-4 w-4" />
        <span className="font-medium">Preview</span>
        {contact ? (
          <Badge variant="secondary" className="ml-auto text-xs">
            {contact.first_name || contact.email || "Contact"}
          </Badge>
        ) : (
          <Badge variant="outline" className="ml-auto text-xs">
            Sample Data
          </Badge>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <div className="border rounded-lg bg-muted/30">
          {/* Missing placeholders warning */}
          {allMissing.length > 0 && (
            <div className="p-3 border-b bg-amber-50 dark:bg-amber-950/20 rounded-t-lg">
              <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Missing placeholder values</p>
                  <p className="text-xs mt-0.5 opacity-80">
                    These placeholders have no value for this contact:{" "}
                    {allMissing.map((m) => `{{${m}}}`).join(", ")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Email subject preview */}
          {channel === "email" && subject && (
            <div className="p-3 border-b">
              <p className="text-xs text-muted-foreground mb-1">Subject</p>
              <p className="text-sm font-medium">{resolvedSubject}</p>
            </div>
          )}

          {/* Body preview */}
          <div className="p-3">
            <p className="text-xs text-muted-foreground mb-1">Message</p>
            <div className="text-sm whitespace-pre-wrap">{resolvedBody || <span className="text-muted-foreground italic">No message content</span>}</div>
          </div>

          {/* SMS info */}
          {smsInfo && (
            <div className="px-3 pb-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {smsInfo.charactersUsed} characters
              </span>
              <span className="text-muted-foreground/50">|</span>
              <span>
                {smsInfo.segments} segment{smsInfo.segments !== 1 ? "s" : ""}
              </span>
              {smsInfo.isUnicode && (
                <>
                  <span className="text-muted-foreground/50">|</span>
                  <span className="text-amber-600">Unicode</span>
                </>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
