"use client";

import { useEffect, useState } from "react";
import { useWorkflowStore } from "@/lib/store/workflowStore";
import { getSubWorkflows, SubWorkflowInfo } from "@/lib/supabase";
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
  CallSubWorkflowData,
  InputMapping,
  ExecutionMode,
  OnFailureBehavior,
} from "@/types/workflow";
import { Plus, Trash2, Loader2, AlertCircle, Info } from "lucide-react";

export function CallSubWorkflowPanel() {
  const { selectedNodeId, nodes, updateNodeData } = useWorkflowStore();
  const [subWorkflows, setSubWorkflows] = useState<SubWorkflowInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load available sub-workflows
  useEffect(() => {
    async function loadSubWorkflows() {
      try {
        setIsLoading(true);
        setError(null);
        const workflows = await getSubWorkflows();
        setSubWorkflows(workflows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sub-workflows");
      } finally {
        setIsLoading(false);
      }
    }
    loadSubWorkflows();
  }, []);

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node || node.type !== "call_sub_workflow") return null;

  const data = node.data as CallSubWorkflowData;

  const selectedSubWorkflow = subWorkflows.find(
    (w) => w.id === data.targetWorkflowId
  );

  const handleLabelChange = (label: string) => {
    updateNodeData(node.id, { label });
  };

  const handleWorkflowChange = (workflowId: string) => {
    const workflow = subWorkflows.find((w) => w.id === workflowId);
    if (!workflow) return;

    // When workflow changes, reset input mappings to match the new workflow's inputs
    const newMappings: InputMapping[] = workflow.inputVariables.map((v) => ({
      variableName: v.name,
      valueExpression: v.defaultValue !== undefined ? String(v.defaultValue) : "",
    }));

    updateNodeData(node.id, {
      targetWorkflowId: workflowId,
      targetWorkflowName: workflow.name,
      executionMode: workflow.executionMode,
      inputMappings: newMappings,
    });
  };

  const handleExecutionModeChange = (mode: ExecutionMode) => {
    updateNodeData(node.id, { executionMode: mode });
  };

  const handleTimeoutChange = (timeout: number) => {
    updateNodeData(node.id, { timeoutSeconds: timeout });
  };

  const handleOnFailureChange = (onFailure: OnFailureBehavior) => {
    updateNodeData(node.id, { onFailure });
  };

  const handleRetryCountChange = (retryCount: number) => {
    updateNodeData(node.id, { retryCount });
  };

  const updateInputMapping = (variableName: string, valueExpression: string) => {
    const newMappings = (data.inputMappings || []).map((m) =>
      m.variableName === variableName ? { ...m, valueExpression } : m
    );
    updateNodeData(node.id, { inputMappings: newMappings });
  };

  const addCustomMapping = () => {
    const newMapping: InputMapping = {
      variableName: `custom_${(data.inputMappings?.length || 0) + 1}`,
      valueExpression: "",
    };
    updateNodeData(node.id, {
      inputMappings: [...(data.inputMappings || []), newMapping],
    });
  };

  const removeMapping = (variableName: string) => {
    const newMappings = (data.inputMappings || []).filter(
      (m) => m.variableName !== variableName
    );
    updateNodeData(node.id, { inputMappings: newMappings });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          value={data.label || ""}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Call Sub-Workflow"
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Workflow Selection */}
      <div className="space-y-2">
        <Label>Target Sub-Workflow</Label>
        {subWorkflows.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-700">
              No sub-workflows available. Create a workflow with the
              &quot;Sub-Workflow&quot; trigger type first.
            </p>
          </div>
        ) : (
          <Select
            value={data.targetWorkflowId || ""}
            onValueChange={handleWorkflowChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a sub-workflow..." />
            </SelectTrigger>
            <SelectContent>
              {subWorkflows.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-gray-500">
          Only workflows with the &quot;Sub-Workflow&quot; trigger type are shown.
        </p>
      </div>

      {/* Execution Mode */}
      <div className="space-y-2">
        <Label>Execution Mode</Label>
        <Select
          value={data.executionMode || "sync"}
          onValueChange={(v) => handleExecutionModeChange(v as ExecutionMode)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sync">Synchronous (wait for result)</SelectItem>
            <SelectItem value="async">Asynchronous (fire and forget)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          {data.executionMode === "sync"
            ? "Parent workflow will wait for sub-workflow to complete and receive any returned data."
            : "Parent workflow continues immediately without waiting for sub-workflow completion."}
        </p>
      </div>

      {/* Timeout (only for sync mode) */}
      {data.executionMode === "sync" && (
        <div className="space-y-2">
          <Label htmlFor="timeout">Timeout (seconds)</Label>
          <Input
            id="timeout"
            type="number"
            min={0}
            max={3600}
            value={data.timeoutSeconds || 300}
            onChange={(e) => handleTimeoutChange(parseInt(e.target.value) || 0)}
          />
          <p className="text-xs text-gray-500">
            Maximum time to wait for sub-workflow completion. Set to 0 for no
            timeout.
          </p>
        </div>
      )}

      {/* On Failure Behavior */}
      <div className="space-y-2">
        <Label>On Failure</Label>
        <Select
          value={data.onFailure || "stop"}
          onValueChange={(v) => handleOnFailureChange(v as OnFailureBehavior)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stop">Stop workflow</SelectItem>
            <SelectItem value="continue">Continue to next node</SelectItem>
            <SelectItem value="retry">Retry</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          What to do if the sub-workflow fails or times out.
        </p>
      </div>

      {/* Retry Count (only if retry is selected) */}
      {data.onFailure === "retry" && (
        <div className="space-y-2">
          <Label htmlFor="retryCount">Retry Count</Label>
          <Input
            id="retryCount"
            type="number"
            min={1}
            max={10}
            value={data.retryCount || 3}
            onChange={(e) => handleRetryCountChange(parseInt(e.target.value) || 1)}
          />
        </div>
      )}

      {/* Input Mappings */}
      {selectedSubWorkflow && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Input Variables</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomMapping}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Map values to the sub-workflow&apos;s input variables. Use field
            references like {`{{contact.email}}`} or {`{{node_id.output}}`}.
          </p>

          {data.inputMappings && data.inputMappings.length > 0 ? (
            <div className="space-y-3">
              {data.inputMappings.map((mapping) => {
                const varDef = selectedSubWorkflow.inputVariables.find(
                  (v) => v.name === mapping.variableName
                );
                const isRequired = varDef?.required ?? false;
                const varType = varDef?.type || "string";

                return (
                  <div
                    key={mapping.variableName}
                    className="rounded-lg border border-gray-200 bg-white p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {mapping.variableName}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                          {varType}
                        </span>
                        {isRequired && (
                          <span className="text-xs text-red-600">*required</span>
                        )}
                      </div>
                      {!varDef && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMapping(mapping.variableName)}
                        >
                          <Trash2 className="h-4 w-4 text-gray-500" />
                        </Button>
                      )}
                    </div>
                    {varDef?.description && (
                      <p className="text-xs text-gray-500">{varDef.description}</p>
                    )}
                    <Input
                      value={mapping.valueExpression}
                      onChange={(e) =>
                        updateInputMapping(mapping.variableName, e.target.value)
                      }
                      placeholder={`Value for ${mapping.variableName}`}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-500">
                This sub-workflow has no input variables defined.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Info box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">How Sub-Workflows Work</p>
            <ul className="mt-1 list-disc list-inside space-y-1 text-blue-600">
              <li>
                The target workflow must have a &quot;Sub-Workflow&quot; trigger
              </li>
              <li>Input values are passed to the sub-workflow&apos;s input variables</li>
              <li>
                Use a &quot;Return to Parent&quot; node in the sub-workflow to send
                data back
              </li>
              <li>Returned data is available as {`{{node_id.result}}`}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
