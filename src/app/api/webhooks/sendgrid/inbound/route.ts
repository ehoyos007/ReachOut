import { NextRequest, NextResponse } from "next/server";
import { getContactByEmail, createMessage, createNotification } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Extract email address from "Name <email@example.com>" format
 */
function extractEmail(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/);
  if (match) {
    return match[1].toLowerCase();
  }
  return emailString.toLowerCase().trim();
}

/**
 * SendGrid Inbound Parse Webhook
 * Receives incoming emails from SendGrid Inbound Parse
 * https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
 */
export async function POST(request: NextRequest) {
  try {
    // SendGrid sends data as multipart/form-data
    const formData = await request.formData();

    const from = formData.get("from") as string;
    const subject = formData.get("subject") as string;
    const text = formData.get("text") as string;
    const html = formData.get("html") as string;

    if (!from) {
      console.error("Missing 'from' field in SendGrid inbound webhook");
      return new NextResponse("Bad Request", { status: 400 });
    }

    const fromEmail = extractEmail(from);
    console.log(`Received inbound email from ${fromEmail}: ${subject || "(no subject)"}`);

    // Find the contact by email
    const contact = await getContactByEmail(fromEmail);

    if (!contact) {
      console.log(`No contact found for email: ${fromEmail}`);
      // Return 200 to acknowledge receipt
      return new NextResponse("OK", { status: 200 });
    }

    // Use text content, fallback to stripped HTML
    const body = text || html?.replace(/<[^>]*>/g, "") || "";

    // Create inbound message record
    const message = await createMessage({
      contact_id: contact.id,
      channel: "email",
      direction: "inbound",
      subject: subject || null,
      body: body.trim(),
      status: "delivered",
    });

    console.log(`Created inbound email message for contact ${contact.id}`);

    // Create notification for the inbound email
    const contactName = [contact.first_name, contact.last_name]
      .filter(Boolean)
      .join(" ") || contact.email || "Unknown";

    await createNotification({
      type: "inbound_email",
      contact_id: contact.id,
      message_id: message.id,
      title: `New email from ${contactName}`,
      body: subject || (body.length > 100 ? body.substring(0, 100) + "..." : body),
      metadata: {
        from_email: fromEmail,
        subject: subject || null,
      },
    });

    console.log(`Created notification for inbound email from ${contactName}`);

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing SendGrid inbound webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
