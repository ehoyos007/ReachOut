"use client";

import { useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Star } from "lucide-react";
import { useSenderStore, selectDefaultEmail, selectDefaultPhone } from "@/lib/store/senderStore";
import { formatSenderEmail, formatSenderPhone } from "@/types/sender";
import type { SenderEmail, SenderPhone } from "@/types/sender";
import type { TemplateChannel } from "@/types/template";

interface SenderSelectorProps {
  channel: TemplateChannel;
  selectedId?: string | null;
  onSelect: (senderId: string | null) => void;
  disabled?: boolean;
}

export function SenderSelector({
  channel,
  selectedId,
  onSelect,
  disabled = false,
}: SenderSelectorProps) {
  const { emails, phones, isLoading, fetchSenders } = useSenderStore();

  // Fetch senders on mount if empty
  useEffect(() => {
    if (emails.length === 0 && phones.length === 0) {
      fetchSenders();
    }
  }, [emails.length, phones.length, fetchSenders]);

  // Get appropriate senders based on channel
  const senders = channel === "email" ? emails : phones;

  // Get default sender
  const defaultSender = useMemo(() => {
    return channel === "email"
      ? selectDefaultEmail(emails)
      : selectDefaultPhone(phones);
  }, [channel, emails, phones]);

  // Find selected sender
  const selectedSender = useMemo(() => {
    if (!selectedId) return null;
    return senders.find((s) => s.id === selectedId) || null;
  }, [senders, selectedId]);

  // Auto-select default when channel changes if nothing selected
  useEffect(() => {
    if (!selectedId && defaultSender) {
      onSelect(defaultSender.id);
    }
  }, [channel, defaultSender?.id]);

  const handleChange = (value: string) => {
    onSelect(value === "none" ? null : value);
  };

  const ChannelIcon = channel === "email" ? Mail : MessageSquare;

  if (senders.length === 0 && !isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded-md bg-muted/30">
        <ChannelIcon className="h-4 w-4" />
        <span>
          No {channel === "email" ? "email" : "phone"} senders configured.{" "}
          <a href="/settings" className="text-primary hover:underline">
            Add in Settings
          </a>
        </span>
      </div>
    );
  }

  return (
    <Select
      value={selectedId || "none"}
      onValueChange={handleChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          <ChannelIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Select sender...">
            {selectedSender
              ? channel === "email"
                ? formatSenderEmail(selectedSender as SenderEmail)
                : formatSenderPhone(selectedSender as SenderPhone)
              : "Select sender..."}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {senders.map((sender) => {
          const isEmail = channel === "email";
          const displayText = isEmail
            ? formatSenderEmail(sender as SenderEmail)
            : formatSenderPhone(sender as SenderPhone);
          const isDefault = sender.is_default;
          const isVerified = isEmail && (sender as SenderEmail).verified;

          return (
            <SelectItem key={sender.id} value={sender.id}>
              <div className="flex items-center gap-2">
                <span className="truncate">{displayText}</span>
                {isDefault && (
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                )}
                {isEmail && !isVerified && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    Unverified
                  </Badge>
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
