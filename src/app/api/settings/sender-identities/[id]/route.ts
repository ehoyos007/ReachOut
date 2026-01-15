import { NextRequest, NextResponse } from "next/server";
import {
  updateSenderEmailIdentity,
  updateSenderPhoneIdentity,
  removeSenderEmail,
  removeSenderPhone,
} from "@/lib/supabase";

// PUT /api/settings/sender-identities/[id] - Update sender identity
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, ...updates } = body;

    if (type === "email") {
      const sender = await updateSenderEmailIdentity({ id, ...updates });
      return NextResponse.json({ success: true, sender });
    } else if (type === "sms") {
      const sender = await updateSenderPhoneIdentity({ id, ...updates });
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

// DELETE /api/settings/sender-identities/[id] - Remove sender identity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "email") {
      await removeSenderEmail(id);
      return NextResponse.json({ success: true });
    } else if (type === "sms") {
      await removeSenderPhone(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Invalid type query parameter. Must be 'email' or 'sms'" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
