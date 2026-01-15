import { NextRequest, NextResponse } from "next/server";
import {
  createMessage,
  updateMessage,
  getContact,
  getSetting,
} from "@/lib/supabase";
import { sendTemplateEmail, sendTemplateBatch, sendWithRetry } from "@/lib/sendgrid";
import type { SendGridSettings } from "@/types/message";
import type { CreateMessageInput } from "@/types/message";
import type { BatchRecipient } from "@/types/sendgrid";

export const dynamic = "force-dynamic";

interface SingleSendRequest {
  templateId: string;
  contactId: string;
  dynamicData: Record<string, unknown>;
  subject?: string;
  batch?: false;
}

interface BatchSendRequest {
  templateId: string;
  recipients: Array<{
    contactId: string;
    dynamicData: Record<string, unknown>;
  }>;
  subject?: string;
  batch: true;
}

type SendRequest = SingleSendRequest | BatchSendRequest;

export async function POST(request: NextRequest) {
  try {
    const body: SendRequest = await request.json();

    // Validate template ID
    if (!body.templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Fetch SendGrid settings
    const [apiKey, fromEmail, fromName] = await Promise.all([
      getSetting("sendgrid_api_key"),
      getSetting("sendgrid_from_email"),
      getSetting("sendgrid_from_name"),
    ]);

    if (!apiKey?.value || !fromEmail?.value) {
      return NextResponse.json(
        { error: "SendGrid is not configured. Please add your settings." },
        { status: 400 }
      );
    }

    const settings: SendGridSettings = {
      api_key: apiKey.value,
      from_email: fromEmail.value,
      from_name: fromName?.value || "ReachOut",
    };

    // Handle batch send
    if (body.batch && "recipients" in body) {
      return handleBatchSend(settings, body);
    }

    // Handle single send
    if ("contactId" in body) {
      return handleSingleSend(settings, body);
    }

    return NextResponse.json(
      { error: "Invalid request format" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in SendGrid send API:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to send email: ${errorMessage}` },
      { status: 500 }
    );
  }
}

async function handleSingleSend(
  settings: SendGridSettings,
  body: SingleSendRequest
) {
  // Fetch contact
  const contact = await getContact(body.contactId);
  if (!contact) {
    return NextResponse.json(
      { error: "Contact not found" },
      { status: 404 }
    );
  }

  if (contact.do_not_contact) {
    return NextResponse.json(
      { error: "Contact is marked as Do Not Contact" },
      { status: 400 }
    );
  }

  if (!contact.email) {
    return NextResponse.json(
      { error: "Contact does not have an email address" },
      { status: 400 }
    );
  }

  // Create message record
  const messageInput: CreateMessageInput = {
    contact_id: body.contactId,
    channel: "email",
    direction: "outbound",
    subject: body.subject || "[Template Email]",
    body: JSON.stringify(body.dynamicData),
    status: "queued",
    source: "manual",
  };

  const message = await createMessage(messageInput);

  // Update status to sending
  await updateMessage({
    id: message.id,
    status: "sending",
  });

  // Send with retry
  const contactName = [contact.first_name, contact.last_name]
    .filter(Boolean)
    .join(" ");

  const result = await sendWithRetry(() =>
    sendTemplateEmail(settings, {
      templateId: body.templateId,
      to: { email: contact.email!, name: contactName || undefined },
      dynamicData: body.dynamicData,
    })
  );

  if (result.success) {
    await updateMessage({
      id: message.id,
      status: "sent",
      provider_id: result.messageId,
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message,
    });
  } else {
    await updateMessage({
      id: message.id,
      status: "failed",
      provider_error: result.error?.message,
      failed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: false,
      error: result.error?.message || "Failed to send email",
      message,
    });
  }
}

async function handleBatchSend(
  settings: SendGridSettings,
  body: BatchSendRequest
) {
  if (!body.recipients || body.recipients.length === 0) {
    return NextResponse.json(
      { error: "At least one recipient is required" },
      { status: 400 }
    );
  }

  const results: Array<{ contactId: string; success: boolean; error?: string }> = [];
  const batchRecipients: BatchRecipient[] = [];
  const messageRecords: Array<{ contactId: string; messageId: string }> = [];

  // Validate all contacts and create message records
  for (const recipient of body.recipients) {
    const contact = await getContact(recipient.contactId);

    if (!contact) {
      results.push({ contactId: recipient.contactId, success: false, error: "Contact not found" });
      continue;
    }

    if (contact.do_not_contact) {
      results.push({ contactId: recipient.contactId, success: false, error: "Do not contact" });
      continue;
    }

    if (!contact.email) {
      results.push({ contactId: recipient.contactId, success: false, error: "No email address" });
      continue;
    }

    // Create message record
    const messageInput: CreateMessageInput = {
      contact_id: recipient.contactId,
      channel: "email",
      direction: "outbound",
      subject: body.subject || "[Template Email]",
      body: JSON.stringify(recipient.dynamicData),
      status: "queued",
      source: "bulk",
    };

    const message = await createMessage(messageInput);
    messageRecords.push({ contactId: recipient.contactId, messageId: message.id });

    // Add to batch
    const contactName = [contact.first_name, contact.last_name]
      .filter(Boolean)
      .join(" ");

    batchRecipients.push({
      contact: {
        id: contact.id,
        email: contact.email,
        fullName: contactName || undefined,
      },
      dynamicData: recipient.dynamicData,
    });
  }

  // If no valid recipients, return early
  if (batchRecipients.length === 0) {
    return NextResponse.json({
      success: false,
      error: "No valid recipients",
      results,
      totalSent: 0,
      totalFailed: body.recipients.length,
    });
  }

  // Update all messages to sending
  for (const record of messageRecords) {
    await updateMessage({ id: record.messageId, status: "sending" });
  }

  // Send batch
  const batchResult = await sendTemplateBatch(settings, {
    templateId: body.templateId,
    recipients: batchRecipients,
  });

  // Update message statuses based on result
  if (batchResult.totalSent > 0) {
    for (const record of messageRecords) {
      await updateMessage({
        id: record.messageId,
        status: "sent",
        sent_at: new Date().toISOString(),
      });
      results.push({ contactId: record.contactId, success: true });
    }
  }

  if (batchResult.totalFailed > 0) {
    const errorMessage = batchResult.results.find((r) => !r.success)?.error?.message || "Send failed";
    for (const record of messageRecords) {
      if (!results.find((r) => r.contactId === record.contactId && r.success)) {
        await updateMessage({
          id: record.messageId,
          status: "failed",
          provider_error: errorMessage,
          failed_at: new Date().toISOString(),
        });
        results.push({ contactId: record.contactId, success: false, error: errorMessage });
      }
    }
  }

  return NextResponse.json({
    success: batchResult.totalSent > 0,
    results,
    totalSent: batchResult.totalSent,
    totalFailed: batchResult.totalFailed,
  });
}
