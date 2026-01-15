import { NextRequest, NextResponse } from "next/server";
import { processExecution, type ExecutionResult } from "@/lib/workflow-executor";
import { getDueExecutions } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Maximum executions to process per cron run
const MAX_EXECUTIONS_PER_RUN = 100;

// Secret for cron authentication (should be set in environment)
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Verify the request is authorized to trigger the cron job
 * Accepts: Vercel Cron (automatic), Bearer token, or no auth in development
 */
function isAuthorized(request: NextRequest): boolean {
  // Always allow Vercel Cron requests (they include this header)
  if (request.headers.get("x-vercel-cron") === "1") {
    return true;
  }

  // Check Bearer token if CRON_SECRET is configured
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    const providedSecret = authHeader?.replace("Bearer ", "");
    return providedSecret === CRON_SECRET;
  }

  // In development without CRON_SECRET, allow all requests
  return process.env.NODE_ENV === "development";
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authorization
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all due executions
    const dueExecutions = await getDueExecutions(MAX_EXECUTIONS_PER_RUN);

    if (dueExecutions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No executions due",
        processed: 0,
        duration_ms: Date.now() - startTime,
      });
    }

    // Process each execution
    const results: ExecutionResult[] = [];
    let successCount = 0;
    let failedCount = 0;
    let stoppedCount = 0;
    let completedCount = 0;
    let waitingCount = 0;

    for (const execution of dueExecutions) {
      try {
        const result = await processExecution(execution.id);
        results.push(result);

        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }

        switch (result.status) {
          case "completed":
            completedCount++;
            break;
          case "stopped":
            stoppedCount++;
            break;
          case "waiting":
            waitingCount++;
            break;
          case "failed":
            // Already counted in failedCount
            break;
        }
      } catch (error) {
        console.error(`Error processing execution ${execution.id}:`, error);
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${dueExecutions.length} executions`,
      processed: dueExecutions.length,
      success_count: successCount,
      failed_count: failedCount,
      status_breakdown: {
        completed: completedCount,
        stopped: stoppedCount,
        waiting: waitingCount,
        failed: failedCount,
      },
      duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    console.error("Error in workflow cron:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Also support GET for easy manual triggering during development
export async function GET(request: NextRequest) {
  return POST(request);
}
