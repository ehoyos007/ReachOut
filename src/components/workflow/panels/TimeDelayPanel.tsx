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
import type { TimeDelayData, TimeUnit } from "@/types/workflow";

export function TimeDelayPanel() {
  const { selectedNodeId, nodes, updateNodeData } = useWorkflowStore();

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node || node.type !== "time_delay") return null;

  const data = node.data as TimeDelayData;

  const handleDurationChange = (value: string) => {
    const duration = parseInt(value, 10);
    if (!isNaN(duration) && duration >= 0) {
      updateNodeData(node.id, { duration });
    }
  };

  const handleUnitChange = (unit: TimeUnit) => {
    updateNodeData(node.id, { unit });
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
          placeholder="Time Delay"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">Duration</Label>
        <div className="flex gap-2">
          <Input
            id="duration"
            type="number"
            min={0}
            value={data.duration || ""}
            onChange={(e) => handleDurationChange(e.target.value)}
            placeholder="1"
            className="flex-1"
          />
          <Select value={data.unit || "days"} onValueChange={handleUnitChange}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">Minutes</SelectItem>
              <SelectItem value="hours">Hours</SelectItem>
              <SelectItem value="days">Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-gray-500">
          How long to wait before proceeding to the next step.
        </p>
      </div>
    </div>
  );
}
