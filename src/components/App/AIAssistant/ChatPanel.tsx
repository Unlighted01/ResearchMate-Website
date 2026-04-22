// ============================================
// CHAT PANEL - AI Chat Tab with Mention Support
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Sparkles, Send, Bot, User, X, Trash2 } from "lucide-react";
import { StorageItem } from "../../../services/storageService";
import { ChatMessage } from "./useAIAssistant";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface ChatPanelProps {
  items: StorageItem[];
  chatInput: string;
  chatHistory: ChatMessage[];
  isChatting: boolean;
  chatEndRef: React.RefObject<HTMLDivElement>;
  chatAbortRef: React.MutableRefObject<AbortController | null>;
  handleSendMessage: () => Promise<void>;
  isMentionMenuOpen: boolean;
  filteredMentions: StorageItem[];
  inputRef: React.RefObject<HTMLInputElement>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  insertMention: (item: StorageItem) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  clearHistory: () => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const ChatPanel: React.FC<ChatPanelProps> = ({
  items,
  chatInput,
  chatHistory,
  isChatting,
  chatEndRef,
  chatAbortRef,
  handleSendMessage,
  isMentionMenuOpen,
  filteredMentions,
  inputRef,
  handleInputChange,
  insertMention,
  handleKeyDown,
  clearHistory,
}) => {
  const userMessages = chatHistory.filter((m) => m.role === "user").length;
  return (
    <div className="animate-fade-in h-[600px] flex flex-col bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-200/50 dark:border-gray-800 overflow-hidden shadow-sm">
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#007AFF]" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">AI Chat</span>
          {userMessages > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
              {userMessages} {userMessages === 1 ? "message" : "messages"}
            </span>
          )}
        </div>
        {chatHistory.length > 1 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
            title="Clear conversation"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>
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

          {/* @ Mention Menu */}
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

          {isChatting ? (
            <button
              onClick={() => chatAbortRef.current?.abort()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#FF3B30] hover:bg-[#D93025] text-white rounded-lg transition-colors"
              title="Cancel request"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSendMessage}
              disabled={!chatInput.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#007AFF] hover:bg-[#0066DD] text-white rounded-lg transition-colors disabled:opacity-50 disabled:bg-gray-400"
              title="Send message"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" />
          AI uses your saved items as context. 1 Credit per message.
        </p>
      </div>
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default ChatPanel;
