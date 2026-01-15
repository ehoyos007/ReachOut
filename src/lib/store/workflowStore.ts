import { create } from "zustand";
import {
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
} from "@xyflow/react";
import type {
  WorkflowNode,
  WorkflowNodeType,
  WorkflowNodeData,
  DbWorkflow,
} from "@/types/workflow";
import { createDefaultNode } from "@/types/workflow";
import {
  loadWorkflowWithNodesAndEdges,
  saveWorkflowNodesAndEdges,
  updateWorkflow,
} from "@/lib/supabase";

interface WorkflowState {
  // Workflow metadata
  workflow: DbWorkflow | null;

  // React Flow state
  nodes: WorkflowNode[];
  edges: Edge[];

  // UI state
  selectedNodeId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setWorkflow: (workflow: DbWorkflow | null) => void;
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: Edge[]) => void;

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  addNode: (type: WorkflowNodeType, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  deleteNode: (nodeId: string) => void;

  setSelectedNode: (nodeId: string | null) => void;
  getSelectedNode: () => WorkflowNode | null;

  loadWorkflow: (workflowId: string) => Promise<boolean>;
  saveWorkflow: () => Promise<boolean>;
  toggleWorkflowEnabled: () => Promise<boolean>;

  resetState: () => void;
  setError: (error: string | null) => void;
}

const initialState = {
  workflow: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isDirty: false,
  isSaving: false,
  isLoading: false,
  error: null,
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  ...initialState,

  setWorkflow: (workflow) => set({ workflow }),

  setNodes: (nodes) => set({ nodes, isDirty: true }),

  setEdges: (edges) => set({ edges, isDirty: true }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as WorkflowNode[],
      isDirty: true,
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
      isDirty: true,
    });
  },

  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(
        {
          ...connection,
          id: crypto.randomUUID(),
        },
        get().edges
      ),
      isDirty: true,
    });
  },

  addNode: (type, position) => {
    const newNode = createDefaultNode(type, position);
    set({
      nodes: [...get().nodes, newNode],
      isDirty: true,
      selectedNodeId: newNode.id,
    });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ) as WorkflowNode[],
      isDirty: true,
    });
  },

  deleteNode: (nodeId) => {
    const state = get();
    set({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
      selectedNodeId:
        state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      isDirty: true,
    });
  },

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

  getSelectedNode: () => {
    const state = get();
    return (
      state.nodes.find((node) => node.id === state.selectedNodeId) || null
    );
  },

  loadWorkflow: async (workflowId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await loadWorkflowWithNodesAndEdges(workflowId);
      if (!result) {
        set({ isLoading: false, error: "Workflow not found" });
        return false;
      }

      set({
        workflow: result.workflow,
        nodes: result.nodes,
        edges: result.edges,
        isLoading: false,
        isDirty: false,
        selectedNodeId: null,
      });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load workflow";
      set({ isLoading: false, error: message });
      return false;
    }
  },

  saveWorkflow: async () => {
    const state = get();
    if (!state.workflow) return false;

    set({ isSaving: true, error: null });
    try {
      await saveWorkflowNodesAndEdges(
        state.workflow.id,
        state.nodes,
        state.edges
      );
      set({ isSaving: false, isDirty: false });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save workflow";
      set({ isSaving: false, error: message });
      return false;
    }
  },

  toggleWorkflowEnabled: async () => {
    const state = get();
    if (!state.workflow) return false;

    const newEnabled = !state.workflow.is_enabled;
    try {
      const updated = await updateWorkflow(state.workflow.id, {
        is_enabled: newEnabled,
      });
      set({ workflow: updated });
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to toggle workflow status";
      set({ error: message });
      return false;
    }
  },

  resetState: () => set(initialState),

  setError: (error) => set({ error }),
}));
