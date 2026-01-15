import sgMail from "@sendgrid/mail";
import type { SendGridSendResult, SendGridSettings } from "@/types/message";
import type { TestResult } from "@/types/settings";
import type {
  SendGridTemplate,
  SendGridTemplateDetails,
  SendGridTemplatesResponse,
  SendGridMailPayload,
  SendTemplateParams,
  BatchSendParams,
  SendResult,
  BatchSendResult,
  SendGridError,
  SendGridErrorType,
  EmailAddress,
} from "@/types/sendgrid";
import { SENDGRID_BASE_URL, SENDGRID_BATCH_SIZE } from "@/types/sendgrid";

// =============================================================================
// SendGrid Client Configuration
// =============================================================================

/**
 * Configure SendGrid client with API key
 */
export function configureSendGrid(settings: SendGridSettings): void {
  if (!settings.api_key) {
    throw new Error("SendGrid API key is not configured");
  }
  sgMail.setApiKey(settings.api_key);
}

// =============================================================================
// Email Sending
// =============================================================================

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  html?: string;
  from?: {
    email: string;
    name?: string;
  };
  replyTo?: string;
  trackingSettings?: {
    clickTracking?: boolean;
    openTracking?: boolean;
  };
}

/**
 * Send an email via SendGrid
 */
export async function sendEmail(
  settings: SendGridSettings,
  params: SendEmailParams
): Promise<SendGridSendResult> {
  try {
    configureSendGrid(settings);

    const fromEmail = params.from?.email || settings.from_email;
    const fromName = params.from?.name || settings.from_name;

    if (!fromEmail) {
      return {
        success: false,
        error: "No sender email address configured",
      };
    }

    const msg = {
      to: params.to,
      from: fromName ? { email: fromEmail, name: fromName } : fromEmail,
      subject: params.subject,
      text: params.body,
      html: params.html || params.body.replace(/\n/g, "<br>"),
      replyTo: params.replyTo,
      trackingSettings: {
        clickTracking: {
          enable: params.trackingSettings?.clickTracking ?? true,
        },
        openTracking: {
          enable: params.trackingSettings?.openTracking ?? true,
        },
      },
    };

    const [response] = await sgMail.send(msg);

    // Extract message ID from headers
    const messageId = response.headers["x-message-id"] as string;

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Handle SendGrid specific errors
    if (
      error &&
      typeof error === "object" &&
      "response" in error &&
      error.response &&
      typeof error.response === "object" &&
      "body" in error.response
    ) {
      const body = error.response.body as { errors?: Array<{ message: string }> };
      if (body.errors && body.errors.length > 0) {
        return {
          success: false,
          error: body.errors.map((e) => e.message).join(", "),
        };
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send multiple emails in a batch
 */
export async function sendBatchEmails(
  settings: SendGridSettings,
  emails: SendEmailParams[]
): Promise<SendGridSendResult[]> {
  const results: SendGridSendResult[] = [];

  for (const email of emails) {
    const result = await sendEmail(settings, email);
    results.push(result);

    // Add small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

// =============================================================================
// Testing Connection
// =============================================================================

/**
 * Test SendGrid connection by verifying API key
 */
export async function testSendGridConnection(
  settings: SendGridSettings
): Promise<TestResult> {
  try {
    if (!settings.api_key) {
      return {
        success: false,
        message: "API Key is required",
      };
    }

    if (!settings.from_email) {
      return {
        success: false,
        message: "From Email is required",
      };
    }

    // Validate API key format
    if (!settings.api_key.startsWith("SG.")) {
      return {
        success: false,
        message: "Invalid API key format",
        details: "SendGrid API keys should start with 'SG.'",
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(settings.from_email)) {
      return {
        success: false,
        message: "Invalid email format",
        details: "Please provide a valid email address",
      };
    }

    // Configure client and try to send a test request
    configureSendGrid(settings);

    // We can't easily test without sending an email, so we'll just validate the config
    // A more thorough test would be to use the SendGrid API to verify sender identity

    return {
      success: true,
      message: "SendGrid configuration looks valid",
      details: `API key configured. From email: ${settings.from_email}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return {
      success: false,
      message: "Connection test failed",
      details: errorMessage,
    };
  }
}

// =============================================================================
// Webhook Processing
// =============================================================================

/**
 * Parse SendGrid inbound email webhook payload
 */
export interface ParsedInboundEmail {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  envelope?: {
    from: string;
    to: string[];
  };
}

export function parseInboundEmail(
  payload: Record<string, string>
): ParsedInboundEmail {
  let envelope: ParsedInboundEmail["envelope"];

  try {
    if (payload.envelope) {
      envelope = JSON.parse(payload.envelope);
    }
  } catch {
    // Ignore envelope parsing errors
  }

  return {
    from: payload.from || "",
    to: payload.to || "",
    subject: payload.subject || "",
    text: payload.text || "",
    html: payload.html,
    envelope,
  };
}

/**
 * Extract email address from "Name <email>" format
 */
export function extractEmailAddress(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/);
  if (match) {
    return match[1];
  }
  return emailString.trim();
}

/**
 * Map SendGrid event type to our message status
 */
export function mapSendGridEventStatus(
  event: string
): "queued" | "sending" | "sent" | "delivered" | "failed" | "bounced" {
  const statusMap: Record<
    string,
    "queued" | "sending" | "sent" | "delivered" | "failed" | "bounced"
  > = {
    processed: "sending",
    delivered: "delivered",
    dropped: "failed",
    deferred: "sending",
    bounce: "bounced",
    blocked: "failed",
  };
  return statusMap[event] || "sent";
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Sanitize HTML for email display
 */
export function sanitizeHtmlForEmail(html: string): string {
  // Remove script tags
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  // Remove onclick and other event handlers
  sanitized = sanitized.replace(/\s*on\w+="[^"]*"/gi, "");
  return sanitized;
}

/**
 * Convert plain text to simple HTML
 */
export function textToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>")
    .replace(/\s{2}/g, "&nbsp;&nbsp;");
}

/**
 * Strip HTML tags to get plain text
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/**
 * Format SendGrid error for display
 */
export function formatSendGridError(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "body" in error.response
  ) {
    const body = error.response.body as { errors?: Array<{ message: string; field?: string }> };
    if (body.errors && body.errors.length > 0) {
      return body.errors
        .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
        .join("; ");
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown SendGrid error";
}

// =============================================================================
// Dynamic Template Functions
// =============================================================================

/**
 * Get SendGrid API headers for direct API calls
 */
function getSendGridHeaders(apiKey: string): HeadersInit {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

/**
 * List all dynamic templates from SendGrid
 */
export async function listDynamicTemplates(
  apiKey: string
): Promise<{ templates: SendGridTemplate[]; error?: string }> {
  try {
    const url = `${SENDGRID_BASE_URL}/templates?generations=dynamic&page_size=200`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getSendGridHeaders(apiKey),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const parsedError = parseSendGridError(response.status, errorData);
      return { templates: [], error: parsedError.message };
    }

    const data: SendGridTemplatesResponse = await response.json();

    // SendGrid returns templates in either 'result' or 'templates' field
    const templates = data.result || data.templates || [];

    // Filter to only show templates with an active version
    const activeTemplates = templates.filter(
      (t) => t.generation === 'dynamic' && t.versions?.some((v) => v.active === 1)
    );

    return { templates: activeTemplates };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { templates: [], error: errorMessage };
  }
}

/**
 * Get full template details including HTML content
 */
export async function getTemplateDetails(
  apiKey: string,
  templateId: string
): Promise<{ template: SendGridTemplateDetails | null; error?: string }> {
  try {
    const url = `${SENDGRID_BASE_URL}/templates/${templateId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getSendGridHeaders(apiKey),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const parsedError = parseSendGridError(response.status, errorData);
      return { template: null, error: parsedError.message };
    }

    const template: SendGridTemplateDetails = await response.json();
    return { template };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { template: null, error: errorMessage };
  }
}

/**
 * Send a single email using a SendGrid dynamic template
 */
export async function sendTemplateEmail(
  settings: SendGridSettings,
  params: SendTemplateParams
): Promise<SendResult> {
  try {
    const fromEmail: EmailAddress = params.from || {
      email: settings.from_email,
      name: settings.from_name,
    };

    const payload: SendGridMailPayload = {
      personalizations: [{
        to: [{ email: params.to.email, name: params.to.name }],
        dynamic_template_data: params.dynamicData,
      }],
      from: fromEmail,
      reply_to: params.replyTo ? { email: params.replyTo } : undefined,
      template_id: params.templateId,
    };

    const response = await fetch(`${SENDGRID_BASE_URL}/mail/send`, {
      method: 'POST',
      headers: getSendGridHeaders(settings.api_key),
      body: JSON.stringify(payload),
    });

    if (response.status === 202) {
      const messageId = response.headers.get('X-Message-Id') || undefined;
      return { success: true, messageId };
    }

    const errorData = await response.json().catch(() => ({}));
    const error = parseSendGridError(response.status, errorData);
    return { success: false, error };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'server',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    };
  }
}

/**
 * Send batch emails using a SendGrid dynamic template
 */
export async function sendTemplateBatch(
  settings: SendGridSettings,
  params: BatchSendParams
): Promise<BatchSendResult> {
  const results: SendResult[] = [];
  let totalSent = 0;
  let totalFailed = 0;

  // Split recipients into batches (SendGrid allows max 1000 per request)
  const batches = chunk(params.recipients, SENDGRID_BATCH_SIZE);

  const fromEmail: EmailAddress = params.from || {
    email: settings.from_email,
    name: settings.from_name,
  };

  for (const batch of batches) {
    try {
      const payload: SendGridMailPayload = {
        personalizations: batch.map((recipient) => ({
          to: [{ email: recipient.contact.email, name: recipient.contact.fullName }],
          dynamic_template_data: recipient.dynamicData,
        })),
        from: fromEmail,
        reply_to: params.replyTo ? { email: params.replyTo } : undefined,
        template_id: params.templateId,
      };

      const response = await fetch(`${SENDGRID_BASE_URL}/mail/send`, {
        method: 'POST',
        headers: getSendGridHeaders(settings.api_key),
        body: JSON.stringify(payload),
      });

      if (response.status === 202) {
        const messageId = response.headers.get('X-Message-Id') || undefined;
        results.push({ success: true, messageId });
        totalSent += batch.length;
      } else {
        const errorData = await response.json().catch(() => ({}));
        const error = parseSendGridError(response.status, errorData);
        results.push({ success: false, error });
        totalFailed += batch.length;
      }

      // Rate limiting: pause between batches
      if (batches.length > 1) {
        await sleep(1000);
      }
    } catch (error) {
      results.push({
        success: false,
        error: {
          type: 'server',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      });
      totalFailed += batch.length;
    }
  }

  return { results, totalSent, totalFailed };
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Parse SendGrid API error response into structured error
 */
export function parseSendGridError(status: number, body: unknown): SendGridError {
  const errorBody = body as { errors?: Array<{ message: string; field?: string }> } | undefined;

  const typeMap: Record<number, SendGridErrorType> = {
    400: 'validation',
    401: 'auth',
    403: 'permission',
    404: 'not_found',
    429: 'rate_limit',
  };

  const messageMap: Record<number, string> = {
    400: 'Invalid request',
    401: 'Invalid API key. Check your SendGrid configuration.',
    403: 'Sender email is not verified in SendGrid.',
    404: 'Template not found.',
    429: 'Rate limit exceeded. Please wait and try again.',
  };

  const type = typeMap[status] || 'server';
  const defaultMessage = messageMap[status] || 'SendGrid server error. Please try again.';

  return {
    type,
    message: errorBody?.errors?.[0]?.message || defaultMessage,
    details: errorBody?.errors?.map((e) => ({
      field: e.field || 'unknown',
      message: e.message,
    })),
    retryable: status >= 500 || status === 429,
  };
}

/**
 * Execute send function with retry logic
 */
export async function sendWithRetry(
  sendFn: () => Promise<SendResult>,
  maxRetries = 3
): Promise<SendResult> {
  let lastError: SendGridError | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendFn();

      if (result.success) {
        return result;
      }

      // If error is not retryable or this is the last attempt, return immediately
      if (!result.error?.retryable || attempt === maxRetries) {
        return result;
      }

      lastError = result.error;
    } catch (error) {
      lastError = {
        type: 'server',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      };

      if (attempt === maxRetries) {
        return { success: false, error: lastError };
      }
    }

    // Exponential backoff: 1s, 2s, 4s
    await sleep(1000 * Math.pow(2, attempt - 1));
  }

  return { success: false, error: lastError };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Split array into chunks
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
