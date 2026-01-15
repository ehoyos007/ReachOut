import { NextRequest, NextResponse } from "next/server";
import { createContactEvent, getContactEvents } from "@/lib/supabase";
import type { ContactEventType, CreateContactEventInput } from "@/types/timeline";

export const dynamic = "force-dynamic";

// Valid event types that can be created via API
const VALID_EVENT_TYPES: ContactEventType[] = [
  "note_added",
  "call_inbound",
  "call_outbound",
  "manual_message",
  "tag_added",
  "tag_removed",
  "status_changed",
];

/**
 * GET /api/contacts/[id]/events
 * Fetch all contact events (excluding messages)
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

    const events = await getContactEvents(contactId);

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Error fetching contact events:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact events" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contacts/[id]/events
 * Create a new contact event
 *
 * Body:
 * - event_type: string (required)
 * - content: string (required for notes/calls/manual_message)
 * - direction: "inbound" | "outbound" (optional)
 * - metadata: object (optional)
 * - created_at: ISO timestamp (optional, for backdating)
 * - created_by: string (optional)
 */
export async function POST(
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

    const body = await request.json();

    // Validate event_type
    const { event_type, content, direction, metadata, created_at, created_by } =
      body;

    if (!event_type) {
      return NextResponse.json(
        { error: "event_type is required" },
        { status: 400 }
      );
    }

    if (!VALID_EVENT_TYPES.includes(event_type)) {
      return NextResponse.json(
        {
          error: `Invalid event_type. Must be one of: ${VALID_EVENT_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate content for certain event types
    const requiresContent = [
      "note_added",
      "call_inbound",
      "call_outbound",
      "manual_message",
    ];
    if (requiresContent.includes(event_type) && !content?.trim()) {
      return NextResponse.json(
        { error: "content is required for this event type" },
        { status: 400 }
      );
    }

    // Validate direction if provided
    if (direction && !["inbound", "outbound"].includes(direction)) {
      return NextResponse.json(
        { error: "direction must be 'inbound' or 'outbound'" },
        { status: 400 }
      );
    }

    // Validate created_at if provided
    if (created_at) {
      const date = new Date(created_at);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "created_at must be a valid ISO timestamp" },
          { status: 400 }
        );
      }
      // Don't allow future dates
      if (date > new Date()) {
        return NextResponse.json(
          { error: "created_at cannot be in the future" },
          { status: 400 }
        );
      }
    }

    // Create the event
    const input: CreateContactEventInput = {
      contact_id: contactId,
      event_type,
      content: content?.trim() || undefined,
      direction,
      metadata: metadata || undefined,
      created_at,
      created_by: created_by || "user",
    };

    const event = await createContactEvent(input);

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("Error creating contact event:", error);
    return NextResponse.json(
      { error: "Failed to create contact event" },
      { status: 500 }
    );
  }
}
