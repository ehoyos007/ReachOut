import { NextRequest, NextResponse } from "next/server";
import { testTwilioConnection } from "@/lib/twilio";
import type { TwilioSettings } from "@/types/message";

export async function POST(request: NextRequest) {
  try {
    const settings: TwilioSettings = await request.json();

    const result = await testTwilioConnection(settings);

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to test Twilio connection",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
