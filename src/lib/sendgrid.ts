import sgMail from "@sendgrid/mail";
import type { SendGridSendResult, SendGridSettings } from "@/types/message";
import type { TestResult } from "@/types/settings";

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
