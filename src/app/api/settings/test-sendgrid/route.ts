import { NextRequest, NextResponse } from "next/server";
import { testSendGridConnection } from "@/lib/sendgrid";
import type { SendGridSettings } from "@/types/message";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const settings: SendGridSettings = await request.json();

    const result = await testSendGridConnection(settings);

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to test SendGrid connection",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
