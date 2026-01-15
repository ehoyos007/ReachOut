"use client";

import { Handle, Position } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ConditionalSplitData } from "@/types/workflow";
import {
  migrateConditionalSplitData,
  formatConditionSummary,
  OPERATOR_DISPLAY_NAMES,
} from "@/types/workflow";

interface ConditionalSplitNodeProps {
  data: ConditionalSplitData;
  selected?: boolean;
}

export function ConditionalSplitNode({
  data,
  selected,
}: ConditionalSplitNodeProps) {
  // Migrate legacy data if needed
  const migratedData = migrateConditionalSplitData(data);

  // Get summary text for display
  const summaryText = formatConditionSummary(migratedData);

  // Build tooltip content with full condition breakdown
  const tooltipContent = buildTooltipContent(migratedData);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "px-4 py-3 shadow-md rounded-lg bg-white border-2 min-w-[200px] transition-all cursor-pointer",
              selected ? "border-blue-500 shadow-lg" : "border-gray-200"
            )}
          >
            <Handle
              type="target"
              position={Position.Top}
              className="w-3 h-3 !bg-gray-400 border-2 border-white"
            />

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <GitBranch className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">
                  {migratedData.label || "Conditional Split"}
                </span>
                <span className="text-xs text-gray-500 max-w-[150px] truncate">
                  {summaryText}
                </span>
              </div>
            </div>

            <div className="flex justify-between mt-3 px-2 text-xs text-gray-500">
              <span className="text-green-600 font-medium">Yes</span>
              <span className="text-red-600 font-medium">No</span>
            </div>

            <Handle
              type="source"
              position={Position.Bottom}
              id="yes"
              className="w-3 h-3 !bg-green-500 border-2 border-white"
              style={{ left: "30%" }}
            />
            <Handle
              type="source"
              position={Position.Bottom}
              id="no"
              className="w-3 h-3 !bg-red-500 border-2 border-white"
              style={{ left: "70%" }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[300px]">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Build tooltip content showing full condition breakdown
 */
function buildTooltipContent(data: ConditionalSplitData): React.ReactNode {
  if (!data.conditionGroups || data.conditionGroups.length === 0) {
    return <span className="text-gray-500">No conditions configured</span>;
  }

  const groups = data.conditionGroups;
  const groupCount = groups.length;

  return (
    <div className="space-y-2 text-xs">
      {groups.map((group, groupIndex) => (
        <div key={group.id}>
          {/* Group conditions */}
          <div className="space-y-1">
            {group.conditions.map((condition, condIndex) => {
              const opDisplay =
                OPERATOR_DISPLAY_NAMES[condition.operator] || condition.operator;
              const needsValue = !["is_empty", "is_not_empty"].includes(
                condition.operator
              );

              return (
                <div key={condition.id}>
                  <span className="text-gray-700">
                    <span className="font-medium">{condition.field || "?"}</span>{" "}
                    {opDisplay}
                    {needsValue && (
                      <>
                        {" "}
                        <span className="font-medium">
                          {condition.value || "?"}
                        </span>
                      </>
                    )}
                  </span>

                  {/* AND/OR between conditions in same group */}
                  {condIndex < group.conditions.length - 1 && (
                    <div className="text-purple-600 font-semibold text-center">
                      {group.logicalOperator}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* AND/OR between groups */}
          {groupIndex < groupCount - 1 && (
            <div className="my-1 py-1 border-t border-b border-gray-200 text-center">
              <span className="text-blue-600 font-bold">{data.groupOperator}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
