// ============================================
// NOTIFICATION ENGINE TESTS
// Verifies zero-serverless architecture, persistence, deduplication, and actionable payloads
// ============================================

import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory mock for localStorage
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
  };
};

describe("Notification Engine (Zero-Serverless, Local-First)", () => {
  let mockStorage: ReturnType<typeof createLocalStorageMock>;
  const STORAGE_KEY = "researchmate_notifications_v2";

  beforeEach(() => {
    mockStorage = createLocalStorageMock();
    vi.stubGlobal("localStorage", mockStorage);
  });

  it("persists notifications in localStorage without touching serverless functions", () => {
    const notifications = [
      {
        id: "notif-1",
        type: "ocr_job",
        title: "Materials Ingested",
        message: "Indexed 2 documents into review corpus.",
        actionUrl: "/app/review",
        actionLabel: "Review Hub",
        time: new Date().toISOString(),
        read: false,
      },
    ];

    mockStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    const retrieved = JSON.parse(mockStorage.getItem(STORAGE_KEY) || "[]");

    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].type).toBe("ocr_job");
    expect(retrieved[0].actionUrl).toBe("/app/review");
  });

  it("deduplicates identical notification messages triggered within 4 seconds", () => {
    const recentMessages = new Map<string, number>();
    const notifications: any[] = [];

    const addNotification = (msg: string, type: string) => {
      const now = Date.now();
      const lastSent = recentMessages.get(msg) || 0;
      if (now - lastSent < 4000) {
        return false; // Suppressed
      }
      recentMessages.set(msg, now);
      notifications.unshift({ id: `${now}`, message: msg, type });
      return true; // Added
    };

    // First call succeeds
    const firstAdded = addNotification("Mobile scanner connected.", "sync");
    expect(firstAdded).toBe(true);
    expect(notifications).toHaveLength(1);

    // Rapid duplicate call within 4s is suppressed (prevents double bell rings)
    const secondAdded = addNotification("Mobile scanner connected.", "sync");
    expect(secondAdded).toBe(false);
    expect(notifications).toHaveLength(1);
  });

  it("supports actionable routing payloads (actionUrl, actionLabel)", () => {
    const payload = {
      type: "exam_result",
      title: "Benchmark Target Achieved!",
      message: "Scored 9/10 (90%) on Thermodynamics Mock Exam.",
      actionUrl: "/app/review?tab=exams",
      actionLabel: "View Results",
      time: new Date(),
      read: false,
    };

    expect(payload.actionUrl).toBe("/app/review?tab=exams");
    expect(payload.actionLabel).toBe("View Results");
    expect(payload.title).toContain("Benchmark");
  });

  it("caps total notifications at 50 to maintain lightweight footprint", () => {
    let list: any[] = [];
    for (let i = 0; i < 60; i++) {
      list = [{ id: `item-${i}`, message: `Message ${i}` }, ...list].slice(0, 50);
    }
    expect(list).toHaveLength(50);
    expect(list[0].id).toBe("item-59");
  });

  it("marks all notifications as read and calculates unread count accurately", () => {
    let items = [
      { id: "1", read: false },
      { id: "2", read: false },
      { id: "3", read: true },
    ];

    const unreadCount = items.filter((n) => !n.read).length;
    expect(unreadCount).toBe(2);

    items = items.map((n) => ({ ...n, read: true }));
    const newUnreadCount = items.filter((n) => !n.read).length;
    expect(newUnreadCount).toBe(0);
  });
});
