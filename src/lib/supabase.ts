import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  DbWorkflow,
  DbWorkflowNode,
  DbWorkflowEdge,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowNodeData,
} from "@/types/workflow";
import { Edge } from "@xyflow/react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create Supabase client only if credentials are configured
// This allows the app to build without Supabase configured
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

// Helper to get Supabase client or throw helpful error
function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
    );
  }
  return supabase;
}

// =============================================================================
// Workflow Operations
// =============================================================================

export async function getWorkflows(): Promise<DbWorkflow[]> {
  const { data, error } = await getSupabase()
    .from("workflows")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export interface SubWorkflowInfo {
  id: string;
  name: string;
  inputVariables: Array<{
    name: string;
    type: string;
    description?: string;
    required?: boolean;
    defaultValue?: unknown;
  }>;
  executionMode: "sync" | "async";
}

/**
 * Get all workflows configured as sub-workflows (with sub_workflow trigger type)
 * Returns workflow info along with their input variable definitions
 */
export async function getSubWorkflows(): Promise<SubWorkflowInfo[]> {
  const client = getSupabase();

  // Get all workflows with their trigger nodes
  const { data: workflows, error: workflowError } = await client
    .from("workflows")
    .select("id, name")
    .order("name", { ascending: true });

  if (workflowError) throw workflowError;
  if (!workflows || workflows.length === 0) return [];

  // Get trigger nodes for all workflows
  const { data: triggerNodes, error: nodeError } = await client
    .from("workflow_nodes")
    .select("workflow_id, data")
    .eq("type", "trigger_start")
    .in("workflow_id", workflows.map(w => w.id));

  if (nodeError) throw nodeError;

  // Filter and map workflows that have sub_workflow trigger
  const subWorkflows: SubWorkflowInfo[] = [];

  for (const workflow of workflows) {
    const triggerNode = triggerNodes?.find(n => n.workflow_id === workflow.id);
    if (!triggerNode) continue;

    const data = triggerNode.data as { triggerConfig?: { type: string; inputVariables?: unknown[]; executionMode?: string } };
    if (data.triggerConfig?.type !== "sub_workflow") continue;

    subWorkflows.push({
      id: workflow.id,
      name: workflow.name,
      inputVariables: (data.triggerConfig.inputVariables || []) as SubWorkflowInfo["inputVariables"],
      executionMode: (data.triggerConfig.executionMode || "sync") as "sync" | "async",
    });
  }

  return subWorkflows;
}

export async function getWorkflow(id: string): Promise<DbWorkflow | null> {
  const { data, error } = await getSupabase()
    .from("workflows")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }
  return data;
}

export async function createWorkflow(
  name: string,
  description?: string
): Promise<DbWorkflow> {
  const { data, error } = await getSupabase()
    .from("workflows")
    .insert({
      name,
      description: description || null,
      is_enabled: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateWorkflow(
  id: string,
  updates: Partial<Pick<DbWorkflow, "name" | "description" | "is_enabled">>
): Promise<DbWorkflow> {
  const { data, error } = await getSupabase()
    .from("workflows")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWorkflow(id: string): Promise<void> {
  const { error } = await getSupabase().from("workflows").delete().eq("id", id);
  if (error) throw error;
}

// =============================================================================
// Workflow Nodes Operations
// =============================================================================

export async function getWorkflowNodes(
  workflowId: string
): Promise<DbWorkflowNode[]> {
  const { data, error } = await getSupabase()
    .from("workflow_nodes")
    .select("*")
    .eq("workflow_id", workflowId);

  if (error) throw error;
  return data || [];
}

export async function saveWorkflowNodes(
  workflowId: string,
  nodes: WorkflowNode[]
): Promise<void> {
  const client = getSupabase();

  // Delete existing nodes
  const { error: deleteError } = await client
    .from("workflow_nodes")
    .delete()
    .eq("workflow_id", workflowId);

  if (deleteError) throw deleteError;

  // Insert new nodes if there are any
  if (nodes.length > 0) {
    const dbNodes: Omit<DbWorkflowNode, "created_at">[] = nodes.map((node) => ({
      id: node.id,
      workflow_id: workflowId,
      type: node.type as WorkflowNodeType,
      position_x: node.position.x,
      position_y: node.position.y,
      data: node.data as WorkflowNodeData,
    }));

    const { error: insertError } = await client
      .from("workflow_nodes")
      .insert(dbNodes);

    if (insertError) throw insertError;
  }
}

// =============================================================================
// Workflow Edges Operations
// =============================================================================

export async function getWorkflowEdges(
  workflowId: string
): Promise<DbWorkflowEdge[]> {
  const { data, error } = await getSupabase()
    .from("workflow_edges")
    .select("*")
    .eq("workflow_id", workflowId);

  if (error) throw error;
  return data || [];
}

export async function saveWorkflowEdges(
  workflowId: string,
  edges: Edge[]
): Promise<void> {
  const client = getSupabase();

  // Delete existing edges
  const { error: deleteError } = await client
    .from("workflow_edges")
    .delete()
    .eq("workflow_id", workflowId);

  if (deleteError) throw deleteError;

  // Insert new edges if there are any
  if (edges.length > 0) {
    const dbEdges: Omit<DbWorkflowEdge, "id">[] = edges.map((edge) => ({
      id: edge.id,
      workflow_id: workflowId,
      source_node_id: edge.source,
      target_node_id: edge.target,
      source_handle: edge.sourceHandle || null,
      target_handle: edge.targetHandle || null,
      label: typeof edge.label === "string" ? edge.label : null,
    }));

    const { error: insertError } = await client
      .from("workflow_edges")
      .insert(dbEdges);

    if (insertError) throw insertError;
  }
}

// =============================================================================
// Combined Operations
// =============================================================================

export async function loadWorkflowWithNodesAndEdges(workflowId: string): Promise<{
  workflow: DbWorkflow;
  nodes: WorkflowNode[];
  edges: Edge[];
} | null> {
  const workflow = await getWorkflow(workflowId);
  if (!workflow) return null;

  const [dbNodes, dbEdges] = await Promise.all([
    getWorkflowNodes(workflowId),
    getWorkflowEdges(workflowId),
  ]);

  // Convert DB nodes to React Flow nodes
  const nodes: WorkflowNode[] = dbNodes.map((dbNode) => ({
    id: dbNode.id,
    type: dbNode.type,
    position: { x: dbNode.position_x, y: dbNode.position_y },
    data: dbNode.data,
  })) as WorkflowNode[];

  // Convert DB edges to React Flow edges
  const edges: Edge[] = dbEdges.map((dbEdge) => ({
    id: dbEdge.id,
    source: dbEdge.source_node_id,
    target: dbEdge.target_node_id,
    sourceHandle: dbEdge.source_handle,
    targetHandle: dbEdge.target_handle,
    label: dbEdge.label,
  }));

  return { workflow, nodes, edges };
}

export async function saveWorkflowNodesAndEdges(
  workflowId: string,
  nodes: WorkflowNode[],
  edges: Edge[]
): Promise<void> {
  // Must save nodes first because edges have foreign key references to nodes
  await saveWorkflowNodes(workflowId, nodes);
  await saveWorkflowEdges(workflowId, edges);
  await updateWorkflow(workflowId, {});
}

// =============================================================================
// Contact Operations
// =============================================================================

import type {
  Contact,
  ContactWithRelations,
  CustomField,
  ContactFieldValue,
  Tag,
  ContactFilters,
  ContactPagination,
  ContactListResponse,
  CreateContactInput,
  UpdateContactInput,
  CreateCustomFieldInput,
  UpdateCustomFieldInput,
  CreateTagInput,
  UpdateTagInput,
} from "@/types/contact";

export async function getContacts(
  filters?: ContactFilters,
  pagination?: Partial<ContactPagination>
): Promise<ContactListResponse> {
  const client = getSupabase();

  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 25;
  const sortBy = pagination?.sortBy ?? "created_at";
  const sortOrder = pagination?.sortOrder ?? "desc";

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Build query
  let query = client
    .from("contacts")
    .select("*", { count: "exact" });

  // Apply filters
  if (filters?.search) {
    const search = `%${filters.search}%`;
    query = query.or(
      `first_name.ilike.${search},last_name.ilike.${search},email.ilike.${search},phone.ilike.${search}`
    );
  }

  if (filters?.status && filters.status.length > 0) {
    query = query.in("status", filters.status);
  }

  if (filters?.do_not_contact !== undefined) {
    query = query.eq("do_not_contact", filters.do_not_contact);
  }

  // Apply sorting and pagination
  query = query
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  // Fetch tags for all contacts in the result
  const contactIds = (data || []).map((c) => c.id);
  const contactsWithRelations = await enrichContactsWithRelations(data || [], contactIds);

  // Apply tag filter after fetching (Supabase doesn't easily support filtering by junction table)
  let filteredContacts = contactsWithRelations;
  if (filters?.tags && filters.tags.length > 0) {
    filteredContacts = contactsWithRelations.filter((contact) =>
      contact.tags.some((tag) => filters.tags!.includes(tag.id))
    );
  }

  return {
    contacts: filteredContacts,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

async function enrichContactsWithRelations(
  contacts: Contact[],
  contactIds: string[]
): Promise<ContactWithRelations[]> {
  if (contactIds.length === 0) {
    return [];
  }

  const client = getSupabase();

  // Fetch tags for contacts
  const { data: contactTags, error: tagsError } = await client
    .from("contact_tags")
    .select("contact_id, tag_id, tags(*)")
    .in("contact_id", contactIds);

  if (tagsError) throw tagsError;

  // Fetch custom field values for contacts
  const { data: fieldValues, error: fieldsError } = await client
    .from("contact_field_values")
    .select("*, contact_custom_fields(name, field_type)")
    .in("contact_id", contactIds);

  if (fieldsError) throw fieldsError;

  // Group tags and field values by contact
  const tagsByContact = new Map<string, Tag[]>();
  const fieldsByContact = new Map<string, ContactFieldValue[]>();

  for (const ct of contactTags || []) {
    const tags = tagsByContact.get(ct.contact_id) || [];
    if (ct.tags) {
      // Supabase returns joined data, need to cast through unknown
      tags.push(ct.tags as unknown as Tag);
    }
    tagsByContact.set(ct.contact_id, tags);
  }

  for (const fv of fieldValues || []) {
    const fields = fieldsByContact.get(fv.contact_id) || [];
    fields.push({
      ...fv,
      field_name: fv.contact_custom_fields?.name,
      field_type: fv.contact_custom_fields?.field_type,
    });
    fieldsByContact.set(fv.contact_id, fields);
  }

  return contacts.map((contact) => ({
    ...contact,
    tags: tagsByContact.get(contact.id) || [],
    custom_fields: fieldsByContact.get(contact.id) || [],
  }));
}

export async function getContact(id: string): Promise<ContactWithRelations | null> {
  const client = getSupabase();

  const { data, error } = await client
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  const [enriched] = await enrichContactsWithRelations([data], [id]);
  return enriched;
}

export async function getContactByPhone(phone: string): Promise<ContactWithRelations | null> {
  const client = getSupabase();

  // Normalize phone number for lookup (try multiple formats)
  const normalizedPhone = phone.replace(/\D/g, "");
  const phoneVariants = [
    phone,
    normalizedPhone,
    `+${normalizedPhone}`,
    `+1${normalizedPhone}`,
    normalizedPhone.slice(-10), // Last 10 digits
  ];

  const { data, error } = await client
    .from("contacts")
    .select("*")
    .or(phoneVariants.map(p => `phone.ilike.%${p.slice(-10)}`).join(","))
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  const [enriched] = await enrichContactsWithRelations([data], [data.id]);
  return enriched;
}

export async function getContactByEmail(email: string): Promise<ContactWithRelations | null> {
  const client = getSupabase();

  const { data, error } = await client
    .from("contacts")
    .select("*")
    .ilike("email", email)
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  const [enriched] = await enrichContactsWithRelations([data], [data.id]);
  return enriched;
}

export async function createContact(input: CreateContactInput): Promise<ContactWithRelations> {
  const client = getSupabase();

  // Create the contact
  const { data: contact, error: contactError } = await client
    .from("contacts")
    .insert({
      first_name: input.first_name || null,
      last_name: input.last_name || null,
      email: input.email || null,
      phone: input.phone || null,
      status: input.status || "new",
      do_not_contact: input.do_not_contact || false,
    })
    .select()
    .single();

  if (contactError) throw contactError;

  // Add tags if provided
  if (input.tags && input.tags.length > 0) {
    const { error: tagsError } = await client.from("contact_tags").insert(
      input.tags.map((tagId) => ({
        contact_id: contact.id,
        tag_id: tagId,
      }))
    );
    if (tagsError) throw tagsError;
  }

  // Add custom field values if provided
  if (input.custom_fields) {
    const fieldEntries = Object.entries(input.custom_fields);
    if (fieldEntries.length > 0) {
      const { error: fieldsError } = await client.from("contact_field_values").insert(
        fieldEntries.map(([fieldId, value]) => ({
          contact_id: contact.id,
          field_id: fieldId,
          value,
        }))
      );
      if (fieldsError) throw fieldsError;
    }
  }

  const result = await getContact(contact.id);
  if (!result) throw new Error("Failed to fetch created contact");
  return result;
}

export async function updateContact(input: UpdateContactInput): Promise<ContactWithRelations> {
  const client = getSupabase();
  const { id, tags, custom_fields, ...updates } = input;

  // Update the contact
  if (Object.keys(updates).length > 0) {
    const { error: contactError } = await client
      .from("contacts")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (contactError) throw contactError;
  }

  // Update tags if provided
  if (tags !== undefined) {
    // Remove existing tags
    const { error: deleteTagsError } = await client
      .from("contact_tags")
      .delete()
      .eq("contact_id", id);

    if (deleteTagsError) throw deleteTagsError;

    // Add new tags
    if (tags.length > 0) {
      const { error: insertTagsError } = await client.from("contact_tags").insert(
        tags.map((tagId) => ({
          contact_id: id,
          tag_id: tagId,
        }))
      );
      if (insertTagsError) throw insertTagsError;
    }
  }

  // Update custom field values if provided
  if (custom_fields !== undefined) {
    // Remove existing field values
    const { error: deleteFieldsError } = await client
      .from("contact_field_values")
      .delete()
      .eq("contact_id", id);

    if (deleteFieldsError) throw deleteFieldsError;

    // Add new field values
    const fieldEntries = Object.entries(custom_fields);
    if (fieldEntries.length > 0) {
      const { error: insertFieldsError } = await client.from("contact_field_values").insert(
        fieldEntries.map(([fieldId, value]) => ({
          contact_id: id,
          field_id: fieldId,
          value,
        }))
      );
      if (insertFieldsError) throw insertFieldsError;
    }
  }

  const result = await getContact(id);
  if (!result) throw new Error("Failed to fetch updated contact");
  return result;
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await getSupabase().from("contacts").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteContacts(ids: string[]): Promise<void> {
  const { error } = await getSupabase().from("contacts").delete().in("id", ids);
  if (error) throw error;
}

// =============================================================================
// Custom Field Operations
// =============================================================================

export async function getCustomFields(): Promise<CustomField[]> {
  const { data, error } = await getSupabase()
    .from("contact_custom_fields")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createCustomField(input: CreateCustomFieldInput): Promise<CustomField> {
  const { data, error } = await getSupabase()
    .from("contact_custom_fields")
    .insert({
      name: input.name,
      field_type: input.field_type,
      options: input.options || null,
      is_required: input.is_required || false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomField(input: UpdateCustomFieldInput): Promise<CustomField> {
  const { id, ...updates } = input;

  const { data, error } = await getSupabase()
    .from("contact_custom_fields")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCustomField(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("contact_custom_fields")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// =============================================================================
// Tag Operations
// =============================================================================

export async function getTags(): Promise<Tag[]> {
  const { data, error } = await getSupabase()
    .from("tags")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createTag(input: CreateTagInput): Promise<Tag> {
  const { data, error } = await getSupabase()
    .from("tags")
    .insert({
      name: input.name,
      color: input.color || "#6366f1",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTag(input: UpdateTagInput): Promise<Tag> {
  const { id, ...updates } = input;

  const { data, error } = await getSupabase()
    .from("tags")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await getSupabase().from("tags").delete().eq("id", id);
  if (error) throw error;
}

// =============================================================================
// Template Operations
// =============================================================================

import type {
  Template,
  TemplateFilters,
  CreateTemplateInput,
  UpdateTemplateInput,
} from "@/types/template";

export async function getTemplates(filters?: TemplateFilters): Promise<Template[]> {
  const client = getSupabase();

  let query = client
    .from("templates")
    .select("*")
    .order("updated_at", { ascending: false });

  // Apply filters
  if (filters?.search) {
    const search = `%${filters.search}%`;
    query = query.or(
      `name.ilike.${search},subject.ilike.${search},body.ilike.${search}`
    );
  }

  if (filters?.channel) {
    query = query.eq("channel", filters.channel);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as Template[];
}

export async function getTemplate(id: string): Promise<Template | null> {
  const { data, error } = await getSupabase()
    .from("templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Template;
}

export async function createTemplate(input: CreateTemplateInput): Promise<Template> {
  const { data, error } = await getSupabase()
    .from("templates")
    .insert({
      name: input.name,
      channel: input.channel,
      subject: input.subject || null,
      body: input.body,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Template;
}

export async function updateTemplate(input: UpdateTemplateInput): Promise<Template> {
  const { id, ...updates } = input;

  const { data, error } = await getSupabase()
    .from("templates")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Template;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await getSupabase().from("templates").delete().eq("id", id);
  if (error) throw error;
}

// =============================================================================
// Message Operations
// =============================================================================

import type {
  Message,
  MessageFilters,
  CreateMessageInput,
  UpdateMessageInput,
  MessageChannel,
  MessageStatus,
} from "@/types/message";

export async function getMessages(
  filters?: MessageFilters,
  pagination?: { page: number; pageSize: number }
): Promise<Message[]> {
  const client = getSupabase();

  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  // Apply filters
  if (filters?.contact_id) {
    query = query.eq("contact_id", filters.contact_id);
  }

  if (filters?.channel) {
    query = query.eq("channel", filters.channel);
  }

  if (filters?.direction) {
    query = query.eq("direction", filters.direction);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  query = query.range(from, to);

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as Message[];
}

export async function getMessagesByContact(contactId: string): Promise<Message[]> {
  const { data, error } = await getSupabase()
    .from("messages")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as Message[];
}

export async function getMessage(id: string): Promise<Message | null> {
  const { data, error } = await getSupabase()
    .from("messages")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Message;
}

export async function getMessageByProviderId(providerId: string): Promise<Message | null> {
  const { data, error } = await getSupabase()
    .from("messages")
    .select("*")
    .eq("provider_id", providerId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Message;
}

export async function createMessage(input: CreateMessageInput): Promise<Message> {
  const { data, error } = await getSupabase()
    .from("messages")
    .insert({
      contact_id: input.contact_id,
      channel: input.channel,
      direction: input.direction,
      subject: input.subject || null,
      body: input.body,
      status: input.status || "queued",
      source: input.source || "manual",
      provider_id: input.provider_id || null,
      provider_error: input.provider_error || null,
      template_id: input.template_id || null,
      workflow_execution_id: input.workflow_execution_id || null,
      scheduled_at: input.scheduled_at || null,
      from_identity: input.from_identity || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Message;
}

export async function updateMessage(input: UpdateMessageInput): Promise<Message> {
  const { id, ...updates } = input;

  const updateData: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await getSupabase()
    .from("messages")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Message;
}

export async function deleteMessage(id: string): Promise<void> {
  const { error } = await getSupabase().from("messages").delete().eq("id", id);
  if (error) throw error;
}

export async function getMessageCount(filters?: MessageFilters): Promise<number> {
  const client = getSupabase();

  let query = client
    .from("messages")
    .select("*", { count: "exact", head: true });

  // Apply filters
  if (filters?.contact_id) {
    query = query.eq("contact_id", filters.contact_id);
  }

  if (filters?.channel) {
    query = query.eq("channel", filters.channel);
  }

  if (filters?.direction) {
    query = query.eq("direction", filters.direction);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const { count, error } = await query;

  if (error) throw error;
  return count || 0;
}

// =============================================================================
// Sent Messages with Contact (for Sent Messages Dashboard)
// =============================================================================

export interface SentMessageWithContact extends Message {
  contact?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    tags?: Array<{
      tag: {
        id: string;
        name: string;
        color: string;
      };
    }>;
  };
}

export type SentMessagesSortField = "sent_at" | "created_at" | "status" | "channel";
export type SentMessagesSortOrder = "asc" | "desc";

export interface SentMessagesFilters {
  channel?: MessageChannel;
  status?: MessageStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: SentMessagesSortField;
  sortOrder?: SentMessagesSortOrder;
}

export interface SentMessagesResult {
  messages: SentMessageWithContact[];
  total: number;
}

export async function getSentMessagesWithContact(
  filters?: SentMessagesFilters,
  pagination?: { page: number; pageSize: number }
): Promise<SentMessagesResult> {
  const client = getSupabase();

  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Determine sort field and order
  const sortBy = filters?.sortBy || "created_at";
  const sortOrder = filters?.sortOrder || "desc";
  const ascending = sortOrder === "asc";

  let query = client
    .from("messages")
    .select(
      `
      *,
      contact:contacts!messages_contact_id_fkey (
        id,
        first_name,
        last_name,
        email,
        phone,
        tags:contact_tags (
          tag:tags (
            id,
            name,
            color
          )
        )
      )
    `,
      { count: "exact" }
    )
    .eq("direction", "outbound")
    .order(sortBy, { ascending });

  // Apply filters
  if (filters?.channel) {
    query = query.eq("channel", filters.channel);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  // Apply search - searches in body and subject
  if (filters?.search) {
    query = query.or(
      `body.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`
    );
  }

  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) throw error;
  return {
    messages: (data || []) as SentMessageWithContact[],
    total: count || 0,
  };
}

// =============================================================================
// Contact Events Operations (Timeline)
// =============================================================================

import type {
  ContactEvent,
  CreateContactEventInput,
  TimelineResponse,
} from "@/types/timeline";
import {
  mergeAndSortEvents,
  createContactCreatedEvent,
} from "@/lib/timeline-utils";

export async function getContactEvents(contactId: string): Promise<ContactEvent[]> {
  const { data, error } = await getSupabase()
    .from("contact_events")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as ContactEvent[];
}

export async function getContactEventsPaginated(
  contactId: string,
  options?: { before?: string; limit?: number }
): Promise<ContactEvent[]> {
  const limit = options?.limit ?? 30;

  let query = getSupabase()
    .from("contact_events")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.before) {
    query = query.lt("created_at", options.before);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as ContactEvent[];
}

export async function createContactEvent(
  input: CreateContactEventInput
): Promise<ContactEvent> {
  const { data, error } = await getSupabase()
    .from("contact_events")
    .insert({
      contact_id: input.contact_id,
      event_type: input.event_type,
      content: input.content || null,
      direction: input.direction || null,
      metadata: input.metadata || {},
      created_by: input.created_by || null,
      created_at: input.created_at || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as ContactEvent;
}

export async function deleteContactEvent(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("contact_events")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Fetch unified timeline for a contact
 * Merges messages and contact_events, sorted by created_at descending
 */
export async function getContactTimeline(
  contactId: string,
  options?: { before?: string; limit?: number; includeCreated?: boolean }
): Promise<TimelineResponse> {
  const limit = options?.limit ?? 30;

  // Fetch both sources in parallel
  const [messagesResult, eventsResult] = await Promise.all([
    (async () => {
      let query = getSupabase()
        .from("messages")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (options?.before) {
        query = query.lt("created_at", options.before);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Message[];
    })(),
    getContactEventsPaginated(contactId, { before: options?.before, limit }),
  ]);

  // Merge and sort
  const merged = mergeAndSortEvents(messagesResult, eventsResult);

  // Take only the requested limit
  const trimmed = merged.slice(0, limit);

  // Check if there are more events to load
  const hasMore = messagesResult.length === limit || eventsResult.length === limit;

  // Get the cursor for the next page
  const nextCursor = trimmed.length > 0 ? trimmed[trimmed.length - 1].created_at : null;

  return {
    events: trimmed,
    hasMore,
    nextCursor,
  };
}

/**
 * Fetch full timeline including contact created event
 * Useful for initial timeline load
 */
export async function getContactTimelineWithCreated(
  contactId: string,
  contactCreatedAt: string,
  options?: { before?: string; limit?: number }
): Promise<TimelineResponse> {
  const response = await getContactTimeline(contactId, options);

  // If we're on the last page and there are no more events,
  // add the "created" event at the end
  if (!response.hasMore && response.events.length > 0) {
    const oldestEvent = response.events[response.events.length - 1];
    const createdEventTime = new Date(contactCreatedAt).getTime();
    const oldestEventTime = new Date(oldestEvent.created_at).getTime();

    // Only add if the created event would be older than all current events
    if (createdEventTime <= oldestEventTime) {
      const createdEvent = createContactCreatedEvent(contactId, contactCreatedAt);
      response.events.push(createdEvent);
    }
  } else if (response.events.length === 0) {
    // No events at all - just show the created event
    const createdEvent = createContactCreatedEvent(contactId, contactCreatedAt);
    response.events.push(createdEvent);
  }

  return response;
}

// =============================================================================
// Settings Operations
// =============================================================================

import type { Setting, SettingKey, UpdateSettingsInput } from "@/types/settings";

export async function getSettings(): Promise<Setting[]> {
  const { data, error } = await getSupabase()
    .from("settings")
    .select("*")
    .order("key", { ascending: true });

  if (error) throw error;
  return (data || []) as Setting[];
}

export async function getSetting(key: SettingKey): Promise<Setting | null> {
  const { data, error } = await getSupabase()
    .from("settings")
    .select("*")
    .eq("key", key)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Setting;
}

export async function updateSetting(key: SettingKey, value: string): Promise<Setting> {
  const { data, error } = await getSupabase()
    .from("settings")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key)
    .select()
    .single();

  if (error) throw error;
  return data as Setting;
}

export async function updateSettings(updates: UpdateSettingsInput[]): Promise<void> {
  const client = getSupabase();

  // Update each setting
  for (const update of updates) {
    const { error } = await client
      .from("settings")
      .update({ value: update.value, updated_at: new Date().toISOString() })
      .eq("key", update.key);

    if (error) throw error;
  }
}

// =============================================================================
// Workflow Enrollment Operations
// =============================================================================

import type {
  WorkflowEnrollment,
  WorkflowEnrollmentWithRelations,
  WorkflowExecution,
  WorkflowExecutionLog,
  EnrollmentStatus,
  ExecutionStatus,
  EnrollmentFilters,
  ExecutionData,
} from "@/types/execution";

export async function getEnrollments(
  filters?: EnrollmentFilters
): Promise<WorkflowEnrollmentWithRelations[]> {
  const client = getSupabase();

  let query = client
    .from("workflow_enrollments")
    .select(`
      *,
      workflow:workflows(id, name, is_enabled),
      contact:contacts(*)
    `)
    .order("enrolled_at", { ascending: false });

  // Apply filters
  if (filters?.workflow_id) {
    query = query.eq("workflow_id", filters.workflow_id);
  }

  if (filters?.contact_id) {
    query = query.eq("contact_id", filters.contact_id);
  }

  if (filters?.status && filters.status.length > 0) {
    query = query.in("status", filters.status);
  }

  if (filters?.enrolled_after) {
    query = query.gte("enrolled_at", filters.enrolled_after);
  }

  if (filters?.enrolled_before) {
    query = query.lte("enrolled_at", filters.enrolled_before);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as WorkflowEnrollmentWithRelations[];
}

export async function getEnrollment(id: string): Promise<WorkflowEnrollmentWithRelations | null> {
  const { data, error } = await getSupabase()
    .from("workflow_enrollments")
    .select(`
      *,
      workflow:workflows(id, name, is_enabled),
      contact:contacts(*)
    `)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as WorkflowEnrollmentWithRelations;
}

export async function getEnrollmentByWorkflowAndContact(
  workflowId: string,
  contactId: string
): Promise<WorkflowEnrollment | null> {
  const { data, error } = await getSupabase()
    .from("workflow_enrollments")
    .select("*")
    .eq("workflow_id", workflowId)
    .eq("contact_id", contactId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as WorkflowEnrollment;
}

export async function createEnrollment(
  workflowId: string,
  contactId: string
): Promise<WorkflowEnrollment> {
  const { data, error } = await getSupabase()
    .from("workflow_enrollments")
    .insert({
      workflow_id: workflowId,
      contact_id: contactId,
      status: "active" as EnrollmentStatus,
    })
    .select()
    .single();

  if (error) throw error;
  return data as WorkflowEnrollment;
}

export async function updateEnrollment(
  id: string,
  updates: Partial<Pick<WorkflowEnrollment, "status" | "completed_at" | "stopped_at" | "stop_reason">>
): Promise<WorkflowEnrollment> {
  const { data, error } = await getSupabase()
    .from("workflow_enrollments")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as WorkflowEnrollment;
}

export async function deleteEnrollment(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("workflow_enrollments")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getEnrollmentCount(
  workflowId: string,
  status?: EnrollmentStatus[]
): Promise<number> {
  const client = getSupabase();

  let query = client
    .from("workflow_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("workflow_id", workflowId);

  if (status && status.length > 0) {
    query = query.in("status", status);
  }

  const { count, error } = await query;

  if (error) throw error;
  return count || 0;
}

// =============================================================================
// Workflow Execution Operations
// =============================================================================

export async function getExecution(id: string): Promise<WorkflowExecution | null> {
  const { data, error } = await getSupabase()
    .from("workflow_executions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as WorkflowExecution;
}

export async function getExecutionByEnrollment(
  enrollmentId: string
): Promise<WorkflowExecution | null> {
  const { data, error } = await getSupabase()
    .from("workflow_executions")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as WorkflowExecution;
}

export async function createExecution(
  enrollmentId: string,
  currentNodeId: string,
  nextRunAt?: Date
): Promise<WorkflowExecution> {
  const { data, error } = await getSupabase()
    .from("workflow_executions")
    .insert({
      enrollment_id: enrollmentId,
      current_node_id: currentNodeId,
      status: "waiting" as ExecutionStatus,
      next_run_at: nextRunAt?.toISOString() || new Date().toISOString(),
      execution_data: {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as WorkflowExecution;
}

interface ExecutionUpdateInput {
  current_node_id?: string;
  status?: ExecutionStatus;
  next_run_at?: string | Date | null;
  last_run_at?: string | Date | null;
  attempts?: number;
  error_message?: string | null;
  execution_data?: ExecutionData;
}

export async function updateExecution(
  id: string,
  updates: ExecutionUpdateInput
): Promise<WorkflowExecution> {
  const updateData: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // Handle Date objects
  if (updates.next_run_at instanceof Date) {
    updateData.next_run_at = updates.next_run_at.toISOString();
  }
  if (updates.last_run_at instanceof Date) {
    updateData.last_run_at = updates.last_run_at.toISOString();
  }

  const { data, error } = await getSupabase()
    .from("workflow_executions")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as WorkflowExecution;
}

export async function getDueExecutions(limit: number = 100): Promise<WorkflowExecution[]> {
  const { data, error } = await getSupabase()
    .from("workflow_executions")
    .select("*")
    .eq("status", "waiting")
    .lte("next_run_at", new Date().toISOString())
    .order("next_run_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data || []) as WorkflowExecution[];
}

export async function getExecutionWithDetails(id: string): Promise<{
  execution: WorkflowExecution;
  enrollment: WorkflowEnrollment;
  contact: ContactWithRelations;
} | null> {
  const client = getSupabase();

  // Get the execution
  const execution = await getExecution(id);
  if (!execution) return null;

  // Get the enrollment
  const { data: enrollment, error: enrollmentError } = await client
    .from("workflow_enrollments")
    .select("*")
    .eq("id", execution.enrollment_id)
    .single();

  if (enrollmentError) {
    if (enrollmentError.code === "PGRST116") return null;
    throw enrollmentError;
  }

  // Get the contact with relations
  const contact = await getContact(enrollment.contact_id);
  if (!contact) return null;

  return {
    execution,
    enrollment: enrollment as WorkflowEnrollment,
    contact,
  };
}

// =============================================================================
// Workflow Execution Log Operations
// =============================================================================

export async function createExecutionLog(
  log: Omit<WorkflowExecutionLog, "id" | "created_at">
): Promise<WorkflowExecutionLog> {
  const { data, error } = await getSupabase()
    .from("workflow_execution_logs")
    .insert(log)
    .select()
    .single();

  if (error) throw error;
  return data as WorkflowExecutionLog;
}

export async function getExecutionLogs(
  enrollmentId: string,
  limit: number = 100
): Promise<WorkflowExecutionLog[]> {
  const { data, error } = await getSupabase()
    .from("workflow_execution_logs")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as WorkflowExecutionLog[];
}

// =============================================================================
// Helper function to check for inbound messages (for stop on reply)
// =============================================================================

export async function hasInboundMessageSince(
  contactId: string,
  since: string,
  channel?: "sms" | "email"
): Promise<{ hasMessage: boolean; channel?: "sms" | "email" }> {
  const client = getSupabase();

  let query = client
    .from("messages")
    .select("channel")
    .eq("contact_id", contactId)
    .eq("direction", "inbound")
    .gte("created_at", since)
    .limit(1);

  if (channel) {
    query = query.eq("channel", channel);
  }

  const { data, error } = await query;

  if (error) throw error;

  if (data && data.length > 0) {
    return { hasMessage: true, channel: data[0].channel as "sms" | "email" };
  }

  return { hasMessage: false };
}

// =============================================================================
// Notification Operations
// =============================================================================

import type {
  Notification,
  NotificationWithRelations,
  CreateNotificationInput,
} from "@/types/notification";

export async function getNotifications(
  limit: number = 50,
  includeRead: boolean = true
): Promise<NotificationWithRelations[]> {
  const client = getSupabase();

  let query = client
    .from("notifications")
    .select(`
      *,
      contact:contacts(id, first_name, last_name, email, phone)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!includeRead) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as NotificationWithRelations[];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) throw error;
  return count || 0;
}

export async function getNotification(id: string): Promise<NotificationWithRelations | null> {
  const { data, error } = await getSupabase()
    .from("notifications")
    .select(`
      *,
      contact:contacts(id, first_name, last_name, email, phone)
    `)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as NotificationWithRelations;
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<Notification> {
  const { data, error } = await getSupabase()
    .from("notifications")
    .insert({
      type: input.type,
      contact_id: input.contact_id || null,
      message_id: input.message_id || null,
      workflow_id: input.workflow_id || null,
      title: input.title,
      body: input.body || null,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as Notification;
}

export async function markNotificationAsRead(id: string): Promise<Notification> {
  const { data, error } = await getSupabase()
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Notification;
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const { error } = await getSupabase()
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("is_read", false);

  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("notifications")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function deleteReadNotifications(): Promise<void> {
  const { error } = await getSupabase()
    .from("notifications")
    .delete()
    .eq("is_read", true);

  if (error) throw error;
}

// =============================================================================
// Scheduled Message Operations
// =============================================================================

import type {
  ScheduledMessageFilters,
  MessageFromIdentity,
} from "@/types/message";
import type {
  SenderEmail,
  SenderPhone,
  CreateSenderEmailInput,
  UpdateSenderEmailInput,
  CreateSenderPhoneInput,
  UpdateSenderPhoneInput,
} from "@/types/sender";

/**
 * Get scheduled messages that are due for sending
 */
export async function getDueScheduledMessages(limit: number = 100): Promise<Message[]> {
  const { data, error } = await getSupabase()
    .from("messages")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data || []) as Message[];
}

/**
 * Get all scheduled messages with optional filters
 */
export async function getScheduledMessages(
  filters?: ScheduledMessageFilters,
  pagination?: { page: number; pageSize: number }
): Promise<{ messages: Message[]; total: number }> {
  const client = getSupabase();

  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from("messages")
    .select("*, contacts(first_name, last_name, email, phone)", { count: "exact" })
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true });

  // Apply filters
  if (filters?.contact_id) {
    query = query.eq("contact_id", filters.contact_id);
  }

  if (filters?.channel) {
    query = query.eq("channel", filters.channel);
  }

  if (filters?.scheduled_after) {
    query = query.gte("scheduled_at", filters.scheduled_after);
  }

  if (filters?.scheduled_before) {
    query = query.lte("scheduled_at", filters.scheduled_before);
  }

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;
  return {
    messages: (data || []) as Message[],
    total: count || 0,
  };
}

/**
 * Cancel a scheduled message (deletes it)
 */
export async function cancelScheduledMessage(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("messages")
    .delete()
    .eq("id", id)
    .eq("status", "scheduled");

  if (error) throw error;
}

/**
 * Update a scheduled message (reschedule or modify)
 */
export async function updateScheduledMessage(
  id: string,
  updates: {
    body?: string;
    subject?: string;
    scheduled_at?: string;
    from_identity?: MessageFromIdentity | null;
  }
): Promise<Message> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.body !== undefined) updateData.body = updates.body;
  if (updates.subject !== undefined) updateData.subject = updates.subject;
  if (updates.scheduled_at !== undefined) updateData.scheduled_at = updates.scheduled_at;
  if (updates.from_identity !== undefined) updateData.from_identity = updates.from_identity;

  const { data, error } = await getSupabase()
    .from("messages")
    .update(updateData)
    .eq("id", id)
    .eq("status", "scheduled")
    .select()
    .single();

  if (error) throw error;
  return data as Message;
}

// =============================================================================
// Sender Identity Operations
// =============================================================================

/**
 * Get all sender email identities from settings
 */
export async function getSenderEmails(): Promise<SenderEmail[]> {
  const setting = await getSetting("sender_emails");
  if (!setting?.value) return [];

  try {
    return JSON.parse(setting.value) as SenderEmail[];
  } catch {
    return [];
  }
}

/**
 * Get all sender phone identities from settings
 */
export async function getSenderPhones(): Promise<SenderPhone[]> {
  const setting = await getSetting("sender_phones");
  if (!setting?.value) return [];

  try {
    return JSON.parse(setting.value) as SenderPhone[];
  } catch {
    return [];
  }
}

/**
 * Add a new sender email identity
 */
export async function addSenderEmail(input: CreateSenderEmailInput): Promise<SenderEmail> {
  const senders = await getSenderEmails();

  const newSender: SenderEmail = {
    id: crypto.randomUUID(),
    email: input.email,
    name: input.name,
    is_default: input.is_default ?? senders.length === 0,
    verified: false,
    created_at: new Date().toISOString(),
  };

  // If this is set as default, unset others
  if (newSender.is_default) {
    senders.forEach((s) => (s.is_default = false));
  }

  senders.push(newSender);
  await updateSetting("sender_emails", JSON.stringify(senders));

  return newSender;
}

/**
 * Update a sender email identity
 */
export async function updateSenderEmailIdentity(input: UpdateSenderEmailInput): Promise<SenderEmail> {
  const senders = await getSenderEmails();
  const index = senders.findIndex((s) => s.id === input.id);

  if (index === -1) {
    throw new Error("Sender email not found");
  }

  // If setting as default, unset others
  if (input.is_default === true) {
    senders.forEach((s) => (s.is_default = false));
  }

  senders[index] = {
    ...senders[index],
    ...(input.email !== undefined && { email: input.email }),
    ...(input.name !== undefined && { name: input.name }),
    ...(input.is_default !== undefined && { is_default: input.is_default }),
    ...(input.verified !== undefined && { verified: input.verified }),
  };

  await updateSetting("sender_emails", JSON.stringify(senders));
  return senders[index];
}

/**
 * Remove a sender email identity
 */
export async function removeSenderEmail(id: string): Promise<void> {
  let senders = await getSenderEmails();
  const wasDefault = senders.find((s) => s.id === id)?.is_default;

  senders = senders.filter((s) => s.id !== id);

  // If removed sender was default, make first remaining one default
  if (wasDefault && senders.length > 0) {
    senders[0].is_default = true;
  }

  await updateSetting("sender_emails", JSON.stringify(senders));
}

/**
 * Add a new sender phone identity
 */
export async function addSenderPhone(input: CreateSenderPhoneInput): Promise<SenderPhone> {
  const senders = await getSenderPhones();

  const newSender: SenderPhone = {
    id: crypto.randomUUID(),
    phone: input.phone,
    label: input.label,
    is_default: input.is_default ?? senders.length === 0,
    created_at: new Date().toISOString(),
  };

  if (newSender.is_default) {
    senders.forEach((s) => (s.is_default = false));
  }

  senders.push(newSender);
  await updateSetting("sender_phones", JSON.stringify(senders));

  return newSender;
}

/**
 * Update a sender phone identity
 */
export async function updateSenderPhoneIdentity(input: UpdateSenderPhoneInput): Promise<SenderPhone> {
  const senders = await getSenderPhones();
  const index = senders.findIndex((s) => s.id === input.id);

  if (index === -1) {
    throw new Error("Sender phone not found");
  }

  if (input.is_default === true) {
    senders.forEach((s) => (s.is_default = false));
  }

  senders[index] = {
    ...senders[index],
    ...(input.phone !== undefined && { phone: input.phone }),
    ...(input.label !== undefined && { label: input.label }),
    ...(input.is_default !== undefined && { is_default: input.is_default }),
  };

  await updateSetting("sender_phones", JSON.stringify(senders));
  return senders[index];
}

/**
 * Remove a sender phone identity
 */
export async function removeSenderPhone(id: string): Promise<void> {
  let senders = await getSenderPhones();
  const wasDefault = senders.find((s) => s.id === id)?.is_default;

  senders = senders.filter((s) => s.id !== id);

  if (wasDefault && senders.length > 0) {
    senders[0].is_default = true;
  }

  await updateSetting("sender_phones", JSON.stringify(senders));
}

/**
 * Get sender identity by ID
 */
export async function getSenderIdentity(
  type: "sms" | "email",
  id: string
): Promise<SenderPhone | SenderEmail | null> {
  if (type === "sms") {
    const phones = await getSenderPhones();
    return phones.find((p) => p.id === id) || null;
  } else {
    const emails = await getSenderEmails();
    return emails.find((e) => e.id === id) || null;
  }
}

/**
 * Get the default sender for a channel
 */
export async function getDefaultSender(
  channel: "sms" | "email"
): Promise<SenderPhone | SenderEmail | null> {
  if (channel === "sms") {
    const phones = await getSenderPhones();
    return phones.find((p) => p.is_default) || phones[0] || null;
  } else {
    const emails = await getSenderEmails();
    return emails.find((e) => e.is_default) || emails[0] || null;
  }
}

// =============================================================================
// Preview Preferences Operations
// =============================================================================

import {
  DEFAULT_PREVIEW_PREFERENCES,
  type PreviewPreferences,
} from "@/types/settings";

/**
 * Get preview preferences
 */
export async function getPreviewPreferences(): Promise<PreviewPreferences> {
  const setting = await getSetting("preview_preferences");
  if (!setting?.value) return { ...DEFAULT_PREVIEW_PREFERENCES };

  try {
    const parsed = JSON.parse(setting.value) as Partial<PreviewPreferences>;
    return {
      sms_phone: parsed.sms_phone ?? null,
      email_address: parsed.email_address ?? null,
      test_data: parsed.test_data ?? {},
    };
  } catch {
    return { ...DEFAULT_PREVIEW_PREFERENCES };
  }
}

/**
 * Update preview preferences
 */
export async function updatePreviewPreferences(
  updates: Partial<PreviewPreferences>
): Promise<PreviewPreferences> {
  const current = await getPreviewPreferences();
  const updated: PreviewPreferences = {
    ...current,
    ...updates,
  };

  await updateSetting("preview_preferences", JSON.stringify(updated));
  return updated;
}

// =============================================================================
// Saved Views Operations
// =============================================================================

import type {
  SavedView,
  CreateSavedViewInput,
  UpdateSavedViewInput,
  AdvancedFilters,
} from "@/types/contact";

/**
 * Get all saved views
 */
export async function getSavedViews(): Promise<SavedView[]> {
  const { data, error } = await getSupabase()
    .from("contact_views")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;

  // Parse the filters JSON field
  return (data || []).map((view) => ({
    ...view,
    filters: (typeof view.filters === "string"
      ? JSON.parse(view.filters)
      : view.filters) as AdvancedFilters,
  })) as SavedView[];
}

/**
 * Get a single saved view by ID
 */
export async function getSavedView(id: string): Promise<SavedView | null> {
  const { data, error } = await getSupabase()
    .from("contact_views")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return {
    ...data,
    filters: (typeof data.filters === "string"
      ? JSON.parse(data.filters)
      : data.filters) as AdvancedFilters,
  } as SavedView;
}

/**
 * Create a new saved view
 */
export async function createSavedView(
  input: CreateSavedViewInput
): Promise<SavedView> {
  // Get current max sort order
  const views = await getSavedViews();
  const maxSortOrder = views.reduce(
    (max, v) => Math.max(max, v.sort_order),
    -1
  );

  const { data, error } = await getSupabase()
    .from("contact_views")
    .insert({
      name: input.name,
      filters: input.filters,
      icon: input.icon || "filter",
      color: input.color || "#6366f1",
      is_default: input.is_default || false,
      sort_order: maxSortOrder + 1,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    filters: (typeof data.filters === "string"
      ? JSON.parse(data.filters)
      : data.filters) as AdvancedFilters,
  } as SavedView;
}

/**
 * Update an existing saved view
 */
export async function updateSavedView(
  input: UpdateSavedViewInput
): Promise<SavedView> {
  const { id, ...updates } = input;

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.filters !== undefined) updateData.filters = updates.filters;
  if (updates.icon !== undefined) updateData.icon = updates.icon;
  if (updates.color !== undefined) updateData.color = updates.color;
  if (updates.is_default !== undefined) updateData.is_default = updates.is_default;

  const { data, error } = await getSupabase()
    .from("contact_views")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    filters: (typeof data.filters === "string"
      ? JSON.parse(data.filters)
      : data.filters) as AdvancedFilters,
  } as SavedView;
}

/**
 * Delete a saved view
 */
export async function deleteSavedView(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("contact_views")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Reorder saved views
 */
export async function reorderSavedViews(
  viewIds: string[]
): Promise<void> {
  const client = getSupabase();

  // Update each view with its new sort order
  for (let i = 0; i < viewIds.length; i++) {
    const { error } = await client
      .from("contact_views")
      .update({ sort_order: i })
      .eq("id", viewIds[i]);

    if (error) throw error;
  }
}

// =============================================================================
// Email Template Cache Functions
// =============================================================================

/**
 * Cached email template from database
 */
export interface DbEmailTemplate {
  id: string;
  sendgrid_id: string;
  name: string;
  subject: string | null;
  variables: string[];
  thumbnail_url: string | null;
  is_active: boolean;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all cached email templates
 */
export async function getCachedEmailTemplates(): Promise<DbEmailTemplate[]> {
  const { data, error } = await getSupabase()
    .from("email_templates")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return data || [];
}

/**
 * Get a cached email template by SendGrid ID
 */
export async function getCachedEmailTemplate(
  sendgridId: string
): Promise<DbEmailTemplate | null> {
  const { data, error } = await getSupabase()
    .from("email_templates")
    .select("*")
    .eq("sendgrid_id", sendgridId)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
  return data || null;
}

/**
 * Input for upserting a cached template
 */
export interface UpsertCachedTemplateInput {
  sendgrid_id: string;
  name: string;
  subject?: string | null;
  variables?: string[];
  thumbnail_url?: string | null;
  is_active?: boolean;
}

/**
 * Upsert (create or update) a cached email template
 */
export async function upsertCachedEmailTemplate(
  input: UpsertCachedTemplateInput
): Promise<DbEmailTemplate> {
  const { data, error } = await getSupabase()
    .from("email_templates")
    .upsert(
      {
        sendgrid_id: input.sendgrid_id,
        name: input.name,
        subject: input.subject || null,
        variables: input.variables || [],
        thumbnail_url: input.thumbnail_url || null,
        is_active: input.is_active ?? true,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "sendgrid_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Sync multiple templates to cache
 */
export async function syncEmailTemplatesToCache(
  templates: UpsertCachedTemplateInput[]
): Promise<DbEmailTemplate[]> {
  if (templates.length === 0) return [];

  const { data, error } = await getSupabase()
    .from("email_templates")
    .upsert(
      templates.map((t) => ({
        sendgrid_id: t.sendgrid_id,
        name: t.name,
        subject: t.subject || null,
        variables: t.variables || [],
        thumbnail_url: t.thumbnail_url || null,
        is_active: t.is_active ?? true,
        synced_at: new Date().toISOString(),
      })),
      { onConflict: "sendgrid_id" }
    )
    .select();

  if (error) throw error;
  return data || [];
}

/**
 * Get the most recent sync timestamp
 */
export async function getLastTemplateSyncTime(): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from("email_templates")
    .select("synced_at")
    .order("synced_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data?.synced_at || null;
}

/**
 * Mark templates as inactive (soft delete)
 */
export async function deactivateEmailTemplates(
  sendgridIds: string[]
): Promise<void> {
  if (sendgridIds.length === 0) return;

  const { error } = await getSupabase()
    .from("email_templates")
    .update({ is_active: false })
    .in("sendgrid_id", sendgridIds);

  if (error) throw error;
}
