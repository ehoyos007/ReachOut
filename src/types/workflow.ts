import { Node, Edge } from "@xyflow/react";

// Node type identifiers
export type WorkflowNodeType =
  | "trigger_start"
  | "time_delay"
  | "conditional_split"
  | "send_sms"
  | "send_email"
  | "update_status"
  | "stop_on_reply";

// Time units for delays
export type TimeUnit = "minutes" | "hours" | "days";

// Comparison operators for conditions
export type ComparisonOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than"
  | "is_empty"
  | "is_not_empty";

// Contact status values
export type ContactStatus =
  | "new"
  | "contacted"
  | "responded"
  | "qualified"
  | "disqualified";

// Channel types
export type ChannelType = "any" | "sms" | "email";

// =============================================================================
// Node Data Types
// =============================================================================

// Base interface with index signature for React Flow compatibility
interface BaseNodeData {
  [key: string]: unknown;
}

export interface TriggerStartData extends BaseNodeData {
  label: string;
}

export interface TimeDelayData extends BaseNodeData {
  label: string;
  duration: number;
  unit: TimeUnit;
}

export interface ConditionalSplitData extends BaseNodeData {
  label: string;
  field: string;
  operator: ComparisonOperator;
  value: string;
}

export interface SendSmsData extends BaseNodeData {
  label: string;
  templateId: string | null;
  templateName: string | null;
  fromNumber: string | null;
}

export interface SendEmailData extends BaseNodeData {
  label: string;
  templateId: string | null;
  templateName: string | null;
  fromEmail: string | null;
  subjectOverride: string | null;
}

export interface UpdateStatusData extends BaseNodeData {
  label: string;
  newStatus: ContactStatus;
}

export interface StopOnReplyData extends BaseNodeData {
  label: string;
  channel: ChannelType;
}

// Union type for all node data
export type WorkflowNodeData =
  | TriggerStartData
  | TimeDelayData
  | ConditionalSplitData
  | SendSmsData
  | SendEmailData
  | UpdateStatusData
  | StopOnReplyData;

// =============================================================================
// React Flow Node Types
// =============================================================================

export type TriggerStartNode = Node<TriggerStartData, "trigger_start">;
export type TimeDelayNode = Node<TimeDelayData, "time_delay">;
export type ConditionalSplitNode = Node<ConditionalSplitData, "conditional_split">;
export type SendSmsNode = Node<SendSmsData, "send_sms">;
export type SendEmailNode = Node<SendEmailData, "send_email">;
export type UpdateStatusNode = Node<UpdateStatusData, "update_status">;
export type StopOnReplyNode = Node<StopOnReplyData, "stop_on_reply">;

export type WorkflowNode =
  | TriggerStartNode
  | TimeDelayNode
  | ConditionalSplitNode
  | SendSmsNode
  | SendEmailNode
  | UpdateStatusNode
  | StopOnReplyNode;

// =============================================================================
// Workflow Types
// =============================================================================

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowWithNodes extends Workflow {
  nodes: WorkflowNode[];
  edges: Edge[];
}

// =============================================================================
// Database Types (Supabase)
// =============================================================================

export interface DbWorkflow {
  id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbWorkflowNode {
  id: string;
  workflow_id: string;
  type: WorkflowNodeType;
  position_x: number;
  position_y: number;
  data: WorkflowNodeData;
  created_at: string;
}

export interface DbWorkflowEdge {
  id: string;
  workflow_id: string;
  source_node_id: string;
  target_node_id: string;
  source_handle: string | null;
  target_handle: string | null;
  label: string | null;
}

// =============================================================================
// Node Configuration (for palette and creation)
// =============================================================================

export interface NodeTypeConfig {
  type: WorkflowNodeType;
  label: string;
  description: string;
  icon: string;
  category: "trigger" | "timing" | "logic" | "action";
  defaultData: WorkflowNodeData;
  hasMultipleOutputs?: boolean;
}

export const NODE_TYPE_CONFIGS: NodeTypeConfig[] = [
  {
    type: "trigger_start",
    label: "Start",
    description: "Entry point for the workflow",
    icon: "Play",
    category: "trigger",
    defaultData: { label: "Start" },
  },
  {
    type: "time_delay",
    label: "Time Delay",
    description: "Wait for a specified duration",
    icon: "Clock",
    category: "timing",
    defaultData: { label: "Wait 1 day", duration: 1, unit: "days" },
  },
  {
    type: "conditional_split",
    label: "Conditional Split",
    description: "Branch based on conditions",
    icon: "GitBranch",
    category: "logic",
    defaultData: {
      label: "Check condition",
      field: "",
      operator: "equals",
      value: "",
    },
    hasMultipleOutputs: true,
  },
  {
    type: "send_sms",
    label: "Send SMS",
    description: "Send an SMS message",
    icon: "MessageSquare",
    category: "action",
    defaultData: {
      label: "Send SMS",
      templateId: null,
      templateName: null,
      fromNumber: null,
    },
  },
  {
    type: "send_email",
    label: "Send Email",
    description: "Send an email message",
    icon: "Mail",
    category: "action",
    defaultData: {
      label: "Send Email",
      templateId: null,
      templateName: null,
      fromEmail: null,
      subjectOverride: null,
    },
  },
  {
    type: "update_status",
    label: "Update Status",
    description: "Update contact status",
    icon: "UserCheck",
    category: "action",
    defaultData: { label: "Update Status", newStatus: "contacted" },
  },
  {
    type: "stop_on_reply",
    label: "Stop on Reply",
    description: "Exit workflow if contact replied",
    icon: "StopCircle",
    category: "logic",
    defaultData: { label: "Stop if replied", channel: "any" },
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

export function getNodeTypeConfig(
  type: WorkflowNodeType
): NodeTypeConfig | undefined {
  return NODE_TYPE_CONFIGS.find((config) => config.type === type);
}

export function createDefaultNode(
  type: WorkflowNodeType,
  position: { x: number; y: number }
): WorkflowNode {
  const config = getNodeTypeConfig(type);
  if (!config) {
    throw new Error(`Unknown node type: ${type}`);
  }

  return {
    id: crypto.randomUUID(),
    type,
    position,
    data: { ...config.defaultData },
  } as WorkflowNode;
}

// Time delay formatting
export function formatTimeDelay(duration: number, unit: TimeUnit): string {
  const plural = duration !== 1 ? "s" : "";
  return `${duration} ${unit.slice(0, -1)}${plural}`;
}

// Status display names
export const STATUS_DISPLAY_NAMES: Record<ContactStatus, string> = {
  new: "New",
  contacted: "Contacted",
  responded: "Responded",
  qualified: "Qualified",
  disqualified: "Disqualified",
};

// Channel display names
export const CHANNEL_DISPLAY_NAMES: Record<ChannelType, string> = {
  any: "Any Channel",
  sms: "SMS Only",
  email: "Email Only",
};

// Operator display names
export const OPERATOR_DISPLAY_NAMES: Record<ComparisonOperator, string> = {
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  not_contains: "does not contain",
  greater_than: "is greater than",
  less_than: "is less than",
  is_empty: "is empty",
  is_not_empty: "is not empty",
};
