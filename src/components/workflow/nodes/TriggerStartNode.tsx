"use client";

import { Play } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { TriggerStartData } from "@/types/workflow";

interface TriggerStartNodeProps {
  data: TriggerStartData;
  selected?: boolean;
}

export function TriggerStartNode({
  data,
  selected,
}: TriggerStartNodeProps) {
  return (
    <BaseNode
      icon={Play}
      label={data.label || "Start"}
      sublabel="Workflow entry point"
      selected={selected}
      iconColor="text-green-600"
      iconBgColor="bg-green-100"
      hasTargetHandle={false}
    />
  );
}
