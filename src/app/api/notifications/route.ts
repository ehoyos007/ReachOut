import { NextRequest, NextResponse } from "next/server";
import { getNotifications, getUnreadNotificationCount } from "@/lib/supabase";

/**
 * GET /api/notifications
 * Fetch notifications with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const includeRead = searchParams.get("includeRead") !== "false";

    const [notifications, unreadCount] = await Promise.all([
      getNotifications(limit, includeRead),
      getUnreadNotificationCount(),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
