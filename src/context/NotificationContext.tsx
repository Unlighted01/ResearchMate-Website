// ============================================
// NOTIFICATION CONTEXT
// Global state for user activity notifications
// ============================================

import React, { createContext, useContext, useState, useCallback } from "react";

// Types
export interface Notification {
  id: string;
  type: "sync" | "summary" | "collection" | "login" | "citation" | "info";
  message: string;
  time: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (type: Notification["type"], message: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

// Context
const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

// Provider
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (type: Notification["type"], message: string) => {
      const newNotification: Notification = {
        id: Date.now().toString(),
        type,
        message,
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
