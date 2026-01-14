// Workflow Executor Module
// This module handles the execution of workflows, including:
// - Enrolling contacts in workflows
// - Processing workflow steps
// - Node-specific processors for each node type

export {
  processExecution,
  enrollContact,
  enrollContacts,
  type ExecutionResult,
  type EnrollContactResult,
} from "./executor";

export {
  nodeProcessors,
  getNodeProcessor,
  getNextNodeId,
} from "./node-processors";
