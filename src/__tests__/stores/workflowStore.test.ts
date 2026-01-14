import { act } from '@testing-library/react';
import { useWorkflowStore } from '@/lib/store/workflowStore';
import type { WorkflowNode } from '@/types/workflow';

// Mock the supabase module
jest.mock('@/lib/supabase', () => ({
  loadWorkflowWithNodesAndEdges: jest.fn(),
  saveWorkflowNodesAndEdges: jest.fn(),
  updateWorkflow: jest.fn(),
}));

import {
  loadWorkflowWithNodesAndEdges,
  saveWorkflowNodesAndEdges,
  updateWorkflow,
} from '@/lib/supabase';

const mockLoadWorkflow = loadWorkflowWithNodesAndEdges as jest.Mock;
const mockSaveWorkflow = saveWorkflowNodesAndEdges as jest.Mock;
const mockUpdateWorkflow = updateWorkflow as jest.Mock;

describe('workflowStore', () => {
  const mockWorkflow = {
    id: 'test-workflow-1',
    name: 'Test Workflow',
    description: 'A test workflow',
    is_enabled: false,
    created_at: '2026-01-14T00:00:00Z',
    updated_at: '2026-01-14T00:00:00Z',
  };

  const mockNode: WorkflowNode = {
    id: 'test-node-1',
    type: 'trigger_start',
    position: { x: 100, y: 100 },
    data: { label: 'Start' },
  };

  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useWorkflowStore.getState().resetState();
    });
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useWorkflowStore.getState();

      expect(state.workflow).toBeNull();
      expect(state.nodes).toEqual([]);
      expect(state.edges).toEqual([]);
      expect(state.selectedNodeId).toBeNull();
      expect(state.isDirty).toBe(false);
      expect(state.isSaving).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setWorkflow', () => {
    it('should set workflow correctly', () => {
      act(() => {
        useWorkflowStore.getState().setWorkflow(mockWorkflow);
      });

      expect(useWorkflowStore.getState().workflow).toEqual(mockWorkflow);
    });

    it('should clear workflow when set to null', () => {
      act(() => {
        useWorkflowStore.getState().setWorkflow(mockWorkflow);
        useWorkflowStore.getState().setWorkflow(null);
      });

      expect(useWorkflowStore.getState().workflow).toBeNull();
    });
  });

  describe('setNodes', () => {
    it('should set nodes and mark as dirty', () => {
      const nodes = [mockNode];

      act(() => {
        useWorkflowStore.getState().setNodes(nodes);
      });

      const state = useWorkflowStore.getState();
      expect(state.nodes).toEqual(nodes);
      expect(state.isDirty).toBe(true);
    });
  });

  describe('setEdges', () => {
    it('should set edges and mark as dirty', () => {
      const edges = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
      ];

      act(() => {
        useWorkflowStore.getState().setEdges(edges);
      });

      const state = useWorkflowStore.getState();
      expect(state.edges).toEqual(edges);
      expect(state.isDirty).toBe(true);
    });
  });

  describe('addNode', () => {
    it('should add a new node to the workflow', () => {
      act(() => {
        useWorkflowStore.getState().addNode('trigger_start', { x: 200, y: 200 });
      });

      const state = useWorkflowStore.getState();
      expect(state.nodes).toHaveLength(1);
      expect(state.nodes[0].type).toBe('trigger_start');
      expect(state.nodes[0].position).toEqual({ x: 200, y: 200 });
      expect(state.isDirty).toBe(true);
    });

    it('should select the newly added node', () => {
      act(() => {
        useWorkflowStore.getState().addNode('time_delay', { x: 100, y: 100 });
      });

      const state = useWorkflowStore.getState();
      expect(state.selectedNodeId).toBe(state.nodes[0].id);
    });

    it('should add node with correct default data for each type', () => {
      const nodeTypes = [
        { type: 'trigger_start' as const, expectedLabel: 'Start' },
        { type: 'time_delay' as const, expectedLabel: 'Wait 1 day' },
        { type: 'send_sms' as const, expectedLabel: 'Send SMS' },
        { type: 'send_email' as const, expectedLabel: 'Send Email' },
        { type: 'update_status' as const, expectedLabel: 'Update Status' },
        { type: 'stop_on_reply' as const, expectedLabel: 'Stop if replied' },
        { type: 'conditional_split' as const, expectedLabel: 'Check condition' },
      ];

      nodeTypes.forEach(({ type, expectedLabel }) => {
        act(() => {
          useWorkflowStore.getState().resetState();
          useWorkflowStore.getState().addNode(type, { x: 0, y: 0 });
        });

        const state = useWorkflowStore.getState();
        expect(state.nodes[0].type).toBe(type);
        expect(state.nodes[0].data.label).toBe(expectedLabel);
      });
    });
  });

  describe('updateNodeData', () => {
    it('should update node data correctly', () => {
      act(() => {
        useWorkflowStore.getState().addNode('trigger_start', { x: 100, y: 100 });
      });

      const nodeId = useWorkflowStore.getState().nodes[0].id;

      act(() => {
        useWorkflowStore.getState().updateNodeData(nodeId, { label: 'Updated Label' });
      });

      const state = useWorkflowStore.getState();
      expect(state.nodes[0].data.label).toBe('Updated Label');
      expect(state.isDirty).toBe(true);
    });

    it('should not modify other nodes when updating one', () => {
      act(() => {
        useWorkflowStore.getState().addNode('trigger_start', { x: 100, y: 100 });
        useWorkflowStore.getState().addNode('time_delay', { x: 200, y: 200 });
      });

      const nodes = useWorkflowStore.getState().nodes;
      const firstNodeId = nodes[0].id;

      act(() => {
        useWorkflowStore.getState().updateNodeData(firstNodeId, { label: 'New Label' });
      });

      const state = useWorkflowStore.getState();
      expect(state.nodes[1].data.label).toBe('Wait 1 day'); // Unchanged
    });
  });

  describe('deleteNode', () => {
    it('should delete a node', () => {
      act(() => {
        useWorkflowStore.getState().addNode('trigger_start', { x: 100, y: 100 });
      });

      const nodeId = useWorkflowStore.getState().nodes[0].id;

      act(() => {
        useWorkflowStore.getState().deleteNode(nodeId);
      });

      expect(useWorkflowStore.getState().nodes).toHaveLength(0);
    });

    it('should remove edges connected to deleted node', () => {
      act(() => {
        useWorkflowStore.getState().addNode('trigger_start', { x: 100, y: 100 });
        useWorkflowStore.getState().addNode('time_delay', { x: 200, y: 200 });
      });

      const nodes = useWorkflowStore.getState().nodes;
      const edges = [
        { id: 'edge-1', source: nodes[0].id, target: nodes[1].id },
      ];

      act(() => {
        useWorkflowStore.getState().setEdges(edges);
        useWorkflowStore.getState().deleteNode(nodes[0].id);
      });

      expect(useWorkflowStore.getState().edges).toHaveLength(0);
    });

    it('should clear selection if deleted node was selected', () => {
      act(() => {
        useWorkflowStore.getState().addNode('trigger_start', { x: 100, y: 100 });
      });

      const nodeId = useWorkflowStore.getState().nodes[0].id;

      act(() => {
        useWorkflowStore.getState().setSelectedNode(nodeId);
        useWorkflowStore.getState().deleteNode(nodeId);
      });

      expect(useWorkflowStore.getState().selectedNodeId).toBeNull();
    });
  });

  describe('setSelectedNode', () => {
    it('should set selected node', () => {
      act(() => {
        useWorkflowStore.getState().setSelectedNode('node-123');
      });

      expect(useWorkflowStore.getState().selectedNodeId).toBe('node-123');
    });
  });

  describe('getSelectedNode', () => {
    it('should return the selected node', () => {
      act(() => {
        useWorkflowStore.getState().addNode('trigger_start', { x: 100, y: 100 });
      });

      const nodeId = useWorkflowStore.getState().nodes[0].id;

      act(() => {
        useWorkflowStore.getState().setSelectedNode(nodeId);
      });

      const selectedNode = useWorkflowStore.getState().getSelectedNode();
      expect(selectedNode?.id).toBe(nodeId);
    });

    it('should return null when no node is selected', () => {
      expect(useWorkflowStore.getState().getSelectedNode()).toBeNull();
    });
  });

  describe('loadWorkflow', () => {
    it('should load workflow successfully', async () => {
      mockLoadWorkflow.mockResolvedValueOnce({
        workflow: mockWorkflow,
        nodes: [mockNode],
        edges: [],
      });

      let result: boolean;
      await act(async () => {
        result = await useWorkflowStore.getState().loadWorkflow('test-workflow-1');
      });

      const state = useWorkflowStore.getState();
      expect(result!).toBe(true);
      expect(state.workflow).toEqual(mockWorkflow);
      expect(state.nodes).toEqual([mockNode]);
      expect(state.isLoading).toBe(false);
      expect(state.isDirty).toBe(false);
    });

    it('should handle workflow not found', async () => {
      mockLoadWorkflow.mockResolvedValueOnce(null);

      let result: boolean;
      await act(async () => {
        result = await useWorkflowStore.getState().loadWorkflow('non-existent');
      });

      const state = useWorkflowStore.getState();
      expect(result!).toBe(false);
      expect(state.error).toBe('Workflow not found');
      expect(state.isLoading).toBe(false);
    });

    it('should handle load errors', async () => {
      mockLoadWorkflow.mockRejectedValueOnce(new Error('Database error'));

      let result: boolean;
      await act(async () => {
        result = await useWorkflowStore.getState().loadWorkflow('test-workflow-1');
      });

      const state = useWorkflowStore.getState();
      expect(result!).toBe(false);
      expect(state.error).toBe('Database error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('saveWorkflow', () => {
    it('should save workflow successfully', async () => {
      mockSaveWorkflow.mockResolvedValueOnce(undefined);

      act(() => {
        useWorkflowStore.getState().setWorkflow(mockWorkflow);
        useWorkflowStore.getState().addNode('trigger_start', { x: 100, y: 100 });
      });

      let result: boolean;
      await act(async () => {
        result = await useWorkflowStore.getState().saveWorkflow();
      });

      const state = useWorkflowStore.getState();
      expect(result!).toBe(true);
      expect(state.isSaving).toBe(false);
      expect(state.isDirty).toBe(false);
      expect(mockSaveWorkflow).toHaveBeenCalledWith(
        mockWorkflow.id,
        expect.any(Array),
        expect.any(Array)
      );
    });

    it('should return false if no workflow is set', async () => {
      let result: boolean;
      await act(async () => {
        result = await useWorkflowStore.getState().saveWorkflow();
      });

      expect(result!).toBe(false);
    });

    it('should handle save errors', async () => {
      mockSaveWorkflow.mockRejectedValueOnce(new Error('Save failed'));

      act(() => {
        useWorkflowStore.getState().setWorkflow(mockWorkflow);
      });

      let result: boolean;
      await act(async () => {
        result = await useWorkflowStore.getState().saveWorkflow();
      });

      const state = useWorkflowStore.getState();
      expect(result!).toBe(false);
      expect(state.error).toBe('Save failed');
      expect(state.isSaving).toBe(false);
    });
  });

  describe('toggleWorkflowEnabled', () => {
    it('should toggle workflow enabled status', async () => {
      mockUpdateWorkflow.mockResolvedValueOnce({ ...mockWorkflow, is_enabled: true });

      act(() => {
        useWorkflowStore.getState().setWorkflow(mockWorkflow);
      });

      let result: boolean;
      await act(async () => {
        result = await useWorkflowStore.getState().toggleWorkflowEnabled();
      });

      expect(result!).toBe(true);
      expect(useWorkflowStore.getState().workflow?.is_enabled).toBe(true);
      expect(mockUpdateWorkflow).toHaveBeenCalledWith(mockWorkflow.id, { is_enabled: true });
    });

    it('should return false if no workflow is set', async () => {
      let result: boolean;
      await act(async () => {
        result = await useWorkflowStore.getState().toggleWorkflowEnabled();
      });

      expect(result!).toBe(false);
    });

    it('should handle toggle errors', async () => {
      mockUpdateWorkflow.mockRejectedValueOnce(new Error('Toggle failed'));

      act(() => {
        useWorkflowStore.getState().setWorkflow(mockWorkflow);
      });

      let result: boolean;
      await act(async () => {
        result = await useWorkflowStore.getState().toggleWorkflowEnabled();
      });

      const state = useWorkflowStore.getState();
      expect(result!).toBe(false);
      expect(state.error).toBe('Toggle failed');
    });
  });

  describe('resetState', () => {
    it('should reset all state to initial values', () => {
      act(() => {
        useWorkflowStore.getState().setWorkflow(mockWorkflow);
        useWorkflowStore.getState().addNode('trigger_start', { x: 100, y: 100 });
        useWorkflowStore.getState().setError('Some error');
      });

      act(() => {
        useWorkflowStore.getState().resetState();
      });

      const state = useWorkflowStore.getState();
      expect(state.workflow).toBeNull();
      expect(state.nodes).toEqual([]);
      expect(state.edges).toEqual([]);
      expect(state.error).toBeNull();
      expect(state.isDirty).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      act(() => {
        useWorkflowStore.getState().setError('Test error');
      });

      expect(useWorkflowStore.getState().error).toBe('Test error');
    });

    it('should clear error when set to null', () => {
      act(() => {
        useWorkflowStore.getState().setError('Test error');
        useWorkflowStore.getState().setError(null);
      });

      expect(useWorkflowStore.getState().error).toBeNull();
    });
  });
});
