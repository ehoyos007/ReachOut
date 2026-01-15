import type { TemplateVariable, TemplateParseResult } from "@/types/sendgrid";
import { HANDLEBARS_BUILT_INS, CONTACT_FIELD_MAPPINGS } from "@/types/sendgrid";

// =============================================================================
// Variable Extraction
// =============================================================================

/**
 * Extract all Handlebars variables from template HTML and subject
 */
export function extractTemplateVariables(
  htmlContent: string,
  subject: string
): TemplateParseResult {
  const variables = new Map<string, TemplateVariable>();
  let hasConditionals = false;
  let hasIterators = false;

  // Regex patterns
  // Simple and triple-brace variables: {{var}}, {{{var}}}, {{ var }}
  const variablePattern = /\{\{\{?\s*([a-zA-Z_][a-zA-Z0-9_\.]*)\s*\}?\}\}/g;

  // Block helpers: {{#each items}}, {{#if condition}}, {{#with context}}
  const blockPattern = /\{\{#(each|if|unless|with)\s+([a-zA-Z_][a-zA-Z0-9_\.]*)/g;

  // Closing block helpers: {{/each}}, {{/if}}, etc.
  const closingBlockPattern = /\{\{\/(each|if|unless|with)\}\}/g;

  // Parse subject
  parseContent(subject, 'subject', variables, variablePattern, blockPattern);

  // Parse body
  parseContent(htmlContent, 'body', variables, variablePattern, blockPattern);

  // Check for conditionals and iterators
  if (closingBlockPattern.test(htmlContent) || closingBlockPattern.test(subject)) {
    // Reset patterns for re-testing
    closingBlockPattern.lastIndex = 0;
    blockPattern.lastIndex = 0;
  }

  const fullContent = htmlContent + subject;
  hasConditionals = /\{\{#(if|unless)\s+/i.test(fullContent);
  hasIterators = /\{\{#each\s+/i.test(fullContent);

  // Filter out built-ins and add auto-mapping suggestions
  const filteredVariables = Array.from(variables.values())
    .filter((v) => !HANDLEBARS_BUILT_INS.has(v.name))
    .map((v) => ({
      ...v,
      suggestedMapping: getAutoMapping(v.name),
    }));

  return {
    variables: filteredVariables,
    hasConditionals,
    hasIterators,
  };
}

/**
 * Parse content for variables and add to the map
 */
function parseContent(
  content: string,
  location: 'subject' | 'body',
  variables: Map<string, TemplateVariable>,
  variablePattern: RegExp,
  blockPattern: RegExp
): void {
  // Track which variables are inside conditional blocks (optional)
  const conditionalVariables = new Set<string>();

  // Find variables inside conditional blocks
  const conditionalBlockPattern = /\{\{#(?:if|unless)\s+([a-zA-Z_][a-zA-Z0-9_\.]*)[^}]*\}\}([\s\S]*?)\{\{\/(?:if|unless)\}\}/g;
  let conditionalMatch;
  while ((conditionalMatch = conditionalBlockPattern.exec(content)) !== null) {
    // The condition variable itself
    const conditionVar = conditionalMatch[1];
    conditionalVariables.add(conditionVar);

    // Variables inside the conditional block are optional
    const blockContent = conditionalMatch[2];
    let innerMatch;
    const innerPattern = /\{\{\{?\s*([a-zA-Z_][a-zA-Z0-9_\.]*)\s*\}?\}\}/g;
    while ((innerMatch = innerPattern.exec(blockContent)) !== null) {
      const varName = innerMatch[1];
      if (!HANDLEBARS_BUILT_INS.has(varName)) {
        conditionalVariables.add(varName);
      }
    }
  }

  // Reset pattern index
  variablePattern.lastIndex = 0;

  // Find all simple variables
  let match;
  while ((match = variablePattern.exec(content)) !== null) {
    const fullPath = match[1];
    const name = getRootVariable(fullPath);

    if (HANDLEBARS_BUILT_INS.has(name)) {
      continue;
    }

    const existing = variables.get(name);
    const isRequired = !conditionalVariables.has(name);

    if (existing) {
      // Add this location if not already present
      if (!existing.locations.includes(location)) {
        existing.locations.push(location);
      }
      // A variable is required if it appears outside any conditional
      if (isRequired) {
        existing.isRequired = true;
      }
    } else {
      variables.set(name, {
        name,
        fullPath,
        locations: [location],
        isRequired,
      });
    }
  }

  // Find block helper arguments
  blockPattern.lastIndex = 0;
  while ((match = blockPattern.exec(content)) !== null) {
    const helperType = match[1]; // each, if, unless, with
    const fullPath = match[2];
    const name = getRootVariable(fullPath);

    if (HANDLEBARS_BUILT_INS.has(name)) {
      continue;
    }

    const existing = variables.get(name);
    // Block helper variables are typically required (especially for #each)
    const isRequired = helperType === 'each' || helperType === 'with';

    if (existing) {
      if (!existing.locations.includes(location)) {
        existing.locations.push(location);
      }
      if (isRequired) {
        existing.isRequired = true;
      }
    } else {
      variables.set(name, {
        name,
        fullPath,
        locations: [location],
        isRequired,
      });
    }
  }
}

/**
 * Get the root variable name from a path (e.g., "contact.first_name" -> "contact")
 */
function getRootVariable(fullPath: string): string {
  const parts = fullPath.split('.');
  return parts[0];
}

// =============================================================================
// Auto-Mapping
// =============================================================================

/**
 * Get auto-mapping suggestion for a variable name
 */
export function getAutoMapping(variableName: string): string | undefined {
  const normalized = variableName.toLowerCase();
  return CONTACT_FIELD_MAPPINGS[normalized];
}

/**
 * Get all possible auto-mappings for a list of variables
 */
export function getAutoMappings(
  variables: TemplateVariable[]
): Record<string, string> {
  const mappings: Record<string, string> = {};

  for (const variable of variables) {
    const mapping = getAutoMapping(variable.name);
    if (mapping) {
      mappings[variable.name] = mapping;
    }
  }

  return mappings;
}

// =============================================================================
// Preview Rendering
// =============================================================================

/**
 * Render template preview by replacing variables with values
 */
export function renderTemplatePreview(
  htmlContent: string,
  subject: string,
  variables: Record<string, string>
): { html: string; subject: string; missingVariables: string[] } {
  let renderedHtml = htmlContent;
  let renderedSubject = subject;
  const missingVariables: string[] = [];

  // Get all variable names from the content
  const allVarPattern = /\{\{\{?\s*([a-zA-Z_][a-zA-Z0-9_\.]*)\s*\}?\}\}/g;
  const foundVars = new Set<string>();

  let match;
  while ((match = allVarPattern.exec(htmlContent + subject)) !== null) {
    const varName = match[1];
    if (!HANDLEBARS_BUILT_INS.has(varName)) {
      foundVars.add(varName);
    }
  }

  // Replace each variable
  for (const [key, value] of Object.entries(variables)) {
    // Match {{var}}, {{{var}}}, and {{ var }} with spaces
    const pattern = new RegExp(
      `\\{\\{\\{?\\s*${escapeRegex(key)}\\s*\\}?\\}\\}`,
      'g'
    );

    const displayValue = value || `[${key}]`;
    renderedHtml = renderedHtml.replace(pattern, displayValue);
    renderedSubject = renderedSubject.replace(pattern, displayValue);
  }

  // Find missing variables (in template but not in values)
  Array.from(foundVars).forEach((varName) => {
    if (!(varName in variables) || !variables[varName]) {
      missingVariables.push(varName);
    }
  });

  // Highlight remaining unresolved variables
  const unresolvedPattern = /\{\{\{?\s*([a-zA-Z_][a-zA-Z0-9_\.]*)\s*\}?\}\}/g;
  renderedHtml = renderedHtml.replace(unresolvedPattern, (match, varName) => {
    if (HANDLEBARS_BUILT_INS.has(varName)) {
      return match; // Keep built-ins as-is
    }
    return `<span style="color: #ef4444; background: #fef2f2; padding: 0 4px; border-radius: 2px;">[${varName}]</span>`;
  });

  renderedSubject = renderedSubject.replace(unresolvedPattern, (match, varName) => {
    if (HANDLEBARS_BUILT_INS.has(varName)) {
      return match;
    }
    return `[${varName}]`;
  });

  return { html: renderedHtml, subject: renderedSubject, missingVariables };
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert snake_case to Title Case for display
 */
export function snakeCaseToTitleCase(str: string): string {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get display label for a variable
 */
export function getVariableLabel(variable: TemplateVariable): string {
  return snakeCaseToTitleCase(variable.name);
}

/**
 * Check if all required variables have values
 */
export function validateVariables(
  variables: TemplateVariable[],
  values: Record<string, string>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const variable of variables) {
    if (variable.isRequired && (!values[variable.name] || values[variable.name].trim() === '')) {
      missing.push(variable.name);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Contact-like object for building dynamic data
 */
interface ContactLike {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

/**
 * Build dynamic data object from contact and manual values
 */
export function buildDynamicData(
  variables: TemplateVariable[],
  values: Record<string, string>,
  contact?: ContactLike
): Record<string, string> {
  const dynamicData: Record<string, string> = {};

  for (const variable of variables) {
    const varName = variable.name;

    // First check if there's a manual value
    if (values[varName] && values[varName].trim() !== '') {
      dynamicData[varName] = values[varName];
      continue;
    }

    // Try to get value from contact using auto-mapping
    if (contact && variable.suggestedMapping) {
      const contactField = variable.suggestedMapping;
      let contactValue: string | null | undefined = null;

      // Handle special fullName case
      if (contactField === 'fullName') {
        const fullName = [contact.first_name, contact.last_name]
          .filter(Boolean)
          .join(' ');
        if (fullName) {
          dynamicData[varName] = fullName;
          continue;
        }
      } else if (contactField === 'first_name') {
        contactValue = contact.first_name;
      } else if (contactField === 'last_name') {
        contactValue = contact.last_name;
      } else if (contactField === 'email') {
        contactValue = contact.email;
      } else if (contactField === 'phone') {
        contactValue = contact.phone;
      }

      // Use contact value if available
      if (contactValue) {
        dynamicData[varName] = contactValue;
        continue;
      }
    }

    // Use empty string as fallback
    dynamicData[varName] = values[varName] || '';
  }

  return dynamicData;
}
