"use client";

import { useWorkflowStore } from "@/lib/store/workflowStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ReturnToParentData,
  OutputVariable,
  VariableType,
} from "@/types/workflow";
import { Plus, Trash2 } from "lucide-react";

const VARIABLE_TYPES: { value: VariableType; label: string }[] = [
  { value: "string", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "object", label: "Object" },
  { value: "array", label: "Array" },
];

export function ReturnToParentPanel() {
  const { selectedNodeId, nodes, updateNodeData } = useWorkflowStore();

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node || node.type !== "return_to_parent") return null;

  const data = node.data as ReturnToParentData;

  const handleLabelChange = (label: string) => {
    updateNodeData(node.id, { label });
  };

  const handleReturnStatusChange = (
    returnStatus: "success" | "failure" | "custom"
  ) => {
    updateNodeData(node.id, { returnStatus });
  };

  const handleCustomStatusFieldChange = (customStatusField: string) => {
    updateNodeData(node.id, { customStatusField });
  };

  const addOutputVariable = () => {
    const newVar: OutputVariable = {
      name: `output_${(data.outputVariables?.length || 0) + 1}`,
      type: "string",
      value: "",
    };
    updateNodeData(node.id, {
      outputVariables: [...(data.outputVariables || []), newVar],
    });
  };

  const updateOutputVariable = (
    index: number,
    updates: Partial<OutputVariable>
  ) => {
    const newVars = [...(data.outputVariables || [])];
    newVars[index] = { ...newVars[index], ...updates };
    updateNodeData(node.id, { outputVariables: newVars });
  };

  const removeOutputVariable = (index: number) => {
    const newVars = (data.outputVariables || []).filter((_, i) => i !== index);
    updateNodeData(node.id, { outputVariables: newVars });
  };

  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          value={data.label || ""}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Return to Parent"
        />
      </div>

      {/* Return Status */}
      <div className="space-y-2">
        <Label>Return Status</Label>
        <Select
          value={data.returnStatus || "success"}
          onValueChange={(v) =>
            handleReturnStatusChange(v as "success" | "failure" | "custom")
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failure">Failure</SelectItem>
            <SelectItem value="custom">Custom (from field)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          The status returned to the parent workflow when this node executes.
        </p>
      </div>

      {/* Custom Status Field (only shown when custom is selected) */}
      {data.returnStatus === "custom" && (
        <div className="space-y-2">
          <Label htmlFor="customStatusField">Status Field Reference</Label>
          <Input
            id="customStatusField"
            value={data.customStatusField || ""}
            onChange={(e) => handleCustomStatusFieldChange(e.target.value)}
            placeholder="{{contact.status}}"
          />
          <p className="text-xs text-gray-500">
            Enter a field reference or variable that contains the status value.
          </p>
        </div>
      )}

      {/* Output Variables */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Output Variables</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOutputVariable}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          Define data to return to the parent workflow. Use field references
          like {`{{contact.name}}`} or {`{{node_id.output}}`}.
        </p>

        {data.outputVariables && data.outputVariables.length > 0 ? (
          <div className="space-y-3">
            {data.outputVariables.map((variable, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 bg-white p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Output {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOutputVariable(index)}
                  >
                    <Trash2 className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={variable.name}
                      onChange={(e) =>
                        updateOutputVariable(index, { name: e.target.value })
                      }
                      placeholder="output_name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={variable.type}
                      onValueChange={(v) =>
                        updateOutputVariable(index, { type: v as VariableType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VARIABLE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Value Expression</Label>
                  <Input
                    value={variable.value}
                    onChange={(e) =>
                      updateOutputVariable(index, { value: e.target.value })
                    }
                    placeholder="{{contact.email}} or static value"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-500">
              No output variables defined. Click &quot;Add&quot; to create one.
            </p>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> This node should only be used in workflows that
          are configured as sub-workflows (with the &quot;Sub-Workflow&quot; trigger
          type).
        </p>
      </div>
    </div>
  );
}
