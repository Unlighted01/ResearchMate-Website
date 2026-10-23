// ============================================
// NOTIFICATION CONTEXT (Zero-Serverless, Local-First)
// Linear-grade actionable notification inbox with persistence
// 100% Client-Side + LocalStorage + Supabase Realtime (0 Vercel functions)
// ============================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

// Types
export type NotificationType =
  | "ocr_job"
  | "exam_result"
  | "manuscript"
  | "sync"
  | "spaced_review"
  | "summary"
  | "collection"
  | "login"
  | "citation"
  | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  time: Date;
  read: boolean;
}

export interface NotificationPayload {
  type: NotificationType;
  message: string;
  title?: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (
    typeOrPayload: NotificationType | NotificationPayload,
    maybeMessage?: string
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

// Storage Key
const STORAGE_KEY = "researchmate_notifications_v2";

// Context
const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

// Provider
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Load initial notifications from persistent localStorage
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          ...item,
          time: new Date(item.time),
        }));
      }
      return [];
    } catch {
      return [];
    }
  });

  // Track recent messages for deduplication
  const recentMessagesRef = useRef<Map<string, number>>(new Map());

  // Save to persistent storage whenever notifications change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (err) {
      console.warn("Failed to save notifications to localStorage:", err);
    }
  }, [notifications]);

  const addNotification = useCallback(
    (typeOrPayload: NotificationType | NotificationPayload, maybeMessage?: string) => {
      const isAllowed =
        typeof window !== "undefined"
          ? localStorage.getItem("researchmate_in_app_notifications") !== "false"
          : true;
      if (!isAllowed) return;

      let type: NotificationType;
      let message: string;
      let title: string | undefined;
      let actionUrl: string | undefined;
      let actionLabel: string | undefined;

      if (typeof typeOrPayload === "object") {
        type = typeOrPayload.type;
        message = typeOrPayload.message;
        title = typeOrPayload.title;
        actionUrl = typeOrPayload.actionUrl;
        actionLabel = typeOrPayload.actionLabel;
      } else {
        type = typeOrPayload;
        message = maybeMessage || "";
      }

      if (!message.trim()) return;

      // Deduplication: prevent identical messages within 4 seconds
      const now = Date.now();
      const lastSent = recentMessagesRef.current.get(message) || 0;
      if (now - lastSent < 4000) {
        return;
      }
      recentMessagesRef.current.set(message, now);

      const newNotification: Notification = {
        id: `${now}-${Math.random().toString(36).substring(2, 7)}`,
        type,
        title,
        message,
        actionUrl,
        actionLabel,
        time: new Date(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep max 50
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Hook
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};
