// =============================================================================
// Template Types
// =============================================================================

export type TemplateChannel = "sms" | "email";

export interface Template {
  id: string;
  name: string;
  channel: TemplateChannel;
  subject: string | null; // For email only
  body: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Database Types (Supabase)
// =============================================================================

export interface DbTemplate {
  id: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Form/Input Types
// =============================================================================

export interface CreateTemplateInput {
  name: string;
  channel: TemplateChannel;
  subject?: string | null;
  body: string;
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  id: string;
}

// =============================================================================
// Filter Types
// =============================================================================

export interface TemplateFilters {
  search?: string; // Search in name, subject, body
  channel?: TemplateChannel;
}

// =============================================================================
// Placeholder Types
// =============================================================================

export interface TemplatePlaceholder {
  key: string;
  label: string;
  description: string;
  example: string;
}

// =============================================================================
// Constants
// =============================================================================

export const CHANNEL_DISPLAY_NAMES: Record<TemplateChannel, string> = {
  sms: "SMS",
  email: "Email",
};

export const CHANNEL_ICONS: Record<TemplateChannel, string> = {
  sms: "MessageSquare",
  email: "Mail",
};

// SMS character limits
export const SMS_SEGMENT_SIZE = 160;
export const SMS_UNICODE_SEGMENT_SIZE = 70;
export const SMS_MAX_SEGMENTS = 10;
export const SMS_MAX_LENGTH = SMS_SEGMENT_SIZE * SMS_MAX_SEGMENTS;

// Standard placeholders available in templates
export const STANDARD_PLACEHOLDERS: TemplatePlaceholder[] = [
  {
    key: "first_name",
    label: "First Name",
    description: "Contact's first name",
    example: "John",
  },
  {
    key: "last_name",
    label: "Last Name",
    description: "Contact's last name",
    example: "Doe",
  },
  {
    key: "full_name",
    label: "Full Name",
    description: "Contact's full name (first + last)",
    example: "John Doe",
  },
  {
    key: "email",
    label: "Email",
    description: "Contact's email address",
    example: "john@example.com",
  },
  {
    key: "phone",
    label: "Phone",
    description: "Contact's phone number",
    example: "(555) 123-4567",
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract placeholder keys from template body
 * Placeholders are in the format {{key}}
 */
export function extractPlaceholders(text: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const matches: string[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }

  return matches;
}

/**
 * Replace placeholders in template with values
 */
export function replacePlaceholders(
  text: string,
  values: Record<string, string>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values[key] !== undefined ? values[key] : match;
  });
}

/**
 * Validate that all placeholders in template have values
 */
export function validatePlaceholders(
  text: string,
  values: Record<string, string>
): { valid: boolean; missing: string[] } {
  const placeholders = extractPlaceholders(text);
  const missing = placeholders.filter(
    (key) => values[key] === undefined || values[key] === ""
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Calculate SMS segment count based on content
 */
export function calculateSmsSegments(text: string): {
  segments: number;
  charactersUsed: number;
  charactersPerSegment: number;
  isUnicode: boolean;
} {
  // Check if text contains non-GSM characters (requires Unicode encoding)
  const gsmChars =
    /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-.\/0-9:;<=>?A-Za-z¡ÄÖÑÜ§¿äöñüà^{}\[~\]|€]*$/;
  const isUnicode = !gsmChars.test(text);

  const segmentSize = isUnicode ? SMS_UNICODE_SEGMENT_SIZE : SMS_SEGMENT_SIZE;

  // For concatenated SMS, each segment has fewer characters due to UDH header
  const concatenatedSegmentSize = isUnicode ? 67 : 153;

  const length = text.length;

  let segments: number;
  if (length <= segmentSize) {
    segments = 1;
  } else {
    segments = Math.ceil(length / concatenatedSegmentSize);
  }

  return {
    segments,
    charactersUsed: length,
    charactersPerSegment: length <= segmentSize ? segmentSize : concatenatedSegmentSize,
    isUnicode,
  };
}

/**
 * Generate sample values for template preview
 */
export function getSamplePlaceholderValues(): Record<string, string> {
  return {
    first_name: "John",
    last_name: "Doe",
    full_name: "John Doe",
    email: "john@example.com",
    phone: "(555) 123-4567",
  };
}

/**
 * Convert contact data to placeholder values
 */
export function contactToPlaceholderValues(contact: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
}): Record<string, string> {
  const fullName = [contact.first_name, contact.last_name]
    .filter(Boolean)
    .join(" ");

  return {
    first_name: contact.first_name || "",
    last_name: contact.last_name || "",
    full_name: fullName || "",
    email: contact.email || "",
    phone: contact.phone || "",
  };
}
