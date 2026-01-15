"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  MessageSquare,
  Mail,
  User,
  Clock,
  X,
  RefreshCw,
  Loader2,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Message, MessageChannel } from "@/types/message";

interface ScheduledMessagesResponse {
  success: boolean;
  messages: Message[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

export default function ScheduledMessagesPage() {
  const router = useRouter();
  const [supabaseReady, setSupabaseReady] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [channelFilter, setChannelFilter] = useState<MessageChannel | "all">("all");

  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelingMessage, setCancelingMessage] = useState<Message | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  const fetchScheduledMessages = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (channelFilter !== "all") {
        params.append("channel", channelFilter);
      }

      const response = await fetch(`/api/messages/scheduled?${params}`);
      const result: ScheduledMessagesResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch scheduled messages");
      }

      setMessages(result.messages);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, channelFilter]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSupabaseReady(false);
      return;
    }

    fetchScheduledMessages();
  }, [fetchScheduledMessages]);

  const handleCancelMessage = async () => {
    if (!cancelingMessage) return;

    setIsCanceling(true);

    try {
      const response = await fetch(`/api/messages/scheduled/${cancelingMessage.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to cancel message");
      }

      // Remove from local state
      setMessages((prev) => prev.filter((m) => m.id !== cancelingMessage.id));
      setTotal((prev) => prev - 1);
      setCancelDialogOpen(false);
      setCancelingMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel message");
    } finally {
      setIsCanceling(false);
    }
  };

  const formatScheduledTime = (scheduledAt: string) => {
    const date = new Date(scheduledAt);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeStr = date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (date.toDateString() === now.toDateString()) {
      return `Today at ${timeStr}`;
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${timeStr}`;
    }

    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getTimeUntil = (scheduledAt: string) => {
    const date = new Date(scheduledAt);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();

    if (diffMs < 0) return "Overdue";

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `in ${diffMins} min`;
    if (diffHours < 24) return `in ${diffHours} hr`;
    return `in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
  };

  if (!supabaseReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Setup Required</CardTitle>
            <CardDescription>
              Configure Supabase to view scheduled messages.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Scheduled Messages
            </h1>
            <p className="text-gray-500 mt-1">
              View and manage messages scheduled for future delivery
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchScheduledMessages}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <Select
                value={channelFilter}
                onValueChange={(value) => {
                  setChannelFilter(value as MessageChannel | "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
              <div className="ml-auto text-sm text-muted-foreground">
                {total} scheduled message{total !== 1 ? "s" : ""}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
            <button className="ml-2 underline" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        {/* Messages List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No scheduled messages"
            description="Messages scheduled for future delivery will appear here. Schedule a message from any contact's detail page."
            action={{
              label: "View Contacts",
              onClick: () => router.push("/contacts"),
            }}
          />
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <Card key={message.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Channel Badge & Contact Link */}
                      <div className="flex items-center gap-3 mb-2">
                        {message.channel === "sms" ? (
                          <Badge variant="secondary" className="gap-1">
                            <MessageSquare className="w-3 h-3" />
                            SMS
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Mail className="w-3 h-3" />
                            Email
                          </Badge>
                        )}
                        <Link
                          href={`/contacts/${message.contact_id}`}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          <User className="w-3 h-3" />
                          View Contact
                        </Link>
                      </div>

                      {/* Subject (Email only) */}
                      {message.channel === "email" && message.subject && (
                        <p className="font-medium text-gray-900 mb-1">
                          {message.subject}
                        </p>
                      )}

                      {/* Body */}
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {message.body}
                      </p>

                      {/* From Identity */}
                      {message.from_identity && (
                        <p className="text-xs text-muted-foreground mt-2">
                          From: {message.from_identity.address}
                        </p>
                      )}
                    </div>

                    {/* Scheduled Time & Actions */}
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {message.scheduled_at && formatScheduledTime(message.scheduled_at)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {message.scheduled_at && getTimeUntil(message.scheduled_at)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCancelingMessage(message);
                          setCancelDialogOpen(true);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Scheduled Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this scheduled message? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {cancelingMessage && (
            <div className="py-4">
              <div className="border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  {cancelingMessage.channel === "sms" ? (
                    <Badge variant="secondary" className="gap-1">
                      <MessageSquare className="w-3 h-3" />
                      SMS
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Mail className="w-3 h-3" />
                      Email
                    </Badge>
                  )}
                </div>
                {cancelingMessage.channel === "email" && cancelingMessage.subject && (
                  <p className="font-medium text-sm mb-1">{cancelingMessage.subject}</p>
                )}
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {cancelingMessage.body}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={isCanceling}
            >
              Keep Message
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelMessage}
              disabled={isCanceling}
            >
              {isCanceling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cancel Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
