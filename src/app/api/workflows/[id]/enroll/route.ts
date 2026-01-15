import { NextRequest, NextResponse } from "next/server";
import { enrollContacts } from "@/lib/workflow-executor";
import { getWorkflow, getContact } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface EnrollRequest {
  contact_ids: string[];
  skip_duplicates?: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;

    // Parse request body
    const body: EnrollRequest = await request.json();
    const { contact_ids, skip_duplicates = true } = body;

    // Validate request
    if (!contact_ids || !Array.isArray(contact_ids) || contact_ids.length === 0) {
      return NextResponse.json(
        { error: "contact_ids is required and must be a non-empty array" },
        { status: 400 }
      );
    }

    // Limit batch size
    if (contact_ids.length > 1000) {
      return NextResponse.json(
        { error: "Maximum batch size is 1000 contacts" },
        { status: 400 }
      );
    }

    // Verify workflow exists and is enabled
    const workflow = await getWorkflow(workflowId);

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    if (!workflow.is_enabled) {
      return NextResponse.json(
        { error: "Workflow is not enabled" },
        { status: 400 }
      );
    }

    // Enroll contacts
    const result = await enrollContacts(workflowId, contact_ids, skip_duplicates);

    return NextResponse.json({
      success: true,
      workflow_id: workflowId,
      total: result.total,
      enrolled: result.enrolled,
      skipped: result.skipped,
      failed: result.failed,
      message: `Enrolled ${result.enrolled} contacts, skipped ${result.skipped}, failed ${result.failed}`,
    });
  } catch (error) {
    console.error("Error enrolling contacts:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// GET endpoint to check enrollment status for contacts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const contactId = searchParams.get("contact_id");

    // Import here to avoid circular dependencies
    const { getEnrollments, getEnrollmentCount } = await import("@/lib/supabase");

    if (contactId) {
      // Get enrollment for specific contact
      const enrollments = await getEnrollments({
        workflow_id: workflowId,
        contact_id: contactId,
      });

      return NextResponse.json({
        enrolled: enrollments.length > 0,
        enrollment: enrollments[0] || null,
      });
    }

    // Get enrollment counts for workflow
    const [activeCount, completedCount, stoppedCount, failedCount] = await Promise.all([
      getEnrollmentCount(workflowId, ["active"]),
      getEnrollmentCount(workflowId, ["completed"]),
      getEnrollmentCount(workflowId, ["stopped"]),
      getEnrollmentCount(workflowId, ["failed"]),
    ]);

    return NextResponse.json({
      workflow_id: workflowId,
      counts: {
        active: activeCount,
        completed: completedCount,
        stopped: stoppedCount,
        failed: failedCount,
        total: activeCount + completedCount + stoppedCount + failedCount,
      },
    });
  } catch (error) {
    console.error("Error getting enrollment status:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
