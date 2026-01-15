import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/supabase";
import { sendSms } from "@/lib/twilio";
import { sendEmail } from "@/lib/sendgrid";
import {
  renderPreviewMessage,
  isValidPhoneNumber,
  isValidEmail,
} from "@/lib/message-renderer";
import type { TwilioSettings, SendGridSettings } from "@/types/message";

export const dynamic = "force-dynamic";

// =============================================================================
// Types
// =============================================================================

interface PreviewRequest {
  /** Message type */
  type: "sms" | "email";
  /** Recipient phone (SMS) or email (Email) */
  recipient: string;
  /** Email subject (required for email) */
  subject?: string;
  /** Message body template */
  body: string;
  /** Custom test data for variable substitution */
  test_data?: Record<string, string>;
}

interface PreviewResponse {
  success: boolean;
  /** Provider message ID (if successful) */
  message_id?: string;
  /** The rendered content that was sent */
  rendered_content: {
    subject?: string;
    body: string;
  };
  /** Variables that were resolved with their values */
  resolved_values?: Record<string, string>;
  /** Variables that couldn't be resolved */
  unresolved_variables?: string[];
  /** Error message (if failed) */
  error?: string;
}

// =============================================================================
// API Handler
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<PreviewResponse>> {
  try {
    const input: PreviewRequest = await request.json();

    // ==========================================================================
    // Validate Input
    // ==========================================================================

    if (!input.type || !["sms", "email"].includes(input.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid message type. Must be 'sms' or 'email'.",
          rendered_content: { body: input.body || "" },
        },
        { status: 400 }
      );
    }

    if (!input.recipient) {
      return NextResponse.json(
        {
          success: false,
          error: `Please enter a preview ${input.type === "sms" ? "phone number" : "email address"}.`,
          rendered_content: { body: input.body || "" },
        },
        { status: 400 }
      );
    }

    if (!input.body) {
      return NextResponse.json(
        {
          success: false,
          error: "Message body is required.",
          rendered_content: { body: "" },
        },
        { status: 400 }
      );
    }

    // Validate recipient format
    if (input.type === "sms" && !isValidPhoneNumber(input.recipient)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid phone number.",
          rendered_content: { body: input.body },
        },
        { status: 400 }
      );
    }

    if (input.type === "email" && !isValidEmail(input.recipient)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid email address.",
          rendered_content: { body: input.body },
        },
        { status: 400 }
      );
    }

    // Email requires subject
    if (input.type === "email" && !input.subject) {
      return NextResponse.json(
        {
          success: false,
          error: "Email subject is required.",
          rendered_content: { body: input.body },
        },
        { status: 400 }
      );
    }

    // ==========================================================================
    // Render Preview Message
    // ==========================================================================

    const rendered = renderPreviewMessage(
      input.type,
      input.body,
      input.subject,
      input.test_data
    );

    // ==========================================================================
    // Send Preview via Provider
    // ==========================================================================

    if (input.type === "sms") {
      // Fetch Twilio settings
      const [accountSid, authToken, phoneNumber] = await Promise.all([
        getSetting("twilio_account_sid"),
        getSetting("twilio_auth_token"),
        getSetting("twilio_phone_number"),
      ]);

      if (!accountSid?.value || !authToken?.value || !phoneNumber?.value) {
        return NextResponse.json(
          {
            success: false,
            error: "Twilio is not configured. Please configure it in Settings.",
            rendered_content: {
              body: rendered.body,
            },
            resolved_values: rendered.renderedValues,
            unresolved_variables: rendered.unresolvedVariables,
          },
          { status: 400 }
        );
      }

      const twilioSettings: TwilioSettings = {
        account_sid: accountSid.value,
        auth_token: authToken.value,
        phone_number: phoneNumber.value,
      };

      const result = await sendSms(twilioSettings, {
        to: input.recipient,
        body: rendered.body,
      });

      if (result.success) {
        return NextResponse.json({
          success: true,
          message_id: result.sid,
          rendered_content: {
            body: rendered.body,
          },
          resolved_values: rendered.renderedValues,
          unresolved_variables: rendered.unresolvedVariables,
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: result.error || "Failed to send SMS preview.",
            rendered_content: {
              body: rendered.body,
            },
            resolved_values: rendered.renderedValues,
            unresolved_variables: rendered.unresolvedVariables,
          },
          { status: 500 }
        );
      }
    } else {
      // Email
      const [apiKey, fromEmail, fromName] = await Promise.all([
        getSetting("sendgrid_api_key"),
        getSetting("sendgrid_from_email"),
        getSetting("sendgrid_from_name"),
      ]);

      if (!apiKey?.value || !fromEmail?.value) {
        return NextResponse.json(
          {
            success: false,
            error: "SendGrid is not configured. Please configure it in Settings.",
            rendered_content: {
              subject: rendered.subject,
              body: rendered.body,
            },
            resolved_values: rendered.renderedValues,
            unresolved_variables: rendered.unresolvedVariables,
          },
          { status: 400 }
        );
      }

      const sendGridSettings: SendGridSettings = {
        api_key: apiKey.value,
        from_email: fromEmail.value,
        from_name: fromName?.value || "ReachOut",
      };

      const result = await sendEmail(sendGridSettings, {
        to: input.recipient,
        subject: rendered.subject || "Preview Message",
        body: rendered.body,
        // Disable tracking for preview messages
        trackingSettings: {
          clickTracking: false,
          openTracking: false,
        },
      });

      if (result.success) {
        return NextResponse.json({
          success: true,
          message_id: result.messageId,
          rendered_content: {
            subject: rendered.subject,
            body: rendered.body,
          },
          resolved_values: rendered.renderedValues,
          unresolved_variables: rendered.unresolvedVariables,
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: result.error || "Failed to send email preview.",
            rendered_content: {
              subject: rendered.subject,
              body: rendered.body,
            },
            resolved_values: rendered.renderedValues,
            unresolved_variables: rendered.unresolvedVariables,
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error("Error sending preview message:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: `Failed to send preview: ${errorMessage}`,
        rendered_content: { body: "" },
      },
      { status: 500 }
    );
  }
}
