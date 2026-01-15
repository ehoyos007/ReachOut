"use client";

import { useWorkflowStore } from "@/lib/store/workflowStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Trash2 } from "lucide-react";
import { TriggerStartPanel } from "./TriggerStartPanel";
import { TimeDelayPanel } from "./TimeDelayPanel";
import { ConditionalSplitPanel } from "./ConditionalSplitPanel";
import { SendSmsPanel } from "./SendSmsPanel";
import { SendEmailPanel } from "./SendEmailPanel";
import { UpdateStatusPanel } from "./UpdateStatusPanel";
import { StopOnReplyPanel } from "./StopOnReplyPanel";
import { ReturnToParentPanel } from "./ReturnToParentPanel";
import type { WorkflowNodeType } from "@/types/workflow";

const PANEL_COMPONENTS: Record<WorkflowNodeType, React.ComponentType | null> = {
  trigger_start: TriggerStartPanel,
  time_delay: TimeDelayPanel,
  conditional_split: ConditionalSplitPanel,
  send_sms: SendSmsPanel,
  send_email: SendEmailPanel,
  update_status: UpdateStatusPanel,
  stop_on_reply: StopOnReplyPanel,
  return_to_parent: ReturnToParentPanel,
};

const NODE_TYPE_LABELS: Record<WorkflowNodeType, string> = {
  trigger_start: "Trigger",
  time_delay: "Time Delay",
  conditional_split: "Conditional Split",
  send_sms: "Send SMS",
  send_email: "Send Email",
  update_status: "Update Status",
  stop_on_reply: "Stop on Reply",
  return_to_parent: "Return to Parent",
};

export function NodeConfigPanel() {
  const { selectedNodeId, nodes, setSelectedNode, deleteNode } =
    useWorkflowStore();

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  if (!selectedNode) return null;

  const PanelComponent = PANEL_COMPONENTS[selectedNode.type as WorkflowNodeType];

  const handleDelete = () => {
    deleteNode(selectedNode.id);
  };

  return (
    <div className="w-80 border-l bg-white flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">
            {NODE_TYPE_LABELS[selectedNode.type as WorkflowNodeType]}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Configure this node</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedNode(null)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {PanelComponent ? (
            <PanelComponent />
          ) : (
            <p className="text-sm text-gray-500">
              This node has no configuration options.
            </p>
          )}
        </div>
      </ScrollArea>

      {selectedNode.type !== "trigger_start" && (
        <div className="p-4 border-t">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Node
          </Button>
        </div>
      )}
    </div>
  );
}
