import { Bell } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function NotificationsEmptyState() {
  return (
    <EmptyState
      icon={Bell}
      title="All caught up!"
      description="You have no new notifications. We'll let you know when contacts respond to your messages."
    />
  );
}
