import { NextRequest, NextResponse } from "next/server";
import { getSentMessagesWithContact } from "@/lib/supabase";
import type { MessageChannel, MessageStatus } from "@/types/message";
import type { SentMessagesSortField, SentMessagesSortOrder } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/messages/sent - List sent messages with contact info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);
    const channel = searchParams.get("channel") as MessageChannel | null;
    const status = searchParams.get("status") as MessageStatus | null;
    const search = searchParams.get("search") || undefined;
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo = searchParams.get("dateTo") || undefined;
    const sortBy = searchParams.get("sortBy") as SentMessagesSortField | null;
    const sortOrder = searchParams.get("sortOrder") as SentMessagesSortOrder | null;

    // Build filters
    const filters = {
      channel: channel || undefined,
      status: status || undefined,
      search,
      dateFrom,
      dateTo,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
    };

    // Validate pagination
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(100, Math.max(1, pageSize));

    const result = await getSentMessagesWithContact(filters, {
      page: validPage,
      pageSize: validPageSize,
    });

    return NextResponse.json({
      success: true,
      messages: result.messages,
      total: result.total,
      page: validPage,
      pageSize: validPageSize,
      totalPages: Math.ceil(result.total / validPageSize),
    });
  } catch (error) {
    console.error("Error fetching sent messages:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
