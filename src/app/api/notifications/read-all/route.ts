import { NextResponse } from "next/server";
import { markAllNotificationsAsRead } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
export async function POST() {
  try {
    await markAllNotificationsAsRead();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json(
      { error: "Failed to mark all notifications as read" },
      { status: 500 }
    );
  }
}
