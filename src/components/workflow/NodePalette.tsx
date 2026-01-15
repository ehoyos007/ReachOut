"use client";

import { DragEvent } from "react";
import {
  Play,
  Clock,
  GitBranch,
  MessageSquare,
  Mail,
  UserCheck,
  StopCircle,
  CornerUpLeft,
  LucideIcon,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { WorkflowNodeType } from "@/types/workflow";

const ICON_MAP: Record<string, LucideIcon> = {
  Play,
  Clock,
  GitBranch,
  MessageSquare,
  Mail,
  UserCheck,
  StopCircle,
  CornerUpLeft,
};

interface NodePaletteItem {
  type: WorkflowNodeType;
  label: string;
  description: string;
  icon: string;
  iconColor: string;
  iconBgColor: string;
}

const NODE_CATEGORIES: {
  name: string;
  items: NodePaletteItem[];
}[] = [
  {
    name: "Trigger",
    items: [
      {
        type: "trigger_start",
        label: "Start",
        description: "Entry point",
        icon: "Play",
        iconColor: "text-green-600",
        iconBgColor: "bg-green-100",
      },
    ],
  },
  {
    name: "Timing",
    items: [
      {
        type: "time_delay",
        label: "Time Delay",
        description: "Wait before next step",
        icon: "Clock",
        iconColor: "text-orange-600",
        iconBgColor: "bg-orange-100",
      },
    ],
  },
  {
    name: "Logic",
    items: [
      {
        type: "conditional_split",
        label: "Conditional Split",
        description: "Branch on condition",
        icon: "GitBranch",
        iconColor: "text-purple-600",
        iconBgColor: "bg-purple-100",
      },
      {
        type: "stop_on_reply",
        label: "Stop on Reply",
        description: "Exit if replied",
        icon: "StopCircle",
        iconColor: "text-red-600",
        iconBgColor: "bg-red-100",
      },
    ],
  },
  {
    name: "Actions",
    items: [
      {
        type: "send_sms",
        label: "Send SMS",
        description: "Send text message",
        icon: "MessageSquare",
        iconColor: "text-blue-600",
        iconBgColor: "bg-blue-100",
      },
      {
        type: "send_email",
        label: "Send Email",
        description: "Send email message",
        icon: "Mail",
        iconColor: "text-indigo-600",
        iconBgColor: "bg-indigo-100",
      },
      {
        type: "update_status",
        label: "Update Status",
        description: "Change contact status",
        icon: "UserCheck",
        iconColor: "text-teal-600",
        iconBgColor: "bg-teal-100",
      },
      {
        type: "return_to_parent",
        label: "Return to Parent",
        description: "Return to parent workflow",
        icon: "CornerUpLeft",
        iconColor: "text-indigo-600",
        iconBgColor: "bg-indigo-100",
      },
    ],
  },
];

interface DraggableNodeProps {
  item: NodePaletteItem;
}

function DraggableNode({ item }: DraggableNodeProps) {
  const Icon = ICON_MAP[item.icon];

  const onDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData("application/reactflow", item.type);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white cursor-grab hover:border-gray-300 hover:shadow-sm transition-all active:cursor-grabbing"
      draggable
      onDragStart={onDragStart}
    >
      <div className={cn("p-2 rounded-lg", item.iconBgColor)}>
        <Icon className={cn("w-4 h-4", item.iconColor)} />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900">{item.label}</span>
        <span className="text-xs text-gray-500">{item.description}</span>
      </div>
    </div>
  );
}

export function NodePalette() {
  return (
    <div className="w-64 border-r bg-gray-50 flex flex-col">
      <div className="p-4 border-b bg-white">
        <h2 className="font-semibold text-gray-900">Nodes</h2>
        <p className="text-xs text-gray-500 mt-1">
          Drag and drop nodes onto the canvas
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {NODE_CATEGORIES.map((category, index) => (
            <div key={category.name}>
              {index > 0 && <Separator className="mb-4" />}
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {category.name}
              </h3>
              <div className="space-y-2">
                {category.items.map((item) => (
                  <DraggableNode key={item.type} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
