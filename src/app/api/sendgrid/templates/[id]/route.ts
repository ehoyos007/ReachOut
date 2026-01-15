import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/supabase";
import { getTemplateDetails } from "@/lib/sendgrid";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/sendgrid/templates/[id]
 * Get full template details including HTML content
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: templateId } = await params;

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Get SendGrid API key from settings
    const apiKeySetting = await getSetting("sendgrid_api_key");

    if (!apiKeySetting?.value) {
      return NextResponse.json(
        { error: "SendGrid is not configured. Please add your API key in Settings." },
        { status: 400 }
      );
    }

    // Fetch template details from SendGrid
    const { template, error } = await getTemplateDetails(apiKeySetting.value, templateId);

    if (error) {
      return NextResponse.json(
        { error },
        { status: 500 }
      );
    }

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Find the active version
    const activeVersion = template.versions?.find((v) => v.active === 1);

    return NextResponse.json({
      template,
      activeVersion,
    });
  } catch (error) {
    console.error("Error fetching SendGrid template:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: `Failed to fetch template: ${errorMessage}` },
      { status: 500 }
    );
  }
}
