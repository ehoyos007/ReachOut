import type {
  NodeProcessorContext,
  ExecutionData,
} from "@/types/execution";
import type { WorkflowWithNodes } from "@/types/workflow";
import {
  getExecution,
  getExecutionWithDetails,
  updateExecution,
  updateEnrollment,
  createExecutionLog,
  loadWorkflowWithNodesAndEdges,
} from "@/lib/supabase";
import { getNodeProcessor } from "./node-processors";

// =============================================================================
// Types
// =============================================================================

export interface ExecutionResult {
  success: boolean;
  executionId: string;
  enrollmentId: string;
  status: "completed" | "waiting" | "failed" | "stopped";
  nodesProcessed: number;
  error?: string;
}

// =============================================================================
// Workflow Executor
// =============================================================================

/**
 * Process a single workflow execution step
 */
export async function processExecution(
  executionId: string
): Promise<ExecutionResult> {
  let nodesProcessed = 0;

  try {
    // Load execution with full details
    const details = await getExecutionWithDetails(executionId);

    if (!details) {
      return {
        success: false,
        executionId,
        enrollmentId: "",
        status: "failed",
        nodesProcessed: 0,
        error: "Execution not found",
      };
    }

    const { execution, enrollment, contact } = details;

    // Check if enrollment is still active
    if (enrollment.status !== "active") {
      return {
        success: false,
        executionId,
        enrollmentId: enrollment.id,
        status: "stopped",
        nodesProcessed: 0,
        error: `Enrollment is ${enrollment.status}`,
      };
    }

    // Load the workflow with nodes and edges
    const workflowData = await loadWorkflowWithNodesAndEdges(enrollment.workflow_id);

    if (!workflowData) {
      await markExecutionFailed(execution.id, "Workflow not found");
      return {
        success: false,
        executionId,
        enrollmentId: enrollment.id,
        status: "failed",
        nodesProcessed: 0,
        error: "Workflow not found",
      };
    }

    // Check if workflow is enabled
    if (!workflowData.workflow.is_enabled) {
      await markExecutionFailed(execution.id, "Workflow is disabled");
      return {
        success: false,
        executionId,
        enrollmentId: enrollment.id,
        status: "failed",
        nodesProcessed: 0,
        error: "Workflow is disabled",
      };
    }

    const workflow: WorkflowWithNodes = {
      ...workflowData.workflow,
      nodes: workflowData.nodes,
      edges: workflowData.edges,
    };

    // Mark execution as processing
    await updateExecution(execution.id, {
      status: "processing",
      last_run_at: new Date().toISOString(),
      attempts: execution.attempts + 1,
    });

    // Process nodes until we hit a delay or end of workflow
    let currentExecution = execution;
    let continueProcessing = true;

    while (continueProcessing) {
      // Find the current node
      const currentNode = workflow.nodes.find(
        (n) => n.id === currentExecution.current_node_id
      );

      if (!currentNode) {
        await markExecutionFailed(execution.id, "Current node not found in workflow");
        return {
          success: false,
          executionId,
          enrollmentId: enrollment.id,
          status: "failed",
          nodesProcessed,
          error: "Current node not found in workflow",
        };
      }

      // Get the processor for this node type
      const processor = getNodeProcessor(currentNode.type);

      if (!processor) {
        await markExecutionFailed(execution.id, `No processor for node type: ${currentNode.type}`);
        return {
          success: false,
          executionId,
          enrollmentId: enrollment.id,
          status: "failed",
          nodesProcessed,
          error: `No processor for node type: ${currentNode.type}`,
        };
      }

      // Build context for the processor
      const context: NodeProcessorContext = {
        workflow,
        enrollment,
        execution: currentExecution,
        contact,
      };

      // Execute the node
      const nodeStartTime = Date.now();
      let result;

      try {
        result = await processor.execute(currentNode, context);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Log the failure
        await createExecutionLog({
          execution_id: currentExecution.id,
          enrollment_id: enrollment.id,
          node_id: currentNode.id,
          node_type: currentNode.type,
          action: "execute",
          status: "failed",
          error_message: errorMessage,
          duration_ms: Date.now() - nodeStartTime,
          input_data: null,
          output_data: null,
        });

        // Check if we should retry
        if (currentExecution.attempts < currentExecution.max_attempts) {
          await updateExecution(currentExecution.id, {
            status: "waiting",
            next_run_at: new Date(Date.now() + 60000).toISOString(), // Retry in 1 minute
            error_message: errorMessage,
          });

          return {
            success: false,
            executionId,
            enrollmentId: enrollment.id,
            status: "waiting",
            nodesProcessed,
            error: errorMessage,
          };
        }

        await markExecutionFailed(execution.id, errorMessage);
        return {
          success: false,
          executionId,
          enrollmentId: enrollment.id,
          status: "failed",
          nodesProcessed,
          error: errorMessage,
        };
      }

      nodesProcessed++;

      // Log the execution
      await createExecutionLog({
        execution_id: currentExecution.id,
        enrollment_id: enrollment.id,
        node_id: currentNode.id,
        node_type: currentNode.type,
        action: result.stopEnrollment ? "stop" : "execute",
        status: result.error ? "failed" : "completed",
        input_data: {
          node_data: currentNode.data,
        },
        output_data: result.outputData || null,
        error_message: result.error || null,
        duration_ms: Date.now() - nodeStartTime,
      });

      // Handle stop enrollment
      if (result.stopEnrollment) {
        await updateEnrollment(enrollment.id, {
          status: "stopped",
          stopped_at: new Date().toISOString(),
          stop_reason: result.stopReason || "Stopped by workflow",
        });

        await updateExecution(currentExecution.id, {
          status: "completed",
        });

        return {
          success: true,
          executionId,
          enrollmentId: enrollment.id,
          status: "stopped",
          nodesProcessed,
        };
      }

      // Handle workflow completion (no next node)
      if (!result.nextNodeId) {
        await updateEnrollment(enrollment.id, {
          status: "completed",
          completed_at: new Date().toISOString(),
        });

        await updateExecution(currentExecution.id, {
          status: "completed",
        });

        return {
          success: true,
          executionId,
          enrollmentId: enrollment.id,
          status: "completed",
          nodesProcessed,
        };
      }

      // Update execution data
      const updatedExecutionData: ExecutionData = {
        ...currentExecution.execution_data,
        ...(result.executionData || {}),
      };

      // If there's a delay, schedule the next run
      if (result.nextRunAt) {
        await updateExecution(currentExecution.id, {
          current_node_id: result.nextNodeId,
          status: "waiting",
          next_run_at: result.nextRunAt.toISOString(),
          error_message: null,
          execution_data: updatedExecutionData,
        });

        return {
          success: true,
          executionId,
          enrollmentId: enrollment.id,
          status: "waiting",
          nodesProcessed,
        };
      }

      // Continue to next node immediately
      await updateExecution(currentExecution.id, {
        current_node_id: result.nextNodeId,
        execution_data: updatedExecutionData,
      });

      // Refresh execution state for next iteration
      const updatedExecution = await getExecution(currentExecution.id);
      if (!updatedExecution) {
        continueProcessing = false;
      } else {
        currentExecution = updatedExecution;
      }

      // Safety limit to prevent infinite loops
      if (nodesProcessed > 100) {
        await markExecutionFailed(execution.id, "Too many nodes processed (possible infinite loop)");
        return {
          success: false,
          executionId,
          enrollmentId: enrollment.id,
          status: "failed",
          nodesProcessed,
          error: "Too many nodes processed",
        };
      }
    }

    return {
      success: true,
      executionId,
      enrollmentId: enrollment.id,
      status: "completed",
      nodesProcessed,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    try {
      await updateExecution(executionId, {
        status: "failed",
        error_message: errorMessage,
      });
    } catch {
      // Ignore errors updating execution
    }

    return {
      success: false,
      executionId,
      enrollmentId: "",
      status: "failed",
      nodesProcessed,
      error: errorMessage,
    };
  }
}

/**
 * Mark an execution as failed
 */
async function markExecutionFailed(
  executionId: string,
  errorMessage: string
): Promise<void> {
  await updateExecution(executionId, {
    status: "failed",
    error_message: errorMessage,
  });
}

// =============================================================================
// Enrollment Functions
// =============================================================================

import {
  createEnrollment,
  createExecution,
  getEnrollmentByWorkflowAndContact,
} from "@/lib/supabase";

export interface EnrollContactResult {
  success: boolean;
  enrollmentId?: string;
  executionId?: string;
  error?: string;
  skipped?: boolean;
}

/**
 * Enroll a single contact in a workflow
 */
export async function enrollContact(
  workflowId: string,
  contactId: string,
  skipDuplicates: boolean = true
): Promise<EnrollContactResult> {
  try {
    // Check if already enrolled
    if (skipDuplicates) {
      const existingEnrollment = await getEnrollmentByWorkflowAndContact(
        workflowId,
        contactId
      );

      if (existingEnrollment) {
        return {
          success: true,
          skipped: true,
          error: "Contact is already enrolled in this workflow",
        };
      }
    }

    // Load workflow to find the trigger_start node
    const workflowData = await loadWorkflowWithNodesAndEdges(workflowId);

    if (!workflowData) {
      return {
        success: false,
        error: "Workflow not found",
      };
    }

    // Find the trigger_start node
    const triggerNode = workflowData.nodes.find((n) => n.type === "trigger_start");

    if (!triggerNode) {
      return {
        success: false,
        error: "Workflow has no trigger start node",
      };
    }

    // Create enrollment
    const enrollment = await createEnrollment(workflowId, contactId);

    // Create initial execution at the trigger node
    const execution = await createExecution(
      enrollment.id,
      triggerNode.id,
      new Date() // Run immediately
    );

    return {
      success: true,
      enrollmentId: enrollment.id,
      executionId: execution.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Handle unique constraint violation (duplicate enrollment)
    if (errorMessage.includes("duplicate") || errorMessage.includes("unique")) {
      return {
        success: true,
        skipped: true,
        error: "Contact is already enrolled in this workflow",
      };
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Enroll multiple contacts in a workflow
 */
export async function enrollContacts(
  workflowId: string,
  contactIds: string[],
  skipDuplicates: boolean = true
): Promise<{
  total: number;
  enrolled: number;
  skipped: number;
  failed: number;
  results: EnrollContactResult[];
}> {
  const results: EnrollContactResult[] = [];
  let enrolled = 0;
  let skipped = 0;
  let failed = 0;

  for (const contactId of contactIds) {
    const result = await enrollContact(workflowId, contactId, skipDuplicates);
    results.push(result);

    if (result.success) {
      if (result.skipped) {
        skipped++;
      } else {
        enrolled++;
      }
    } else {
      failed++;
    }

    // Small delay to avoid overwhelming the database
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return {
    total: contactIds.length,
    enrolled,
    skipped,
    failed,
    results,
  };
}
