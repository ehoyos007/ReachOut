import { create } from "zustand";
import type { NotificationWithRelations } from "@/types/notification";

interface NotificationState {
  // Data
  notifications: NotificationWithRelations[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  setNotifications: (notifications: NotificationWithRelations[]) => void;
  addNotification: (notification: NotificationWithRelations) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed
  getUnreadNotifications: () => NotificationWithRelations[];
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Initial state
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  // Actions
  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    set({ notifications, unreadCount });
  },

  addNotification: (notification) => {
    set((state) => {
      const notifications = [notification, ...state.notifications];
      const unreadCount = notifications.filter((n) => !n.is_read).length;
      return { notifications, unreadCount };
    });
  },

  markAsRead: (id) => {
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n
      );
      const unreadCount = notifications.filter((n) => !n.is_read).length;
      return { notifications, unreadCount };
    });
  },

  markAllAsRead: () => {
    set((state) => {
      const now = new Date().toISOString();
      const notifications = state.notifications.map((n) =>
        n.is_read ? n : { ...n, is_read: true, read_at: now }
      );
      return { notifications, unreadCount: 0 };
    });
  },

  deleteNotification: (id) => {
    set((state) => {
      const notifications = state.notifications.filter((n) => n.id !== id);
      const unreadCount = notifications.filter((n) => !n.is_read).length;
      return { notifications, unreadCount };
    });
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  // Computed
  getUnreadNotifications: () => {
    return get().notifications.filter((n) => !n.is_read);
  },
}));

// Helper functions for notification operations
export async function fetchNotifications(): Promise<NotificationWithRelations[]> {
  const response = await fetch("/api/notifications");
  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }
  const data = await response.json();
  return data.notifications;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const response = await fetch(`/api/notifications/${id}/read`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to mark notification as read");
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const response = await fetch("/api/notifications/read-all", {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to mark all notifications as read");
  }
}

export async function deleteNotification(id: string): Promise<void> {
  const response = await fetch(`/api/notifications/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete notification");
  }
}
