"use client";

import {
  MessageSquare,
  Mail,
  PhoneIncoming,
  PhoneOutgoing,
  StickyNote,
  Tag,
  X,
  RefreshCw,
  UserPlus,
  PenLine,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineEventType } from "@/types/timeline";
import { EVENT_TYPE_CONFIG } from "@/types/timeline";

interface TimelineEventIconProps {
  eventType: TimelineEventType;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const iconMap: Record<string, React.ElementType> = {
  MessageSquare,
  Mail,
  PhoneIncoming,
  PhoneOutgoing,
  StickyNote,
  Tag,
  X,
  RefreshCw,
  UserPlus,
  PenLine,
};

const sizeClasses = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function TimelineEventIcon({
  eventType,
  size = "md",
  className,
}: TimelineEventIconProps) {
  const config = EVENT_TYPE_CONFIG[eventType];
  const IconComponent = iconMap[config.icon] || MessageSquare;

  // Determine if we need a direction arrow
  const isOutbound = ["sms_sent", "email_sent"].includes(eventType);
  const isInbound = ["sms_received", "email_received"].includes(eventType);

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <IconComponent className={cn(sizeClasses[size], config.colorClass)} />
      {isOutbound && (
        <ArrowUp
          className={cn(
            "absolute -top-1 -right-1",
            size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5",
            "text-blue-500"
          )}
        />
      )}
      {isInbound && (
        <ArrowDown
          className={cn(
            "absolute -top-1 -right-1",
            size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5",
            "text-gray-500"
          )}
        />
      )}
    </div>
  );
}
