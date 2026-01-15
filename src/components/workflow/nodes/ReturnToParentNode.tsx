"use client";

import { CornerUpLeft } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { ReturnToParentData } from "@/types/workflow";

interface ReturnToParentNodeProps {
  data: ReturnToParentData;
  selected?: boolean;
}

export function ReturnToParentNode({
  data,
  selected,
}: ReturnToParentNodeProps) {
  // Generate sublabel based on configuration
  const getSublabel = () => {
    const outputCount = data.outputVariables?.length || 0;
    const statusLabel =
      data.returnStatus === "success"
        ? "Success"
        : data.returnStatus === "failure"
        ? "Failure"
        : "Custom";

    if (outputCount === 0) {
      return `Return ${statusLabel}`;
    }
    return `${statusLabel}, ${outputCount} output${outputCount > 1 ? "s" : ""}`;
  };

  return (
    <BaseNode
      icon={CornerUpLeft}
      label={data.label || "Return to Parent"}
      sublabel={getSublabel()}
      selected={selected}
      iconColor="text-indigo-600"
      iconBgColor="bg-indigo-100"
      hasSourceHandle={false}
    />
  );
}
