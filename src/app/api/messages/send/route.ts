import { NextRequest, NextResponse } from "next/server";
import {
  createMessage,
  updateMessage,
  getContact,
  getSetting,
  getSenderIdentity,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";
import { sendSms } from "@/lib/twilio";
import { sendEmail } from "@/lib/sendgrid";
import type {
  SendMessageInput,
  CreateMessageInput,
  TwilioSettings,
  SendGridSettings,
  MessageFromIdentity,
} from "@/types/message";
import type { SenderEmail, SenderPhone } from "@/types/sender";
import {
  replacePlaceholders,
  contactToPlaceholderValues,
} from "@/types/template";

export async function POST(request: NextRequest) {
  try {
    const input: SendMessageInput = await request.json();

    // Validate input
    if (!input.contact_id || !input.channel || !input.body) {
      return NextResponse.json(
        { error: "Missing required fields: contact_id, channel, body" },
        { status: 400 }
      );
    }

    // Fetch contact details
    const contact = await getContact(input.contact_id);
    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Check for do_not_contact flag
    if (contact.do_not_contact) {
      return NextResponse.json(
        { error: "Contact is marked as Do Not Contact" },
        { status: 400 }
      );
    }

    // Validate channel requirements
    if (input.channel === "sms" && !contact.phone) {
      return NextResponse.json(
        { error: "Contact does not have a phone number" },
        { status: 400 }
      );
    }

    if (input.channel === "email" && !contact.email) {
      return NextResponse.json(
        { error: "Contact does not have an email address" },
        { status: 400 }
      );
    }

    // Resolve placeholders in message body and subject
    const placeholderValues = contactToPlaceholderValues(contact);
    const resolvedBody = replacePlaceholders(input.body, placeholderValues);
    const resolvedSubject = input.subject
      ? replacePlaceholders(input.subject, placeholderValues)
      : null;

    // Determine sender identity
    let fromIdentity: MessageFromIdentity | null = null;
    if (input.from_identity_id) {
      const identity = await getSenderIdentity(input.channel, input.from_identity_id);
      if (identity) {
        fromIdentity = {
          type: input.channel,
          identity_id: identity.id,
          address: input.channel === "sms"
            ? (identity as SenderPhone).phone
            : (identity as SenderEmail).email,
        };
      }
    }

    // Check if this is a scheduled message (scheduled_at is in the future)
    const isScheduled =
      input.scheduled_at && new Date(input.scheduled_at) > new Date();

    // Create message record with resolved placeholders
    const messageInput: CreateMessageInput = {
      contact_id: input.contact_id,
      channel: input.channel,
      direction: "outbound",
      subject: resolvedSubject,
      body: resolvedBody,
      status: isScheduled ? "scheduled" : "queued",
      source: input.source || "manual", // Default to manual if not specified
      template_id: input.template_id || null,
      scheduled_at: input.scheduled_at || null,
      from_identity: fromIdentity,
    };

    const message = await createMessage(messageInput);

    // If scheduled for future, return without sending
    if (isScheduled) {
      return NextResponse.json({
        success: true,
        scheduled: true,
        message,
      });
    }

    // Send via appropriate provider
    if (input.channel === "sms") {
      // Fetch Twilio settings
      const [accountSid, authToken, phoneNumber] = await Promise.all([
        getSetting("twilio_account_sid"),
        getSetting("twilio_auth_token"),
        getSetting("twilio_phone_number"),
      ]);

      if (!accountSid?.value || !authToken?.value || !phoneNumber?.value) {
        await updateMessage({
          id: message.id,
          status: "failed",
          provider_error: "Twilio is not configured",
          failed_at: new Date().toISOString(),
        });

        return NextResponse.json(
          { error: "Twilio is not configured", message },
          { status: 400 }
        );
      }

      const twilioSettings: TwilioSettings = {
        account_sid: accountSid.value,
        auth_token: authToken.value,
        phone_number: phoneNumber.value,
      };

      // Update status to sending
      await updateMessage({
        id: message.id,
        status: "sending",
      });

      // Send SMS with resolved placeholders
      const result = await sendSms(twilioSettings, {
        to: contact.phone!,
        body: resolvedBody,
      });

      if (result.success) {
        const updatedMessage = await updateMessage({
          id: message.id,
          status: "sent",
          provider_id: result.sid,
          sent_at: new Date().toISOString(),
        });

        return NextResponse.json({
          success: true,
          message: updatedMessage,
        });
      } else {
        const updatedMessage = await updateMessage({
          id: message.id,
          status: "failed",
          provider_error: result.error,
          failed_at: new Date().toISOString(),
        });

        return NextResponse.json({
          success: false,
          error: result.error,
          message: updatedMessage,
        });
      }
    } else if (input.channel === "email") {
      // Fetch SendGrid settings
      const [apiKey, fromEmail, fromName] = await Promise.all([
        getSetting("sendgrid_api_key"),
        getSetting("sendgrid_from_email"),
        getSetting("sendgrid_from_name"),
      ]);

      if (!apiKey?.value || !fromEmail?.value) {
        await updateMessage({
          id: message.id,
          status: "failed",
          provider_error: "SendGrid is not configured",
          failed_at: new Date().toISOString(),
        });

        return NextResponse.json(
          { error: "SendGrid is not configured", message },
          { status: 400 }
        );
      }

      const sendGridSettings: SendGridSettings = {
        api_key: apiKey.value,
        from_email: fromEmail.value,
        from_name: fromName?.value || "ReachOut",
      };

      // Update status to sending
      await updateMessage({
        id: message.id,
        status: "sending",
      });

      // Send Email with resolved placeholders
      const result = await sendEmail(sendGridSettings, {
        to: contact.email!,
        subject: resolvedSubject || "Message from ReachOut",
        body: resolvedBody,
      });

      if (result.success) {
        const updatedMessage = await updateMessage({
          id: message.id,
          status: "sent",
          provider_id: result.messageId,
          sent_at: new Date().toISOString(),
        });

        return NextResponse.json({
          success: true,
          message: updatedMessage,
        });
      } else {
        const updatedMessage = await updateMessage({
          id: message.id,
          status: "failed",
          provider_error: result.error,
          failed_at: new Date().toISOString(),
        });

        return NextResponse.json({
          success: false,
          error: result.error,
          message: updatedMessage,
        });
      }
    }

    return NextResponse.json(
      { error: "Invalid channel" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error sending message:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: `Failed to send message: ${errorMessage}` },
      { status: 500 }
    );
  }
}
