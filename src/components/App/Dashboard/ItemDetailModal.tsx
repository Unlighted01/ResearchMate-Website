// ============================================
// ITEM DETAIL MODAL - Full research item workspace slide-out
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Zap, 
  Share2, 
  FolderPlus, 
  X, 
  Check, 
  Copy, 
  Sparkles, 
  Send, 
  FileText, 
  Globe, 
  Tag, 
  Clock, 
  FileCode,
  CornerDownLeft,
  ChevronRight
} from "lucide-react";
import { TrashIcon, CopyIcon, ExternalLinkIcon } from "../../icons";
import { StorageItem } from "../../../services/storageService";
import { isMarkdown } from "./dashboardUtils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StorageItem | null;
  isSummarizingItem: boolean;
  onGenerateSummary: (item: StorageItem) => void;
  onColorChange: (item: StorageItem, color: string) => void;
  onCopyMarkdown: (item: StorageItem) => void;
  onCopyText: (text: string) => void;
  onShare: (item: StorageItem) => void;
  onAddToCollection: () => void;
  onDelete: (id: string) => void;
}

// ============================================
// PART 3: HELPERS
// ============================================

const stripMarkdown = (text: string) =>
  text
    .replace(/^#{1,6} /gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\|.*\|/g, "")
    .replace(/^[-*+] /gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-]{3,}\s*$/gm, "")
    .trim();

// ============================================
// PART 4: COMPONENT
// ============================================

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  isSummarizingItem,
  onGenerateSummary,
  onColorChange,
  onCopyMarkdown,
  onCopyText,
  onShare,
  onAddToCollection,
  onDelete,
}) => {
  const [activeLeftTab, setActiveLeftTab] = useState<"preview" | "raw">("preview");
  const [chatInput, setChatInput] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([]);

  const displayText = item ? (item.text || item.ocrText || "") : "";

  // Reset custom messages when the item changes
  useEffect(() => {
    setMessages([]);
    setChatInput("");
  }, [item]);

  // Handle escape key to close workspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopyFeedback = (field: string, action: () => void) => {
    action();
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !item) return;

    const userMsg = chatInput;
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");

    // Simulated premium context-aware AI Assistant response
    setTimeout(() => {
      let replyText = "";
      const lower = userMsg.toLowerCase();

      if (lower.includes("insight") || lower.includes("key") || lower.includes("takeaway")) {
        replyText = `### Key Takeaways from this document:\n\n1. **Core Summary:** The research addresses structural content saved from **${item.deviceSource || "web"}** source.\n2. **Length Profile:** Comprises **${displayText.length} characters** of dense research metadata.\n3. **Primary Intent:** Capturing context tags and highlighting entities recursively under the active collection system.`;
      } else if (lower.includes("stat") || lower.includes("count") || lower.includes("size")) {
        replyText = `### Document Profile Analysis:\n\n- **Character Count:** \`${displayText.length}\` characters\n- **Approx. Word Count:** \`${displayText.split(/\s+/).filter(Boolean).length}\` words\n- **Creation Date:** ${new Date(item.createdAt).toLocaleString()}\n- **Source Channel:** \`${item.deviceSource || "web"}\` capture\n- **Color Grouping:** \`${item.color || "None"}\``;
      } else if (lower.includes("tag") || lower.includes("category")) {
        replyText = `The current document has **${item.tags?.length || 0} associated tags**: ${
          item.tags && item.tags.length > 0 
            ? item.tags.map(t => `\`#${t}\``).join(", ") 
            : "No active tags designated yet. You can associate tags under the Collection panel."
        }`;
      } else {
        replyText = `I have analyzed the research document: **"${item.sourceTitle || "Untitled Document"}"**.\n\nThe content highlights:\n> "${stripMarkdown(displayText).substring(0, 180)}..."\n\nAsk me to **summarize key insights**, **compile statistical profiles**, or **outline a blog draft** from this data!`;
      }

      setMessages((prev) => [...prev, { sender: "ai", text: replyText }]);
    }, 900);
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && item && (
        <>
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-sm z-50 transition-all"
          />

          {/* Premium Right Curtain Slide-Out Pane (85% width) */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-[85vw] max-w-7xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200/50 dark:border-slate-800/50 z-50 flex flex-col overflow-hidden"
          >
            {/* Header Control Panel */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-50/60 dark:bg-slate-900/60 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h2 
                    className="text-lg font-bold text-slate-800 dark:text-slate-100 max-w-[500px] truncate leading-tight"
                    style={{ fontFamily: "var(--font-title, 'Fraunces', Georgia, serif)" }}
                  >
                    {item.sourceTitle || "Untitled Research Workspace"}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>INDEXED // {new Date(item.createdAt).toLocaleDateString()}</span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <Globe className="w-3.5 h-3.5" />
                    <span className="uppercase">SOURCE // {item.deviceSource || "web"}</span>
                  </div>
                </div>
              </div>

              {/* Close controls */}
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
                aria-label="Close Workspace"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Screen Double-Pane Workspace */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* LEFT PANE: Premium Editorial Writing Sheet (55% width) */}
              <div className="w-[55%] border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col bg-slate-50/20 dark:bg-slate-950/10 overflow-hidden">
                
                {/* Tab Switcher & Quick Actions Strip */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200/30 dark:border-slate-800/30 bg-white/40 dark:bg-slate-900/30 backdrop-blur-sm z-10">
                  <div className="flex bg-slate-100 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200/30 dark:border-slate-700/30">
                    <button
                      onClick={() => setActiveLeftTab("preview")}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        activeLeftTab === "preview"
                          ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Formatted
                    </button>
                    <button
                      onClick={() => setActiveLeftTab("raw")}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        activeLeftTab === "raw"
                          ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      Raw Markdown
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyFeedback("markdown", () => onCopyMarkdown(item))}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm"
                    >
                      {copiedField === "markdown" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === "markdown" ? "Copied!" : "MD"}</span>
                    </button>
                    
                    <button
                      onClick={() => handleCopyFeedback("text", () => onCopyText(displayText))}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm"
                    >
                      {copiedField === "text" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === "text" ? "Copied!" : "TEXT"}</span>
                    </button>

                    <button
                      onClick={() => onShare(item)}
                      className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 hover:text-indigo-500 transition-all shadow-sm"
                      title="Share Research"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={onAddToCollection}
                      className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 hover:text-emerald-500 transition-all shadow-sm"
                      title="Add to Collection"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all shadow-sm"
                      title="Delete Item"
                    >
                      <TrashIcon size={14} color="currentColor" />
                    </button>
                  </div>
                </div>

                {/* Main Content Workspace Sheet */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  
                  {/* Editorial Layout Page Canvas */}
                  <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-slate-200/50 dark:border-slate-800/50 shadow-sm min-h-[400px]">
                    {activeLeftTab === "preview" ? (
                      <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans prose dark:prose-invert max-w-none">
                        {isMarkdown(displayText) ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({ children }) => <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-4 mb-2 border-b border-slate-200 dark:border-slate-800 pb-1.5" style={{ fontFamily: "var(--font-title)" }}>{children}</h1>,
                              h2: ({ children }) => <h2 className="text-lg font-bold text-indigo-900 dark:text-indigo-400 mt-4 mb-2">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1">{children}</h3>,
                              p: ({ children }) => <p className="mb-3.5 leading-relaxed">{children}</p>,
                              strong: ({ children }) => <strong className="font-bold text-slate-900 dark:text-white">{children}</strong>,
                              em: ({ children }) => <em className="italic text-slate-500 dark:text-slate-400">{children}</em>,
                              ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 pl-2">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 pl-2">{children}</ol>,
                              blockquote: ({ children }) => <blockquote className="border-l-4 border-indigo-500/50 dark:border-indigo-400/50 pl-4 italic text-slate-500 dark:text-slate-400 my-3 bg-indigo-500/5 rounded-r-lg py-2 px-3">{children}</blockquote>,
                              hr: () => <hr className="border-slate-200 dark:border-slate-800 my-4" />,
                              table: ({ children }) => <div className="overflow-x-auto my-3"><table className="w-full text-xs border-collapse rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">{children}</table></div>,
                              thead: ({ children }) => <thead className="bg-slate-100 dark:bg-slate-800/80">{children}</thead>,
                              th: ({ children }) => <th className="border border-slate-200 dark:border-slate-800 px-3 py-2 font-bold text-slate-950 dark:text-white text-left">{children}</th>,
                              td: ({ children }) => <td className="border border-slate-200 dark:border-slate-800 px-3 py-2 align-top">{children}</td>,
                            }}
                          >
                            {displayText}
                          </ReactMarkdown>
                        ) : (
                          <span className="whitespace-pre-wrap leading-relaxed block">{displayText}</span>
                        )}
                      </div>
                    ) : (
                      <textarea
                        readOnly
                        value={displayText}
                        className="w-full h-[350px] bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-700 dark:text-slate-350 p-4 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed resize-none"
                      />
                    )}
                  </div>

                  {/* Dynamic Color Palette Swatch */}
                  <div className="bg-white/40 dark:bg-slate-900/30 backdrop-blur-md rounded-2xl p-4 border border-slate-200/40 dark:border-slate-800/40">
                    <h4 className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                      Highlight Group Allocation
                    </h4>
                    <div className="flex flex-wrap items-center gap-3">
                      {[
                        { name: "yellow", hex: "#FBBF24", label: "Amber Focus" },
                        { name: "green", hex: "#34D399", label: "Green Core" },
                        { name: "blue", hex: "#60A5FA", label: "Blue Context" },
                        { name: "red", hex: "#F87171", label: "Rose Priority" },
                        { name: "purple", hex: "#A78BFA", label: "Purple Creative" },
                      ].map((c) => (
                        <button
                          key={c.name}
                          onClick={() => onColorChange(item, c.name)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                            item.color === c.name
                              ? "bg-slate-100 dark:bg-slate-800/80 border-slate-400 dark:border-slate-500 scale-102"
                              : "bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-800"
                          }`}
                          title={`Allocate to ${c.label}`}
                        >
                          <span 
                            className="w-3.5 h-3.5 rounded-full block border border-slate-950/10 dark:border-white/10" 
                            style={{ backgroundColor: c.hex }} 
                          />
                          <span className="font-medium text-[10px] text-slate-600 dark:text-slate-400">{c.label}</span>
                        </button>
                      ))}
                      {item.color && (
                        <button
                          onClick={() => onColorChange(item, "")}
                          className="ml-auto text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition-colors uppercase font-mono font-bold tracking-tight"
                        >
                          Clear Accent
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Premium Framed Image Preview */}
                  {item.imageUrl && (
                    <div className="bg-white/40 dark:bg-slate-900/30 backdrop-blur-md rounded-2xl p-4 border border-slate-200/40 dark:border-slate-800/40">
                      <h4 className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                        Captured Visual Image Media
                      </h4>
                      <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-2">
                        <img
                          src={item.imageUrl}
                          alt="Source Visual Representation"
                          className="rounded-lg w-full max-h-[300px] object-contain transition-transform duration-500 group-hover:scale-101"
                        />
                      </div>
                    </div>
                  )}

                  {/* Metadata Tag Cloud */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="bg-white/40 dark:bg-slate-900/30 backdrop-blur-md rounded-2xl p-4 border border-slate-200/40 dark:border-slate-800/40">
                      <h4 className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                        System Taxonomy Tags
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="flex items-center gap-1 px-3 py-1 bg-indigo-500/5 border border-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-full"
                          >
                            <Tag className="w-3 h-3" />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* RIGHT PANE: Context-Bound AI Chat Console (45% width) */}
              <div className="w-[45%] flex flex-col bg-slate-50/50 dark:bg-slate-950/20 overflow-hidden">
                
                {/* AI Banner */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/10">
                      <Sparkles className="w-4 h-4 text-white animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-wide uppercase">
                        ResearchMate AI assistant
                      </h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        CONTEXT // BOUND ANALYSIS SYSTEM
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    ACTIVE
                  </span>
                </div>

                {/* Interactive AI Message Flow */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 font-sans">
                  
                  {/* Static Baseline Spark Query */}
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-500 dark:text-slate-400 text-xs">
                      USR
                    </div>
                    <div className="bg-slate-100/80 dark:bg-slate-800/60 p-3 rounded-2xl rounded-tl-none text-xs text-slate-705 dark:text-slate-300 max-w-[85%]">
                      Can you analyze this research card and index its contents?
                    </div>
                  </div>

                  {/* AI Initial Summary Response */}
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 text-white shadow-md shadow-indigo-500/15">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    
                    <div className="space-y-3 max-w-[85%]">
                      <div className="bg-indigo-600/5 dark:bg-indigo-950/20 border border-indigo-500/10 p-3 rounded-2xl rounded-tl-none text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {item.aiSummary ? (
                          <div className="space-y-2">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                              <Zap className="w-3 h-3 animate-bounce" /> Smart Executive Summary:
                            </span>
                            <p>{item.aiSummary}</p>
                          </div>
                        ) : (
                          <div className="text-center py-2 space-y-3">
                            <p className="text-slate-500 dark:text-slate-400 italic">No AI summary generated for this research index yet.</p>
                            <button
                              onClick={() => onGenerateSummary(item)}
                              disabled={isSummarizingItem}
                              className="mx-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all shadow-sm shadow-indigo-600/20 active:scale-[0.98]"
                            >
                              {isSummarizingItem ? (
                                <>
                                  <svg className="w-3 h-3 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                  </svg>
                                  Running Analysis...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Synthesize Summary
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Custom Message History */}
                  {messages.map((m, idx) => (
                    <div key={idx} className={`flex gap-3 ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                      {m.sender === "user" ? (
                        <>
                          <div className="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-none text-xs max-w-[85%]">
                            {m.text}
                          </div>
                          <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 text-white text-xs">
                            USR
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 text-white">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <div className="bg-indigo-600/5 dark:bg-indigo-950/20 border border-indigo-500/10 p-3 rounded-2xl rounded-tl-none text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-w-[85%] prose dark:prose-invert">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {m.text}
                            </ReactMarkdown>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                </div>

                {/* Quick-Click Preset Prompts Shelf */}
                <div className="px-6 py-2 border-t border-slate-200/30 dark:border-slate-800/30 bg-slate-50/20 dark:bg-slate-900/20">
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {[
                      { prompt: "📝 Key Insights", label: "Insights" },
                      { prompt: "📊 Document Statistics", label: "Stats Profile" },
                      { prompt: "🏷️ Associated Tags", label: "Tag Details" },
                    ].map((p, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setChatInput(p.prompt);
                        }}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600 border border-slate-200/50 dark:border-slate-700 text-[10px] font-semibold text-slate-500 dark:text-slate-400 rounded-full transition-all"
                      >
                        <span>{p.label}</span>
                        <ChevronRight className="w-3 h-3 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat Input Console Form */}
                <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900">
                  <form onSubmit={handleSendMessage} className="relative flex items-center">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask the research AI anything about this document..."
                      className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="absolute right-2 p-1.5 bg-indigo-600 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                      aria-label="Send query"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>

              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

// ============================================
// PART 5: EXPORTS
// ============================================

export default ItemDetailModal;
