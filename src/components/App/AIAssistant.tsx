// ============================================
// AI ASSISTANT PAGE - Apple Design
// Features: Summary Overview + Interactive Chat + Credit System
// ============================================

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Zap,
  RefreshCw,
  Search,
  CheckCircle2,
  Sparkles,
  Clock,
  ArrowRight,
  Brain,
  Wand2,
  MessageSquare,
  Send,
  Bot,
  User,
  AlertCircle,
  Coins,
} from "lucide-react";
import { Button, Card, Badge, Modal } from "../shared/UIComponents";
import {
  getAllItems,
  updateItem,
  StorageItem,
} from "../../services/storageService";
import {
  generateSummary,
  generateChatResponse,
} from "../../services/geminiService";

interface AIProps {
  useToast: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
  };
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: number;
}

const AIAssistant: React.FC<AIProps> = ({ useToast }) => {
  const [activeTab, setActiveTab] = useState<"overview" | "chat">("overview");
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Summary State
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);

  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "ai",
      text: "Hello! I'm ResearchMate AI. I can help you analyze your saved research, find connections, or summarize complex topics. How can I help you today?",
      timestamp: Date.now(),
    },
  ]);
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Credit State
  const [credits, setCredits] = useState<number | string>("...");

  const { showToast } = useToast();

  // Debounce search query (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    getAllItems(100).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, activeTab]);

  // Memoize filtered items
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

  // ============================================
  // SUMMARY LOGIC
  // ============================================

  const handleSummarize = async (item: StorageItem) => {
    const textContent = item.text || item.ocrText || "";

    if (!textContent.trim()) {
      showToast("No text content to summarize (Scan might be empty)", "error");
      return;
    }

    setSummarizing(item.id);
    try {
      const result = await generateSummary(textContent);
      // Note: currently generateSummary returns string directly for backward compat,
      // but ideally we'd use summarizeText to get the full object.
      // For now, prompt the user if empty string returned (error).
      if (result) {
        await updateItem(item.id, { aiSummary: result });
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, aiSummary: result } : i)),
        );
        showToast("Summary generated!", "success");
      } else {
        // If result is empty string, it often means the API failed or returned empty
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
        const result = await generateSummary(item.text || item.ocrText || "");
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

  // Mention State
  const [isMentionMenuOpen, setIsMentionMenuOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // MENTION LOGIC
  // ============================================

  const filteredMentions = useMemo(() => {
    if (!mentionQuery) return items.slice(0, 5); // Show top 5 recent by default
    return items
      .filter((i) =>
        i.sourceTitle?.toLowerCase().includes(mentionQuery.toLowerCase()),
      )
      .slice(0, 5);
  }, [items, mentionQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setChatInput(val);

    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);

    // Check for @ trigger
    const lastAtPos = val.lastIndexOf("@", cursorPos - 1);
    if (lastAtPos !== -1) {
      const query = val.substring(lastAtPos + 1, cursorPos);
      // Only trigger if no spaces in query (simple implementation)
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
      // Format: @[Title](id) -> Visible as just @Title in basic input,
      // but for simple text input we'll just use the title for now and lookup by name
      // OR better: Just insert title and keep ID in a separate list?
      // Let's stick to simple text replacement for this V1: "@Title "
      const newValue = `${before}@${item.sourceTitle || "Untitled"} ${after}`;

      setChatInput(newValue);
      setIsMentionMenuOpen(false);
      inputRef.current.focus();
    }
  };

  // ============================================
  // CITATION REDIRECT HANDLER
  // ============================================
  const handleRedirectCitations = () => {
    showToast("Redirecting to Citations Tab...", "info");
    // Dispatch event to switch main app tab (handled in App.tsx or parent)
    // Since specific implementation might vary, we'll try standard CustomEvent
    window.dispatchEvent(
      new CustomEvent("switch-tab", { detail: "citations" }),
    );

    // Fallback: If this component is inside the main dashboard, we might need a prop.
    // For now, assuming Global Event or User will see toast.
  };

  // ============================================
  // CHAT SEND
  // ============================================

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

    // 1. Detect Mentions in Input
    // We look for strings starting with @ that match Item Titles
    const mentionedItems = items.filter((i) =>
      userMsg.text.toLowerCase().includes(`@${i.sourceTitle?.toLowerCase()}`),
    );

    // 2. Prepare Context
    // If mentions exist, ONLY use them. If none, use top 5 recent.
    const itemsToUse =
      mentionedItems.length > 0 ? mentionedItems : items.slice(0, 5);

    console.log(
      "Using Context Items:",
      itemsToUse.map((i) => i.sourceTitle),
    );

    const contextItems = itemsToUse
      .map(
        (item) => `
      Title: ${item.sourceTitle}
      Date: ${item.createdAt}
      Summary: ${item.aiSummary || "No summary available"}
      Content Snippet: ${(item.text || "").substring(0, 500)}... 
    `, // Increased snippet length for mentioned items
      )
      .join("\n---\n");

    const context = `
    User Saved Research (Prioritize these):
    ${contextItems}
    `;

    try {
      const result = await generateChatResponse(userMsg.text, context);

      if (result.ok) {
        // CHECK FOR REDIRECT ACTION
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

        // Update credits if available
        if (result.credits_remaining !== undefined) {
          setCredits(result.credits_remaining);
        }
      } else {
        // Handle Error (e.g., No Credits)
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "ai",
          text:
            result.reason === "no_credits"
              ? "⚠️ **Out of AI Credits**. Please wait for your monthly refill or add your own API Key in Settings."
              : `Error: ${result.error}`,
          timestamp: Date.now(),
        };
        setChatHistory((prev) => [...prev, errorMsg]);
        if (result.reason === "no_credits") setCredits(0);
      }
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: "Sorry, I encountered a network error. Please try again.",
        timestamp: Date.now(),
      };
      setChatHistory((prev) => [...prev, errorMsg]);
    } finally {
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
    // Simple navigation for value could be added here
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ========== HEADER ========== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            AI Assistant
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Analyze, summarize, and chat with your research
          </p>
        </div>

        {/* Credit Badge */}
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-sm">
            <Coins className="w-4 h-4 text-[#FF9500]" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {credits} Credits
            </span>
          </div>
        </div>
      </div>

      {/* ========== TABS ========== */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "overview"
              ? "text-[#007AFF] border-b-2 border-[#007AFF] bg-[#007AFF]/5"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Overview & Stats
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === "chat"
              ? "text-[#007AFF] border-b-2 border-[#007AFF] bg-[#007AFF]/5"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Chat with Research
        </button>
      </div>

      {/* ========== OVERVIEW TAB ========== */}
      {activeTab === "overview" && (
        <div className="animate-fade-in space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-gray-200/50 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#FF9500]/10 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#FF9500]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {itemsWithoutSummary.length}
                  </p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-gray-200/50 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#34C759]/10 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-[#34C759]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {itemsWithSummary.length}
                  </p>
                  <p className="text-xs text-gray-500">Summarized</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-gray-200/50 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#007AFF]/10 rounded-xl flex items-center justify-center">
                  <Brain className="w-5 h-5 text-[#007AFF]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {items.length > 0
                      ? Math.round(
                          (itemsWithSummary.length / items.length) * 100,
                        )
                      : 0}
                    %
                  </p>
                  <p className="text-xs text-gray-500">Coverage</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Action Bar */}
          <div className="flex items-center justify-between">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition-all"
              />
            </div>
            {itemsWithoutSummary.length > 0 && (
              <button
                onClick={handleBatchSummarize}
                disabled={batchProcessing}
                className="ml-4 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95 disabled:opacity-50"
              >
                {batchProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Summarize All ({Math.min(5, itemsWithoutSummary.length)})
                  </>
                )}
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Needs Summary
              </h3>
              {itemsWithoutSummary.length === 0 ? (
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-8 border border-gray-200/50 dark:border-gray-800 text-center">
                  <p className="text-gray-500">All caught up!</p>
                </div>
              ) : (
                itemsWithoutSummary.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-[#1C1C1E] p-4 rounded-xl border border-gray-200/50 dark:border-gray-800 flex justify-between items-center"
                  >
                    <div className="truncate pr-4 flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {item.sourceTitle || "Untitled"}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSummarize(item)}
                      disabled={summarizing === item.id}
                      className="px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-lg text-xs font-medium hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] transition-colors"
                    >
                      {summarizing === item.id ? "..." : "Summarize"}
                    </button>
                  </div>
                ))
              )}
            </div>
            {/* Completed */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Completed
              </h3>
              {itemsWithSummary.length === 0 ? (
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-8 border border-gray-200/50 dark:border-gray-800 text-center">
                  <p className="text-gray-500">No summaries yet</p>
                </div>
              ) : (
                itemsWithSummary.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="bg-white dark:bg-[#1C1C1E] p-4 rounded-xl border border-gray-200/50 dark:border-gray-800 cursor-pointer hover:border-[#34C759]/50 transition-colors"
                  >
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {item.sourceTitle || "Untitled"}
                    </h4>
                    <p className="text-xs text-[#34C759] mt-1 line-clamp-1">
                      "{item.aiSummary}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== CHAT TAB ========== */}
      {activeTab === "chat" && (
        <div className="animate-fade-in h-[600px] flex flex-col bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-200/50 dark:border-gray-800 overflow-hidden shadow-sm">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-[#151516]">
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === "ai"
                      ? "bg-gradient-to-br from-[#007AFF] to-[#5856D6] text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {msg.role === "ai" ? (
                    <Bot className="w-5 h-5" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#007AFF] text-white rounded-tr-none"
                      : "bg-white dark:bg-[#2C2C2E] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-tl-none shadow-sm"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white dark:bg-[#1C1C1E] border-t border-gray-200/50 dark:border-gray-800">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={chatInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  items.length > 0
                    ? "Ask about your saved research (Type @ to mention)..."
                    : "Add some items to start chatting..."
                }
                className="w-full pl-4 pr-12 py-3.5 bg-gray-100 dark:bg-[#2C2C2E] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition-all"
                disabled={isChatting}
              />

              {/* @ MENTION MENU */}
              {isMentionMenuOpen && filteredMentions.length > 0 && (
                <div className="absolute bottom-full mb-2 left-0 w-64 bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-10">
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500">
                    Suggest Research
                  </div>
                  {filteredMentions.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => insertMention(item)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-[#007AFF]/10 hover:text-[#007AFF] transition-colors truncate"
                    >
                      {item.sourceTitle || "Untitled"}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isChatting}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#007AFF] hover:bg-[#0066DD] text-white rounded-lg transition-colors disabled:opacity-50 disabled:bg-gray-400"
              >
                {isChatting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI uses your saved items as context. 1 Credit per message.
            </p>
          </div>
        </div>
      )}

      {/* ========== DETAIL MODAL ========== */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="AI Summary"
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-[#007AFF]/10 via-[#5856D6]/10 to-[#AF52DE]/10 rounded-xl p-5 border border-[#007AFF]/20">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-[#007AFF]" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  AI Generated Summary
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {selectedItem.aiSummary}
              </p>
            </div>

            <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Original Content
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4">
                {selectedItem.text || selectedItem.ocrText}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AIAssistant;
