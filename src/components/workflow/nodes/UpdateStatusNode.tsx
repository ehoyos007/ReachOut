"use client";

import { UserCheck } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { UpdateStatusData } from "@/types/workflow";
import { STATUS_DISPLAY_NAMES } from "@/types/workflow";

interface UpdateStatusNodeProps {
  data: UpdateStatusData;
  selected?: boolean;
}

export function UpdateStatusNode({
  data,
  selected,
}: UpdateStatusNodeProps) {
  const sublabel = data.newStatus
    ? `Set to "${STATUS_DISPLAY_NAMES[data.newStatus]}"`
    : "Select status";

  return (
    <BaseNode
      icon={UserCheck}
      label={data.label || "Update Status"}
      sublabel={sublabel}
      selected={selected}
      iconColor="text-teal-600"
      iconBgColor="bg-teal-100"
    />
  );
}
