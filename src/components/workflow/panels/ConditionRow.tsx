"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Condition, ComparisonOperator } from "@/types/workflow";
import { OPERATOR_DISPLAY_NAMES } from "@/types/workflow";

// Common contact fields that can be used in conditions
export const CONTACT_FIELDS = [
  { value: "status", label: "Status" },
  { value: "tags", label: "Tags" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "replied", label: "Has Replied" },
  { value: "last_contacted", label: "Last Contacted" },
];

interface ConditionRowProps {
  condition: Condition;
  onUpdate: (updates: Partial<Condition>) => void;
  onDelete: () => void;
  canDelete: boolean;
}

export function ConditionRow({
  condition,
  onUpdate,
  onDelete,
  canDelete,
}: ConditionRowProps) {
  // Check if operator needs a value input
  const needsValue = !["is_empty", "is_not_empty"].includes(condition.operator);

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 grid grid-cols-3 gap-2">
        {/* Field selector */}
        <Select
          value={condition.field || ""}
          onValueChange={(field) => onUpdate({ field })}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Field" />
          </SelectTrigger>
          <SelectContent>
            {CONTACT_FIELDS.map((field) => (
              <SelectItem key={field.value} value={field.value}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Operator selector */}
        <Select
          value={condition.operator || "equals"}
          onValueChange={(operator) =>
            onUpdate({ operator: operator as ComparisonOperator })
          }
        >
          <SelectTrigger className="h-9 text-sm">
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

        {/* Value input (only if operator needs it) */}
        {needsValue ? (
          <Input
            value={condition.value || ""}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder="Value"
            className="h-9 text-sm"
          />
        ) : (
          <div /> // Empty placeholder to maintain grid
        )}
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-gray-400 hover:text-red-500 shrink-0"
        onClick={onDelete}
        disabled={!canDelete}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
