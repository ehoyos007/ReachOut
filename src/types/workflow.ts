import { Node, Edge } from "@xyflow/react";

// Node type identifiers
export type WorkflowNodeType =
  | "trigger_start"
  | "time_delay"
  | "conditional_split"
  | "send_sms"
  | "send_email"
  | "update_status"
  | "stop_on_reply"
  | "return_to_parent"
  | "call_sub_workflow";

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

// Logical operators for combining conditions
export type LogicalOperator = "AND" | "OR";

// =============================================================================
// Condition Types (for Conditional Split)
// =============================================================================

// A single condition
export interface Condition {
  id: string;
  field: string;
  operator: ComparisonOperator;
  value: string;
}

// A group of conditions joined by the same logical operator
export interface ConditionGroup {
  id: string;
  conditions: Condition[];
  logicalOperator: LogicalOperator;
}

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
// Trigger Type Definitions
// =============================================================================

export type TriggerType =
  | "manual"
  | "contact_added"
  | "tag_added"
  | "scheduled"
  | "status_changed"
  | "sub_workflow";

// Schedule frequency options
export type ScheduleFrequency = "daily" | "weekly" | "monthly";

// Days of week (0 = Sunday, 6 = Saturday)
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Variable types for sub-workflow inputs/outputs
export type VariableType = "string" | "number" | "boolean" | "object" | "array";

// Sub-workflow execution modes
export type ExecutionMode = "sync" | "async";

// Input variable definition for sub-workflows
export interface InputVariable {
  name: string;
  type: VariableType;
  description?: string;
  required?: boolean;
  defaultValue?: unknown;
}

// Output variable definition for return to parent
export interface OutputVariable {
  name: string;
  type: VariableType;
  value: string; // Expression or field reference
}

// --- Trigger Configuration Types (Discriminated Union) ---

export interface ManualTriggerConfig {
  type: "manual";
}

export interface ContactAddedTriggerConfig {
  type: "contact_added";
}

export interface TagAddedTriggerConfig {
  type: "tag_added";
  tagIds: string[];
  matchMode: "any" | "all";
}

export interface ScheduledTriggerConfig {
  type: "scheduled";
  scheduleType: "once" | "recurring";
  // One-time execution
  runAt?: string; // ISO date string
  // Recurring execution
  frequency?: ScheduleFrequency;
  time?: string; // HH:mm format
  daysOfWeek?: DayOfWeek[]; // For weekly frequency
  dayOfMonth?: number; // For monthly frequency (1-31)
  timezone?: string; // IANA timezone
}

export interface StatusChangedTriggerConfig {
  type: "status_changed";
  statuses: ContactStatus[];
}

export interface SubWorkflowTriggerConfig {
  type: "sub_workflow";
  inputVariables: InputVariable[];
  executionMode: ExecutionMode;
}

// Union of all trigger configs
export type TriggerConfig =
  | ManualTriggerConfig
  | ContactAddedTriggerConfig
  | TagAddedTriggerConfig
  | ScheduledTriggerConfig
  | StatusChangedTriggerConfig
  | SubWorkflowTriggerConfig;

// Display names for trigger types
export const TRIGGER_TYPE_DISPLAY_NAMES: Record<TriggerType, string> = {
  manual: "Manual",
  contact_added: "When Contact Added",
  tag_added: "When Tag Added",
  scheduled: "Scheduled",
  status_changed: "When Status Changes",
  sub_workflow: "Sub-Workflow",
};

// Descriptions for trigger types
export const TRIGGER_TYPE_DESCRIPTIONS: Record<TriggerType, string> = {
  manual: "Start workflow manually by clicking Run",
  contact_added: "Triggers when a new contact is created",
  tag_added: "Triggers when specific tags are added to a contact",
  scheduled: "Triggers at scheduled times or intervals",
  status_changed: "Triggers when contact status changes to specified values",
  sub_workflow: "Called by another workflow as a reusable component",
};

// Day of week display names
export const DAY_OF_WEEK_NAMES: Record<DayOfWeek, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

// Short day names
export const DAY_OF_WEEK_SHORT: Record<DayOfWeek, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

// =============================================================================
// Node Data Types
// =============================================================================

// Base interface with index signature for React Flow compatibility
interface BaseNodeData {
  [key: string]: unknown;
}

export interface TriggerStartData extends BaseNodeData {
  label: string;
  triggerConfig: TriggerConfig;
}

export interface TimeDelayData extends BaseNodeData {
  label: string;
  duration: number;
  unit: TimeUnit;
}

export interface ConditionalSplitData extends BaseNodeData {
  label: string;
  // New structure: array of condition groups with group-level operator
  conditionGroups: ConditionGroup[];
  groupOperator: LogicalOperator;
  // Legacy fields (for backward compatibility - auto-migrated on load)
  field?: string;
  operator?: ComparisonOperator;
  value?: string;
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

export interface ReturnToParentData extends BaseNodeData {
  label: string;
  outputVariables: OutputVariable[];
  returnStatus: "success" | "failure" | "custom";
  customStatusField?: string;
}

// Input mapping for sub-workflow calls
export interface InputMapping {
  variableName: string; // The input variable name defined in the sub-workflow
  valueExpression: string; // Expression to get the value (e.g., "{{contact.email}}" or static value)
}

// On failure behavior options
export type OnFailureBehavior = "stop" | "continue" | "retry";

export interface CallSubWorkflowData extends BaseNodeData {
  label: string;
  targetWorkflowId: string | null; // ID of the sub-workflow to call
  targetWorkflowName: string | null; // Display name for UI
  executionMode: ExecutionMode; // "sync" or "async"
  inputMappings: InputMapping[]; // Map parent data to sub-workflow inputs
  timeoutSeconds: number; // Timeout for sync mode (0 = no timeout)
  onFailure: OnFailureBehavior; // What to do if sub-workflow fails
  retryCount?: number; // Number of retries if onFailure is "retry"
}

// Union type for all node data
export type WorkflowNodeData =
  | TriggerStartData
  | TimeDelayData
  | ConditionalSplitData
  | SendSmsData
  | SendEmailData
  | UpdateStatusData
  | StopOnReplyData
  | ReturnToParentData
  | CallSubWorkflowData;

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
export type ReturnToParentNode = Node<ReturnToParentData, "return_to_parent">;
export type CallSubWorkflowNode = Node<CallSubWorkflowData, "call_sub_workflow">;

export type WorkflowNode =
  | TriggerStartNode
  | TimeDelayNode
  | ConditionalSplitNode
  | SendSmsNode
  | SendEmailNode
  | UpdateStatusNode
  | StopOnReplyNode
  | ReturnToParentNode
  | CallSubWorkflowNode;

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
    defaultData: {
      label: "Start",
      triggerConfig: { type: "manual" },
    } as TriggerStartData,
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
      conditionGroups: [],  // Empty array - createDefaultNode will populate with fresh IDs
      groupOperator: "AND",
    } as ConditionalSplitData,
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
  {
    type: "return_to_parent",
    label: "Return to Parent",
    description: "Return data to parent workflow",
    icon: "CornerUpLeft",
    category: "action",
    defaultData: {
      label: "Return to Parent",
      outputVariables: [],
      returnStatus: "success",
    } as ReturnToParentData,
  },
  {
    type: "call_sub_workflow",
    label: "Call Sub-Workflow",
    description: "Execute another workflow",
    icon: "Workflow",
    category: "action",
    defaultData: {
      label: "Call Sub-Workflow",
      targetWorkflowId: null,
      targetWorkflowName: null,
      executionMode: "sync",
      inputMappings: [],
      timeoutSeconds: 300,
      onFailure: "stop",
    } as CallSubWorkflowData,
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

  // Special handling for conditional_split to generate unique IDs
  const data =
    type === "conditional_split"
      ? createDefaultConditionalSplitData()
      : { ...config.defaultData };

  return {
    id: crypto.randomUUID(),
    type,
    position,
    data,
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

// =============================================================================
// Condition Helpers
// =============================================================================

// Create a new empty condition
export function createCondition(
  field: string = "",
  operator: ComparisonOperator = "equals",
  value: string = ""
): Condition {
  return {
    id: crypto.randomUUID(),
    field,
    operator,
    value,
  };
}

// Create a new condition group with one empty condition
export function createConditionGroup(
  logicalOperator: LogicalOperator = "AND"
): ConditionGroup {
  return {
    id: crypto.randomUUID(),
    conditions: [createCondition()],
    logicalOperator,
  };
}

// Create default ConditionalSplitData
export function createDefaultConditionalSplitData(): ConditionalSplitData {
  return {
    label: "Check condition",
    conditionGroups: [createConditionGroup()],
    groupOperator: "AND",
  };
}

// Migrate legacy single-condition data to new format
export function migrateConditionalSplitData(
  data: ConditionalSplitData
): ConditionalSplitData {
  // If already has conditionGroups, return as-is
  if (data.conditionGroups && data.conditionGroups.length > 0) {
    return data;
  }

  // Migrate legacy format (field, operator, value) to new format
  const legacyField = data.field || "";
  const legacyOperator = data.operator || "equals";
  const legacyValue = data.value || "";

  return {
    label: data.label,
    conditionGroups: [
      {
        id: crypto.randomUUID(),
        conditions: [
          {
            id: crypto.randomUUID(),
            field: legacyField,
            operator: legacyOperator,
            value: legacyValue,
          },
        ],
        logicalOperator: "AND",
      },
    ],
    groupOperator: "AND",
  };
}

// Count total conditions across all groups
export function countConditions(data: ConditionalSplitData): number {
  if (!data.conditionGroups) return 0;
  return data.conditionGroups.reduce(
    (sum, group) => sum + (group.conditions?.length || 0),
    0
  );
}

// Check if complexity warning should be shown
export function shouldShowComplexityWarning(data: ConditionalSplitData): boolean {
  const groupCount = data.conditionGroups?.length || 0;
  const conditionCount = countConditions(data);
  return groupCount >= 5 || conditionCount >= 10;
}

// Format conditions for display (summary text)
export function formatConditionSummary(data: ConditionalSplitData): string {
  const groupCount = data.conditionGroups?.length || 0;
  const conditionCount = countConditions(data);

  if (conditionCount === 0) {
    return "No conditions set";
  }

  if (conditionCount === 1 && groupCount === 1) {
    const condition = data.conditionGroups[0]?.conditions[0];
    if (condition) {
      const opDisplay = OPERATOR_DISPLAY_NAMES[condition.operator] || condition.operator;
      if (condition.operator === "is_empty" || condition.operator === "is_not_empty") {
        return `${condition.field} ${opDisplay}`;
      }
      return `${condition.field} ${opDisplay} ${condition.value}`;
    }
  }

  // Multiple conditions: show summary
  const conditionText = conditionCount === 1 ? "condition" : "conditions";
  if (groupCount === 1) {
    return `${conditionCount} ${conditionText}`;
  }
  const groupText = groupCount === 1 ? "group" : "groups";
  return `${conditionCount} ${conditionText} (${groupCount} ${groupText})`;
}

// Format trigger config for display
export function formatTriggerConfig(config: TriggerConfig): string {
  switch (config.type) {
    case "manual":
      return "Click Run to start";
    case "contact_added":
      return "When contact is created";
    case "tag_added": {
      const tagCount = config.tagIds.length;
      if (tagCount === 0) return "Select tags to watch";
      const mode = config.matchMode === "all" ? "all of" : "any of";
      return `When ${mode} ${tagCount} tag${tagCount > 1 ? "s" : ""} added`;
    }
    case "scheduled": {
      if (config.scheduleType === "once") {
        if (!config.runAt) return "Set date and time";
        return `Once at ${new Date(config.runAt).toLocaleDateString()}`;
      }
      if (!config.frequency || !config.time) return "Set schedule";
      const timeStr = config.time;
      switch (config.frequency) {
        case "daily":
          return `Daily at ${timeStr}`;
        case "weekly": {
          const days = config.daysOfWeek || [];
          if (days.length === 0) return "Select days";
          const dayNames = days.map((d) => DAY_OF_WEEK_SHORT[d]).join(", ");
          return `${dayNames} at ${timeStr}`;
        }
        case "monthly":
          return `Monthly on day ${config.dayOfMonth || "?"} at ${timeStr}`;
        default:
          return "Set schedule";
      }
    }
    case "status_changed": {
      const statusCount = config.statuses.length;
      if (statusCount === 0) return "Select statuses to watch";
      if (statusCount === 1)
        return `When status is ${STATUS_DISPLAY_NAMES[config.statuses[0]]}`;
      return `When status is any of ${statusCount} values`;
    }
    case "sub_workflow": {
      const inputCount = config.inputVariables.length;
      const mode = config.executionMode === "sync" ? "Sync" : "Async";
      return `${mode}, ${inputCount} input${inputCount !== 1 ? "s" : ""}`;
    }
    default:
      return "Configure trigger";
  }
}
