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
