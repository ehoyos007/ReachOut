"use client";

import { useEffect, useMemo } from "react";
import { useWorkflowStore } from "@/lib/store/workflowStore";
import {
  useTemplateStore,
  selectEmailTemplates,
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
import type { SendEmailData } from "@/types/workflow";
import type { Template } from "@/types/template";

export function SendEmailPanel() {
  const { selectedNodeId, nodes, updateNodeData } = useWorkflowStore();
  const { templates, fetchTemplates, isLoading } = useTemplateStore();

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Filter to only Email templates
  const emailTemplates = useMemo(
    () => selectEmailTemplates(templates),
    [templates]
  );

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node || node.type !== "send_email") return null;

  const data = node.data as SendEmailData;

  // Find the selected template for preview
  const selectedTemplate = emailTemplates.find((t) => t.id === data.templateId);

  const handleTemplateChange = (templateId: string) => {
    const template = emailTemplates.find((t) => t.id === templateId);
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
            <SelectValue
              placeholder={isLoading ? "Loading templates..." : "Select a template"}
            />
          </SelectTrigger>
          <SelectContent>
            {emailTemplates.length === 0 ? (
              <div className="px-2 py-4 text-sm text-gray-500 text-center">
                No email templates found.
                <br />
                Create one below.
              </div>
            ) : (
              emailTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex flex-col items-start">
                    <span>{template.name}</span>
                    <span className="text-xs text-gray-500 truncate max-w-[200px]">
                      {template.subject || "No subject"}
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <CreateTemplateDialog
          channel="email"
          onTemplateCreated={handleTemplateCreated}
        />

        {/* Template Preview */}
        {selectedTemplate && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-md border">
            <div className="mb-2">
              <span className="text-xs font-medium text-gray-500">
                Template Preview
              </span>
            </div>
            {selectedTemplate.subject && (
              <div className="mb-2">
                <span className="text-xs text-gray-400">Subject:</span>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedTemplate.subject}
                </p>
              </div>
            )}
            <div>
              <span className="text-xs text-gray-400">Body:</span>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mt-1 max-h-32 overflow-y-auto">
                {selectedTemplate.body}
              </p>
            </div>
          </div>
        )}

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
