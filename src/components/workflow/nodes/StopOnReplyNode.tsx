"use client";

import { StopCircle } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { StopOnReplyData } from "@/types/workflow";
import { CHANNEL_DISPLAY_NAMES } from "@/types/workflow";

interface StopOnReplyNodeProps {
  data: StopOnReplyData;
  selected?: boolean;
}

export function StopOnReplyNode({
  data,
  selected,
}: StopOnReplyNodeProps) {
  const sublabel = data.channel
    ? CHANNEL_DISPLAY_NAMES[data.channel]
    : "Any channel";

  return (
    <BaseNode
      icon={StopCircle}
      label={data.label || "Stop on Reply"}
      sublabel={sublabel}
      selected={selected}
      iconColor="text-red-600"
      iconBgColor="bg-red-100"
      hasSourceHandle={false}
    />
  );
}
