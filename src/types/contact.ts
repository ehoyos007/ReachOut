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

// Basic filters (for backward compatibility)
export interface ContactFilters {
  search?: string; // Search in first_name, last_name, email, phone
  status?: Contact["status"][];
  tags?: string[]; // Tag IDs
  do_not_contact?: boolean;
}

// =============================================================================
// Advanced Filter Types
// =============================================================================

// Filter operators by field type
export type TextOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty";

export type NumberOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "between"
  | "is_empty"
  | "is_not_empty";

export type DateOperator =
  | "equals"
  | "before"
  | "after"
  | "between"
  | "is_empty"
  | "is_not_empty"
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "this_month"
  | "this_year";

export type TagOperator =
  | "has_any"
  | "has_all"
  | "has_none";

export type StatusOperator =
  | "is"
  | "is_not";

export type BooleanOperator =
  | "is_true"
  | "is_false";

export type FilterOperator = TextOperator | NumberOperator | DateOperator | TagOperator | StatusOperator | BooleanOperator;

// Filter field types
export type FilterFieldType = "text" | "number" | "date" | "status" | "tags" | "boolean";

// Standard filterable fields
export interface FilterableField {
  id: string;
  label: string;
  type: FilterFieldType;
  field: string; // The actual field name in the contact object
}

// A single filter condition
export interface FilterCondition {
  id: string;
  field: string; // Field name (e.g., "first_name", "status", "tags")
  fieldType: FilterFieldType;
  operator: FilterOperator;
  value: string | string[] | null; // Value(s) to compare against
  value2?: string | null; // For "between" operators
}

// Filter group with logic
export interface FilterGroup {
  id: string;
  logic: "and" | "or";
  conditions: FilterCondition[];
}

// Advanced filters structure
export interface AdvancedFilters {
  groups: FilterGroup[];
  groupLogic: "and" | "or"; // Logic between groups
}

// =============================================================================
// Saved Views Types
// =============================================================================

export interface SavedView {
  id: string;
  name: string;
  filters: AdvancedFilters;
  icon: string;
  color: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSavedViewInput {
  name: string;
  filters: AdvancedFilters;
  icon?: string;
  color?: string;
  is_default?: boolean;
}

export interface UpdateSavedViewInput extends Partial<CreateSavedViewInput> {
  id: string;
}

// =============================================================================
// Filter Constants
// =============================================================================

export const STANDARD_FILTERABLE_FIELDS: FilterableField[] = [
  { id: "first_name", label: "First Name", type: "text", field: "first_name" },
  { id: "last_name", label: "Last Name", type: "text", field: "last_name" },
  { id: "email", label: "Email", type: "text", field: "email" },
  { id: "phone", label: "Phone", type: "text", field: "phone" },
  { id: "status", label: "Status", type: "status", field: "status" },
  { id: "tags", label: "Tags", type: "tags", field: "tags" },
  { id: "do_not_contact", label: "Do Not Contact", type: "boolean", field: "do_not_contact" },
  { id: "created_at", label: "Created Date", type: "date", field: "created_at" },
  { id: "updated_at", label: "Updated Date", type: "date", field: "updated_at" },
];

export const TEXT_OPERATORS: { value: TextOperator; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "starts_with", label: "starts with" },
  { value: "ends_with", label: "ends with" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

export const NUMBER_OPERATORS: { value: NumberOperator; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "greater_than", label: "is greater than" },
  { value: "less_than", label: "is less than" },
  { value: "between", label: "is between" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

export const DATE_OPERATORS: { value: DateOperator; label: string }[] = [
  { value: "equals", label: "is on" },
  { value: "before", label: "is before" },
  { value: "after", label: "is after" },
  { value: "between", label: "is between" },
  { value: "last_7_days", label: "in last 7 days" },
  { value: "last_30_days", label: "in last 30 days" },
  { value: "last_90_days", label: "in last 90 days" },
  { value: "this_month", label: "this month" },
  { value: "this_year", label: "this year" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

export const TAG_OPERATORS: { value: TagOperator; label: string }[] = [
  { value: "has_any", label: "has any of" },
  { value: "has_all", label: "has all of" },
  { value: "has_none", label: "has none of" },
];

export const STATUS_OPERATORS: { value: StatusOperator; label: string }[] = [
  { value: "is", label: "is" },
  { value: "is_not", label: "is not" },
];

export const BOOLEAN_OPERATORS: { value: BooleanOperator; label: string }[] = [
  { value: "is_true", label: "is true" },
  { value: "is_false", label: "is false" },
];

export const SAVED_VIEW_ICONS = [
  "filter",
  "users",
  "star",
  "heart",
  "flag",
  "bookmark",
  "zap",
  "target",
  "trending-up",
  "award",
  "briefcase",
  "phone",
  "mail",
  "clock",
];

export const SAVED_VIEW_COLORS = [
  "#6366f1", // Indigo
  "#3b82f6", // Blue
  "#14b8a6", // Teal
  "#22c55e", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#ec4899", // Pink
];

// =============================================================================
// Filter Helper Functions
// =============================================================================

export function createEmptyFilterCondition(): FilterCondition {
  return {
    id: crypto.randomUUID(),
    field: "first_name",
    fieldType: "text",
    operator: "contains",
    value: "",
  };
}

export function createEmptyFilterGroup(): FilterGroup {
  return {
    id: crypto.randomUUID(),
    logic: "and",
    conditions: [createEmptyFilterCondition()],
  };
}

export function createEmptyAdvancedFilters(): AdvancedFilters {
  return {
    groups: [],
    groupLogic: "and",
  };
}

export function getOperatorsForFieldType(fieldType: FilterFieldType): { value: string; label: string }[] {
  switch (fieldType) {
    case "text":
      return TEXT_OPERATORS;
    case "number":
      return NUMBER_OPERATORS;
    case "date":
      return DATE_OPERATORS;
    case "tags":
      return TAG_OPERATORS;
    case "status":
      return STATUS_OPERATORS;
    case "boolean":
      return BOOLEAN_OPERATORS;
    default:
      return TEXT_OPERATORS;
  }
}

export function hasActiveFilters(filters: AdvancedFilters): boolean {
  return filters.groups.length > 0 &&
    filters.groups.some(group => group.conditions.length > 0);
}

export function countActiveFilters(filters: AdvancedFilters): number {
  return filters.groups.reduce((count, group) => count + group.conditions.length, 0);
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
