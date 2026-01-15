"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, ChevronDown, X, Send } from "lucide-react";

interface SchedulePickerProps {
  scheduledAt: string | null;
  onChange: (scheduledAt: string | null) => void;
  disabled?: boolean;
}

// Quick scheduling options
interface QuickOption {
  label: string;
  getDate: () => Date;
}

const getQuickOptions = (): QuickOption[] => {
  const now = new Date();

  return [
    {
      label: "In 1 hour",
      getDate: () => new Date(now.getTime() + 60 * 60 * 1000),
    },
    {
      label: "In 3 hours",
      getDate: () => new Date(now.getTime() + 3 * 60 * 60 * 1000),
    },
    {
      label: "Tomorrow 9 AM",
      getDate: () => {
        const date = new Date(now);
        date.setDate(date.getDate() + 1);
        date.setHours(9, 0, 0, 0);
        return date;
      },
    },
    {
      label: "Tomorrow 2 PM",
      getDate: () => {
        const date = new Date(now);
        date.setDate(date.getDate() + 1);
        date.setHours(14, 0, 0, 0);
        return date;
      },
    },
    {
      label: "Monday 8 AM",
      getDate: () => {
        const date = new Date(now);
        const daysUntilMonday = ((8 - date.getDay()) % 7) || 7;
        date.setDate(date.getDate() + daysUntilMonday);
        date.setHours(8, 0, 0, 0);
        return date;
      },
    },
  ];
};

function formatScheduledDate(date: Date): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  if (isTomorrow) {
    return `Tomorrow at ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return `${dateStr} at ${timeStr}`;
}

function toLocalDateTimeInput(date: Date): { date: string; time: string } {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

function fromLocalDateTimeInput(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

export function SchedulePicker({
  scheduledAt,
  onChange,
  disabled = false,
}: SchedulePickerProps) {
  const [open, setOpen] = useState(false);
  const quickOptions = useMemo(getQuickOptions, []);

  // Parse scheduled date
  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
  const isScheduled = scheduledDate && scheduledDate > new Date();

  // Local input state
  const localInputs = scheduledDate
    ? toLocalDateTimeInput(scheduledDate)
    : toLocalDateTimeInput(new Date(Date.now() + 60 * 60 * 1000));

  const [dateValue, setDateValue] = useState(localInputs.date);
  const [timeValue, setTimeValue] = useState(localInputs.time);

  const handleQuickOption = (option: QuickOption) => {
    const date = option.getDate();
    onChange(date.toISOString());
    setOpen(false);
  };

  const handleSendNow = () => {
    onChange(null);
    setOpen(false);
  };

  const handleCustomSchedule = () => {
    if (dateValue && timeValue) {
      const date = fromLocalDateTimeInput(dateValue, timeValue);
      if (date > new Date()) {
        onChange(date.toISOString());
        setOpen(false);
      }
    }
  };

  const handleClearSchedule = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  // Get minimum date (now)
  const minDate = toLocalDateTimeInput(new Date()).date;

  // Get timezone name
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={isScheduled ? "secondary" : "outline"}
          disabled={disabled}
          className="w-full justify-between h-9"
        >
          <div className="flex items-center gap-2">
            {isScheduled ? (
              <>
                <Calendar className="h-4 w-4" />
                <span>{formatScheduledDate(scheduledDate!)}</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Send Now</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isScheduled && (
              <button
                type="button"
                onClick={handleClearSchedule}
                className="p-0.5 hover:bg-background rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {/* Send Now option */}
        <div className="p-3">
          <button
            type="button"
            onClick={handleSendNow}
            className={`w-full text-left p-3 rounded-md transition-colors hover:bg-muted flex items-center gap-3 ${
              !isScheduled ? "bg-muted" : ""
            }`}
          >
            <Send className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Send Now</p>
              <p className="text-xs text-muted-foreground">Message sends immediately</p>
            </div>
            {!isScheduled && (
              <Badge variant="secondary" className="ml-auto text-xs">
                Selected
              </Badge>
            )}
          </button>
        </div>

        <Separator />

        {/* Quick options */}
        <div className="p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
            Quick Schedule
          </p>
          <div className="grid grid-cols-2 gap-2">
            {quickOptions.map((option) => (
              <Button
                key={option.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickOption(option)}
                className="justify-start text-xs h-8"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Custom date/time */}
        <div className="p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
            Custom Schedule
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="schedule-date" className="text-xs">
                  Date
                </Label>
                <Input
                  id="schedule-date"
                  type="date"
                  value={dateValue}
                  min={minDate}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="schedule-time" className="text-xs">
                  Time
                </Label>
                <Input
                  id="schedule-time"
                  type="time"
                  value={timeValue}
                  onChange={(e) => setTimeValue(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timezone}
              </p>
              <Button
                type="button"
                size="sm"
                onClick={handleCustomSchedule}
                className="h-7 text-xs"
              >
                Schedule
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
