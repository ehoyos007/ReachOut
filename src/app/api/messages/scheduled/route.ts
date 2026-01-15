import { NextRequest, NextResponse } from "next/server";
import { getScheduledMessages } from "@/lib/supabase";
import type { MessageChannel } from "@/types/message";

// GET /api/messages/scheduled - List scheduled messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters = {
      contact_id: searchParams.get("contact_id") || undefined,
      channel: (searchParams.get("channel") as MessageChannel) || undefined,
      scheduled_after: searchParams.get("scheduled_after") || undefined,
      scheduled_before: searchParams.get("scheduled_before") || undefined,
    };

    const pagination = {
      page: parseInt(searchParams.get("page") || "1"),
      pageSize: parseInt(searchParams.get("pageSize") || "25"),
    };

    const result = await getScheduledMessages(filters, pagination);

    return NextResponse.json({
      success: true,
      ...result,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(result.total / pagination.pageSize),
    });
  } catch (error) {
    console.error("Error fetching scheduled messages:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
