"use client";

import {
  Play,
  UserPlus,
  Tag,
  Calendar,
  Activity,
  Workflow,
} from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { TriggerStartData, TriggerType } from "@/types/workflow";
import { formatTriggerConfig, TRIGGER_TYPE_DISPLAY_NAMES } from "@/types/workflow";
import type { LucideIcon } from "lucide-react";

interface TriggerStartNodeProps {
  data: TriggerStartData;
  selected?: boolean;
}

// Map trigger types to icons
const TRIGGER_TYPE_ICONS: Record<TriggerType, LucideIcon> = {
  manual: Play,
  contact_added: UserPlus,
  tag_added: Tag,
  scheduled: Calendar,
  status_changed: Activity,
  sub_workflow: Workflow,
};

// Map trigger types to colors
const TRIGGER_TYPE_COLORS: Record<TriggerType, { icon: string; bg: string }> = {
  manual: { icon: "text-green-600", bg: "bg-green-100" },
  contact_added: { icon: "text-blue-600", bg: "bg-blue-100" },
  tag_added: { icon: "text-purple-600", bg: "bg-purple-100" },
  scheduled: { icon: "text-orange-600", bg: "bg-orange-100" },
  status_changed: { icon: "text-teal-600", bg: "bg-teal-100" },
  sub_workflow: { icon: "text-indigo-600", bg: "bg-indigo-100" },
};

export function TriggerStartNode({
  data,
  selected,
}: TriggerStartNodeProps) {
  const triggerConfig = data.triggerConfig || { type: "manual" };
  const triggerType = triggerConfig.type;
  const Icon = TRIGGER_TYPE_ICONS[triggerType];
  const colors = TRIGGER_TYPE_COLORS[triggerType];

  // Generate sublabel based on trigger config
  const sublabel = formatTriggerConfig(triggerConfig);

  return (
    <BaseNode
      icon={Icon}
      label={data.label || TRIGGER_TYPE_DISPLAY_NAMES[triggerType]}
      sublabel={sublabel}
      selected={selected}
      iconColor={colors.icon}
      iconBgColor={colors.bg}
      hasTargetHandle={false}
    />
  );
}
