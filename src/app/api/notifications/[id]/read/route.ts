import { NextRequest, NextResponse } from "next/server";
import { markNotificationAsRead, getNotification } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/notifications/[id]/read
 * Mark a single notification as read
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if notification exists
    const notification = await getNotification(id);
    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Already read - return success
    if (notification.is_read) {
      return NextResponse.json({ notification });
    }

    // Mark as read
    const updated = await markNotificationAsRead(id);

    return NextResponse.json({ notification: updated });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
