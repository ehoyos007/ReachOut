"use client";

import { Workflow } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { CallSubWorkflowData } from "@/types/workflow";

interface CallSubWorkflowNodeProps {
  data: CallSubWorkflowData;
  selected?: boolean;
}

export function CallSubWorkflowNode({
  data,
  selected,
}: CallSubWorkflowNodeProps) {
  // Generate sublabel based on configuration
  const getSublabel = () => {
    if (!data.targetWorkflowName) {
      return "Select workflow";
    }

    const mode = data.executionMode === "sync" ? "Sync" : "Async";
    const inputCount = data.inputMappings?.length || 0;

    if (inputCount === 0) {
      return `${mode}: ${data.targetWorkflowName}`;
    }

    return `${mode}, ${inputCount} input${inputCount > 1 ? "s" : ""}`;
  };

  return (
    <BaseNode
      icon={Workflow}
      label={data.label || "Call Sub-Workflow"}
      sublabel={getSublabel()}
      selected={selected}
      iconColor="text-cyan-600"
      iconBgColor="bg-cyan-100"
    />
  );
}
