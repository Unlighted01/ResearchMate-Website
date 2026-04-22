// ============================================
// USE AI ASSISTANT - Shared State & Logic Hook
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import { useState, useEffect, useMemo, useRef } from "react";
import {
  getAllItems,
  updateItem,
  StorageItem,
} from "../../../services/storageService";
import { supabase } from "../../../services/supabaseClient";
import {
  generateSummary,
  generateChatResponse,
} from "../../../services/geminiService";
import type { SummaryMode } from "../../../services/geminiService";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: number;
}

export interface UseAIAssistantReturn {
  // Tab state
  activeTab: "overview" | "chat";
  setActiveTab: (tab: "overview" | "chat") => void;

  // Items
  items: StorageItem[];
  loading: boolean;
  itemsWithoutSummary: StorageItem[];
  itemsWithSummary: StorageItem[];

  // Summary state
  summarizing: string | null;
  batchProcessing: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedItem: StorageItem | null;
  setSelectedItem: (item: StorageItem | null) => void;
  summaryMode: SummaryMode;
  setSummaryMode: (mode: SummaryMode) => void;
  handleSummarize: (item: StorageItem) => Promise<void>;
  handleBatchSummarize: () => Promise<void>;

  // Chat state
  chatInput: string;
  setChatInput: (v: string) => void;
  chatHistory: ChatMessage[];
  isChatting: boolean;
  chatEndRef: React.RefObject<HTMLDivElement>;
  chatAbortRef: React.MutableRefObject<AbortController | null>;
  handleSendMessage: () => Promise<void>;

  // Mention state
  isMentionMenuOpen: boolean;
  setIsMentionMenuOpen: (v: boolean) => void;
  mentionQuery: string;
  filteredMentions: StorageItem[];
  inputRef: React.RefObject<HTMLInputElement>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  insertMention: (item: StorageItem) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;

  // Credits
  credits: number | string;

  // Conversation management
  clearHistory: () => void;
}

// ============================================
// PART 3: HOOK
// ============================================

const useAIAssistant = (
  showToast: (msg: string, type: "success" | "error" | "info") => void,
): UseAIAssistantReturn => {
  // ---------- PART 3A: STATE ----------
  const [activeTab, setActiveTab] = useState<"overview" | "chat">("overview");
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Summary state
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
  const [summaryMode, setSummaryMode] = useState<SummaryMode>("standard");

  // Credits
  const [credits, setCredits] = useState<number | string>("...");

  // Persist chat history in localStorage (keyed per user once session loads)
  const CHAT_STORAGE_KEY = "rm_chat_history";

  // Chat state — restore from localStorage if available
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return [
      {
        id: "welcome",
        role: "ai",
        text: "Hello! I'm ResearchMate AI. I can help you analyze your saved research, find connections, or summarize complex topics. How can I help you today?",
        timestamp: Date.now(),
      },
    ];
  });

  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatAbortRef = useRef<AbortController | null>(null);

  // Mention state
  const [isMentionMenuOpen, setIsMentionMenuOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---------- PART 3B: EFFECTS ----------

  // Persist chat history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory));
    } catch { /* quota exceeded — ignore */ }
  }, [chatHistory, CHAT_STORAGE_KEY]);

  const clearHistory = () => {
    const welcome: ChatMessage = {
      id: "welcome",
      role: "ai",
      text: "Hello! I'm ResearchMate AI. I can help you analyze your saved research, find connections, or summarize complex topics. How can I help you today?",
      timestamp: Date.now(),
    };
    setChatHistory([welcome]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  // Fetch credits on mount
  useEffect(() => {
    const fetchCredits = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("ai_credits")
        .eq("id", session.user.id)
        .single();
      if (profile) setCredits(profile.ai_credits ?? 0);
    };
    fetchCredits();
  }, []);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load items on mount
  useEffect(() => {
    getAllItems(100).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, activeTab]);

  // ---------- PART 3C: MEMOS ----------

  const itemsWithoutSummary = useMemo(() => {
    return items.filter(
      (i) =>
        !i.aiSummary &&
        (debouncedSearchQuery
          ? i.sourceTitle
              ?.toLowerCase()
              .includes(debouncedSearchQuery.toLowerCase())
          : true),
    );
  }, [items, debouncedSearchQuery]);

  const itemsWithSummary = useMemo(() => {
    return items.filter(
      (i) =>
        i.aiSummary &&
        (debouncedSearchQuery
          ? i.sourceTitle
              ?.toLowerCase()
              .includes(debouncedSearchQuery.toLowerCase())
          : true),
    );
  }, [items, debouncedSearchQuery]);

  const filteredMentions = useMemo(() => {
    if (!mentionQuery) return items.slice(0, 5);
    return items
      .filter((i) =>
        i.sourceTitle?.toLowerCase().includes(mentionQuery.toLowerCase()),
      )
      .slice(0, 5);
  }, [items, mentionQuery]);

  // ---------- PART 3D: HANDLERS ----------

  const handleSummarize = async (item: StorageItem) => {
    const textContent = item.text || item.ocrText || "";

    if (!textContent.trim()) {
      showToast("No text content to summarize (Scan might be empty)", "error");
      return;
    }

    setSummarizing(item.id);
    try {
      const result = await generateSummary(textContent, summaryMode);
      if (result) {
        await updateItem(item.id, { aiSummary: result });
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, aiSummary: result } : i)),
        );
        showToast("Summary generated!", "success");
      } else {
        showToast(
          "Summary failed. Service might be busy or out of credits.",
          "error",
        );
      }
    } catch (e) {
      console.error("Summary error:", e);
      showToast("Failed to summarize (Network/Server Error)", "error");
    }
    setSummarizing(null);
  };

  const handleBatchSummarize = async () => {
    if (itemsWithoutSummary.length === 0) return;
    setBatchProcessing(true);

    for (const item of itemsWithoutSummary.slice(0, 5)) {
      try {
        const result = await generateSummary(
          item.text || item.ocrText || "",
          summaryMode,
        );
        if (result) {
          await updateItem(item.id, { aiSummary: result });
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, aiSummary: result } : i,
            ),
          );
        }
      } catch (e) {
        console.error("Failed to summarize item:", item.id);
      }
    }

    showToast(
      `Processed ${Math.min(5, itemsWithoutSummary.length)} items!`,
      "success",
    );
    setBatchProcessing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setChatInput(val);

    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);

    const lastAtPos = val.lastIndexOf("@", cursorPos - 1);
    if (lastAtPos !== -1) {
      const query = val.substring(lastAtPos + 1, cursorPos);
      if (!query.includes(" ")) {
        setIsMentionMenuOpen(true);
        setMentionQuery(query);
        return;
      }
    }
    setIsMentionMenuOpen(false);
  };

  const insertMention = (item: StorageItem) => {
    if (!inputRef.current) return;

    const val = chatInput;
    const lastAtPos = val.lastIndexOf("@", cursorPosition - 1);

    if (lastAtPos !== -1) {
      const before = val.substring(0, lastAtPos);
      const after = val.substring(cursorPosition);
      const newValue = `${before}@${item.sourceTitle || "Untitled"} ${after}`;
      setChatInput(newValue);
      setIsMentionMenuOpen(false);
      inputRef.current.focus();
    }
  };

  const handleRedirectCitations = () => {
    showToast("Redirecting to Citations Tab...", "info");
    window.dispatchEvent(
      new CustomEvent("switch-tab", { detail: "citations" }),
    );
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatting) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: chatInput,
      timestamp: Date.now(),
    };

    setChatHistory((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsMentionMenuOpen(false);
    setIsChatting(true);

    const mentionedItems = items.filter((i) =>
      userMsg.text.toLowerCase().includes(`@${i.sourceTitle?.toLowerCase()}`),
    );

    const itemsToUse =
      mentionedItems.length > 0 ? mentionedItems : items.slice(0, 5);

    const contextItems = itemsToUse
      .map(
        (item) => `
      Title: ${item.sourceTitle}
      Date: ${item.createdAt}
      Summary: ${item.aiSummary || "No summary available"}
      Content Snippet: ${(item.text || "").substring(0, 500)}...
    `,
      )
      .join("\n---\n");

    const context = `
    User Saved Research (Prioritize these):
    ${contextItems}
    `;

    const controller = new AbortController();
    chatAbortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const result = await generateChatResponse(
        userMsg.text,
        context,
        controller.signal,
      );
      clearTimeout(timeoutId);

      if (result.ok) {
        if (result.response.includes("ACTION_REDIRECT_CITATIONS")) {
          handleRedirectCitations();
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "ai",
            text: "I've navigated you to the Citations tab to view accurate references.",
            timestamp: Date.now(),
          };
          setChatHistory((prev) => [...prev, aiMsg]);
        } else {
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "ai",
            text: result.response,
            timestamp: Date.now(),
          };
          setChatHistory((prev) => [...prev, aiMsg]);
        }

        if (result.credits_remaining !== undefined) {
          setCredits(result.credits_remaining);
        }
      } else {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "ai",
          text:
            result.reason === "no_credits"
              ? "⚠️ **Out of AI Credits**. Please wait for your monthly refill or add your own API Key in Settings."
              : result.reason === "aborted"
                ? "Request was cancelled."
                : `Error: ${result.error}`,
          timestamp: Date.now(),
        };
        setChatHistory((prev) => [...prev, errorMsg]);
        if (result.reason === "no_credits") setCredits(0);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const isAbort = (error as Error).name === "AbortError";
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: isAbort
          ? "Request timed out or was cancelled. Please try again."
          : "Sorry, I encountered a network error. Please try again.",
        timestamp: Date.now(),
      };
      setChatHistory((prev) => [...prev, errorMsg]);
    } finally {
      chatAbortRef.current = null;
      setIsChatting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (isMentionMenuOpen) {
        e.preventDefault();
        if (filteredMentions.length > 0) insertMention(filteredMentions[0]);
        return;
      }
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ============================================
  // PART 4: RETURN
  // ============================================

  return {
    activeTab,
    setActiveTab,
    items,
    loading,
    itemsWithoutSummary,
    itemsWithSummary,
    summarizing,
    batchProcessing,
    searchQuery,
    setSearchQuery,
    selectedItem,
    setSelectedItem,
    summaryMode,
    setSummaryMode,
    handleSummarize,
    handleBatchSummarize,
    chatInput,
    setChatInput,
    chatHistory,
    isChatting,
    chatEndRef,
    chatAbortRef,
    handleSendMessage,
    isMentionMenuOpen,
    setIsMentionMenuOpen,
    mentionQuery,
    filteredMentions,
    inputRef,
    handleInputChange,
    insertMention,
    handleKeyDown,
    credits,
    clearHistory,
  };
};

// ============================================
// PART 5: EXPORTS
// ============================================

export default useAIAssistant;
