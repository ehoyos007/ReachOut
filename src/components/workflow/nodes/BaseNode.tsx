"use client";

import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface BaseNodeProps {
  icon: LucideIcon;
  label: string;
  sublabel?: string;
  selected?: boolean;
  iconColor?: string;
  iconBgColor?: string;
  hasSourceHandle?: boolean;
  hasTargetHandle?: boolean;
  sourceHandles?: { id: string; label?: string; position?: number }[];
}

export function BaseNode({
  icon: Icon,
  label,
  sublabel,
  selected,
  iconColor = "text-gray-600",
  iconBgColor = "bg-gray-100",
  hasSourceHandle = true,
  hasTargetHandle = true,
  sourceHandles,
}: BaseNodeProps) {
  return (
    <div
      className={cn(
        "px-4 py-3 shadow-md rounded-lg bg-white border-2 min-w-[180px] transition-all",
        selected ? "border-blue-500 shadow-lg" : "border-gray-200"
      )}
    >
      {hasTargetHandle && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 !bg-gray-400 border-2 border-white"
        />
      )}

      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", iconBgColor)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          {sublabel && (
            <span className="text-xs text-gray-500">{sublabel}</span>
          )}
        </div>
      </div>

      {hasSourceHandle && !sourceHandles && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 !bg-gray-400 border-2 border-white"
        />
      )}

      {sourceHandles &&
        sourceHandles.map((handle, index) => (
          <Handle
            key={handle.id}
            type="source"
            position={Position.Bottom}
            id={handle.id}
            className="w-3 h-3 !bg-gray-400 border-2 border-white"
            style={{
              left: `${((index + 1) / (sourceHandles.length + 1)) * 100}%`,
            }}
          />
        ))}
    </div>
  );
}
