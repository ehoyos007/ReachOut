"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  GitBranch,
  MessageSquare,
  TrendingUp,
  Plus,
  Upload,
  FileText,
  Mail,
  Phone,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalContacts: number;
  activeWorkflows: number;
  messagesSent: number;
  responseRate: number;
}

interface RecentMessage {
  id: string;
  channel: "sms" | "email";
  direction: "inbound" | "outbound";
  body: string;
  subject: string | null;
  created_at: string;
  contact: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

// Raw shape from Supabase query (contact can be object or array due to join syntax)
interface RawMessageFromDb {
  id: string;
  channel: string;
  direction: string;
  body: string;
  subject: string | null;
  created_at: string;
  contact: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | {
    id: string;
    first_name: string | null;
    last_name: string | null;
  }[] | null;
}

function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function RecentActivitySkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-3 pb-4 border-b last:border-0">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function getContactDisplayName(contact: RecentMessage["contact"]): string {
  if (!contact) return "Unknown Contact";
  const firstName = contact.first_name || "";
  const lastName = contact.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || "Unknown Contact";
}

// Transform raw Supabase data to our typed format
function transformMessages(rawMessages: RawMessageFromDb[]): RecentMessage[] {
  return rawMessages.map((msg) => {
    // Handle contact which may come back as array or object from Supabase join
    let contact: RecentMessage["contact"] = null;
    if (msg.contact) {
      if (Array.isArray(msg.contact)) {
        contact = msg.contact[0] || null;
      } else {
        contact = msg.contact;
      }
    }

    return {
      id: msg.id,
      channel: msg.channel as "sms" | "email",
      direction: msg.direction as "inbound" | "outbound",
      body: msg.body,
      subject: msg.subject,
      created_at: msg.created_at,
      contact,
    };
  });
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!isSupabaseConfigured() || !supabase) {
        setError("Supabase is not configured. Please set up your environment variables.");
        setIsLoading(false);
        return;
      }

      try {
        // Fetch all stats in parallel
        const [
          contactsResult,
          workflowsResult,
          outboundMessagesResult,
          inboundMessagesResult,
          recentMessagesResult,
        ] = await Promise.all([
          // Total contacts count
          supabase.from("contacts").select("*", { count: "exact", head: true }),
          // Active workflows count
          supabase
            .from("workflows")
            .select("*", { count: "exact", head: true })
            .eq("is_enabled", true),
          // Outbound messages count
          supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("direction", "outbound"),
          // Inbound messages count
          supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("direction", "inbound"),
          // Recent messages with contact info
          supabase
            .from("messages")
            .select("id, channel, direction, body, subject, created_at, contact:contacts(id, first_name, last_name)")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        // Calculate response rate
        const outboundCount = outboundMessagesResult.count || 0;
        const inboundCount = inboundMessagesResult.count || 0;
        const responseRate =
          outboundCount > 0 ? Math.round((inboundCount / outboundCount) * 100) : 0;

        setStats({
          totalContacts: contactsResult.count || 0,
          activeWorkflows: workflowsResult.count || 0,
          messagesSent: outboundCount,
          responseRate,
        });

        // Transform and set messages
        const rawMessages = (recentMessagesResult.data || []) as unknown as RawMessageFromDb[];
        setRecentMessages(transformMessages(rawMessages));
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">
          Welcome back! Here&apos;s an overview of your outreach.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Contacts
                </CardTitle>
                <Users className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalContacts.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500">
                  People in your database
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Active Workflows
                </CardTitle>
                <GitBranch className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.activeWorkflows}
                </div>
                <p className="text-xs text-gray-500">
                  Currently running automations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Messages Sent
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.messagesSent.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500">
                  Total outbound messages
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Response Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.responseRate}%</div>
                <p className="text-xs text-gray-500">
                  Replies vs messages sent
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest messages across all contacts</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <RecentActivitySkeleton />
            ) : recentMessages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No messages yet</p>
                <p className="text-sm">
                  Messages will appear here once you start sending.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentMessages.map((message) => (
                  <Link
                    key={message.id}
                    href={message.contact ? `/contacts/${message.contact.id}` : "#"}
                    className="flex items-start gap-3 pb-4 border-b last:border-0 hover:bg-gray-50 -mx-2 px-2 py-2 rounded-md transition-colors"
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.direction === "inbound"
                          ? "bg-green-100"
                          : "bg-blue-100"
                      }`}
                    >
                      {message.channel === "sms" ? (
                        <Phone
                          className={`h-4 w-4 ${
                            message.direction === "inbound"
                              ? "text-green-600"
                              : "text-blue-600"
                          }`}
                        />
                      ) : (
                        <Mail
                          className={`h-4 w-4 ${
                            message.direction === "inbound"
                              ? "text-green-600"
                              : "text-blue-600"
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900 truncate">
                          {getContactDisplayName(message.contact)}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] uppercase ${
                            message.channel === "sms"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {message.channel}
                        </Badge>
                        {message.direction === "inbound" && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-green-100 text-green-700"
                          >
                            Reply
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {message.subject
                          ? `${message.subject}: ${message.body}`
                          : message.body}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTimeAgo(message.created_at)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/workflows/new">
                <Plus className="h-4 w-4 mr-2" />
                Create New Workflow
              </Link>
            </Button>

            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/contacts/import">
                <Upload className="h-4 w-4 mr-2" />
                Import Contacts
              </Link>
            </Button>

            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/templates">
                <FileText className="h-4 w-4 mr-2" />
                Manage Templates
              </Link>
            </Button>

            <div className="pt-4 border-t mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Navigate to
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="ghost" size="sm" className="justify-start">
                  <Link href="/workflows">
                    <GitBranch className="h-4 w-4 mr-2" />
                    Workflows
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="justify-start">
                  <Link href="/contacts">
                    <Users className="h-4 w-4 mr-2" />
                    Contacts
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="justify-start">
                  <Link href="/templates">
                    <FileText className="h-4 w-4 mr-2" />
                    Templates
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="justify-start">
                  <Link href="/notifications">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Notifications
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
