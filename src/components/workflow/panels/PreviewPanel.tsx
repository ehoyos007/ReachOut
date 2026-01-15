"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Send,
  Check,
  AlertCircle,
  Loader2,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useMessagePreview } from "@/hooks/useMessagePreview";
import { TestDataConfig } from "./TestDataConfig";

// =============================================================================
// Types
// =============================================================================

interface PreviewPanelProps {
  /** The message channel */
  channel: "sms" | "email";
  /** The message body template */
  body: string;
  /** The message subject template (email only) */
  subject?: string;
  /** Whether the panel should be expanded by default */
  defaultOpen?: boolean;
  /** Whether the panel is disabled (e.g., no template selected) */
  disabled?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function PreviewPanel({
  channel,
  body,
  subject,
  defaultOpen = false,
  disabled = false,
}: PreviewPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    recipient,
    setRecipient,
    saveAsDefault,
    setSaveAsDefault,
    testData,
    updateTestValue,
    resetTestData,
    variables,
    sendPreview,
    isSending,
    lastResult,
    clearResult,
    isValid,
    validationError,
    isLoadingPreferences,
  } = useMessagePreview({
    channel,
    body,
    subject,
  });

  // Show success message temporarily
  useEffect(() => {
    if (lastResult?.success) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
        clearResult();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastResult, clearResult]);

  // Get the appropriate icon
  const Icon = channel === "sms" ? Phone : Mail;

  // Format the relative time
  const getRelativeTime = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card">
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex items-center justify-between w-full px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors rounded-t-lg",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <Send className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Preview Settings</span>
            </div>
            {showSuccess && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <Check className="h-3 w-3" />
                Sent
              </span>
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-4 border-t">
            {/* Recipient Input */}
            <div className="space-y-2 pt-3">
              <Label htmlFor="preview-recipient" className="text-sm font-medium">
                Send preview to
              </Label>
              <div className="relative">
                <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="preview-recipient"
                  type={channel === "email" ? "email" : "tel"}
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={
                    channel === "sms"
                      ? "+1 (555) 123-4567"
                      : "your.email@example.com"
                  }
                  className="pl-10"
                  disabled={isLoadingPreferences}
                />
              </div>
              {validationError && recipient && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationError}
                </p>
              )}
            </div>

            {/* Save as Default Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="save-default"
                checked={saveAsDefault}
                onCheckedChange={(checked) =>
                  setSaveAsDefault(checked === true)
                }
              />
              <Label
                htmlFor="save-default"
                className="text-sm font-normal text-muted-foreground cursor-pointer"
              >
                Save as my default preview{" "}
                {channel === "sms" ? "number" : "address"}
              </Label>
            </div>

            {/* Test Data Configuration */}
            {variables.length > 0 && (
              <TestDataConfig
                variables={variables}
                testData={testData}
                onUpdateValue={updateTestValue}
                onReset={resetTestData}
              />
            )}

            {/* Send Preview Button */}
            <div className="space-y-2">
              <Button
                onClick={sendPreview}
                disabled={!isValid || isSending || disabled || !body}
                className="w-full"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : showSuccess ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Preview Sent
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Preview
                  </>
                )}
              </Button>

              {/* Result Feedback */}
              {lastResult && !showSuccess && lastResult.error && (
                <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{lastResult.error}</span>
                </div>
              )}

              {lastResult?.success && lastResult.sentAt && (
                <p className="text-xs text-muted-foreground text-center">
                  Preview sent {getRelativeTime(lastResult.sentAt)}
                </p>
              )}
            </div>

            {/* Preview Note */}
            {!body && (
              <p className="text-xs text-muted-foreground text-center">
                Select a template to enable previews
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
