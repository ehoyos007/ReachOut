"use client";

import { Plus, AlertTriangle } from "lucide-react";
import { useWorkflowStore } from "@/lib/store/workflowStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConditionGroupCard } from "./ConditionGroupCard";
import type {
  ConditionalSplitData,
  Condition,
  ConditionGroup,
  LogicalOperator,
} from "@/types/workflow";
import {
  createCondition,
  createConditionGroup,
  migrateConditionalSplitData,
  shouldShowComplexityWarning,
  countConditions,
} from "@/types/workflow";

export function ConditionalSplitPanel() {
  const { selectedNodeId, nodes, updateNodeData } = useWorkflowStore();

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node || node.type !== "conditional_split") return null;

  // Migrate legacy data format if needed
  const rawData = node.data as ConditionalSplitData;
  const data = migrateConditionalSplitData(rawData);

  // If migration happened, update the node data
  if (!rawData.conditionGroups || rawData.conditionGroups.length === 0) {
    // Schedule update for next tick to avoid render loop
    setTimeout(() => {
      updateNodeData(node.id, {
        conditionGroups: data.conditionGroups,
        groupOperator: data.groupOperator,
      });
    }, 0);
  }

  const handleLabelChange = (label: string) => {
    updateNodeData(node.id, { label });
  };

  const handleGroupOperatorChange = (groupOperator: LogicalOperator) => {
    updateNodeData(node.id, { groupOperator });
  };

  const handleUpdateCondition = (
    groupIndex: number,
    conditionIndex: number,
    updates: Partial<Condition>
  ) => {
    const newGroups = [...data.conditionGroups];
    const group = newGroups[groupIndex];
    const condition = group.conditions[conditionIndex];
    group.conditions[conditionIndex] = { ...condition, ...updates };
    updateNodeData(node.id, { conditionGroups: newGroups });
  };

  const handleAddCondition = (groupIndex: number) => {
    const newGroups = [...data.conditionGroups];
    newGroups[groupIndex].conditions.push(createCondition());
    updateNodeData(node.id, { conditionGroups: newGroups });
  };

  const handleDeleteCondition = (groupIndex: number, conditionIndex: number) => {
    const newGroups = [...data.conditionGroups];
    newGroups[groupIndex].conditions.splice(conditionIndex, 1);
    updateNodeData(node.id, { conditionGroups: newGroups });
  };

  const handleUpdateGroupOperator = (
    groupIndex: number,
    logicalOperator: LogicalOperator
  ) => {
    const newGroups = [...data.conditionGroups];
    newGroups[groupIndex].logicalOperator = logicalOperator;
    updateNodeData(node.id, { conditionGroups: newGroups });
  };

  const handleAddGroup = () => {
    const newGroups = [...data.conditionGroups, createConditionGroup()];
    updateNodeData(node.id, { conditionGroups: newGroups });
  };

  const handleDeleteGroup = (groupIndex: number) => {
    const newGroups = data.conditionGroups.filter((_, i) => i !== groupIndex);
    updateNodeData(node.id, { conditionGroups: newGroups });
  };

  const showComplexityWarning = shouldShowComplexityWarning(data);
  const groupCount = data.conditionGroups.length;
  const conditionCount = countConditions(data);
  const canDeleteGroup = groupCount > 1;

  return (
    <div className="space-y-4">
      {/* Label input */}
      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          value={data.label || ""}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Check condition"
        />
      </div>

      {/* Complexity warning */}
      {showComplexityWarning && (
        <Alert variant="default" className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700 text-xs">
            Complex conditions ({conditionCount} conditions in {groupCount} groups) may be harder to debug.
          </AlertDescription>
        </Alert>
      )}

      {/* Conditions section */}
      <div className="space-y-2">
        <Label>Conditions</Label>
        <p className="text-xs text-gray-500">
          Define when contacts should take the &quot;Yes&quot; path.
        </p>

        {/* Condition groups */}
        <div className="space-y-3 mt-3">
          {data.conditionGroups.map((group, groupIndex) => (
            <div key={group.id}>
              <ConditionGroupCard
                group={group}
                groupIndex={groupIndex}
                onUpdateCondition={(conditionIndex, updates) =>
                  handleUpdateCondition(groupIndex, conditionIndex, updates)
                }
                onAddCondition={() => handleAddCondition(groupIndex)}
                onDeleteCondition={(conditionIndex) =>
                  handleDeleteCondition(groupIndex, conditionIndex)
                }
                onUpdateOperator={(operator) =>
                  handleUpdateGroupOperator(groupIndex, operator)
                }
                onDeleteGroup={() => handleDeleteGroup(groupIndex)}
                canDeleteGroup={canDeleteGroup}
              />

              {/* Group operator indicator between groups */}
              {groupIndex < data.conditionGroups.length - 1 && (
                <div className="flex items-center justify-center my-3">
                  <div className="flex-1 h-px bg-gray-300" />
                  <span className="px-3 py-1 text-xs font-semibold text-white bg-gray-500 rounded-full">
                    {data.groupOperator}
                  </span>
                  <div className="flex-1 h-px bg-gray-300" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add group + group operator selector */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleAddGroup}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Group
          </Button>

          {groupCount > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Groups joined by:</span>
              <Select
                value={data.groupOperator}
                onValueChange={handleGroupOperatorChange}
              >
                <SelectTrigger className="h-8 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Branch paths legend */}
      <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
        <p className="font-medium mb-1">Branch paths:</p>
        <ul className="space-y-1">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>Yes: All conditions evaluate to true</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>No: Conditions evaluate to false</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
