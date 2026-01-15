import { NextRequest, NextResponse } from "next/server";
import {
  getMessage,
  cancelScheduledMessage,
  updateScheduledMessage,
} from "@/lib/supabase";

// GET /api/messages/scheduled/[id] - Get single scheduled message
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const message = await getMessage(id);

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.status !== "scheduled") {
      return NextResponse.json(
        { error: "Message is not scheduled" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PUT /api/messages/scheduled/[id] - Update scheduled message
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const message = await updateScheduledMessage(id, {
      body: body.body,
      subject: body.subject,
      scheduled_at: body.scheduled_at,
      from_identity: body.from_identity,
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE /api/messages/scheduled/[id] - Cancel scheduled message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await cancelScheduledMessage(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
