import { NextResponse } from "next/server";
import { getSetting } from "@/lib/supabase";
import { listDynamicTemplates } from "@/lib/sendgrid";

export const dynamic = "force-dynamic";

/**
 * GET /api/sendgrid/templates
 * List all dynamic templates from SendGrid
 */
export async function GET() {
  try {
    // Get SendGrid API key from settings
    const apiKeySetting = await getSetting("sendgrid_api_key");

    if (!apiKeySetting?.value) {
      return NextResponse.json(
        { error: "SendGrid is not configured. Please add your API key in Settings." },
        { status: 400 }
      );
    }

    // Fetch templates from SendGrid
    const { templates, error } = await listDynamicTemplates(apiKeySetting.value);

    if (error) {
      return NextResponse.json(
        { error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      templates,
      count: templates.length,
    });
  } catch (error) {
    console.error("Error fetching SendGrid templates:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: `Failed to fetch templates: ${errorMessage}` },
      { status: 500 }
    );
  }
}
