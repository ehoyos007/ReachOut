"use client";

import { useWorkflowStore } from "@/lib/store/workflowStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type TriggerStartData,
  type TriggerType,
  type TriggerConfig,
  type ContactStatus,
  type DayOfWeek,
  type ScheduleFrequency,
  type InputVariable,
  type VariableType,
  type ExecutionMode,
  TRIGGER_TYPE_DISPLAY_NAMES,
  TRIGGER_TYPE_DESCRIPTIONS,
  STATUS_DISPLAY_NAMES,
  DAY_OF_WEEK_NAMES,
} from "@/types/workflow";
import { Plus, Trash2 } from "lucide-react";

// Mock tags for now - would come from database
const MOCK_TAGS = [
  { id: "tag-1", name: "VIP" },
  { id: "tag-2", name: "Lead" },
  { id: "tag-3", name: "Customer" },
  { id: "tag-4", name: "Prospect" },
  { id: "tag-5", name: "Newsletter" },
];

const VARIABLE_TYPES: { value: VariableType; label: string }[] = [
  { value: "string", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "object", label: "Object" },
  { value: "array", label: "Array" },
];

export function TriggerStartPanel() {
  const { selectedNodeId, nodes, updateNodeData } = useWorkflowStore();

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node || node.type !== "trigger_start") return null;

  const data = node.data as TriggerStartData;
  const triggerConfig = data.triggerConfig || { type: "manual" };

  const handleLabelChange = (label: string) => {
    updateNodeData(node.id, { label });
  };

  const handleTriggerTypeChange = (type: TriggerType) => {
    let newConfig: TriggerConfig;
    switch (type) {
      case "manual":
        newConfig = { type: "manual" };
        break;
      case "contact_added":
        newConfig = { type: "contact_added" };
        break;
      case "tag_added":
        newConfig = { type: "tag_added", tagIds: [], matchMode: "any" };
        break;
      case "scheduled":
        newConfig = {
          type: "scheduled",
          scheduleType: "recurring",
          frequency: "daily",
          time: "09:00",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        break;
      case "status_changed":
        newConfig = { type: "status_changed", statuses: [] };
        break;
      case "sub_workflow":
        newConfig = {
          type: "sub_workflow",
          inputVariables: [],
          executionMode: "sync",
        };
        break;
      default:
        newConfig = { type: "manual" };
    }
    updateNodeData(node.id, { triggerConfig: newConfig });
  };

  const updateTriggerConfig = (updates: Partial<TriggerConfig>) => {
    updateNodeData(node.id, {
      triggerConfig: { ...triggerConfig, ...updates },
    });
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
          placeholder="Start"
        />
      </div>

      {/* Trigger Type Selector */}
      <div className="space-y-2">
        <Label>Trigger Type</Label>
        <Select
          value={triggerConfig.type}
          onValueChange={(v) => handleTriggerTypeChange(v as TriggerType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TRIGGER_TYPE_DISPLAY_NAMES) as TriggerType[]).map(
              (type) => (
                <SelectItem key={type} value={type}>
                  {TRIGGER_TYPE_DISPLAY_NAMES[type]}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          {TRIGGER_TYPE_DESCRIPTIONS[triggerConfig.type]}
        </p>
      </div>

      {/* Type-specific configuration */}
      {triggerConfig.type === "manual" && <ManualConfig />}
      {triggerConfig.type === "contact_added" && <ContactAddedConfig />}
      {triggerConfig.type === "tag_added" && (
        <TagAddedConfig
          config={triggerConfig}
          onUpdate={updateTriggerConfig}
        />
      )}
      {triggerConfig.type === "scheduled" && (
        <ScheduledConfig
          config={triggerConfig}
          onUpdate={updateTriggerConfig}
        />
      )}
      {triggerConfig.type === "status_changed" && (
        <StatusChangedConfig
          config={triggerConfig}
          onUpdate={updateTriggerConfig}
        />
      )}
      {triggerConfig.type === "sub_workflow" && (
        <SubWorkflowConfig
          config={triggerConfig}
          onUpdate={updateTriggerConfig}
        />
      )}
    </div>
  );
}

// Manual trigger - no configuration needed
function ManualConfig() {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-sm text-gray-600">
        This workflow will only run when you manually click the &quot;Run&quot; button.
        No automatic triggers are configured.
      </p>
    </div>
  );
}

// Contact Added trigger - no configuration needed
function ContactAddedConfig() {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-sm text-gray-600">
        This workflow will automatically start whenever a new contact is created
        in the system.
      </p>
    </div>
  );
}

// Tag Added trigger configuration
function TagAddedConfig({
  config,
  onUpdate,
}: {
  config: TriggerConfig & { type: "tag_added" };
  onUpdate: (updates: Partial<TriggerConfig>) => void;
}) {
  const toggleTag = (tagId: string) => {
    const current = config.tagIds || [];
    const newTagIds = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    onUpdate({ tagIds: newTagIds });
  };

  return (
    <div className="space-y-4">
      {/* Match Mode */}
      <div className="space-y-2">
        <Label>Match Mode</Label>
        <Select
          value={config.matchMode}
          onValueChange={(v) => onUpdate({ matchMode: v as "any" | "all" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any of these tags</SelectItem>
            <SelectItem value="all">All of these tags</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          {config.matchMode === "any"
            ? "Trigger when any selected tag is added"
            : "Trigger only when all selected tags are present"}
        </p>
      </div>

      {/* Tag Selection */}
      <div className="space-y-2">
        <Label>Select Tags</Label>
        <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
          {MOCK_TAGS.map((tag) => (
            <div key={tag.id} className="flex items-center space-x-2">
              <Checkbox
                id={tag.id}
                checked={config.tagIds?.includes(tag.id) || false}
                onCheckedChange={() => toggleTag(tag.id)}
              />
              <label
                htmlFor={tag.id}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {tag.name}
              </label>
            </div>
          ))}
        </div>
        {config.tagIds && config.tagIds.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {config.tagIds.map((tagId) => {
              const tag = MOCK_TAGS.find((t) => t.id === tagId);
              return tag ? (
                <Badge key={tagId} variant="secondary">
                  {tag.name}
                </Badge>
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Scheduled trigger configuration
function ScheduledConfig({
  config,
  onUpdate,
}: {
  config: TriggerConfig & { type: "scheduled" };
  onUpdate: (updates: Partial<TriggerConfig>) => void;
}) {
  const toggleDayOfWeek = (day: DayOfWeek) => {
    const current = config.daysOfWeek || [];
    const newDays = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort();
    onUpdate({ daysOfWeek: newDays });
  };

  return (
    <div className="space-y-4">
      {/* Schedule Type */}
      <div className="space-y-2">
        <Label>Schedule Type</Label>
        <Select
          value={config.scheduleType}
          onValueChange={(v) =>
            onUpdate({ scheduleType: v as "once" | "recurring" })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recurring">Recurring</SelectItem>
            <SelectItem value="once">One-time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.scheduleType === "once" ? (
        /* One-time scheduling */
        <div className="space-y-2">
          <Label htmlFor="runAt">Run At</Label>
          <Input
            id="runAt"
            type="datetime-local"
            value={config.runAt || ""}
            onChange={(e) => onUpdate({ runAt: e.target.value })}
          />
          <p className="text-xs text-gray-500">
            Select the exact date and time to run this workflow.
          </p>
        </div>
      ) : (
        /* Recurring scheduling */
        <>
          {/* Frequency */}
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select
              value={config.frequency || "daily"}
              onValueChange={(v) => onUpdate({ frequency: v as ScheduleFrequency })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={config.time || "09:00"}
              onChange={(e) => onUpdate({ time: e.target.value })}
            />
          </div>

          {/* Weekly: Day selection */}
          {config.frequency === "weekly" && (
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="grid grid-cols-4 gap-2">
                {([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((day) => (
                  <div key={day} className="flex items-center space-x-1">
                    <Checkbox
                      id={`day-${day}`}
                      checked={config.daysOfWeek?.includes(day) || false}
                      onCheckedChange={() => toggleDayOfWeek(day)}
                    />
                    <label
                      htmlFor={`day-${day}`}
                      className="text-xs cursor-pointer"
                    >
                      {DAY_OF_WEEK_NAMES[day].slice(0, 3)}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly: Day of month */}
          {config.frequency === "monthly" && (
            <div className="space-y-2">
              <Label htmlFor="dayOfMonth">Day of Month</Label>
              <Input
                id="dayOfMonth"
                type="number"
                min={1}
                max={31}
                value={config.dayOfMonth || ""}
                onChange={(e) =>
                  onUpdate({ dayOfMonth: parseInt(e.target.value, 10) || 1 })
                }
                placeholder="1"
              />
              <p className="text-xs text-gray-500">
                Enter a day between 1 and 31. If the month has fewer days, it
                will run on the last day.
              </p>
            </div>
          )}

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              value={config.timezone || ""}
              onChange={(e) => onUpdate({ timezone: e.target.value })}
              placeholder="America/New_York"
            />
            <p className="text-xs text-gray-500">
              Current: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// Status Changed trigger configuration
function StatusChangedConfig({
  config,
  onUpdate,
}: {
  config: TriggerConfig & { type: "status_changed" };
  onUpdate: (updates: Partial<TriggerConfig>) => void;
}) {
  const toggleStatus = (status: ContactStatus) => {
    const current = config.statuses || [];
    const newStatuses = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onUpdate({ statuses: newStatuses });
  };

  const allStatuses: ContactStatus[] = [
    "new",
    "contacted",
    "responded",
    "qualified",
    "disqualified",
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Trigger when status changes to:</Label>
        <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
          {allStatuses.map((status) => (
            <div key={status} className="flex items-center space-x-2">
              <Checkbox
                id={`status-${status}`}
                checked={config.statuses?.includes(status) || false}
                onCheckedChange={() => toggleStatus(status)}
              />
              <label
                htmlFor={`status-${status}`}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {STATUS_DISPLAY_NAMES[status]}
              </label>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          The workflow will trigger when a contact&apos;s status changes to any of
          the selected values.
        </p>
      </div>
    </div>
  );
}

// Sub-workflow trigger configuration
function SubWorkflowConfig({
  config,
  onUpdate,
}: {
  config: TriggerConfig & { type: "sub_workflow" };
  onUpdate: (updates: Partial<TriggerConfig>) => void;
}) {
  const addInputVariable = () => {
    const newVar: InputVariable = {
      name: `input_${(config.inputVariables?.length || 0) + 1}`,
      type: "string",
      required: false,
    };
    onUpdate({
      inputVariables: [...(config.inputVariables || []), newVar],
    });
  };

  const updateInputVariable = (index: number, updates: Partial<InputVariable>) => {
    const newVars = [...(config.inputVariables || [])];
    newVars[index] = { ...newVars[index], ...updates };
    onUpdate({ inputVariables: newVars });
  };

  const removeInputVariable = (index: number) => {
    const newVars = (config.inputVariables || []).filter((_, i) => i !== index);
    onUpdate({ inputVariables: newVars });
  };

  return (
    <div className="space-y-4">
      {/* Execution Mode */}
      <div className="space-y-2">
        <Label>Execution Mode</Label>
        <Select
          value={config.executionMode}
          onValueChange={(v) => onUpdate({ executionMode: v as ExecutionMode })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sync">Synchronous (Wait for completion)</SelectItem>
            <SelectItem value="async">Asynchronous (Fire and forget)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          {config.executionMode === "sync"
            ? "Parent workflow will wait for this sub-workflow to complete"
            : "Parent workflow will continue immediately after triggering"}
        </p>
      </div>

      {/* Input Variables */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Input Variables</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addInputVariable}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          Define variables that parent workflows can pass to this sub-workflow.
        </p>

        {config.inputVariables && config.inputVariables.length > 0 ? (
          <div className="space-y-3">
            {config.inputVariables.map((variable, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 bg-white p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Variable {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInputVariable(index)}
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
                        updateInputVariable(index, { name: e.target.value })
                      }
                      placeholder="variable_name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={variable.type}
                      onValueChange={(v) =>
                        updateInputVariable(index, { type: v as VariableType })
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
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`required-${index}`}
                    checked={variable.required || false}
                    onCheckedChange={(checked) =>
                      updateInputVariable(index, { required: !!checked })
                    }
                  />
                  <label
                    htmlFor={`required-${index}`}
                    className="text-xs cursor-pointer"
                  >
                    Required
                  </label>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-500">
              No input variables defined. Click &quot;Add&quot; to create one.
            </p>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <p className="text-sm text-blue-700">
          <strong>Tip:</strong> Use the &quot;Return to Parent&quot; node at the end of
          this workflow to send data back to the parent workflow.
        </p>
      </div>
    </div>
  );
}
