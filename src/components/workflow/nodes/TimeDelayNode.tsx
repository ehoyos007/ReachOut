"use client";

import { Clock } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { TimeDelayData } from "@/types/workflow";
import { formatTimeDelay } from "@/types/workflow";

interface TimeDelayNodeProps {
  data: TimeDelayData;
  selected?: boolean;
}

export function TimeDelayNode({
  data,
  selected,
}: TimeDelayNodeProps) {
  const sublabel = data.duration && data.unit
    ? `Wait ${formatTimeDelay(data.duration, data.unit)}`
    : "Configure delay";

  return (
    <BaseNode
      icon={Clock}
      label={data.label || "Time Delay"}
      sublabel={sublabel}
      selected={selected}
      iconColor="text-orange-600"
      iconBgColor="bg-orange-100"
    />
  );
}
