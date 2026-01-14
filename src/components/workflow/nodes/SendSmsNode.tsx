"use client";

import { MessageSquare } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { SendSmsData } from "@/types/workflow";

interface SendSmsNodeProps {
  data: SendSmsData;
  selected?: boolean;
}

export function SendSmsNode({
  data,
  selected,
}: SendSmsNodeProps) {
  const sublabel = data.templateName || "Select template";

  return (
    <BaseNode
      icon={MessageSquare}
      label={data.label || "Send SMS"}
      sublabel={sublabel}
      selected={selected}
      iconColor="text-blue-600"
      iconBgColor="bg-blue-100"
    />
  );
}
