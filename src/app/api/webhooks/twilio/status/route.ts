import { NextRequest, NextResponse } from "next/server";
import { getMessageByProviderId, updateMessage } from "@/lib/supabase";
import { mapTwilioStatus } from "@/types/message";
import crypto from "crypto";

/**
 * Verify Twilio webhook signature
 */
async function verifyTwilioSignature(
  request: NextRequest,
  body: string
): Promise<boolean> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.warn("TWILIO_AUTH_TOKEN not set, skipping signature verification");
    return true;
  }

  const signature = request.headers.get("x-twilio-signature");
  if (!signature) {
    return false;
  }

  const url = request.url;
  const params = new URLSearchParams(body);
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}${value}`)
    .join("");

  const data = url + sortedParams;
  const expectedSignature = crypto
    .createHmac("sha1", authToken)
    .update(data)
    .digest("base64");

  return signature === expectedSignature;
}

/**
 * Twilio Status Callback Webhook
 * Receives delivery status updates for outbound SMS
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Verify signature in production
    if (process.env.NODE_ENV === "production") {
      const isValid = await verifyTwilioSignature(request, body);
      if (!isValid) {
        console.error("Invalid Twilio signature");
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    // Parse form data
    const formData = new URLSearchParams(body);
    const messageSid = formData.get("MessageSid");
    const messageStatus = formData.get("MessageStatus");
    const errorCode = formData.get("ErrorCode");
    const errorMessage = formData.get("ErrorMessage");

    if (!messageSid || !messageStatus) {
      console.error("Missing required fields in Twilio status callback");
      return new NextResponse("Bad Request", { status: 400 });
    }

    console.log(`Twilio status update: ${messageSid} -> ${messageStatus}`);

    // Find the message by provider ID (Twilio SID)
    const message = await getMessageByProviderId(messageSid);

    if (!message) {
      console.log(`No message found for SID: ${messageSid}`);
      return new NextResponse("OK", { status: 200 });
    }

    // Map Twilio status to our status
    const status = mapTwilioStatus(messageStatus);

    // Build update data
    const updateData: {
      id: string;
      status: typeof status;
      provider_error?: string;
      delivered_at?: string;
      failed_at?: string;
    } = {
      id: message.id,
      status,
    };

    // Add error info if failed
    if (errorCode || errorMessage) {
      updateData.provider_error = `${errorCode || ""}: ${errorMessage || ""}`.trim();
    }

    // Add timestamps based on status
    if (status === "delivered") {
      updateData.delivered_at = new Date().toISOString();
    } else if (status === "failed") {
      updateData.failed_at = new Date().toISOString();
    }

    // Update the message
    await updateMessage(updateData);

    console.log(`Updated message ${message.id} status to ${status}`);

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing Twilio status callback:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
