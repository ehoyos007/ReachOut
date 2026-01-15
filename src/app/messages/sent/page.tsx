"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Send,
  MessageSquare,
  Mail,
  User,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Copy,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Tag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  MESSAGE_STATUS_DISPLAY,
  MESSAGE_STATUS_COLORS,
  MESSAGE_SOURCE_DISPLAY,
  MESSAGE_SOURCE_COLORS,
  getTimeAgo,
} from "@/types/message";
import type { Message, MessageChannel, MessageStatus } from "@/types/message";
import type { SentMessagesSortField, SentMessagesSortOrder } from "@/lib/supabase";

interface ContactTag {
  tag: {
    id: string;
    name: string;
    color: string;
  };
}

interface SentMessagesResponse {
  success: boolean;
  messages: MessageWithContact[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

interface MessageWithContact extends Message {
  contact?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    tags?: ContactTag[];
  };
}

type SortConfig = {
  field: SentMessagesSortField;
  order: SentMessagesSortOrder;
} | null;

export default function SentMessagesPage() {
  const router = useRouter();
  const [supabaseReady, setSupabaseReady] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithContact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [channelFilter, setChannelFilter] = useState<MessageChannel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<MessageStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Sorting
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // Expanded row state
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Full message modal
  const [fullMessageModal, setFullMessageModal] = useState<MessageWithContact | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchSentMessages = useCallback(async () => {
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
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }
      if (dateFrom) {
        params.append("dateFrom", dateFrom);
      }
      if (dateTo) {
        // Add end of day to include the entire end date
        params.append("dateTo", dateTo + "T23:59:59.999Z");
      }
      if (sortConfig) {
        params.append("sortBy", sortConfig.field);
        params.append("sortOrder", sortConfig.order);
      }

      const response = await fetch(`/api/messages/sent?${params}`);
      const result: SentMessagesResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch sent messages");
      }

      setMessages(result.messages);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, channelFilter, statusFilter, debouncedSearch, dateFrom, dateTo, sortConfig]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSupabaseReady(false);
      return;
    }

    fetchSentMessages();
  }, [fetchSentMessages]);

  const toggleRowExpanded = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const handleSort = (field: SentMessagesSortField) => {
    setSortConfig((prev) => {
      if (prev?.field === field) {
        // Toggle order or clear
        if (prev.order === "desc") {
          return { field, order: "asc" };
        } else {
          return null; // Clear sorting
        }
      }
      // New sort field, default to desc
      return { field, order: "desc" };
    });
    setPage(1);
  };

  const getSortIcon = (field: SentMessagesSortField) => {
    if (sortConfig?.field !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortConfig.order === "desc" ? (
      <ArrowDown className="w-4 h-4 ml-1" />
    ) : (
      <ArrowUp className="w-4 h-4 ml-1" />
    );
  };

  const getContactDisplayName = (message: MessageWithContact): string => {
    if (message.contact) {
      const { first_name, last_name, email, phone } = message.contact;
      if (first_name || last_name) {
        return `${first_name || ""} ${last_name || ""}`.trim();
      }
      return email || phone || "Unknown";
    }
    return "Unknown Contact";
  };

  const getStatusIcon = (status: MessageStatus) => {
    switch (status) {
      case "delivered":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "sent":
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
      case "failed":
      case "bounced":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "scheduled":
      case "queued":
      case "sending":
        return <Clock className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getPreviewText = (message: Message): string => {
    if (message.channel === "email" && message.subject) {
      return message.subject;
    }
    return message.body.length > 50 ? message.body.slice(0, 50) + "..." : message.body;
  };

  const formatTimestamp = (dateString: string | null): string => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleResend = (message: MessageWithContact) => {
    if (!message.contact) return;
    // Navigate to contact page with compose modal params
    const params = new URLSearchParams({
      compose: "true",
      channel: message.channel,
      body: message.body,
    });
    if (message.subject) {
      params.append("subject", message.subject);
    }
    router.push(`/contacts/${message.contact.id}?${params.toString()}`);
  };

  const clearDateRange = () => {
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const activeFilterCount = [
    channelFilter !== "all",
    statusFilter !== "all",
    debouncedSearch.length > 0,
    dateFrom || dateTo,
  ].filter(Boolean).length;

  if (!supabaseReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold">Setup Required</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Configure Supabase to view sent messages.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Send className="w-6 h-6" />
              Sent Messages
            </h1>
            <p className="text-gray-500 mt-1">
              {total > 0 ? `${total.toLocaleString()} message${total !== 1 ? "s" : ""} sent` : "View all outbound messages"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSentMessages}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>

              {/* Search */}
              <div className="flex-1 min-w-[200px] max-w-[300px]">
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Channel Filter */}
              <Select
                value={channelFilter}
                onValueChange={(value) => {
                  setChannelFilter(value as MessageChannel | "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as MessageStatus | "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={dateFrom || dateTo ? "secondary" : "outline"}
                    size="sm"
                    className="h-9"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    {dateFrom || dateTo ? (
                      <span>
                        {dateFrom && dateTo
                          ? `${formatDateShort(dateFrom)} - ${formatDateShort(dateTo)}`
                          : dateFrom
                          ? `From ${formatDateShort(dateFrom)}`
                          : `Until ${formatDateShort(dateTo)}`}
                      </span>
                    ) : (
                      "Date Range"
                    )}
                    {(dateFrom || dateTo) && (
                      <X
                        className="w-3 h-3 ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearDateRange();
                        }}
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="date-from" className="text-xs">From</Label>
                      <Input
                        id="date-from"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => {
                          setDateFrom(e.target.value);
                          setPage(1);
                        }}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date-to" className="text-xs">To</Label>
                      <Input
                        id="date-to"
                        type="date"
                        value={dateTo}
                        onChange={(e) => {
                          setDateTo(e.target.value);
                          setPage(1);
                        }}
                        className="h-8"
                      />
                    </div>
                    {(dateFrom || dateTo) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={clearDateRange}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Active Filters Badge */}
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {activeFilterCount} active filter{activeFilterCount !== 1 ? "s" : ""}
                </Badge>
              )}
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

        {/* Messages Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-6 w-[80px]" />
                    <Skeleton className="h-4 w-[100px]" />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Send}
                  title="No sent messages"
                  description={
                    debouncedSearch || channelFilter !== "all" || statusFilter !== "all" || dateFrom || dateTo
                      ? "No messages match your filters. Try adjusting your search criteria."
                      : "Messages you send will appear here. Send a message from any contact's detail page."
                  }
                  action={
                    debouncedSearch || channelFilter !== "all" || statusFilter !== "all" || dateFrom || dateTo
                      ? {
                          label: "Clear Filters",
                          onClick: () => {
                            setSearchQuery("");
                            setChannelFilter("all");
                            setStatusFilter("all");
                            setDateFrom("");
                            setDateTo("");
                          },
                        }
                      : {
                          label: "View Contacts",
                          onClick: () => router.push("/contacts"),
                        }
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead
                      className="w-[60px] cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("channel")}
                    >
                      <div className="flex items-center">
                        Type
                        {getSortIcon("channel")}
                      </div>
                    </TableHead>
                    <TableHead className="w-[180px]">Recipient</TableHead>
                    <TableHead>Subject / Preview</TableHead>
                    <TableHead
                      className="w-[100px] cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center">
                        Status
                        {getSortIcon("status")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="w-[120px] cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("sent_at")}
                    >
                      <div className="flex items-center">
                        Sent
                        {getSortIcon("sent_at")}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => {
                    const isExpanded = expandedRowId === message.id;
                    const statusColors = MESSAGE_STATUS_COLORS[message.status];
                    const sourceColors = MESSAGE_SOURCE_COLORS[message.source];
                    const contactTags = message.contact?.tags || [];

                    return (
                      <>
                        {/* Main Row */}
                        <TableRow
                          key={message.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleRowExpanded(message.id)}
                        >
                          <TableCell className="p-2">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            {message.channel === "sms" ? (
                              <MessageSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Mail className="w-5 h-5 text-purple-600" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {getContactDisplayName(message)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getPreviewText(message)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {getStatusIcon(message.status)}
                              <Badge
                                variant="secondary"
                                className={`${statusColors.bg} ${statusColors.text} border-0`}
                              >
                                {MESSAGE_STATUS_DISPLAY[message.status]}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {message.sent_at ? getTimeAgo(message.sent_at) : getTimeAgo(message.created_at)}
                          </TableCell>
                        </TableRow>

                        {/* Expanded Row */}
                        {isExpanded && (
                          <TableRow key={`${message.id}-expanded`}>
                            <TableCell colSpan={6} className="bg-muted/30 p-0">
                              <div className="p-6 animate-in slide-in-from-top-2 duration-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Left Column: Contact Details */}
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                        Contact Details
                                      </h4>
                                      <div className="space-y-1.5 text-sm">
                                        <div className="flex items-center gap-2">
                                          <User className="w-4 h-4 text-muted-foreground" />
                                          <span className="font-medium">
                                            {getContactDisplayName(message)}
                                          </span>
                                        </div>
                                        {message.contact?.email && (
                                          <div className="flex items-center gap-2 text-muted-foreground">
                                            <Mail className="w-4 h-4" />
                                            {message.contact.email}
                                          </div>
                                        )}
                                        {message.contact?.phone && (
                                          <div className="flex items-center gap-2 text-muted-foreground">
                                            <MessageSquare className="w-4 h-4" />
                                            {message.contact.phone}
                                          </div>
                                        )}
                                      </div>
                                      {message.contact && (
                                        <Link
                                          href={`/contacts/${message.contact.id}`}
                                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          View Contact
                                          <ExternalLink className="w-3 h-3" />
                                        </Link>
                                      )}
                                    </div>

                                    {/* Contact Tags */}
                                    {contactTags.length > 0 && (
                                      <div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1">
                                          <Tag className="w-4 h-4" />
                                          Tags
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5">
                                          {contactTags.map(({ tag }) => (
                                            <Badge
                                              key={tag.id}
                                              variant="secondary"
                                              style={{
                                                backgroundColor: `${tag.color}20`,
                                                color: tag.color,
                                                borderColor: `${tag.color}40`,
                                              }}
                                              className="border text-xs"
                                            >
                                              {tag.name}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Source Badge */}
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                        Source
                                      </h4>
                                      <Badge
                                        variant="outline"
                                        className={`${sourceColors.bg} ${sourceColors.text} ${sourceColors.border}`}
                                      >
                                        {MESSAGE_SOURCE_DISPLAY[message.source]}
                                      </Badge>
                                    </div>
                                  </div>

                                  {/* Right Column: Message Details */}
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                        Timestamps
                                      </h4>
                                      <div className="space-y-1.5 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Created:</span>
                                          <span>{formatTimestamp(message.created_at)}</span>
                                        </div>
                                        {message.sent_at && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Sent:</span>
                                            <span>{formatTimestamp(message.sent_at)}</span>
                                          </div>
                                        )}
                                        {message.delivered_at && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Delivered:</span>
                                            <span>{formatTimestamp(message.delivered_at)}</span>
                                          </div>
                                        )}
                                        {message.failed_at && (
                                          <div className="flex justify-between text-red-600">
                                            <span>Failed:</span>
                                            <span>{formatTimestamp(message.failed_at)}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Error Message */}
                                    {message.provider_error && (
                                      <div>
                                        <h4 className="text-sm font-semibold text-red-600 mb-2">
                                          Error
                                        </h4>
                                        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                          {message.provider_error}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Message Content */}
                                <div className="mt-6 pt-6 border-t">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-semibold text-gray-900">
                                      Message Content
                                    </h4>
                                    <div className="flex items-center gap-2">
                                      {message.body.length > 500 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setFullMessageModal(message);
                                          }}
                                        >
                                          <ExternalLink className="w-4 h-4 mr-1" />
                                          View Full
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyToClipboard(message.body);
                                        }}
                                      >
                                        <Copy className="w-4 h-4 mr-1" />
                                        Copy
                                      </Button>
                                    </div>
                                  </div>
                                  {message.channel === "email" && message.subject && (
                                    <p className="font-medium text-gray-900 mb-2">
                                      Subject: {message.subject}
                                    </p>
                                  )}
                                  <div className="bg-white border rounded-lg p-4 text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                                    {message.body.length > 500
                                      ? message.body.slice(0, 500) + "..."
                                      : message.body}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="mt-4 pt-4 border-t flex items-center gap-2">
                                  {message.contact && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/contacts/${message.contact!.id}`);
                                      }}
                                    >
                                      <User className="w-4 h-4 mr-1" />
                                      View Contact
                                    </Button>
                                  )}
                                  {message.contact && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleResend(message);
                                      }}
                                    >
                                      <RotateCcw className="w-4 h-4 mr-1" />
                                      Resend
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(message.body);
                                    }}
                                  >
                                    <Copy className="w-4 h-4 mr-1" />
                                    Copy Content
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total.toLocaleString()} messages
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
              <span className="text-sm text-muted-foreground px-2">
                Page {page} of {totalPages}
              </span>
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

      {/* Full Message Modal */}
      <Dialog open={!!fullMessageModal} onOpenChange={() => setFullMessageModal(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {fullMessageModal?.channel === "sms" ? (
                <MessageSquare className="w-5 h-5 text-blue-600" />
              ) : (
                <Mail className="w-5 h-5 text-purple-600" />
              )}
              {fullMessageModal?.channel === "sms" ? "SMS Message" : "Email Message"}
            </DialogTitle>
            <DialogDescription>
              Sent to {fullMessageModal ? getContactDisplayName(fullMessageModal) : ""}
              {" "}on{" "}
              {fullMessageModal?.sent_at
                ? formatTimestamp(fullMessageModal.sent_at)
                : formatTimestamp(fullMessageModal?.created_at || "")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {fullMessageModal?.channel === "email" && fullMessageModal?.subject && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Subject</h4>
                <p className="text-sm">{fullMessageModal.subject}</p>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900">Message</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (fullMessageModal) {
                      copyToClipboard(fullMessageModal.body);
                    }
                  }}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="bg-muted/30 border rounded-lg p-4 text-sm whitespace-pre-wrap">
                {fullMessageModal?.body}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function for short date formatting
function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
