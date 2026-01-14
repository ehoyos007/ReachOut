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
import type {
  ConditionalSplitData,
  ComparisonOperator,
} from "@/types/workflow";
import { OPERATOR_DISPLAY_NAMES } from "@/types/workflow";

// Common contact fields that can be used in conditions
const CONTACT_FIELDS = [
  { value: "status", label: "Status" },
  { value: "tags", label: "Tags" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "name", label: "Name" },
  { value: "replied", label: "Has Replied" },
  { value: "last_contacted", label: "Last Contacted" },
];

export function ConditionalSplitPanel() {
  const { selectedNodeId, nodes, updateNodeData } = useWorkflowStore();

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node || node.type !== "conditional_split") return null;

  const data = node.data as ConditionalSplitData;

  const handleFieldChange = (field: string) => {
    updateNodeData(node.id, { field });
  };

  const handleOperatorChange = (operator: ComparisonOperator) => {
    updateNodeData(node.id, { operator });
  };

  const handleValueChange = (value: string) => {
    updateNodeData(node.id, { value });
  };

  const handleLabelChange = (label: string) => {
    updateNodeData(node.id, { label });
  };

  // Check if operator needs a value input
  const needsValue = !["is_empty", "is_not_empty"].includes(data.operator);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          value={data.label || ""}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Check condition"
        />
      </div>

      <div className="space-y-2">
        <Label>Condition</Label>
        <p className="text-xs text-gray-500 mb-2">
          Define when contacts should take the &quot;Yes&quot; path.
        </p>

        <div className="space-y-2">
          <Select value={data.field || ""} onValueChange={handleFieldChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
              {CONTACT_FIELDS.map((field) => (
                <SelectItem key={field.value} value={field.value}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={data.operator || "equals"}
            onValueChange={handleOperatorChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(OPERATOR_DISPLAY_NAMES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {needsValue && (
            <Input
              value={data.value || ""}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="Enter value"
            />
          )}
        </div>
      </div>

      <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
        <p className="font-medium mb-1">Branch paths:</p>
        <ul className="space-y-1">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>Yes: Condition is true</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>No: Condition is false</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
