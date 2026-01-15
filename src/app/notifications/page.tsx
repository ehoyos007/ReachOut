"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
  MessageSquare,
  Mail,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getNotificationTypeLabel, type NotificationWithRelations, type NotificationType } from "@/types/notification";

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case "inbound_sms":
      return <MessageSquare className="h-5 w-5 text-blue-500" />;
    case "inbound_email":
      return <Mail className="h-5 w-5 text-green-500" />;
    case "workflow_completed":
      return <CheckCircle className="h-5 w-5 text-emerald-500" />;
    case "workflow_failed":
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case "system":
      return <Bell className="h-5 w-5 text-gray-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationWithRelations[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      const response = await fetch("/api/notifications?limit=100");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMarkAsRead(id: string) {
    setActionInProgress(id);
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
      });
      if (response.ok) {
        setNotifications(
          notifications.map((n) =>
            n.id === id
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleMarkAllAsRead() {
    setActionInProgress("all");
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (response.ok) {
        const now = new Date().toISOString();
        setNotifications(
          notifications.map((n) => ({ ...n, is_read: true, read_at: now }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleDelete(id: string) {
    setActionInProgress(id);
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        const deleted = notifications.find((n) => n.id === id);
        setNotifications(notifications.filter((n) => n.id !== id));
        if (deleted && !deleted.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    } finally {
      setActionInProgress(null);
    }
  }

  function handleNotificationClick(notification: NotificationWithRelations) {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    if (notification.contact_id) {
      router.push(`/contacts/${notification.contact_id}`);
    } else if (notification.workflow_id) {
      router.push(`/workflows/${notification.workflow_id}`);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-gray-500">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
            disabled={actionInProgress === "all"}
          >
            {actionInProgress === "all" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4 mr-2" />
            )}
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bell className="h-16 w-16 text-gray-200 mb-4" />
            <p className="text-lg font-medium text-gray-600">No notifications</p>
            <p className="text-sm text-gray-400 mt-1">
              You&apos;re all caught up!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const contactName = notification.contact
              ? `${notification.contact.first_name || ""} ${notification.contact.last_name || ""}`.trim() ||
                notification.contact.email ||
                notification.contact.phone ||
                "Unknown"
              : null;

            return (
              <Card
                key={notification.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  !notification.is_read
                    ? "border-l-4 border-l-blue-500 bg-blue-50/50"
                    : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className={`font-medium ${
                            !notification.is_read
                              ? "text-blue-700"
                              : "text-gray-900"
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                      </div>
                      {notification.body && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.body}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {getNotificationTypeLabel(notification.type)}
                        </Badge>
                        {contactName && (
                          <span className="text-xs text-muted-foreground">
                            {contactName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          disabled={actionInProgress === notification.id}
                          title="Mark as read"
                        >
                          {actionInProgress === notification.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        disabled={actionInProgress === notification.id}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
