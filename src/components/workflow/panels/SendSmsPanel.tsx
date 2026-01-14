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
import type { SendSmsData } from "@/types/workflow";

// Placeholder templates - in a real app, these would come from the database
const PLACEHOLDER_TEMPLATES = [
  { id: "1", name: "Welcome SMS" },
  { id: "2", name: "Follow-up SMS" },
  { id: "3", name: "Reminder SMS" },
];

export function SendSmsPanel() {
  const { selectedNodeId, nodes, updateNodeData } = useWorkflowStore();

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node || node.type !== "send_sms") return null;

  const data = node.data as SendSmsData;

  const handleTemplateChange = (templateId: string) => {
    const template = PLACEHOLDER_TEMPLATES.find((t) => t.id === templateId);
    updateNodeData(node.id, {
      templateId,
      templateName: template?.name || null,
    });
  };

  const handleFromNumberChange = (fromNumber: string) => {
    updateNodeData(node.id, { fromNumber: fromNumber || null });
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
          placeholder="Send SMS"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template">SMS Template</Label>
        <Select
          value={data.templateId || ""}
          onValueChange={handleTemplateChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent>
            {PLACEHOLDER_TEMPLATES.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          Choose which SMS template to send.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fromNumber">From Number (optional)</Label>
        <Input
          id="fromNumber"
          value={data.fromNumber || ""}
          onChange={(e) => handleFromNumberChange(e.target.value)}
          placeholder="Use default number"
        />
        <p className="text-xs text-gray-500">
          Leave empty to use the default Twilio number.
        </p>
      </div>
    </div>
  );
}
