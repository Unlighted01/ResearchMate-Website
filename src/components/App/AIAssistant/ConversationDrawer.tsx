// ============================================
// CONVERSATION DRAWER
// Multi-Session Chat History Drawer (ChatGPT / Claude / NotebookLM style)
// ResearchMate Design System
// ============================================

import React, { useState, useMemo } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  Search,
  X,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  ConversationSummary,
  formatConversationTime,
} from "../../../services/conversationService";

interface ConversationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: ConversationSummary[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
  onDeleteThread: (threadId: string) => void;
}

const ConversationDrawer: React.FC<ConversationDrawerProps> = ({
  isOpen,
  onClose,
  conversations,
  activeThreadId,
  onSelectThread,
  onNewChat,
  onDeleteThread,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.itemTitle && c.itemTitle.toLowerCase().includes(q)) ||
        c.preview.toLowerCase().includes(q),
    );
  }, [conversations, searchQuery]);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-30 lg:hidden"
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-72 sm:w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col transition-all duration-300 shadow-2xl lg:shadow-none shrink-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Conversations
            </h3>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onNewChat();
                if (window.innerWidth < 1024) onClose();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Start a new AI conversation"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 lg:hidden"
              title="Close history drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Filter */}
        <div className="p-3 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chat history..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 border border-transparent"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 font-sans">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-10 px-4 text-slate-400 space-y-2">
              <Sparkles className="w-6 h-6 mx-auto opacity-40 text-indigo-500" />
              <p className="text-xs font-medium">
                {searchQuery ? "No matching conversations" : "No saved chats yet"}
              </p>
              <p className="text-[11px] text-slate-400/80">
                {searchQuery
                  ? "Try a different search keyword."
                  : "Conversations you have with ResearchMate AI are preserved here."}
              </p>
            </div>
          ) : (
            filteredConversations.map((thread) => {
              const isActive = activeThreadId === thread.id;
              const isItemChat = Boolean(thread.itemId);

              return (
                <div
                  key={thread.id}
                  onClick={() => {
                    onSelectThread(thread.id);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`group relative flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80 shadow-xs"
                      : "bg-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/60 border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                      isItemChat
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    }`}
                  >
                    {isItemChat ? (
                      <FileText className="w-3.5 h-3.5" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-6">
                    <p
                      className={`text-xs font-semibold truncate ${
                        isActive
                          ? "text-indigo-700 dark:text-indigo-300"
                          : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {thread.title}
                    </p>

                    {thread.preview && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {thread.preview}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{formatConversationTime(thread.updatedAt)}</span>
                      </span>
                      <span>•</span>
                      <span>
                        {thread.messageCount}{" "}
                        {thread.messageCount === 1 ? "turn" : "turns"}
                      </span>
                    </div>
                  </div>

                  {/* Delete button (visible on hover) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteThread(thread.id);
                    }}
                    className="absolute right-2 top-2 p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
};

export default ConversationDrawer;
