"use client";

import { Mail } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { SendEmailData } from "@/types/workflow";

interface SendEmailNodeProps {
  data: SendEmailData;
  selected?: boolean;
}

export function SendEmailNode({
  data,
  selected,
}: SendEmailNodeProps) {
  const sublabel = data.templateName || "Select template";

  return (
    <BaseNode
      icon={Mail}
      label={data.label || "Send Email"}
      sublabel={sublabel}
      selected={selected}
      iconColor="text-indigo-600"
      iconBgColor="bg-indigo-100"
    />
  );
}
