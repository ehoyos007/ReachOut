"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConditionRow } from "./ConditionRow";
import type {
  Condition,
  ConditionGroup,
  LogicalOperator,
} from "@/types/workflow";
import { createCondition } from "@/types/workflow";

interface ConditionGroupCardProps {
  group: ConditionGroup;
  groupIndex: number;
  onUpdateCondition: (conditionIndex: number, updates: Partial<Condition>) => void;
  onAddCondition: () => void;
  onDeleteCondition: (conditionIndex: number) => void;
  onUpdateOperator: (operator: LogicalOperator) => void;
  onDeleteGroup: () => void;
  canDeleteGroup: boolean;
}

export function ConditionGroupCard({
  group,
  groupIndex,
  onUpdateCondition,
  onAddCondition,
  onDeleteCondition,
  onUpdateOperator,
  onDeleteGroup,
  canDeleteGroup,
}: ConditionGroupCardProps) {
  const canDeleteCondition = group.conditions.length > 1;

  return (
    <Card className="p-3 bg-gray-50 border-gray-200">
      {/* Group header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500">
          Group {groupIndex + 1}
        </span>
        {canDeleteGroup && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-red-500"
            onClick={onDeleteGroup}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Conditions */}
      <div className="space-y-2">
        {group.conditions.map((condition, conditionIndex) => (
          <div key={condition.id}>
            <ConditionRow
              condition={condition}
              onUpdate={(updates) => onUpdateCondition(conditionIndex, updates)}
              onDelete={() => onDeleteCondition(conditionIndex)}
              canDelete={canDeleteCondition}
            />

            {/* AND/OR indicator between conditions */}
            {conditionIndex < group.conditions.length - 1 && (
              <div className="flex items-center justify-center my-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="px-2 text-xs font-medium text-gray-400">
                  {group.logicalOperator}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Group footer: Add condition + operator selector */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-gray-600 hover:text-gray-900"
          onClick={onAddCondition}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Condition
        </Button>

        {group.conditions.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Join with:</span>
            <Select
              value={group.logicalOperator}
              onValueChange={(value) => onUpdateOperator(value as LogicalOperator)}
            >
              <SelectTrigger className="h-7 w-20 text-xs">
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
    </Card>
  );
}
