"use client";

import { useEffect, useMemo } from "react";
import { useWorkflowStore } from "@/lib/store/workflowStore";
import {
  useTemplateStore,
  selectSmsTemplates,
} from "@/lib/store/templateStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateTemplateDialog } from "./CreateTemplateDialog";
import { PreviewPanel } from "./PreviewPanel";
import type { SendSmsData } from "@/types/workflow";
import type { Template } from "@/types/template";
import { calculateSmsSegments } from "@/types/template";

export function SendSmsPanel() {
  const { selectedNodeId, nodes, updateNodeData } = useWorkflowStore();
  const { templates, fetchTemplates, isLoading } = useTemplateStore();

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Filter to only SMS templates
  const smsTemplates = useMemo(
    () => selectSmsTemplates(templates),
    [templates]
  );

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node || node.type !== "send_sms") return null;

  const data = node.data as SendSmsData;

  // Find the selected template for preview
  const selectedTemplate = smsTemplates.find((t) => t.id === data.templateId);
  const smsInfo = selectedTemplate
    ? calculateSmsSegments(selectedTemplate.body)
    : null;

  const handleTemplateChange = (templateId: string) => {
    const template = smsTemplates.find((t) => t.id === templateId);
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

  const handleTemplateCreated = (template: Template) => {
    // Auto-select the newly created template
    updateNodeData(node.id, {
      templateId: template.id,
      templateName: template.name,
    });
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
            <SelectValue
              placeholder={isLoading ? "Loading templates..." : "Select a template"}
            />
          </SelectTrigger>
          <SelectContent>
            {smsTemplates.length === 0 ? (
              <div className="px-2 py-4 text-sm text-gray-500 text-center">
                No SMS templates found.
                <br />
                Create one below.
              </div>
            ) : (
              smsTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex flex-col items-start">
                    <span>{template.name}</span>
                    <span className="text-xs text-gray-500 truncate max-w-[200px]">
                      {template.body.substring(0, 50)}
                      {template.body.length > 50 ? "..." : ""}
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <CreateTemplateDialog
          channel="sms"
          onTemplateCreated={handleTemplateCreated}
        />

        {/* Template Preview */}
        {selectedTemplate && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-md border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">
                Template Preview
              </span>
              {smsInfo && (
                <span className="text-xs text-gray-400">
                  {smsInfo.segments} segment{smsInfo.segments !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {selectedTemplate.body}
            </p>
          </div>
        )}

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

      {/* Preview Panel */}
      <PreviewPanel
        channel="sms"
        body={selectedTemplate?.body || ""}
        disabled={!selectedTemplate}
      />
    </div>
  );
}
