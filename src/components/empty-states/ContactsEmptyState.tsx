"use client";

import { Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface ContactsEmptyStateProps {
  onAddContact?: () => void;
}

export function ContactsEmptyState({ onAddContact }: ContactsEmptyStateProps) {
  return (
    <EmptyState
      icon={Users}
      title="No contacts yet"
      description="Import your contacts from a CSV file or add them manually to start building your outreach campaigns."
      action={
        onAddContact
          ? {
              label: "Add Contact",
              onClick: onAddContact,
            }
          : undefined
      }
    />
  );
}
