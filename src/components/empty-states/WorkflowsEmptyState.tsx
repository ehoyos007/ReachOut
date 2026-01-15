"use client";

import { GitBranch } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface WorkflowsEmptyStateProps {
  onCreateWorkflow?: () => void;
}

export function WorkflowsEmptyState({ onCreateWorkflow }: WorkflowsEmptyStateProps) {
  return (
    <EmptyState
      icon={GitBranch}
      title="No workflows yet"
      description="Create your first automated outreach workflow to engage contacts with personalized SMS and email sequences."
      action={
        onCreateWorkflow
          ? {
              label: "Create Workflow",
              onClick: onCreateWorkflow,
            }
          : undefined
      }
    />
  );
}
