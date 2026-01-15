"use client";

import { useState } from "react";
import { Monitor, Smartphone, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Contact } from "@/types/contact";
import { renderTemplatePreview } from "@/utils/templateParser";
import { cn } from "@/lib/utils";

type ViewMode = "desktop" | "mobile";

interface TemplatePreviewProps {
  htmlContent: string;
  subject: string;
  variables: Record<string, string>;
  selectedContacts: Contact[];
  previewContactIndex?: number;
  onPreviewContactChange?: (index: number) => void;
}

export function TemplatePreview({
  htmlContent,
  subject,
  variables,
  selectedContacts,
  previewContactIndex = 0,
  onPreviewContactChange,
}: TemplatePreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");

  // Get current preview contact
  const previewContact = selectedContacts[previewContactIndex] || null;
  const hasMultipleContacts = selectedContacts.length > 1;

  // Render preview with variables
  const { html: renderedHtml, subject: renderedSubject, missingVariables } =
    renderTemplatePreview(htmlContent, subject, variables);

  // Get preview width based on view mode
  const previewWidth = viewMode === "desktop" ? 600 : 375;

  // Get contact display name
  const getContactDisplayName = (contact: Contact) => {
    const name = [contact.first_name, contact.last_name]
      .filter(Boolean)
      .join(" ");
    return name || contact.email || "Unknown";
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Preview</CardTitle>
          <div className="flex items-center gap-2">
            {/* Missing variables warning */}
            {missingVariables.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="mr-1 h-3 w-3" />
                {missingVariables.length} missing
              </Badge>
            )}

            {/* View mode toggle */}
            <div className="flex items-center rounded-md border">
              <Button
                variant={viewMode === "desktop" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("desktop")}
                className="h-8 px-2 rounded-r-none"
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "mobile" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("mobile")}
                className="h-8 px-2 rounded-l-none"
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* Contact selector for multi-contact preview */}
        {hasMultipleContacts && (
          <div className="mb-3">
            <Select
              value={previewContactIndex.toString()}
              onValueChange={(value) => onPreviewContactChange?.(parseInt(value))}
            >
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    Preview as: {getContactDisplayName(selectedContacts[previewContactIndex])}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {selectedContacts.map((contact, index) => (
                  <SelectItem key={contact.id} value={index.toString()}>
                    {getContactDisplayName(contact)}
                    {contact.email && (
                      <span className="text-muted-foreground ml-2">
                        ({contact.email})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Email header */}
        <div className="bg-muted rounded-t-md p-3 border border-b-0 flex-shrink-0">
          <div className="space-y-1 text-sm">
            <div className="flex items-start">
              <span className="text-muted-foreground w-16 flex-shrink-0">To:</span>
              <span className="font-medium">
                {previewContact
                  ? `${getContactDisplayName(previewContact)} <${previewContact.email || "no email"}>`
                  : "No recipient selected"}
              </span>
            </div>
            <div className="flex items-start">
              <span className="text-muted-foreground w-16 flex-shrink-0">Subject:</span>
              <span
                className={cn(
                  "font-medium",
                  renderedSubject.includes("[") && "text-amber-600"
                )}
              >
                {renderedSubject || "No subject"}
              </span>
            </div>
          </div>
        </div>

        {/* Preview frame */}
        <div
          className={cn(
            "flex-1 border rounded-b-md bg-white overflow-hidden flex flex-col min-h-0",
            viewMode === "mobile" && "mx-auto"
          )}
          style={{ maxWidth: previewWidth }}
        >
          <div className="flex-1 overflow-auto">
            <iframe
              srcDoc={`
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                      body {
                        margin: 0;
                        padding: 16px;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        font-size: 14px;
                        line-height: 1.5;
                        color: #333;
                      }
                      img {
                        max-width: 100%;
                        height: auto;
                      }
                      a {
                        color: #2563eb;
                      }
                    </style>
                  </head>
                  <body>
                    ${renderedHtml}
                  </body>
                </html>
              `}
              sandbox="allow-same-origin"
              title="Email Preview"
              className="w-full h-full border-0"
              style={{ minHeight: 400 }}
            />
          </div>
        </div>

        {/* Missing variables list */}
        {missingVariables.length > 0 && (
          <div className="mt-3 p-3 bg-amber-50 rounded-md border border-amber-200 flex-shrink-0">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Missing variables:</p>
                <p className="text-amber-700">
                  {missingVariables.join(", ")}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
