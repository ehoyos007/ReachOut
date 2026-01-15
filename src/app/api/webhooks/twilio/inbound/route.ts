import { NextRequest, NextResponse } from "next/server";
import { getContactByPhone, createMessage, createNotification } from "@/lib/supabase";
import { normalizePhoneNumber } from "@/types/message";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * Verify Twilio webhook signature
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
async function verifyTwilioSignature(
  request: NextRequest,
  body: string
): Promise<boolean> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.warn("TWILIO_AUTH_TOKEN not set, skipping signature verification");
    return true; // Allow in development
  }

  const signature = request.headers.get("x-twilio-signature");
  if (!signature) {
    return false;
  }

  // Get the full URL
  const url = request.url;

  // Parse the body as form data
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
 * Twilio Inbound SMS Webhook
 * Receives incoming SMS messages from Twilio
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
    const from = formData.get("From");
    const to = formData.get("To");
    const messageBody = formData.get("Body");

    if (!messageSid || !from || !messageBody) {
      console.error("Missing required fields in Twilio webhook");
      return new NextResponse("Bad Request", { status: 400 });
    }

    console.log(`Received inbound SMS from ${from}: ${messageBody.substring(0, 50)}...`);

    // Find the contact by phone number
    const normalizedPhone = normalizePhoneNumber(from);
    const contact = await getContactByPhone(normalizedPhone);

    if (!contact) {
      console.log(`No contact found for phone: ${from}`);
      // Still return 200 to acknowledge receipt
      // Optionally: create a new contact automatically
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        }
      );
    }

    // Create inbound message record
    const message = await createMessage({
      contact_id: contact.id,
      channel: "sms",
      direction: "inbound",
      body: messageBody,
      status: "delivered",
      provider_id: messageSid,
    });

    console.log(`Created inbound SMS message for contact ${contact.id}`);

    // Create notification for the inbound message
    const contactName = [contact.first_name, contact.last_name]
      .filter(Boolean)
      .join(" ") || contact.phone || "Unknown";

    await createNotification({
      type: "inbound_sms",
      contact_id: contact.id,
      message_id: message.id,
      title: `New SMS from ${contactName}`,
      body: messageBody.length > 100 ? messageBody.substring(0, 100) + "..." : messageBody,
      metadata: {
        from_phone: from,
        provider_id: messageSid,
      },
    });

    console.log(`Created notification for inbound SMS from ${contactName}`);

    // Return TwiML response (empty response = no auto-reply)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  } catch (error) {
    console.error("Error processing Twilio inbound webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
