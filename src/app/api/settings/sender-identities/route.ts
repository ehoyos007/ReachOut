import { NextRequest, NextResponse } from "next/server";
import {
  getSenderEmails,
  getSenderPhones,
  addSenderEmail,
  addSenderPhone,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/settings/sender-identities - Get all sender identities
export async function GET() {
  try {
    const [emails, phones] = await Promise.all([
      getSenderEmails(),
      getSenderPhones(),
    ]);

    return NextResponse.json({
      success: true,
      emails,
      phones,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/settings/sender-identities - Add new sender identity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...input } = body;

    if (type === "email") {
      if (!input.email || !input.name) {
        return NextResponse.json(
          { error: "Email and name are required for email sender" },
          { status: 400 }
        );
      }
      const sender = await addSenderEmail(input);
      return NextResponse.json({ success: true, sender });
    } else if (type === "sms") {
      if (!input.phone || !input.label) {
        return NextResponse.json(
          { error: "Phone and label are required for SMS sender" },
          { status: 400 }
        );
      }
      const sender = await addSenderPhone(input);
      return NextResponse.json({ success: true, sender });
    }

    return NextResponse.json(
      { error: "Invalid type. Must be 'email' or 'sms'" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
