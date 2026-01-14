import { Contact, ContactWithRelations } from "./contact";
import {
  WorkflowNode,
  WorkflowNodeType,
  WorkflowWithNodes,
  TimeUnit,
} from "./workflow";

// =============================================================================
// Enrollment Types
// =============================================================================

export type EnrollmentStatus =
  | "active"
  | "paused"
  | "completed"
  | "stopped"
  | "failed";

export interface WorkflowEnrollment {
  id: string;
  workflow_id: string;
  contact_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  stopped_at: string | null;
  stop_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowEnrollmentWithRelations extends WorkflowEnrollment {
  workflow?: {
    id: string;
    name: string;
    is_enabled: boolean;
  };
  contact?: Contact;
  current_execution?: WorkflowExecution;
}

// =============================================================================
// Execution Types
// =============================================================================

export type ExecutionStatus =
  | "waiting"
  | "processing"
  | "completed"
  | "failed"
  | "skipped";

export interface WorkflowExecution {
  id: string;
  enrollment_id: string;
  current_node_id: string;
  status: ExecutionStatus;
  next_run_at: string | null;
  last_run_at: string | null;
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  execution_data: ExecutionData;
  created_at: string;
  updated_at: string;
}

export interface ExecutionData {
  [key: string]: unknown;
  // Tracks conditional split results
  last_condition_result?: boolean;
  // Tracks message IDs sent in this workflow
  sent_message_ids?: string[];
  // Track if stop_on_reply was triggered
  stopped_by_reply?: boolean;
  reply_channel?: "sms" | "email";
}

export interface WorkflowExecutionWithRelations extends WorkflowExecution {
  enrollment?: WorkflowEnrollment;
}

// =============================================================================
// Execution Log Types
// =============================================================================

export type ExecutionLogStatus = "started" | "completed" | "failed" | "skipped";

export interface WorkflowExecutionLog {
  id: string;
  execution_id: string;
  enrollment_id: string;
  node_id: string;
  node_type: WorkflowNodeType;
  action: string;
  status: ExecutionLogStatus;
  input_data: Record<string, unknown> | null;
  output_data: Record<string, unknown> | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

// =============================================================================
// Database Types (Supabase)
// =============================================================================

export interface DbWorkflowEnrollment {
  id: string;
  workflow_id: string;
  contact_id: string;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
  stopped_at: string | null;
  stop_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbWorkflowExecution {
  id: string;
  enrollment_id: string;
  current_node_id: string;
  status: string;
  next_run_at: string | null;
  last_run_at: string | null;
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  execution_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbWorkflowExecutionLog {
  id: string;
  execution_id: string;
  enrollment_id: string;
  node_id: string;
  node_type: string;
  action: string;
  status: string;
  input_data: Record<string, unknown> | null;
  output_data: Record<string, unknown> | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

// =============================================================================
// Node Processor Types
// =============================================================================

export interface NodeProcessorContext {
  workflow: WorkflowWithNodes;
  enrollment: WorkflowEnrollment;
  execution: WorkflowExecution;
  contact: ContactWithRelations;
}

export interface NodeProcessorResult {
  // The next node to transition to (null = workflow complete)
  nextNodeId: string | null;
  // When to run the next node (null = immediately)
  nextRunAt: Date | null;
  // Updated execution data to persist
  executionData?: Partial<ExecutionData>;
  // Output data for logging
  outputData?: Record<string, unknown>;
  // Error message if failed
  error?: string;
  // Whether to stop the enrollment entirely
  stopEnrollment?: boolean;
  // Reason for stopping
  stopReason?: string;
}

export interface NodeProcessor {
  execute(
    node: WorkflowNode,
    context: NodeProcessorContext
  ): Promise<NodeProcessorResult>;
}

// =============================================================================
// Enrollment Input Types
// =============================================================================

export interface EnrollContactsInput {
  workflow_id: string;
  contact_ids: string[];
  skip_duplicates?: boolean;
}

export interface EnrollContactsResult {
  total: number;
  enrolled: number;
  skipped: number;
  errors: EnrollmentError[];
}

export interface EnrollmentError {
  contact_id: string;
  reason: string;
}

// =============================================================================
// Filter & Query Types
// =============================================================================

export interface EnrollmentFilters {
  workflow_id?: string;
  contact_id?: string;
  status?: EnrollmentStatus[];
  enrolled_after?: string;
  enrolled_before?: string;
}

export interface ExecutionFilters {
  enrollment_id?: string;
  status?: ExecutionStatus[];
  due_before?: string;
}

// =============================================================================
// Constants
// =============================================================================

export const ENROLLMENT_STATUS_DISPLAY: Record<EnrollmentStatus, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  stopped: "Stopped",
  failed: "Failed",
};

export const ENROLLMENT_STATUS_COLORS: Record<
  EnrollmentStatus,
  { bg: string; text: string; dot: string }
> = {
  active: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  paused: { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  completed: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  stopped: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" },
  failed: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
};

export const EXECUTION_STATUS_DISPLAY: Record<ExecutionStatus, string> = {
  waiting: "Waiting",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  skipped: "Skipped",
};

export const EXECUTION_STATUS_COLORS: Record<
  ExecutionStatus,
  { bg: string; text: string }
> = {
  waiting: { bg: "bg-blue-100", text: "text-blue-700" },
  processing: { bg: "bg-yellow-100", text: "text-yellow-700" },
  completed: { bg: "bg-green-100", text: "text-green-700" },
  failed: { bg: "bg-red-100", text: "text-red-700" },
  skipped: { bg: "bg-gray-100", text: "text-gray-700" },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert time delay to milliseconds
 */
export function timeDelayToMs(duration: number, unit: TimeUnit): number {
  const multipliers: Record<TimeUnit, number> = {
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  };
  return duration * multipliers[unit];
}

/**
 * Calculate the next run time based on a delay
 */
export function calculateNextRunAt(
  duration: number,
  unit: TimeUnit,
  from: Date = new Date()
): Date {
  const delayMs = timeDelayToMs(duration, unit);
  return new Date(from.getTime() + delayMs);
}

/**
 * Check if an enrollment is in a terminal state
 */
export function isEnrollmentTerminal(status: EnrollmentStatus): boolean {
  return ["completed", "stopped", "failed"].includes(status);
}

/**
 * Check if an execution is in a terminal state
 */
export function isExecutionTerminal(status: ExecutionStatus): boolean {
  return ["completed", "failed", "skipped"].includes(status);
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`;
  }
  if (ms < 3600000) {
    return `${Math.round(ms / 60000)}m`;
  }
  return `${Math.round(ms / 3600000)}h`;
}

/**
 * Get time remaining until next run
 */
export function getTimeUntilNextRun(nextRunAt: string | null): string | null {
  if (!nextRunAt) return null;

  const next = new Date(nextRunAt);
  const now = new Date();
  const diffMs = next.getTime() - now.getTime();

  if (diffMs <= 0) return "Now";

  if (diffMs < 60000) {
    return `${Math.ceil(diffMs / 1000)}s`;
  }
  if (diffMs < 3600000) {
    return `${Math.ceil(diffMs / 60000)}m`;
  }
  if (diffMs < 86400000) {
    return `${Math.ceil(diffMs / 3600000)}h`;
  }
  return `${Math.ceil(diffMs / 86400000)}d`;
}

/**
 * Get a descriptive label for the current workflow step
 */
export function getExecutionStepLabel(
  execution: WorkflowExecution,
  workflow: WorkflowWithNodes
): string {
  const node = workflow.nodes.find((n) => n.id === execution.current_node_id);
  if (!node) return "Unknown step";

  return (node.data as { label?: string }).label || node.type || "Unknown";
}

/**
 * Count enrollments by status
 */
export function countEnrollmentsByStatus(
  enrollments: WorkflowEnrollment[]
): Record<EnrollmentStatus, number> {
  const counts: Record<EnrollmentStatus, number> = {
    active: 0,
    paused: 0,
    completed: 0,
    stopped: 0,
    failed: 0,
  };

  for (const enrollment of enrollments) {
    counts[enrollment.status]++;
  }

  return counts;
}
