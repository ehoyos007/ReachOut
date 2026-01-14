"use client";

import { useCallback, useRef, DragEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useWorkflowStore } from "@/lib/store/workflowStore";
import { NodePalette } from "./NodePalette";
import { NodeConfigPanel } from "./panels/NodeConfigPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TriggerStartNode,
  TimeDelayNode,
  ConditionalSplitNode,
  SendSmsNode,
  SendEmailNode,
  UpdateStatusNode,
  StopOnReplyNode,
} from "./nodes";
import type { WorkflowNodeType } from "@/types/workflow";
import { Save, Power, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const nodeTypes = {
  trigger_start: TriggerStartNode,
  time_delay: TimeDelayNode,
  conditional_split: ConditionalSplitNode,
  send_sms: SendSmsNode,
  send_email: SendEmailNode,
  update_status: UpdateStatusNode,
  stop_on_reply: StopOnReplyNode,
};

function WorkflowCanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const {
    workflow,
    nodes,
    edges,
    selectedNodeId,
    isDirty,
    isSaving,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setSelectedNode,
    saveWorkflow,
    toggleWorkflowEnabled,
  } = useWorkflowStore();

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData(
        "application/reactflow"
      ) as WorkflowNodeType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [screenToFlowPosition, addNode]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const handleSave = async () => {
    await saveWorkflow();
  };

  const handleToggleEnabled = async () => {
    await toggleWorkflowEnabled();
  };

  return (
    <div className="flex h-screen">
      <NodePalette />

      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-14 border-b bg-white px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/workflows">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-gray-900">
                {workflow?.name || "Workflow"}
              </h1>
              {workflow?.is_enabled ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
              {isDirty && (
                <Badge variant="outline" className="text-orange-600">
                  Unsaved
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleEnabled}
              disabled={!workflow}
            >
              <Power className="w-4 h-4 mr-2" />
              {workflow?.is_enabled ? "Disable" : "Enable"}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex">
          <div ref={reactFlowWrapper} className="flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              onDragOver={onDragOver}
              onDrop={onDrop}
              nodeTypes={nodeTypes}
              fitView
              snapToGrid
              snapGrid={[15, 15]}
              defaultEdgeOptions={{
                style: { strokeWidth: 2, stroke: "#9ca3af" },
                type: "smoothstep",
              }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="#e5e7eb"
              />
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  switch (node.type) {
                    case "trigger_start":
                      return "#22c55e";
                    case "time_delay":
                      return "#f97316";
                    case "conditional_split":
                      return "#a855f7";
                    case "send_sms":
                      return "#3b82f6";
                    case "send_email":
                      return "#6366f1";
                    case "update_status":
                      return "#14b8a6";
                    case "stop_on_reply":
                      return "#ef4444";
                    default:
                      return "#6b7280";
                  }
                }}
                maskColor="rgba(0, 0, 0, 0.1)"
              />
              <Panel position="bottom-center" className="text-xs text-gray-400">
                Drag nodes from the palette to build your workflow
              </Panel>
            </ReactFlow>
          </div>

          {selectedNodeId && <NodeConfigPanel />}
        </div>
      </div>
    </div>
  );
}

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  );
}
