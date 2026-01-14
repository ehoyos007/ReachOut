// =============================================================================
// Contact Types
// =============================================================================

// Contact status values (matching workflow.ts definition)
export type ContactStatus =
  | "new"
  | "contacted"
  | "responded"
  | "qualified"
  | "disqualified";

export interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: "new" | "contacted" | "responded" | "qualified" | "disqualified";
  do_not_contact: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactWithRelations extends Contact {
  tags: Tag[];
  custom_fields: ContactFieldValue[];
}

// =============================================================================
// Custom Field Types
// =============================================================================

export type CustomFieldType = "text" | "number" | "date" | "select";

export interface CustomField {
  id: string;
  name: string;
  field_type: CustomFieldType;
  options: string[] | null; // For select type
  is_required: boolean;
  created_at: string;
}

export interface ContactFieldValue {
  id: string;
  contact_id: string;
  field_id: string;
  field_name?: string; // Joined from custom_fields
  field_type?: CustomFieldType; // Joined from custom_fields
  value: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Tag Types
// =============================================================================

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ContactTag {
  contact_id: string;
  tag_id: string;
  created_at: string;
}

// =============================================================================
// Database Types (Supabase)
// =============================================================================

export interface DbContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  do_not_contact: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbCustomField {
  id: string;
  name: string;
  field_type: string;
  options: string[] | null;
  is_required: boolean;
  created_at: string;
}

export interface DbContactFieldValue {
  id: string;
  contact_id: string;
  field_id: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface DbContactTag {
  contact_id: string;
  tag_id: string;
  created_at: string;
}

// =============================================================================
// Form/Input Types
// =============================================================================

export interface CreateContactInput {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: Contact["status"];
  do_not_contact?: boolean;
  tags?: string[]; // Tag IDs
  custom_fields?: Record<string, string>; // field_id -> value
}

export interface UpdateContactInput extends Partial<CreateContactInput> {
  id: string;
}

export interface CreateCustomFieldInput {
  name: string;
  field_type: CustomFieldType;
  options?: string[];
  is_required?: boolean;
}

export interface UpdateCustomFieldInput extends Partial<CreateCustomFieldInput> {
  id: string;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface UpdateTagInput extends Partial<CreateTagInput> {
  id: string;
}

// =============================================================================
// Filter & Pagination Types
// =============================================================================

export interface ContactFilters {
  search?: string; // Search in first_name, last_name, email, phone
  status?: Contact["status"][];
  tags?: string[]; // Tag IDs
  do_not_contact?: boolean;
}

export interface ContactPagination {
  page: number;
  pageSize: number;
  sortBy: keyof Contact;
  sortOrder: "asc" | "desc";
}

export interface ContactListResponse {
  contacts: ContactWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// =============================================================================
// CSV Import Types
// =============================================================================

export interface CsvColumn {
  header: string;
  sample: string[];
}

export interface CsvMapping {
  csvColumn: string;
  targetField: string | null; // null = skip column
}

export interface CsvImportPreview {
  columns: CsvColumn[];
  rowCount: number;
  previewRows: Record<string, string>[];
}

export interface CsvImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: CsvImportError[];
}

export interface CsvImportError {
  row: number;
  field: string;
  value: string;
  message: string;
}

// =============================================================================
// Constants
// =============================================================================

export const STATUS_DISPLAY_NAMES: Record<ContactStatus, string> = {
  new: "New",
  contacted: "Contacted",
  responded: "Responded",
  qualified: "Qualified",
  disqualified: "Disqualified",
};

export const FIELD_TYPE_DISPLAY_NAMES: Record<CustomFieldType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  select: "Select",
};

export const DEFAULT_TAG_COLORS = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#f59e0b", // Amber
  "#84cc16", // Lime
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#a855f7", // Purple
  "#d946ef", // Fuchsia
  "#ec4899", // Pink
  "#64748b", // Slate
];

// Standard fields that can be mapped during CSV import
export const STANDARD_CONTACT_FIELDS = [
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "status", label: "Status" },
] as const;

// =============================================================================
// Helper Functions
// =============================================================================

export function getContactDisplayName(contact: Contact): string {
  if (contact.first_name && contact.last_name) {
    return `${contact.first_name} ${contact.last_name}`;
  }
  if (contact.first_name) {
    return contact.first_name;
  }
  if (contact.last_name) {
    return contact.last_name;
  }
  if (contact.email) {
    return contact.email;
  }
  if (contact.phone) {
    return contact.phone;
  }
  return "Unknown Contact";
}

export function getContactInitials(contact: Contact): string {
  const first = contact.first_name?.[0]?.toUpperCase() || "";
  const last = contact.last_name?.[0]?.toUpperCase() || "";

  if (first && last) {
    return `${first}${last}`;
  }
  if (first) {
    return first;
  }
  if (last) {
    return last;
  }
  if (contact.email) {
    return contact.email[0].toUpperCase();
  }
  return "?";
}

export function formatPhoneNumber(phone: string | null): string {
  if (!phone) return "";

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "");

  // Format as (XXX) XXX-XXXX for US numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // Format as +X (XXX) XXX-XXXX for numbers with country code
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Return as-is if doesn't match expected formats
  return phone;
}

export function normalizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters except leading +
  const hasPlus = phone.startsWith("+");
  const cleaned = phone.replace(/\D/g, "");

  // Add + back if it was there
  return hasPlus ? `+${cleaned}` : cleaned;
}
