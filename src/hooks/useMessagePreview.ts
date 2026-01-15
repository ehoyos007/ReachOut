import { useState, useCallback, useMemo, useEffect } from "react";
import { usePreviewStore } from "@/lib/store/previewStore";
import {
  renderMessage,
  extractAllVariables,
  getTestDataWithDefaults,
  isValidPhoneNumber,
  isValidEmail,
  DEFAULT_TEST_DATA,
} from "@/lib/message-renderer";

// =============================================================================
// Types
// =============================================================================

export interface UseMessagePreviewOptions {
  /** The message channel (sms or email) */
  channel: "sms" | "email";
  /** The message body template */
  body: string;
  /** The message subject template (email only) */
  subject?: string;
}

export interface PreviewResult {
  success: boolean;
  error?: string;
  sentAt?: Date;
  messageId?: string;
}

export interface UseMessagePreviewReturn {
  // Recipient state
  recipient: string;
  setRecipient: (value: string) => void;

  // Save as default option
  saveAsDefault: boolean;
  setSaveAsDefault: (value: boolean) => void;

  // Test data state
  testData: Record<string, string>;
  setTestData: (data: Record<string, string>) => void;
  updateTestValue: (key: string, value: string) => void;
  resetTestData: () => void;

  // Detected variables
  variables: string[];

  // Rendered preview content
  renderedContent: {
    body: string;
    subject?: string;
  };

  // Preview action
  sendPreview: () => Promise<void>;
  isSending: boolean;
  lastResult: PreviewResult | null;
  clearResult: () => void;

  // Validation
  isValid: boolean;
  validationError: string | null;

  // Loading state for preferences
  isLoadingPreferences: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useMessagePreview(
  options: UseMessagePreviewOptions
): UseMessagePreviewReturn {
  const { channel, body, subject } = options;

  // Get preview preferences from store
  const {
    preferences,
    isLoading: isLoadingPreferences,
    fetchPreferences,
    updateSmsPhone,
    updateEmailAddress,
  } = usePreviewStore();

  // Local state
  const [recipient, setRecipientInternal] = useState<string>("");
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [testData, setTestDataInternal] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<PreviewResult | null>(null);

  // Fetch preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Initialize recipient from preferences when loaded
  useEffect(() => {
    if (!isLoadingPreferences) {
      const defaultRecipient =
        channel === "sms"
          ? preferences.sms_phone || ""
          : preferences.email_address || "";
      setRecipientInternal(defaultRecipient);

      // Also load saved test data
      if (Object.keys(preferences.test_data).length > 0) {
        setTestDataInternal(preferences.test_data);
      }
    }
  }, [channel, preferences, isLoadingPreferences]);

  // Extract variables from template(s)
  const variables = useMemo(() => {
    return extractAllVariables(body, subject);
  }, [body, subject]);

  // Render preview content with current test data
  const renderedContent = useMemo(() => {
    const mergedTestData = getTestDataWithDefaults(testData);

    const bodyResult = renderMessage({
      template: body,
      testData: mergedTestData,
      useDefaults: true,
    });

    let subjectRendered: string | undefined;
    if (channel === "email" && subject) {
      const subjectResult = renderMessage({
        template: subject,
        testData: mergedTestData,
        useDefaults: true,
      });
      subjectRendered = subjectResult.rendered;
    }

    return {
      body: bodyResult.rendered,
      subject: subjectRendered,
    };
  }, [body, subject, testData, channel]);

  // Validation
  const { isValid, validationError } = useMemo(() => {
    if (!recipient.trim()) {
      return {
        isValid: false,
        validationError: `Enter a preview ${channel === "sms" ? "phone number" : "email address"}`,
      };
    }

    if (channel === "sms" && !isValidPhoneNumber(recipient)) {
      return {
        isValid: false,
        validationError: "Enter a valid phone number",
      };
    }

    if (channel === "email" && !isValidEmail(recipient)) {
      return {
        isValid: false,
        validationError: "Enter a valid email address",
      };
    }

    if (!body.trim()) {
      return {
        isValid: false,
        validationError: "Message body is required",
      };
    }

    if (channel === "email" && !subject?.trim()) {
      return {
        isValid: false,
        validationError: "Email subject is required",
      };
    }

    return { isValid: true, validationError: null };
  }, [recipient, body, subject, channel]);

  // Set recipient (wrapper to handle default saving)
  const setRecipient = useCallback((value: string) => {
    setRecipientInternal(value);
  }, []);

  // Update test data
  const setTestData = useCallback((data: Record<string, string>) => {
    setTestDataInternal(data);
  }, []);

  const updateTestValue = useCallback((key: string, value: string) => {
    setTestDataInternal((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const resetTestData = useCallback(() => {
    setTestDataInternal({});
  }, []);

  // Clear last result
  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

  // Send preview
  const sendPreview = useCallback(async () => {
    if (!isValid) return;

    setIsSending(true);
    setLastResult(null);

    try {
      const response = await fetch("/api/messages/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: channel,
          recipient,
          subject: channel === "email" ? subject : undefined,
          body,
          test_data: testData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setLastResult({
          success: true,
          sentAt: new Date(),
          messageId: data.message_id,
        });

        // Save as default if checked
        if (saveAsDefault) {
          if (channel === "sms") {
            await updateSmsPhone(recipient);
          } else {
            await updateEmailAddress(recipient);
          }
        }
      } else {
        setLastResult({
          success: false,
          error: data.error || "Failed to send preview",
        });
      }
    } catch (error) {
      setLastResult({
        success: false,
        error: error instanceof Error ? error.message : "Failed to send preview",
      });
    } finally {
      setIsSending(false);
    }
  }, [
    isValid,
    channel,
    recipient,
    subject,
    body,
    testData,
    saveAsDefault,
    updateSmsPhone,
    updateEmailAddress,
  ]);

  return {
    // Recipient state
    recipient,
    setRecipient,

    // Save as default option
    saveAsDefault,
    setSaveAsDefault,

    // Test data state
    testData,
    setTestData,
    updateTestValue,
    resetTestData,

    // Detected variables
    variables,

    // Rendered preview content
    renderedContent,

    // Preview action
    sendPreview,
    isSending,
    lastResult,
    clearResult,

    // Validation
    isValid,
    validationError,

    // Loading state
    isLoadingPreferences,
  };
}

// =============================================================================
// Helper Exports
// =============================================================================

export { DEFAULT_TEST_DATA };
