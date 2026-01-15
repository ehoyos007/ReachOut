import type {
  WorkflowNodeType,
  TimeDelayData,
  ConditionalSplitData,
  SendSmsData,
  SendEmailData,
  UpdateStatusData,
  StopOnReplyData,
  ReturnToParentData,
  ComparisonOperator,
} from "@/types/workflow";
import type {
  NodeProcessor,
  NodeProcessorContext,
  NodeProcessorResult,
} from "@/types/execution";
import { calculateNextRunAt } from "@/types/execution";
import { sendSms, SendSmsParams } from "@/lib/twilio";
import { sendEmail, SendEmailParams } from "@/lib/sendgrid";
import {
  getSettings,
  getTemplate,
  updateContact,
  createMessage,
  hasInboundMessageSince,
} from "@/lib/supabase";
import type { TwilioSettings, SendGridSettings } from "@/types/message";
import { contactToPlaceholderValues, replacePlaceholders } from "@/types/template";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the next node ID from the workflow edges
 */
export function getNextNodeId(
  workflow: NodeProcessorContext["workflow"],
  currentNodeId: string,
  sourceHandle?: string | null
): string | null {
  const edge = workflow.edges.find(
    (e) =>
      e.source === currentNodeId &&
      (sourceHandle === undefined || e.sourceHandle === sourceHandle)
  );
  return edge?.target || null;
}

/**
 * Load Twilio settings from database
 */
async function getTwilioSettings(): Promise<TwilioSettings | null> {
  try {
    const settings = await getSettings();
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    const accountSid = settingsMap.get("twilio_account_sid");
    const authToken = settingsMap.get("twilio_auth_token");
    const phoneNumber = settingsMap.get("twilio_phone_number");

    if (!accountSid || !authToken || !phoneNumber) {
      return null;
    }

    return {
      account_sid: accountSid,
      auth_token: authToken,
      phone_number: phoneNumber,
    };
  } catch {
    return null;
  }
}

/**
 * Load SendGrid settings from database
 */
async function getSendGridSettings(): Promise<SendGridSettings | null> {
  try {
    const settings = await getSettings();
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    const apiKey = settingsMap.get("sendgrid_api_key");
    const fromEmail = settingsMap.get("sendgrid_from_email");
    const fromName = settingsMap.get("sendgrid_from_name") || "";

    if (!apiKey || !fromEmail) {
      return null;
    }

    return {
      api_key: apiKey,
      from_email: fromEmail,
      from_name: fromName,
    };
  } catch {
    return null;
  }
}

/**
 * Evaluate a conditional expression
 */
function evaluateCondition(
  fieldValue: string | null | undefined,
  operator: ComparisonOperator,
  compareValue: string
): boolean {
  const value = fieldValue || "";

  switch (operator) {
    case "equals":
      return value.toLowerCase() === compareValue.toLowerCase();
    case "not_equals":
      return value.toLowerCase() !== compareValue.toLowerCase();
    case "contains":
      return value.toLowerCase().includes(compareValue.toLowerCase());
    case "not_contains":
      return !value.toLowerCase().includes(compareValue.toLowerCase());
    case "greater_than":
      return parseFloat(value) > parseFloat(compareValue);
    case "less_than":
      return parseFloat(value) < parseFloat(compareValue);
    case "is_empty":
      return !value || value.trim() === "";
    case "is_not_empty":
      return !!value && value.trim() !== "";
    default:
      return false;
  }
}

/**
 * Get contact field value by field name
 */
function getContactFieldValue(
  context: NodeProcessorContext,
  fieldName: string
): string | null {
  const contact = context.contact;

  // Check standard fields first
  const standardFields: Record<string, string | null> = {
    first_name: contact.first_name,
    last_name: contact.last_name,
    email: contact.email,
    phone: contact.phone,
    status: contact.status,
  };

  if (fieldName in standardFields) {
    return standardFields[fieldName];
  }

  // Check custom fields
  const customField = contact.custom_fields?.find(
    (f) => f.field_name?.toLowerCase() === fieldName.toLowerCase()
  );

  return customField?.value || null;
}

// =============================================================================
// Node Processors
// =============================================================================

/**
 * Trigger Start Node - Entry point, immediately move to next node
 */
export const triggerStartProcessor: NodeProcessor = {
  async execute(node, context): Promise<NodeProcessorResult> {
    const nextNodeId = getNextNodeId(context.workflow, node.id);

    return {
      nextNodeId,
      nextRunAt: null, // Execute next node immediately
      outputData: { action: "workflow_started" },
    };
  },
};

/**
 * Time Delay Node - Wait for specified duration before continuing
 */
export const timeDelayProcessor: NodeProcessor = {
  async execute(node, context): Promise<NodeProcessorResult> {
    const data = node.data as TimeDelayData;
    const nextNodeId = getNextNodeId(context.workflow, node.id);
    const nextRunAt = calculateNextRunAt(data.duration, data.unit);

    return {
      nextNodeId,
      nextRunAt,
      outputData: {
        action: "delay_scheduled",
        duration: data.duration,
        unit: data.unit,
        scheduled_for: nextRunAt.toISOString(),
      },
    };
  },
};

/**
 * Conditional Split Node - Evaluate condition and branch
 */
export const conditionalSplitProcessor: NodeProcessor = {
  async execute(node, context): Promise<NodeProcessorResult> {
    const data = node.data as ConditionalSplitData;

    // Get the field value from the contact
    const fieldValue = getContactFieldValue(context, data.field);

    // Evaluate the condition
    const result = evaluateCondition(fieldValue, data.operator, data.value);

    // Find the appropriate edge based on result
    // Yes edge has sourceHandle "yes", No edge has sourceHandle "no"
    const sourceHandle = result ? "yes" : "no";
    const nextNodeId = getNextNodeId(context.workflow, node.id, sourceHandle);

    return {
      nextNodeId,
      nextRunAt: null, // Execute next node immediately
      executionData: {
        last_condition_result: result,
      },
      outputData: {
        action: "condition_evaluated",
        field: data.field,
        operator: data.operator,
        value: data.value,
        field_value: fieldValue,
        result,
        branch: result ? "yes" : "no",
      },
    };
  },
};

/**
 * Send SMS Node - Send SMS message to contact
 */
export const sendSmsProcessor: NodeProcessor = {
  async execute(node, context): Promise<NodeProcessorResult> {
    const data = node.data as SendSmsData;
    const { contact, execution } = context;

    // Check if contact has a phone number
    if (!contact.phone) {
      return {
        nextNodeId: getNextNodeId(context.workflow, node.id),
        nextRunAt: null,
        outputData: {
          action: "sms_skipped",
          reason: "no_phone_number",
        },
      };
    }

    // Check do_not_contact flag
    if (contact.do_not_contact) {
      return {
        nextNodeId: getNextNodeId(context.workflow, node.id),
        nextRunAt: null,
        outputData: {
          action: "sms_skipped",
          reason: "do_not_contact",
        },
      };
    }

    // Load Twilio settings
    const twilioSettings = await getTwilioSettings();
    if (!twilioSettings) {
      return {
        nextNodeId: null,
        nextRunAt: null,
        error: "Twilio is not configured",
        outputData: {
          action: "sms_failed",
          reason: "twilio_not_configured",
        },
      };
    }

    // Get template and replace placeholders
    let messageBody = "";
    if (data.templateId) {
      const template = await getTemplate(data.templateId);
      if (template) {
        const placeholderValues = contactToPlaceholderValues(contact);
        messageBody = replacePlaceholders(template.body, placeholderValues);
      }
    }

    if (!messageBody) {
      return {
        nextNodeId: getNextNodeId(context.workflow, node.id),
        nextRunAt: null,
        outputData: {
          action: "sms_skipped",
          reason: "no_template",
        },
      };
    }

    // Create message record
    const message = await createMessage({
      contact_id: contact.id,
      channel: "sms",
      direction: "outbound",
      body: messageBody,
      status: "queued",
      source: "workflow",
      template_id: data.templateId,
      workflow_execution_id: execution.id,
    });

    // Send SMS
    const smsParams: SendSmsParams = {
      to: contact.phone,
      body: messageBody,
      from: data.fromNumber || twilioSettings.phone_number,
    };

    const result = await sendSms(twilioSettings, smsParams);

    // Update message record with result
    if (result.success) {
      await createMessage({
        contact_id: contact.id,
        channel: "sms",
        direction: "outbound",
        body: messageBody,
        status: "sent",
        source: "workflow",
        provider_id: result.sid,
        template_id: data.templateId,
        workflow_execution_id: execution.id,
      });

      const sentMessageIds = execution.execution_data.sent_message_ids || [];

      return {
        nextNodeId: getNextNodeId(context.workflow, node.id),
        nextRunAt: null,
        executionData: {
          sent_message_ids: [...sentMessageIds, message.id],
        },
        outputData: {
          action: "sms_sent",
          message_id: message.id,
          provider_id: result.sid,
        },
      };
    } else {
      return {
        nextNodeId: getNextNodeId(context.workflow, node.id),
        nextRunAt: null,
        error: result.error,
        outputData: {
          action: "sms_failed",
          message_id: message.id,
          error: result.error,
          error_code: result.errorCode,
        },
      };
    }
  },
};

/**
 * Send Email Node - Send email to contact
 */
export const sendEmailProcessor: NodeProcessor = {
  async execute(node, context): Promise<NodeProcessorResult> {
    const data = node.data as SendEmailData;
    const { contact, execution } = context;

    // Check if contact has an email
    if (!contact.email) {
      return {
        nextNodeId: getNextNodeId(context.workflow, node.id),
        nextRunAt: null,
        outputData: {
          action: "email_skipped",
          reason: "no_email",
        },
      };
    }

    // Check do_not_contact flag
    if (contact.do_not_contact) {
      return {
        nextNodeId: getNextNodeId(context.workflow, node.id),
        nextRunAt: null,
        outputData: {
          action: "email_skipped",
          reason: "do_not_contact",
        },
      };
    }

    // Load SendGrid settings
    const sendGridSettings = await getSendGridSettings();
    if (!sendGridSettings) {
      return {
        nextNodeId: null,
        nextRunAt: null,
        error: "SendGrid is not configured",
        outputData: {
          action: "email_failed",
          reason: "sendgrid_not_configured",
        },
      };
    }

    // Get template and replace placeholders
    let messageBody = "";
    let subject = "";
    if (data.templateId) {
      const template = await getTemplate(data.templateId);
      if (template) {
        const placeholderValues = contactToPlaceholderValues(contact);
        messageBody = replacePlaceholders(template.body, placeholderValues);
        subject = data.subjectOverride
          ? replacePlaceholders(data.subjectOverride, placeholderValues)
          : replacePlaceholders(template.subject || "", placeholderValues);
      }
    }

    if (!messageBody || !subject) {
      return {
        nextNodeId: getNextNodeId(context.workflow, node.id),
        nextRunAt: null,
        outputData: {
          action: "email_skipped",
          reason: "no_template_or_subject",
        },
      };
    }

    // Create message record
    const message = await createMessage({
      contact_id: contact.id,
      channel: "email",
      direction: "outbound",
      subject,
      body: messageBody,
      status: "queued",
      source: "workflow",
      template_id: data.templateId,
      workflow_execution_id: execution.id,
    });

    // Send email
    const emailParams: SendEmailParams = {
      to: contact.email,
      subject,
      body: messageBody,
      from: data.fromEmail
        ? { email: data.fromEmail }
        : { email: sendGridSettings.from_email, name: sendGridSettings.from_name },
    };

    const result = await sendEmail(sendGridSettings, emailParams);

    if (result.success) {
      const sentMessageIds = execution.execution_data.sent_message_ids || [];

      return {
        nextNodeId: getNextNodeId(context.workflow, node.id),
        nextRunAt: null,
        executionData: {
          sent_message_ids: [...sentMessageIds, message.id],
        },
        outputData: {
          action: "email_sent",
          message_id: message.id,
          provider_id: result.messageId,
        },
      };
    } else {
      return {
        nextNodeId: getNextNodeId(context.workflow, node.id),
        nextRunAt: null,
        error: result.error,
        outputData: {
          action: "email_failed",
          message_id: message.id,
          error: result.error,
        },
      };
    }
  },
};

/**
 * Update Status Node - Update contact status
 */
export const updateStatusProcessor: NodeProcessor = {
  async execute(node, context): Promise<NodeProcessorResult> {
    const data = node.data as UpdateStatusData;
    const { contact } = context;

    // Update the contact status
    await updateContact({
      id: contact.id,
      status: data.newStatus,
    });

    return {
      nextNodeId: getNextNodeId(context.workflow, node.id),
      nextRunAt: null,
      outputData: {
        action: "status_updated",
        old_status: contact.status,
        new_status: data.newStatus,
      },
    };
  },
};

/**
 * Stop on Reply Node - Check if contact replied and stop workflow if so
 */
export const stopOnReplyProcessor: NodeProcessor = {
  async execute(node, context): Promise<NodeProcessorResult> {
    const data = node.data as StopOnReplyData;
    const { contact, enrollment } = context;

    // Check for inbound messages since enrollment
    const channel = data.channel === "any" ? undefined : data.channel;
    const result = await hasInboundMessageSince(
      contact.id,
      enrollment.enrolled_at,
      channel
    );

    if (result.hasMessage) {
      // Stop the workflow
      return {
        nextNodeId: null,
        nextRunAt: null,
        stopEnrollment: true,
        stopReason: `Contact replied via ${result.channel}`,
        executionData: {
          stopped_by_reply: true,
          reply_channel: result.channel,
        },
        outputData: {
          action: "workflow_stopped",
          reason: "contact_replied",
          reply_channel: result.channel,
        },
      };
    }

    // No reply, continue (but stop_on_reply is typically a terminal node)
    // If there's a next node, proceed; otherwise mark as completed
    const nextNodeId = getNextNodeId(context.workflow, node.id);

    return {
      nextNodeId,
      nextRunAt: null,
      outputData: {
        action: "no_reply_detected",
        channel_checked: data.channel,
      },
    };
  },
};

// =============================================================================
// Return to Parent Processor
// =============================================================================

/**
 * Return to Parent Node - Returns data to the parent workflow (for sub-workflows)
 */
export const returnToParentProcessor: NodeProcessor = {
  async execute(node): Promise<NodeProcessorResult> {
    const data = node.data as ReturnToParentData;

    // In a real implementation, this would:
    // 1. Look up the parent execution context
    // 2. Serialize the output variables
    // 3. Signal the parent workflow to resume
    // For now, we just mark this as a terminal node

    const outputVariables: Record<string, unknown> = {};
    for (const variable of data.outputVariables || []) {
      // In a real implementation, we'd evaluate the value expression
      // For now, just store the raw value reference
      outputVariables[variable.name] = variable.value;
    }

    // Return to parent is always a terminal node
    return {
      nextNodeId: null, // Terminal node
      nextRunAt: null,
      outputData: {
        action: "return_to_parent",
        returnStatus: data.returnStatus,
        customStatusField: data.customStatusField,
        outputVariables,
      },
    };
  },
};

// =============================================================================
// Processor Registry
// =============================================================================

export const nodeProcessors: Record<WorkflowNodeType, NodeProcessor> = {
  trigger_start: triggerStartProcessor,
  time_delay: timeDelayProcessor,
  conditional_split: conditionalSplitProcessor,
  send_sms: sendSmsProcessor,
  send_email: sendEmailProcessor,
  update_status: updateStatusProcessor,
  stop_on_reply: stopOnReplyProcessor,
  return_to_parent: returnToParentProcessor,
};

/**
 * Get the processor for a node type
 */
export function getNodeProcessor(
  nodeType: WorkflowNodeType
): NodeProcessor | undefined {
  return nodeProcessors[nodeType];
}
