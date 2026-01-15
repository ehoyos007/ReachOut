import { NextRequest, NextResponse } from "next/server";
import { getContactTimelineWithCreated, getContactTimeline } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/contacts/[id]/timeline
 * Fetch unified timeline (messages + events) for a contact
 *
 * Query params:
 * - before: ISO timestamp cursor for pagination
 * - limit: number of events to fetch (default 30)
 * - contactCreatedAt: ISO timestamp of when contact was created (to include "created" event)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;

    if (!contactId) {
      return NextResponse.json(
        { error: "Contact ID is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before") || undefined;
    const limit = parseInt(searchParams.get("limit") || "30", 10);
    const contactCreatedAt = searchParams.get("contactCreatedAt") || undefined;

    // Use the appropriate function based on whether we have contactCreatedAt
    const response = contactCreatedAt
      ? await getContactTimelineWithCreated(contactId, contactCreatedAt, {
          before,
          limit,
        })
      : await getContactTimeline(contactId, { before, limit });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching timeline:", error);
    return NextResponse.json(
      { error: "Failed to fetch timeline" },
      { status: 500 }
    );
  }
}
