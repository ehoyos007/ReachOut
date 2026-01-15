import { NextRequest, NextResponse } from "next/server";
import {
  getDueScheduledMessages,
  updateMessage,
  getContact,
  getSetting,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";
import { sendSms } from "@/lib/twilio";
import { sendEmail } from "@/lib/sendgrid";
import type { Message, TwilioSettings, SendGridSettings } from "@/types/message";

const MAX_MESSAGES_PER_RUN = 50;
const CRON_SECRET = process.env.CRON_SECRET;

function isAuthorized(request: NextRequest): boolean {
  // Allow Vercel cron
  if (request.headers.get("x-vercel-cron") === "1") return true;

  // Allow bearer token
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    const providedSecret = authHeader?.replace("Bearer ", "");
    return providedSecret === CRON_SECRET;
  }

  // Allow in development
  return process.env.NODE_ENV === "development";
}

async function processScheduledSms(
  message: Message,
  contactPhone: string
): Promise<{ success: boolean; error?: string; sid?: string }> {
  // Fetch Twilio settings
  const [accountSid, authToken, phoneNumber] = await Promise.all([
    getSetting("twilio_account_sid"),
    getSetting("twilio_auth_token"),
    getSetting("twilio_phone_number"),
  ]);

  if (!accountSid?.value || !authToken?.value || !phoneNumber?.value) {
    return { success: false, error: "Twilio is not configured" };
  }

  const twilioSettings: TwilioSettings = {
    account_sid: accountSid.value,
    auth_token: authToken.value,
    phone_number: phoneNumber.value,
  };

  // Use from_identity phone if available, otherwise use settings phone
  const fromPhone = message.from_identity?.address || phoneNumber.value;

  return sendSms(twilioSettings, {
    to: contactPhone,
    body: message.body,
    from: fromPhone,
  });
}

async function processScheduledEmail(
  message: Message,
  contactEmail: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  // Fetch SendGrid settings
  const [apiKey, fromEmail, fromName] = await Promise.all([
    getSetting("sendgrid_api_key"),
    getSetting("sendgrid_from_email"),
    getSetting("sendgrid_from_name"),
  ]);

  if (!apiKey?.value || !fromEmail?.value) {
    return { success: false, error: "SendGrid is not configured" };
  }

  const sendGridSettings: SendGridSettings = {
    api_key: apiKey.value,
    from_email: message.from_identity?.address || fromEmail.value,
    from_name: fromName?.value || "ReachOut",
  };

  return sendEmail(sendGridSettings, {
    to: contactEmail,
    subject: message.subject || "Message from ReachOut",
    body: message.body,
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get messages that are due for sending
    const dueMessages = await getDueScheduledMessages(MAX_MESSAGES_PER_RUN);

    if (dueMessages.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No scheduled messages due",
        processed: 0,
        duration_ms: Date.now() - startTime,
      });
    }

    let successCount = 0;
    let failedCount = 0;

    for (const message of dueMessages) {
      try {
        // Update status to queued
        await updateMessage({ id: message.id, status: "queued" });

        // Get contact
        const contact = await getContact(message.contact_id);
        if (!contact) {
          await updateMessage({
            id: message.id,
            status: "failed",
            provider_error: "Contact not found",
            failed_at: new Date().toISOString(),
          });
          failedCount++;
          continue;
        }

        // Check do_not_contact
        if (contact.do_not_contact) {
          await updateMessage({
            id: message.id,
            status: "failed",
            provider_error: "Contact is marked as Do Not Contact",
            failed_at: new Date().toISOString(),
          });
          failedCount++;
          continue;
        }

        // Update status to sending
        await updateMessage({ id: message.id, status: "sending" });

        // Send via appropriate channel
        if (message.channel === "sms") {
          if (!contact.phone) {
            await updateMessage({
              id: message.id,
              status: "failed",
              provider_error: "Contact does not have a phone number",
              failed_at: new Date().toISOString(),
            });
            failedCount++;
            continue;
          }

          const result = await processScheduledSms(message, contact.phone);

          if (result.success) {
            await updateMessage({
              id: message.id,
              status: "sent",
              provider_id: result.sid,
              sent_at: new Date().toISOString(),
            });
            successCount++;
          } else {
            await updateMessage({
              id: message.id,
              status: "failed",
              provider_error: result.error,
              failed_at: new Date().toISOString(),
            });
            failedCount++;
          }
        } else if (message.channel === "email") {
          if (!contact.email) {
            await updateMessage({
              id: message.id,
              status: "failed",
              provider_error: "Contact does not have an email address",
              failed_at: new Date().toISOString(),
            });
            failedCount++;
            continue;
          }

          const result = await processScheduledEmail(message, contact.email);

          if (result.success) {
            await updateMessage({
              id: message.id,
              status: "sent",
              provider_id: result.messageId,
              sent_at: new Date().toISOString(),
            });
            successCount++;
          } else {
            await updateMessage({
              id: message.id,
              status: "failed",
              provider_error: result.error,
              failed_at: new Date().toISOString(),
            });
            failedCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing scheduled message ${message.id}:`, error);
        await updateMessage({
          id: message.id,
          status: "failed",
          provider_error: error instanceof Error ? error.message : "Unknown error",
          failed_at: new Date().toISOString(),
        });
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${dueMessages.length} scheduled messages`,
      processed: dueMessages.length,
      success_count: successCount,
      failed_count: failedCount,
      duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    console.error("Error in scheduled messages cron:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Also support GET for easier testing/triggering
export async function GET(request: NextRequest) {
  return POST(request);
}
