"use client";

import { FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface TemplatesEmptyStateProps {
  onCreateTemplate?: () => void;
}

export function TemplatesEmptyState({ onCreateTemplate }: TemplatesEmptyStateProps) {
  return (
    <EmptyState
      icon={FileText}
      title="No templates yet"
      description="Create reusable message templates with dynamic placeholders to personalize your outreach at scale."
      action={
        onCreateTemplate
          ? {
              label: "Create Template",
              onClick: onCreateTemplate,
            }
          : undefined
      }
    />
  );
}
