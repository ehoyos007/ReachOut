"use client";

import { useState, useCallback } from "react";
import type { SendResult, BatchSendResult } from "@/types/sendgrid";

interface SendEmailParams {
  templateId: string;
  contactId: string;
  dynamicData: Record<string, unknown>;
  subject?: string;
}

interface BatchSendEmailParams {
  templateId: string;
  recipients: Array<{
    contactId: string;
    dynamicData: Record<string, unknown>;
  }>;
  subject?: string;
}

interface UseSendTemplateEmailState {
  isSending: boolean;
  error: string | null;
  lastResult: SendResult | BatchSendResult | null;
}

export function useSendTemplateEmail() {
  const [state, setState] = useState<UseSendTemplateEmailState>({
    isSending: false,
    error: null,
    lastResult: null,
  });

  // Send to a single contact
  const sendToContact = useCallback(
    async (params: SendEmailParams): Promise<SendResult> => {
      try {
        setState({ isSending: true, error: null, lastResult: null });

        const response = await fetch("/api/sendgrid/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: params.templateId,
            contactId: params.contactId,
            dynamicData: params.dynamicData,
            subject: params.subject,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const error = data.error || "Failed to send email";
          setState({ isSending: false, error, lastResult: { success: false, error: { type: 'server', message: error, retryable: false } } });
          return { success: false, error: { type: 'server', message: error, retryable: false } };
        }

        const result: SendResult = {
          success: true,
          messageId: data.messageId,
        };

        setState({ isSending: false, error: null, lastResult: result });
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("Failed to send template email:", err);
        const result: SendResult = {
          success: false,
          error: { type: 'server', message: errorMessage, retryable: true },
        };
        setState({ isSending: false, error: errorMessage, lastResult: result });
        return result;
      }
    },
    []
  );

  // Send to multiple contacts (batch)
  const sendBatch = useCallback(
    async (params: BatchSendEmailParams): Promise<BatchSendResult> => {
      try {
        setState({ isSending: true, error: null, lastResult: null });

        const response = await fetch("/api/sendgrid/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: params.templateId,
            recipients: params.recipients,
            subject: params.subject,
            batch: true,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const error = data.error || "Failed to send batch emails";
          const result: BatchSendResult = {
            results: [],
            totalSent: 0,
            totalFailed: params.recipients.length,
          };
          setState({ isSending: false, error, lastResult: result });
          return result;
        }

        const result: BatchSendResult = {
          results: data.results || [],
          totalSent: data.totalSent || 0,
          totalFailed: data.totalFailed || 0,
        };

        setState({ isSending: false, error: null, lastResult: result });
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("Failed to send batch template emails:", err);
        const result: BatchSendResult = {
          results: [],
          totalSent: 0,
          totalFailed: params.recipients.length,
        };
        setState({ isSending: false, error: errorMessage, lastResult: result });
        return result;
      }
    },
    []
  );

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    isSending: state.isSending,
    error: state.error,
    lastResult: state.lastResult,
    sendToContact,
    sendBatch,
    clearError,
  };
}

export type UseSendTemplateEmailReturn = ReturnType<typeof useSendTemplateEmail>;
