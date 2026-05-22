// ============================================
// CHAT PANEL - High-Fidelity Split-Pane AI Workspace
// ============================================

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import {
  Sparkles,
  Send,
  Bot,
  User,
  X,
  Trash2,
  FileText,
  Mic,
  Globe,
  Search,
  Check,
  Info,
  ChevronRight,
  Database,
  ArrowRight,
  Copy,
} from "lucide-react";
import { StorageItem } from "../../../services/storageService";
import { ChatMessage } from "./useAIAssistant";

// ============================================
// TYPE DEFINITIONS
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
// CORE HELPER FOR SOURCE ICONS
// ============================================
const getSourceIcon = (type: string) => {
  switch (type) {
    case "pdf":
      return <FileText className="w-4 h-4 text-purple-500" />;
    case "audio":
      return <Mic className="w-4 h-4 text-cyan-500" />;
    case "web":
      return <Globe className="w-4 h-4 text-amber-500" />;
    default:
      return <FileText className="w-4 h-4 text-slate-400" />;
  }
};

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
  // Source pane states
  const [sourceSearch, setSourceSearch] = useState("");
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<StorageItem | null>(null);

  // Copy state mapping to animate individual copy checkmarks
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter sources inside the left pane
  const filteredSources = useMemo(() => {
    if (!sourceSearch.trim()) return items;
    return items.filter((item) =>
      item.sourceTitle?.toLowerCase().includes(sourceSearch.toLowerCase())
    );
  }, [items, sourceSearch]);

  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSourceClick = (item: StorageItem) => {
    if (!inputRef.current) return;
    
    // Auto-insert the @mention format at the cursor position
    const val = chatInput;
    const insertText = `@${item.sourceTitle || "Untitled"} `;
    
    // Insert at end or current selection
    const selectionStart = inputRef.current.selectionStart ?? val.length;
    const before = val.substring(0, selectionStart);
    const after = val.substring(selectionStart);
    
    // If we're already typing an @ character, replace it
    const lastAtIndex = before.lastIndexOf("@");
    if (lastAtIndex !== -1 && !before.substring(lastAtIndex).includes(" ")) {
      const replacedBefore = before.substring(0, lastAtIndex);
      handleInputChange({
        target: { value: `${replacedBefore}${insertText}${after}` }
      } as React.ChangeEvent<HTMLInputElement>);
    } else {
      handleInputChange({
        target: { value: `${before}${insertText}${after}` }
      } as React.ChangeEvent<HTMLInputElement>);
    }

    inputRef.current.focus();
  };

  const userMessages = chatHistory.filter((m) => m.role === "user").length;

  return (
    <div className="h-[650px] grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-[#1C1C1E] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-xl animate-fade-in-up">
      {/* ============================================
          LEFT PANE: LIVE CONTEXT SOURCES (4 Cols)
          ============================================ */}
      <div className="lg:col-span-4 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col h-full bg-slate-50/60 dark:bg-black/10">
        {/* Source Header */}
        <div className="px-4 py-4 border-b border-slate-200/80 dark:border-slate-800/80">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-500" />
            Research Library
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Click to auto-mention items in chat.
          </p>

          {/* Search Sources */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={sourceSearch}
              onChange={(e) => setSourceSearch(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-[#2C2C2E] border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all text-slate-900 dark:text-white"
            />
            {sourceSearch && (
              <button
                onClick={() => setSourceSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Source List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredSources.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="text-xs text-slate-400">No documents found</p>
            </div>
          ) : (
            filteredSources.map((item) => {
              const isSelectedForPreview = selectedPreviewItem?.id === item.id;
              const hasSummary = !!item.aiSummary;

              return (
                <div key={item.id} className="group flex flex-col rounded-xl overflow-hidden transition-all duration-300">
                  <div
                    onClick={() => handleSourceClick(item)}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-200/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors relative"
                  >
                    <div className="p-1.5 bg-white dark:bg-[#2C2C2E] rounded-lg border border-slate-200/50 dark:border-slate-700/50 shadow-sm shrink-0">
                      {getSourceIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                        {item.sourceTitle || "Untitled Document"}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Just now"}
                      </p>
                    </div>

                    {/* Preview summary button */}
                    {hasSummary && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPreviewItem(isSelectedForPreview ? null : item);
                        }}
                        className={`p-1 rounded-lg shrink-0 transition-colors ${
                          isSelectedForPreview
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-500"
                            : "hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        }`}
                        title="View Summary Context"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Summary preview collapse box */}
                  <AnimatePresence>
                    {isSelectedForPreview && item.aiSummary && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="bg-white dark:bg-[#202022] border-t border-slate-100 dark:border-slate-800 p-3 mx-2 my-1 rounded-xl shadow-inner text-[11px] text-slate-600 dark:text-slate-400 leading-normal"
                      >
                        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
                          <span className="font-bold text-[10px] uppercase text-blue-500">
                            Knowledge Snapshot
                          </span>
                          <button
                            onClick={() => setSelectedPreviewItem(null)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="line-clamp-6">{item.aiSummary}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ============================================
          RIGHT PANE: CHAT CONVERSATION WORKSPACE (8 Cols)
          ============================================ */}
      <div className="lg:col-span-8 flex flex-col h-full bg-slate-50/20 dark:bg-[#151516]/40">
        {/* Chat header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#1C1C1E]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#007AFF]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Synthesis Stream</h3>
              <p className="text-[10px] text-slate-400">Context is automatically retrieved from mentioned nodes.</p>
            </div>
            {userMessages > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold ml-2">
                {userMessages} {userMessages === 1 ? "turn" : "turns"}
              </span>
            )}
          </div>
          {chatHistory.length > 1 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
              title="Reset conversation state"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Stream
            </button>
          )}
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {chatHistory.map((msg) => {
            const isAI = msg.role === "ai";
            const isCopied = copiedId === msg.id;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className={`flex gap-4 group/msg ${msg.role === "user" ? "flex-row-reverse text-right" : ""}`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                    isAI
                      ? "bg-gradient-to-br from-[#007AFF] to-[#5856D6] text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {isAI ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>

                {/* Message Body Card */}
                <div className={`relative flex flex-col max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`rounded-2xl px-4 py-3.5 text-sm leading-relaxed border shadow-sm ${
                      msg.role === "user"
                        ? "bg-[#007AFF] text-white border-transparent rounded-tr-none"
                        : "bg-white dark:bg-[#2C2C2E] text-slate-800 dark:text-slate-200 border-slate-200/50 dark:border-slate-800 rounded-tl-none"
                    }`}
                  >
                    {/* Copy and Actions overlay */}
                    {isAI && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => handleCopyMessage(msg.text, msg.id)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-750 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg shadow-sm transition-colors"
                          title="Copy response"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}

                    {/* Rich text formatting via react-markdown */}
                    {isAI ? (
                      <ReactMarkdown
                        className="markdown-body space-y-2.5 break-words"
                        components={{
                          h1: ({ node, ...props }) => <h1 className="text-base font-extrabold my-2 text-slate-900 dark:text-white" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-sm font-bold my-1.5 text-slate-900 dark:text-white" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-xs font-semibold my-1 text-slate-800 dark:text-slate-350" {...props} />,
                          p: ({ node, ...props }) => <p className="leading-relaxed text-slate-700 dark:text-slate-300 text-xs sm:text-sm" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1 my-1.5" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1 my-1.5" {...props} />,
                          li: ({ node, ...props }) => <li className="text-xs sm:text-sm text-slate-700 dark:text-slate-300" {...props} />,
                          blockquote: ({ node, ...props }) => (
                            <blockquote className="border-l-4 border-blue-500 pl-3 py-1 my-2 bg-slate-50 dark:bg-slate-800/30 text-xs italic text-slate-600 dark:text-slate-400 rounded-r-lg" {...props} />
                          ),
                          code: ({ node, className, children, ...props }: any) => {
                            const match = /language-(\w+)/.exec(className || "");
                            const isInline = !match;
                            return isInline ? (
                              <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono text-purple-600 dark:text-purple-400" {...props}>
                                {children}
                              </code>
                            ) : (
                              <div className="relative my-3 rounded-xl overflow-hidden border border-slate-200/50 dark:border-slate-800">
                                <div className="flex items-center justify-between px-4 py-1.5 bg-slate-100 dark:bg-slate-850 text-[10px] font-mono text-slate-500 border-b border-slate-200/50 dark:border-slate-800">
                                  <span>{match[1] || "code"}</span>
                                </div>
                                <pre className="bg-slate-900 text-slate-100 p-4 overflow-x-auto text-[11px] font-mono leading-normal">
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              </div>
                            );
                          },
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    ) : (
                      <div className="whitespace-pre-wrap text-xs sm:text-sm">{msg.text}</div>
                    )}
                  </div>

                  {/* Timestamp tag */}
                  <span className="text-[9px] text-slate-400 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </motion.div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar Section */}
        <div className="p-4 bg-white dark:bg-[#1C1C1E] border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={chatInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                items.length > 0
                  ? "Query notes or PDFs (Type @ to mention, or click items on the left)..."
                  : "Collect reference materials to activate the synthesis engine..."
              }
              className="w-full pl-4 pr-12 py-4 bg-slate-100 dark:bg-[#2C2C2E] rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/35 transition-all border border-slate-200/50 dark:border-slate-700/50"
              disabled={isChatting}
            />

            {/* Float Menu: Mention suggestions */}
            <AnimatePresence>
              {isMentionMenuOpen && filteredMentions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute bottom-full mb-3 left-0 w-72 bg-white dark:bg-[#2C2C2E] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-30"
                >
                  <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-750 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Suggest Research Node
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredMentions.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => insertMention(item)}
                        className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-500/10 hover:text-blue-500 dark:hover:text-blue-400 transition-colors truncate flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                      >
                        <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded shrink-0">
                          {getSourceIcon(item.type)}
                        </div>
                        <span className="truncate">{item.sourceTitle || "Untitled"}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Processing / Send Controls */}
            {isChatting ? (
              <button
                onClick={() => chatAbortRef.current?.abort()}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-md active:scale-95"
                title="Abort stream request"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim()}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-2.5 bg-[#007AFF] hover:bg-[#0066DD] text-white rounded-xl transition-all disabled:opacity-40 disabled:bg-slate-400 shrink-0 shadow-md hover:shadow-blue-500/10 active:scale-95"
                title="Transmit prompt"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-2.5 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            Active Synthesizer: Context derived from notes. 1 Token per query.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
