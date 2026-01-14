"use client";

import { Handle, Position } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConditionalSplitData } from "@/types/workflow";
import { OPERATOR_DISPLAY_NAMES } from "@/types/workflow";

interface ConditionalSplitNodeProps {
  data: ConditionalSplitData;
  selected?: boolean;
}

export function ConditionalSplitNode({
  data,
  selected,
}: ConditionalSplitNodeProps) {
  const condition = data.field && data.operator
    ? `${data.field} ${OPERATOR_DISPLAY_NAMES[data.operator]} ${data.value || "..."}`
    : "Configure condition";

  return (
    <div
      className={cn(
        "px-4 py-3 shadow-md rounded-lg bg-white border-2 min-w-[200px] transition-all",
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
            {data.label || "Conditional Split"}
          </span>
          <span className="text-xs text-gray-500 max-w-[150px] truncate">
            {condition}
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
  );
}
