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
import type { SendEmailData } from "@/types/workflow";

// Placeholder templates - in a real app, these would come from the database
const PLACEHOLDER_TEMPLATES = [
  { id: "1", name: "Welcome Email" },
  { id: "2", name: "Follow-up Email" },
  { id: "3", name: "Newsletter" },
];

export function SendEmailPanel() {
  const { selectedNodeId, nodes, updateNodeData } = useWorkflowStore();

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node || node.type !== "send_email") return null;

  const data = node.data as SendEmailData;

  const handleTemplateChange = (templateId: string) => {
    const template = PLACEHOLDER_TEMPLATES.find((t) => t.id === templateId);
    updateNodeData(node.id, {
      templateId,
      templateName: template?.name || null,
    });
  };

  const handleFromEmailChange = (fromEmail: string) => {
    updateNodeData(node.id, { fromEmail: fromEmail || null });
  };

  const handleSubjectOverrideChange = (subjectOverride: string) => {
    updateNodeData(node.id, { subjectOverride: subjectOverride || null });
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
          placeholder="Send Email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template">Email Template</Label>
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
          Choose which email template to send.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subjectOverride">Subject Override (optional)</Label>
        <Input
          id="subjectOverride"
          value={data.subjectOverride || ""}
          onChange={(e) => handleSubjectOverrideChange(e.target.value)}
          placeholder="Use template subject"
        />
        <p className="text-xs text-gray-500">
          Override the template&apos;s subject line.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fromEmail">From Email (optional)</Label>
        <Input
          id="fromEmail"
          value={data.fromEmail || ""}
          onChange={(e) => handleFromEmailChange(e.target.value)}
          placeholder="Use default email"
        />
        <p className="text-xs text-gray-500">
          Leave empty to use the default SendGrid email.
        </p>
      </div>
    </div>
  );
}
