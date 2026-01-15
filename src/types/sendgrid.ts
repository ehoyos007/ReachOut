// =============================================================================
// SendGrid Dynamic Template Types
// =============================================================================

/**
 * SendGrid template from list endpoint
 */
export interface SendGridTemplate {
  id: string;                      // e.g., "d-f43daeeaef504760851f727007e0b5d0"
  name: string;                    // Human-readable template name
  generation: 'dynamic' | 'legacy';
  updated_at: string;              // ISO timestamp
  versions: SendGridTemplateVersion[];
}

/**
 * Template version (each template can have multiple versions)
 */
export interface SendGridTemplateVersion {
  id: string;
  template_id: string;
  active: 0 | 1;                   // 1 = currently active version
  name: string;
  subject: string;                 // May contain {{variables}}
  html_content?: string;           // Full HTML with Handlebars syntax
  plain_content?: string;          // Plain text version
  generate_plain_content?: boolean;
  editor?: 'code' | 'design';
  thumbnail_url?: string;
}

/**
 * Full template details from single template endpoint
 */
export interface SendGridTemplateDetails {
  id: string;
  name: string;
  generation: 'dynamic' | 'legacy';
  updated_at: string;
  versions: SendGridTemplateVersion[];
}

// =============================================================================
// Template Variable Extraction Types
// =============================================================================

/**
 * Extracted variable from template parsing
 */
export interface TemplateVariable {
  name: string;                          // e.g., "first_name"
  fullPath: string;                      // e.g., "contact.first_name"
  locations: ('subject' | 'body')[];     // Where it appears
  isRequired: boolean;                   // false if inside {{#if}} block
  suggestedMapping?: string;             // Auto-mapping suggestion to contact field
}

/**
 * Result of parsing a template for variables
 */
export interface TemplateParseResult {
  variables: TemplateVariable[];
  hasConditionals: boolean;
  hasIterators: boolean;
}

// =============================================================================
// Send Email Types
// =============================================================================

/**
 * Email address with optional name
 */
export interface EmailAddress {
  email: string;
  name?: string;
}

/**
 * Parameters for sending a single email with a template
 */
export interface SendTemplateParams {
  templateId: string;
  to: EmailAddress;
  from?: EmailAddress;
  replyTo?: string;
  dynamicData: Record<string, unknown>;
}

/**
 * Recipient with dynamic data for batch sends
 */
export interface BatchRecipient {
  contact: {
    id: string;
    email: string;
    fullName?: string;
  };
  dynamicData: Record<string, unknown>;
}

/**
 * Parameters for sending batch emails with a template
 */
export interface BatchSendParams {
  templateId: string;
  recipients: BatchRecipient[];
  from?: EmailAddress;
  replyTo?: string;
}

/**
 * Result of a single send operation
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: SendGridError;
}

/**
 * Result of a batch send operation
 */
export interface BatchSendResult {
  results: SendResult[];
  totalSent: number;
  totalFailed: number;
}

// =============================================================================
// Error Types
// =============================================================================

export type SendGridErrorType =
  | 'validation'
  | 'auth'
  | 'permission'
  | 'not_found'
  | 'rate_limit'
  | 'server';

/**
 * Structured SendGrid error
 */
export interface SendGridError {
  type: SendGridErrorType;
  message: string;
  details?: Array<{ field: string; message: string }>;
  retryable: boolean;
}

/**
 * Raw error response from SendGrid API
 */
export interface SendGridApiError {
  errors?: Array<{
    message: string;
    field?: string;
    help?: string;
  }>;
}

// =============================================================================
// API Payload Types (for SendGrid API calls)
// =============================================================================

/**
 * Personalization block in SendGrid mail/send payload
 */
export interface SendGridPersonalization {
  to: EmailAddress[];
  dynamic_template_data: Record<string, unknown>;
}

/**
 * Full SendGrid mail/send payload
 */
export interface SendGridMailPayload {
  personalizations: SendGridPersonalization[];
  from: EmailAddress;
  reply_to?: EmailAddress;
  template_id: string;
}

/**
 * SendGrid API response for templates list
 */
export interface SendGridTemplatesResponse {
  result?: SendGridTemplate[];
  templates?: SendGridTemplate[];
  _metadata?: {
    self: string;
    count: number;
  };
}

// =============================================================================
// Local Cache Types (Database)
// =============================================================================

/**
 * Cached template in local database
 */
export interface CachedEmailTemplate {
  id: string;                       // UUID
  sendgrid_id: string;              // SendGrid template ID
  name: string;
  subject: string | null;
  variables: string[];              // Extracted variable names
  thumbnail_url: string | null;
  is_active: boolean;
  synced_at: string;                // ISO timestamp
  created_at: string;
}

/**
 * Input for creating/updating cached template
 */
export interface UpsertEmailTemplateInput {
  sendgrid_id: string;
  name: string;
  subject?: string | null;
  variables?: string[];
  thumbnail_url?: string | null;
  is_active?: boolean;
}

// =============================================================================
// UI State Types
// =============================================================================

/**
 * Template selector state
 */
export interface TemplateSelectionState {
  templates: SendGridTemplate[];
  selectedTemplate: SendGridTemplateDetails | null;
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
}

/**
 * Variable mapping state for the form
 */
export interface VariableMappingState {
  variables: TemplateVariable[];
  values: Record<string, string>;
  mappings: Record<string, string>;  // variable name -> contact field
}

/**
 * Preview state
 */
export interface PreviewState {
  renderedHtml: string;
  renderedSubject: string;
  missingVariables: string[];
  viewMode: 'desktop' | 'mobile';
}

// =============================================================================
// Constants
// =============================================================================

export const SENDGRID_BASE_URL = 'https://api.sendgrid.com/v3';

export const SENDGRID_BATCH_SIZE = 1000;

export const TEMPLATE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Contact field mappings for auto-suggestions
 */
export const CONTACT_FIELD_MAPPINGS: Record<string, string> = {
  // Name variations
  'first_name': 'first_name',
  'firstname': 'first_name',
  'first': 'first_name',
  'last_name': 'last_name',
  'lastname': 'last_name',
  'last': 'last_name',
  'name': 'fullName',
  'full_name': 'fullName',
  'fullname': 'fullName',

  // Contact info
  'email': 'email',
  'email_address': 'email',
  'emailaddress': 'email',
  'phone': 'phone',
  'phone_number': 'phone',
  'phonenumber': 'phone',

  // Common fields (may be custom fields)
  'company': 'company',
  'company_name': 'company',
  'companyname': 'company',
  'title': 'jobTitle',
  'job_title': 'jobTitle',
  'jobtitle': 'jobTitle',
};

/**
 * Handlebars built-in helpers to exclude from variable extraction
 */
export const HANDLEBARS_BUILT_INS = new Set([
  // Block helpers
  'if', 'else', 'unless', 'each', 'with',
  // Iteration context
  'this', 'root', 'index', 'key', 'first', 'last',
  // SendGrid helpers
  'equals', 'notEquals', 'greaterThan', 'lessThan',
  'and', 'or', 'not', 'length',
  'insert', 'default', 'formatDate',
  'concat', 'split', 'join', 'substring',
]);
