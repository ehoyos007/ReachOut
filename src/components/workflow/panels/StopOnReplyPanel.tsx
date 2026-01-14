"use client";

import { useWorkflowStore } from "@/lib/store/workflowStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StopOnReplyData, ChannelType } from "@/types/workflow";
import { CHANNEL_DISPLAY_NAMES } from "@/types/workflow";

export function StopOnReplyPanel() {
  const { selectedNodeId, nodes, updateNodeData } = useWorkflowStore();

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node || node.type !== "stop_on_reply") return null;

  const data = node.data as StopOnReplyData;

  const handleChannelChange = (channel: ChannelType) => {
    updateNodeData(node.id, { channel });
  };

  const handleLabelChange = (label: string) => {
    updateNodeData(node.id, { label });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          value={data.label || ""}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Stop on Reply"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="channel">Reply Channel</Label>
        <Select
          value={data.channel || "any"}
          onValueChange={handleChannelChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CHANNEL_DISPLAY_NAMES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          Stop the workflow if the contact replies via this channel.
        </p>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
        <p className="font-medium mb-1">Note:</p>
        <p>
          When a contact replies, they will be removed from this workflow and no
          further messages will be sent.
        </p>
      </div>
    </div>
  );
}
