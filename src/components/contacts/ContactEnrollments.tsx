"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, GitBranch, Play, Pause, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WorkflowEnrollmentWithRelations, EnrollmentStatus } from "@/types/execution";

interface ContactEnrollmentsProps {
  contactId: string;
}

const STATUS_CONFIG: Record<EnrollmentStatus, {
  label: string;
  color: string;
  icon: React.ReactNode;
}> = {
  active: {
    label: "Active",
    color: "bg-green-100 text-green-700",
    icon: <Play className="w-3 h-3" />,
  },
  paused: {
    label: "Paused",
    color: "bg-yellow-100 text-yellow-700",
    icon: <Pause className="w-3 h-3" />,
  },
  completed: {
    label: "Completed",
    color: "bg-blue-100 text-blue-700",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  stopped: {
    label: "Stopped",
    color: "bg-gray-100 text-gray-700",
    icon: <XCircle className="w-3 h-3" />,
  },
  failed: {
    label: "Failed",
    color: "bg-red-100 text-red-700",
    icon: <AlertCircle className="w-3 h-3" />,
  },
};

export function ContactEnrollments({ contactId }: ContactEnrollmentsProps) {
  const [enrollments, setEnrollments] = useState<WorkflowEnrollmentWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEnrollments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { getEnrollments } = await import("@/lib/supabase");
      const data = await getEnrollments({ contact_id: contactId });
      setEnrollments(data);
    } catch (err) {
      console.error("Failed to load enrollments:", err);
      setError("Failed to load workflow enrollments");
    } finally {
      setIsLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    loadEnrollments();
  }, [loadEnrollments]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Workflows
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Workflows
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" size="sm" onClick={loadEnrollments} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          Workflows
        </CardTitle>
      </CardHeader>
      <CardContent>
        {enrollments.length === 0 ? (
          <p className="text-sm text-gray-500">Not enrolled in any workflows</p>
        ) : (
          <div className="space-y-3">
            {enrollments.map((enrollment) => {
              const statusConfig = STATUS_CONFIG[enrollment.status];
              const workflow = enrollment.workflow;

              return (
                <div
                  key={enrollment.id}
                  className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/workflows/${enrollment.workflow_id}`}
                        className="font-medium text-sm text-gray-900 hover:text-blue-600 hover:underline truncate block"
                      >
                        {workflow?.name || "Unknown Workflow"}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${statusConfig.color} border-0 text-xs`}>
                          <span className="mr-1">{statusConfig.icon}</span>
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {formatRelativeTime(enrollment.enrolled_at)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Enrolled: {formatDate(enrollment.enrolled_at)}</p>
                          {enrollment.completed_at && (
                            <p>Completed: {formatDate(enrollment.completed_at)}</p>
                          )}
                          {enrollment.stopped_at && (
                            <p>Stopped: {formatDate(enrollment.stopped_at)}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Current Execution Info */}
                  {enrollment.current_execution &&
                    enrollment.current_execution.next_run_at &&
                    enrollment.status === "active" && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-gray-400">
                        Next action: {formatRelativeTime(enrollment.current_execution.next_run_at)}
                      </p>
                    </div>
                  )}

                  {/* Stop Reason */}
                  {enrollment.stop_reason && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-gray-500">
                        Reason: {enrollment.stop_reason}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
