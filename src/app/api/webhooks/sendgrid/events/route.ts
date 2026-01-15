import { NextRequest, NextResponse } from "next/server";
import { getMessageByProviderId, updateMessage } from "@/lib/supabase";
import { mapSendGridStatus, type MessageStatus } from "@/types/message";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * Verify SendGrid webhook signature
 * https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features
 */
function verifySendGridSignature(
  request: NextRequest,
  body: string
): boolean {
  const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;
  if (!verificationKey) {
    console.warn("SENDGRID_WEBHOOK_VERIFICATION_KEY not set, skipping signature verification");
    return true;
  }

  const signature = request.headers.get("x-twilio-email-event-webhook-signature");
  const timestamp = request.headers.get("x-twilio-email-event-webhook-timestamp");

  if (!signature || !timestamp) {
    return false;
  }

  const payload = timestamp + body;

  try {
    const publicKey = crypto.createPublicKey(verificationKey);
    const isValid = crypto.verify(
      "sha256",
      Buffer.from(payload),
      publicKey,
      Buffer.from(signature, "base64")
    );
    return isValid;
  } catch (error) {
    console.error("Error verifying SendGrid signature:", error);
    return false;
  }
}

interface SendGridEvent {
  email: string;
  timestamp: number;
  event: string;
  sg_message_id: string;
  reason?: string;
  status?: string;
  bounce_classification?: string;
}

/**
 * SendGrid Event Webhook
 * Receives delivery status events for outbound emails
 * https://docs.sendgrid.com/for-developers/tracking-events/event
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Verify signature in production
    if (process.env.NODE_ENV === "production") {
      const isValid = verifySendGridSignature(request, body);
      if (!isValid) {
        console.error("Invalid SendGrid signature");
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    // Parse JSON array of events
    let events: SendGridEvent[];
    try {
      events = JSON.parse(body);
    } catch {
      console.error("Failed to parse SendGrid events JSON");
      return new NextResponse("Bad Request", { status: 400 });
    }

    if (!Array.isArray(events)) {
      console.error("SendGrid events is not an array");
      return new NextResponse("Bad Request", { status: 400 });
    }

    console.log(`Received ${events.length} SendGrid events`);

    // Process each event
    for (const event of events) {
      try {
        const { sg_message_id, event: eventType, reason, bounce_classification } = event;

        if (!sg_message_id) {
          console.log("Skipping event without sg_message_id");
          continue;
        }

        // Extract the message ID (remove the filter ID suffix if present)
        // SendGrid message ID format: "messageid.filterId"
        const messageId = sg_message_id.split(".")[0];

        console.log(`Processing event: ${eventType} for message ${messageId}`);

        // Find the message by provider ID
        const message = await getMessageByProviderId(messageId);

        if (!message) {
          // Also try with the full sg_message_id
          const messageWithFullId = await getMessageByProviderId(sg_message_id);
          if (!messageWithFullId) {
            console.log(`No message found for ID: ${messageId}`);
            continue;
          }
        }

        const targetMessage = message || (await getMessageByProviderId(sg_message_id));
        if (!targetMessage) continue;

        // Map event to status
        const status = mapSendGridStatus(eventType);

        // Build update data
        const updateData: {
          id: string;
          status: MessageStatus;
          provider_error?: string;
          delivered_at?: string;
          failed_at?: string;
        } = {
          id: targetMessage.id,
          status,
        };

        // Add error info if bounced or dropped
        if (reason || bounce_classification) {
          updateData.provider_error = [bounce_classification, reason]
            .filter(Boolean)
            .join(": ");
        }

        // Add timestamps based on status
        if (status === "delivered") {
          updateData.delivered_at = new Date().toISOString();
        } else if (status === "failed" || status === "bounced") {
          updateData.failed_at = new Date().toISOString();
        }

        // Update the message
        await updateMessage(updateData);

        console.log(`Updated message ${targetMessage.id} status to ${status}`);
      } catch (eventError) {
        console.error("Error processing individual SendGrid event:", eventError);
        // Continue processing other events
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing SendGrid events webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
