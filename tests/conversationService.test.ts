import { describe, it, expect, beforeEach } from "vitest";
import {
  generateThreadTitle,
  saveConversation,
  getConversation,
  saveItemConversation,
  getItemConversation,
  clearItemConversation,
  listConversations,
  deleteConversation,
  formatConversationTime,
  _resetConversationStorage,
  ChatMessage,
  ConversationThread,
} from "../src/services/conversationService";

describe("Conversation Service", () => {
  beforeEach(async () => {
    _resetConversationStorage();
  });

  describe("generateThreadTitle", () => {
    it("returns clean title for short queries", () => {
      expect(generateThreadTitle("What is photosynthesis?")).toBe("What is photosynthesis?");
    });

    it("truncates long queries cleanly at word boundary", () => {
      const longQuery = "Can you please solve problem number 45 involving second order differential equations and damping factors?";
      const title = generateThreadTitle(longQuery);
      expect(title.length).toBeLessThanOrEqual(43);
      expect(title.endsWith("...")).toBe(true);
    });

    it("handles fallback to document title if firstQuery is empty", () => {
      expect(generateThreadTitle("", "Calculus III Notes")).toBe("Chat: Calculus III Notes");
      expect(generateThreadTitle("")).toBe("New Conversation");
    });
  });

  describe("saveConversation & getConversation", () => {
    it("saves and retrieves a conversation thread", async () => {
      const thread: ConversationThread = {
        id: "thread_123",
        title: "Differential Equations Drill",
        createdAt: Date.now() - 5000,
        updatedAt: Date.now(),
        messages: [
          { id: "m1", role: "user", text: "How to solve y'' + y = 0?", timestamp: Date.now() - 4000 },
          { id: "m2", role: "ai", text: "The characteristic equation is r^2 + 1 = 0.", timestamp: Date.now() - 3000 },
        ],
      };

      await saveConversation(thread);
      const retrieved = await getConversation("thread_123");
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe("thread_123");
      expect(retrieved?.title).toBe("Differential Equations Drill");
      expect(retrieved?.messages.length).toBe(2);
    });
  });

  describe("Item-bound conversation persistence", () => {
    it("saves and restores conversation anchored to an item ID", async () => {
      const messages: ChatMessage[] = [
        { id: "m1", role: "user", text: "Solve problem 14 on page 3", timestamp: Date.now() },
        { id: "m2", role: "ai", text: "The answer to #14 is B", timestamp: Date.now() },
      ];

      const saved = await saveItemConversation("doc_abc_1", messages, "CSC Math Review.pdf");
      expect(saved.itemId).toBe("doc_abc_1");
      expect(saved.itemTitle).toBe("CSC Math Review.pdf");
      expect(saved.messages.length).toBe(2);

      const restored = await getItemConversation("doc_abc_1");
      expect(restored).toBeDefined();
      expect(restored?.messages[0].text).toBe("Solve problem 14 on page 3");
    });

    it("clears item conversation cleanly", async () => {
      await saveItemConversation("doc_to_clear", [
        { id: "m1", role: "user", text: "Test", timestamp: Date.now() },
      ]);
      expect(await getItemConversation("doc_to_clear")).not.toBeNull();

      await clearItemConversation("doc_to_clear");
      expect(await getItemConversation("doc_to_clear")).toBeNull();
    });
  });

  describe("listConversations & deleteConversation", () => {
    it("lists all conversations sorted by latest update", async () => {
      await saveConversation({
        id: "chat_a",
        title: "Older Chat",
        createdAt: 1000,
        updatedAt: 1000,
        messages: [{ id: "1", role: "user", text: "Hello A", timestamp: 1000 }],
      });

      await saveConversation({
        id: "chat_b",
        title: "Newer Chat",
        createdAt: 2000,
        updatedAt: 2000,
        messages: [{ id: "2", role: "user", text: "Hello B", timestamp: 2000 }],
      });

      const list = await listConversations();
      expect(list.length).toBeGreaterThanOrEqual(2);
      expect(list[0].id).toBe("chat_b");
      expect(list[1].id).toBe("chat_a");
    });

    it("deletes a conversation thread", async () => {
      await saveConversation({
        id: "chat_delete_me",
        title: "Temporary",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      });

      await deleteConversation("chat_delete_me");
      const result = await getConversation("chat_delete_me");
      expect(result).toBeNull();
    });
  });

  describe("formatConversationTime", () => {
    it("formats relative timestamps properly", () => {
      const now = Date.now();
      expect(formatConversationTime(now - 10000)).toBe("Just now");
      expect(formatConversationTime(now - 5 * 60 * 1000)).toBe("5m ago");
      expect(formatConversationTime(now - 3 * 3600 * 1000)).toBe("3h ago");
      expect(formatConversationTime(now - 25 * 3600 * 1000)).toBe("Yesterday");
    });
  });
});
