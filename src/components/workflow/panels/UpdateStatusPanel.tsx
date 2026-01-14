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
import type { UpdateStatusData, ContactStatus } from "@/types/workflow";
import { STATUS_DISPLAY_NAMES } from "@/types/workflow";

export function UpdateStatusPanel() {
  const { selectedNodeId, nodes, updateNodeData } = useWorkflowStore();

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node || node.type !== "update_status") return null;

  const data = node.data as UpdateStatusData;

  const handleStatusChange = (newStatus: ContactStatus) => {
    updateNodeData(node.id, { newStatus });
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
          placeholder="Update Status"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">New Status</Label>
        <Select
          value={data.newStatus || "contacted"}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_DISPLAY_NAMES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          The contact&apos;s status will be updated to this value.
        </p>
      </div>
    </div>
  );
}
