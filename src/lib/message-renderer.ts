/**
 * Message Renderer Utility
 *
 * Provides message rendering with variable substitution and preview marking
 * for the message preview feature.
 */

import {
  extractPlaceholders,
  replacePlaceholders,
  getSamplePlaceholderValues,
  STANDARD_PLACEHOLDERS,
} from "@/types/template";

// =============================================================================
// Types
// =============================================================================

export interface RenderMessageOptions {
  /** The template text containing {{variable}} placeholders */
  template: string;
  /** Custom test data to use for variable substitution */
  testData?: Record<string, string>;
  /** Whether to use default values for missing variables */
  useDefaults?: boolean;
}

export interface RenderMessageResult {
  /** The rendered message with variables substituted */
  rendered: string;
  /** Variables that were found in the template */
  variables: string[];
  /** Variables that had values (from testData or defaults) */
  resolvedVariables: Record<string, string>;
  /** Variables that remained unresolved (no value available) */
  unresolvedVariables: string[];
}

export interface PreviewMarkingOptions {
  /** The message channel */
  channel: "sms" | "email";
  /** The rendered message body */
  body: string;
  /** The rendered subject (email only) */
  subject?: string;
}

export interface MarkedPreviewResult {
  /** The body with preview marking applied */
  body: string;
  /** The subject with preview marking applied (email only) */
  subject?: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Default test data values for preview rendering */
export const DEFAULT_TEST_DATA: Record<string, string> = {
  first_name: "John",
  last_name: "Smith",
  full_name: "John Smith",
  email: "john.smith@example.com",
  phone: "(555) 123-4567",
  company: "Acme Inc",
  title: "Manager",
  city: "New York",
  state: "NY",
};

/** SMS preview prefix */
const SMS_PREVIEW_PREFIX = "[PREVIEW] ";

/** Email subject preview prefix */
const EMAIL_SUBJECT_PREFIX = "[PREVIEW] ";

/** Email body preview banner (HTML) */
const EMAIL_PREVIEW_BANNER = `<div style="background: #FEF3C7; padding: 12px; margin-bottom: 16px; border-radius: 4px; border: 1px solid #F59E0B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">
  <strong style="color: #92400E;">Preview Message</strong><br>
  <span style="color: #78350F;">This is a test message. The actual recipient will not see this banner.</span>
</div>`;

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Render a message template with variable substitution
 *
 * @param options - Rendering options including template and test data
 * @returns Rendered message with metadata about variable resolution
 */
export function renderMessage(options: RenderMessageOptions): RenderMessageResult {
  const { template, testData = {}, useDefaults = true } = options;

  // Extract variables from template
  const variables = extractPlaceholders(template);

  // Build the values map, merging test data with defaults
  const resolvedVariables: Record<string, string> = {};
  const unresolvedVariables: string[] = [];

  for (const variable of variables) {
    if (testData[variable] !== undefined && testData[variable] !== "") {
      // Use provided test data
      resolvedVariables[variable] = testData[variable];
    } else if (useDefaults && DEFAULT_TEST_DATA[variable] !== undefined) {
      // Fall back to defaults
      resolvedVariables[variable] = DEFAULT_TEST_DATA[variable];
    } else {
      // No value available
      unresolvedVariables.push(variable);
    }
  }

  // Render the template
  const rendered = replacePlaceholders(template, resolvedVariables);

  return {
    rendered,
    variables,
    resolvedVariables,
    unresolvedVariables,
  };
}

/**
 * Mark a message as a preview by adding appropriate prefix/banner
 *
 * @param options - The message content and channel
 * @returns The marked message with preview indicators
 */
export function markAsPreview(options: PreviewMarkingOptions): MarkedPreviewResult {
  const { channel, body, subject } = options;

  if (channel === "sms") {
    return {
      body: SMS_PREVIEW_PREFIX + body,
    };
  }

  // Email channel
  return {
    subject: subject ? EMAIL_SUBJECT_PREFIX + subject : undefined,
    body: EMAIL_PREVIEW_BANNER + body,
  };
}

/**
 * Render a message and mark it as a preview in one step
 *
 * @param channel - The message channel (sms or email)
 * @param body - The body template
 * @param subject - The subject template (email only)
 * @param testData - Custom test data for variable substitution
 * @returns The fully rendered and marked preview content
 */
export function renderPreviewMessage(
  channel: "sms" | "email",
  body: string,
  subject?: string,
  testData?: Record<string, string>
): {
  body: string;
  subject?: string;
  renderedValues: Record<string, string>;
  unresolvedVariables: string[];
} {
  // Render body
  const bodyResult = renderMessage({
    template: body,
    testData,
    useDefaults: true,
  });

  // Render subject (email only)
  let subjectResult: RenderMessageResult | null = null;
  if (channel === "email" && subject) {
    subjectResult = renderMessage({
      template: subject,
      testData,
      useDefaults: true,
    });
  }

  // Combine rendered values and unresolved variables
  const renderedValues = {
    ...bodyResult.resolvedVariables,
    ...(subjectResult?.resolvedVariables || {}),
  };
  const unresolvedVariables = Array.from(
    new Set([
      ...bodyResult.unresolvedVariables,
      ...(subjectResult?.unresolvedVariables || []),
    ])
  );

  // Mark as preview
  const marked = markAsPreview({
    channel,
    body: bodyResult.rendered,
    subject: subjectResult?.rendered,
  });

  return {
    body: marked.body,
    subject: marked.subject,
    renderedValues,
    unresolvedVariables,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get all variables from both body and subject templates
 */
export function extractAllVariables(body: string, subject?: string): string[] {
  const bodyVars = extractPlaceholders(body);
  const subjectVars = subject ? extractPlaceholders(subject) : [];
  return Array.from(new Set([...bodyVars, ...subjectVars]));
}

/**
 * Get default test data merged with custom overrides
 */
export function getTestDataWithDefaults(
  customData?: Record<string, string>
): Record<string, string> {
  return {
    ...DEFAULT_TEST_DATA,
    ...customData,
  };
}

/**
 * Get placeholder info for a given key
 */
export function getPlaceholderInfo(key: string): {
  label: string;
  description: string;
  example: string;
} | null {
  const placeholder = STANDARD_PLACEHOLDERS.find((p) => p.key === key);
  if (placeholder) {
    return {
      label: placeholder.label,
      description: placeholder.description,
      example: placeholder.example,
    };
  }

  // For custom/unknown placeholders, generate a friendly label
  if (key.startsWith("custom_")) {
    const name = key.replace("custom_", "").replace(/_/g, " ");
    return {
      label: name.charAt(0).toUpperCase() + name.slice(1),
      description: "Custom field",
      example: "Value",
    };
  }

  return {
    label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: "Custom variable",
    example: DEFAULT_TEST_DATA[key] || "Value",
  };
}

/**
 * Validate a phone number format (basic E.164 check)
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Accept formats: +15551234567, 5551234567, (555) 123-4567
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  return /^\+?1?\d{10,14}$/.test(cleaned);
}

/**
 * Validate an email address format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Re-export commonly used functions from template.ts for convenience
export { extractPlaceholders, replacePlaceholders, getSamplePlaceholderValues };
