import twilio from "twilio";
import type { TwilioSendResult, TwilioSettings } from "@/types/message";
import type { TestResult } from "@/types/settings";

// =============================================================================
// Twilio Client Factory
// =============================================================================

/**
 * Create a Twilio client with the provided credentials
 */
export function createTwilioClient(settings: TwilioSettings) {
  if (!settings.account_sid || !settings.auth_token) {
    throw new Error("Twilio credentials are not configured");
  }
  return twilio(settings.account_sid, settings.auth_token);
}

// =============================================================================
// SMS Sending
// =============================================================================

export interface SendSmsParams {
  to: string;
  body: string;
  from?: string;
  statusCallback?: string;
}

/**
 * Send an SMS message via Twilio
 */
export async function sendSms(
  settings: TwilioSettings,
  params: SendSmsParams
): Promise<TwilioSendResult> {
  try {
    const client = createTwilioClient(settings);

    // Normalize phone number to E.164 format
    const toNumber = normalizePhoneForTwilio(params.to);
    const fromNumber = params.from || settings.phone_number;

    if (!fromNumber) {
      return {
        success: false,
        error: "No sender phone number configured",
      };
    }

    const message = await client.messages.create({
      to: toNumber,
      from: fromNumber,
      body: params.body,
      statusCallback: params.statusCallback,
    });

    return {
      success: true,
      sid: message.sid,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorCode =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : undefined;

    return {
      success: false,
      error: errorMessage,
      errorCode,
    };
  }
}

// =============================================================================
// Testing Connection
// =============================================================================

/**
 * Test Twilio connection by verifying credentials and phone number
 */
export async function testTwilioConnection(
  settings: TwilioSettings
): Promise<TestResult> {
  try {
    if (!settings.account_sid) {
      return {
        success: false,
        message: "Account SID is required",
      };
    }

    if (!settings.auth_token) {
      return {
        success: false,
        message: "Auth Token is required",
      };
    }

    if (!settings.phone_number) {
      return {
        success: false,
        message: "Phone Number is required",
      };
    }

    const client = createTwilioClient(settings);

    // Verify account credentials by fetching account info
    const account = await client.api.accounts(settings.account_sid).fetch();

    // Verify phone number ownership
    const phoneNumber = normalizePhoneForTwilio(settings.phone_number);
    const incomingNumbers = await client.incomingPhoneNumbers.list({
      phoneNumber: phoneNumber,
      limit: 1,
    });

    if (incomingNumbers.length === 0) {
      return {
        success: false,
        message: "Phone number not found in your Twilio account",
        details: `The number ${settings.phone_number} is not associated with this Twilio account.`,
      };
    }

    return {
      success: true,
      message: "Twilio connection successful",
      details: `Connected to account "${account.friendlyName}". Phone number verified.`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Handle specific Twilio errors
    if (errorMessage.includes("authenticate")) {
      return {
        success: false,
        message: "Authentication failed",
        details: "Please verify your Account SID and Auth Token are correct.",
      };
    }

    return {
      success: false,
      message: "Connection test failed",
      details: errorMessage,
    };
  }
}

// =============================================================================
// Webhook Signature Verification
// =============================================================================

/**
 * Verify Twilio webhook signature
 */
export function verifyTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  return twilio.validateRequest(authToken, signature, url, params);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize phone number to E.164 format for Twilio
 */
export function normalizePhoneForTwilio(phone: string): string {
  // Remove all non-numeric characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // Ensure US numbers start with +1
  if (cleaned.length === 10) {
    cleaned = `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
    cleaned = `+${cleaned}`;
  } else if (!cleaned.startsWith("+")) {
    cleaned = `+${cleaned}`;
  }

  return cleaned;
}

/**
 * Extract phone number from Twilio webhook payload
 */
export function extractPhoneFromWebhook(from: string): string {
  // Twilio sends numbers in E.164 format, normalize for lookup
  return normalizePhoneForTwilio(from);
}

/**
 * Map Twilio message status to our internal status
 */
export function mapTwilioMessageStatus(
  twilioStatus: string
): "queued" | "sending" | "sent" | "delivered" | "failed" {
  const statusMap: Record<string, "queued" | "sending" | "sent" | "delivered" | "failed"> = {
    queued: "queued",
    sending: "sending",
    sent: "sent",
    delivered: "delivered",
    undelivered: "failed",
    failed: "failed",
  };
  return statusMap[twilioStatus] || "failed";
}

/**
 * Format error message from Twilio error code
 */
export function formatTwilioError(errorCode: string | number): string {
  const errorMessages: Record<string, string> = {
    "21211": "Invalid 'To' phone number",
    "21408": "Permission to send SMS denied",
    "21610": "Message exceeds maximum segments",
    "21614": "Phone number not capable of SMS",
    "30003": "Unreachable destination phone number",
    "30004": "Message blocked by carrier",
    "30005": "Unknown destination phone number",
    "30006": "Landline or unreachable carrier",
    "30007": "Message filtered by carrier",
    "30008": "Unknown error from carrier",
  };

  return errorMessages[String(errorCode)] || `Twilio error: ${errorCode}`;
}
