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
  TemplateChannel,
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
