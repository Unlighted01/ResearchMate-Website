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
  ChevronRight,
  Upload,
  BookOpen,
  Eye,
  Layers,
} from "lucide-react";
import { TrashIcon, CopyIcon, ExternalLinkIcon } from "../../icons";
import { StorageItem, updateItem, getCachedProblemSolution, saveCachedProblemSolution } from "../../../services/storageService";
import { generateAiResponse, generateChatResponse, generateEmbedding } from "../../../services/geminiService";
import { chunkText, findTopKChunks, findTopKChunksHybrid, embedChunks } from "../../../services/ragService";
import { extractPdfContent } from "../../../services/pdfService";
import { isPureMathCalculation, solveMath } from "../../../services/mathSolverEngine";
import { findRelevantKnowledge } from "../../../services/knowledgeDatasets";
import { isMarkdown } from "./dashboardUtils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

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
  onItemUpdated?: (updated: StorageItem) => void;
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

/**
 * Normalizes mathematical operators and unescapes stray tokens for KaTeX rendering
 */
const sanitizeMathAndOperators = (text: string): string => {
  if (!text) return "";
  return text
    // Normalize informal OCR division tokens: "/div" -> " ÷ "
    .replace(/\s*\/div\s*/gi, " ÷ ")
    // Unescape stray escaped question marks in math expressions (e.g., \? -> ?)
    .replace(/\\(\?)/g, "$1");
};

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
  onItemUpdated,
}) => {
  const displayText = item ? (item.text || item.ocrText || "") : "";
  const isPdfOrDocument = Boolean(
    item?.tags?.includes("pdf") ||
    item?.imageUrl ||
    item?.sourceTitle?.toLowerCase().endsWith(".pdf") ||
    (displayText && displayText.length > 2000)
  );

  const [activeLeftTab, setActiveLeftTab] = useState<"cover" | "preview" | "raw">(
    isPdfOrDocument ? "cover" : "preview"
  );
  const [chatInput, setChatInput] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([]);

  const [isAiThinking, setIsAiThinking] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-flash");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const pdfInputRef = React.useRef<HTMLInputElement>(null);

  // Set default tab to "cover" for books/documents, or "preview" for short notes
  useEffect(() => {
    if (isPdfOrDocument) {
      setActiveLeftTab("cover");
    } else {
      setActiveLeftTab("preview");
    }
  }, [item?.id]);

  const handleReindexPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !item) return;

    setIsReindexing(true);
    try {
      const extracted = await extractPdfContent(file);
      await updateItem(item.id, {
        text: extracted.text,
        aiSummary: extracted.summary,
        imageUrl: extracted.coverImageUrl,
      });
      const updatedItem: StorageItem = {
        ...item,
        text: extracted.text,
        aiSummary: extracted.summary,
        imageUrl: extracted.coverImageUrl,
      };
      if (onItemUpdated) {
        onItemUpdated(updatedItem);
      }
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: `✅ Successfully extracted and indexed **${extracted.pageCount} pages** from **${file.name}**!\n\nYou can now ask me to solve specific problems (e.g. *"solve problem 1"*), explain formulas, or generate mock practice questions.`,
        },
      ]);
    } catch (err: any) {
      console.error("Failed to re-index PDF:", err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: `⚠️ Could not extract text from this PDF: ${err?.message || "Unknown error"}. Try uploading another version or pasting the problem directly.`,
        },
      ]);
    } finally {
      setIsReindexing(false);
      if (e.target) e.target.value = "";
    }
  };

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

  const handleSendMessage = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const query = (customMsg || chatInput).trim();
    if (!query || !item || isAiThinking) return;

    setMessages((prev) => [...prev, { sender: "user", text: query }]);
    setChatInput("");
    setIsAiThinking(true);

    try {
      // TIER 1: Check Cached Problem Solutions (0 credits, instant response)
      const cachedSolution = await getCachedProblemSolution(item.sourceTitle, query);
      if (cachedSolution) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: `${cachedSolution}\n\n*(Loaded from verified solution cache • 0 credits consumed)*`,
          },
        ]);
        setIsAiThinking(false);
        return;
      }

      // TIER 2: Pure Math & Unit Conversion Local Solver (0 credits, 100% accurate)
      if (isPureMathCalculation(query)) {
        const mathResult = solveMath(query);
        if (mathResult.success) {
          setMessages((prev) => [
            ...prev,
            {
              sender: "ai",
              text: `${mathResult.explanationMarkdown}\n\n*(Computed deterministically via Math.js engine • 0 credits consumed)*`,
            },
          ]);
          await saveCachedProblemSolution(item.sourceTitle, query, mathResult.explanationMarkdown);
          setIsAiThinking(false);
          return;
        }
      }

      // TIER 3: Knowledge Bank Lookup + AI Pedagogical Tutor
      const relevantKnowledge = findRelevantKnowledge(query);

      let docContext = "";
      if (displayText && displayText.trim()) {
        const chunks = chunkText(displayText, 1500, 200);
        if (chunks.length <= 3) {
          const formattedChunks = chunks.map(
            (c) => `[Source Section ${c.index + 1}]\n${c.text}`
          );
          docContext = `Document Title: "${item.sourceTitle || "Untitled"}"\n\nRelevant Document Excerpts:\n${formattedChunks.join("\n\n")}`;
        } else {
          try {
            const queryEmb = await generateEmbedding(query);
            const embedded = await embedChunks(chunks);
            const topChunks = findTopKChunksHybrid(query, queryEmb, embedded, 4);
            topChunks.sort((a, b) => a.index - b.index);
            const formattedChunks = topChunks.map(
              (c) => `[Source Section ${c.index + 1}]\n${c.text}`
            );
            docContext = `Document Title: "${item.sourceTitle || "Untitled"}"\n\nRelevant Document Excerpts:\n${formattedChunks.join("\n\n")}`;
          } catch (ragErr) {
            console.warn("RAG retrieval failed, falling back to hybrid chunks:", ragErr);
            const fallbackChunks = findTopKChunksHybrid(query, [], chunks, 4);
            fallbackChunks.sort((a, b) => a.index - b.index);
            const formattedChunks = fallbackChunks.map(
              (c) => `[Source Section ${c.index + 1}]\n${c.text}`
            );
            docContext = `Document Title: "${item.sourceTitle || "Untitled"}"\n\nRelevant Document Excerpts:\n${fallbackChunks.join("\n\n")}`;
          }
        }
      } else {
        docContext = `Document Title: "${item.sourceTitle || "Untitled"}"\n(Note: No body text extracted yet. If the user asks to solve specific problems or analyze sections, explain what is available, offer to solve it if they paste it or re-parse the PDF, and provide a helpful illustrative example).`;
      }

      if (relevantKnowledge.length > 0) {
        docContext += `\n\nVERIFIED REFERENCE KNOWLEDGE:\n${relevantKnowledge.join("\n")}`;
      }

      const chatRes = await generateChatResponse(query, docContext, selectedModel);
      if (chatRes.ok && chatRes.response) {
        setMessages((prev) => [...prev, { sender: "ai", text: chatRes.response }]);
        // Auto-cache problem solutions to save credits on repeat visits
        if (/problem|question|number|solve|formula/i.test(query)) {
          await saveCachedProblemSolution(item.sourceTitle, query, chatRes.response);
        }
      } else {
        if (chatRes.reason === "no_credits" || chatRes.error?.toLowerCase().includes("credit")) {
          setShowUpgradeModal(true);
        }
        throw new Error(chatRes.error || "No response from AI assistant");
      }
    } catch (err: any) {
      console.warn("AI chat error:", err);
      if (err.message?.toLowerCase().includes("credit")) {
        setShowUpgradeModal(true);
      }
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: err.message?.toLowerCase().includes("credit")
            ? `⚠️ You have used all your free AI credits. You can add your personal free Google key in Settings for unlimited studying, or upgrade to Student Pro!`
            : `I had trouble connecting to the AI service. If this document was recently uploaded without text, click **Re-parse PDF** above to re-index its pages.`,
        },
      ]);
    } finally {
      setIsAiThinking(false);
    }
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
            className="fixed top-0 right-0 h-full w-full sm:w-[85vw] max-w-7xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200/50 dark:border-slate-800/50 z-50 flex flex-col overflow-hidden"
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
                    <span>Indexed {new Date(item.createdAt).toLocaleDateString()}</span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <Globe className="w-3.5 h-3.5" />
                    <span className="capitalize">{item.deviceSource || "web"} source</span>
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
            <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
              
              {/* LEFT PANE: Premium Editorial Writing Sheet (55% width) */}
              <div className="w-full lg:w-[55%] lg:border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col shrink-0 lg:shrink bg-slate-50/20 dark:bg-slate-950/10 overflow-visible lg:overflow-hidden border-b lg:border-b-0">
                
                {/* Tab Switcher & Quick Actions Strip */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200/30 dark:border-slate-800/30 bg-white/40 dark:bg-slate-900/30 backdrop-blur-sm z-10">
                  <div className="flex bg-slate-100 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200/30 dark:border-slate-700/30">
                    <button
                      onClick={() => setActiveLeftTab("cover")}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-semibold transition-all ${
                        activeLeftTab === "cover"
                          ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Overview
                    </button>
                    <button
                      onClick={() => setActiveLeftTab("preview")}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-semibold transition-all ${
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
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-semibold transition-all ${
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
                      className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm"
                    >
                      {copiedField === "markdown" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === "markdown" ? "Copied!" : "MD"}</span>
                    </button>
                    
                    <button
                      onClick={() => handleCopyFeedback("text", () => onCopyText(displayText))}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm"
                    >
                      {copiedField === "text" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === "text" ? "Copied!" : "TEXT"}</span>
                    </button>

                    <button
                      onClick={() => pdfInputRef.current?.click()}
                      disabled={isReindexing}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors shadow-2xs"
                      title="Re-parse PDF file into this note"
                    >
                      <Upload className={`w-3 h-3 ${isReindexing ? "animate-spin" : ""}`} />
                      <span>{isReindexing ? "Parsing..." : "Re-parse PDF"}</span>
                    </button>
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleReindexPdf}
                    />

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
                  
                  {activeLeftTab === "cover" ? (
                    <div className="space-y-6">
                      {/* Editorial Cover Presentation Card */}
                      <div className="bg-gradient-to-b from-indigo-50/50 via-white to-slate-50 dark:from-slate-900/60 dark:via-slate-900/40 dark:to-slate-950/60 rounded-3xl p-6 md:p-8 border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col items-center text-center">
                        
                        {/* Visual Cover: Rendered Page 1 Image or Elegant Academic Cover Plate */}
                        {item.imageUrl ? (
                          <div className="relative group rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-w-[240px] max-h-[340px] mb-5 transition-transform duration-300 hover:scale-[1.02]">
                            <img
                              src={item.imageUrl}
                              alt={`${item.sourceTitle || "Document"} Cover`}
                              className="w-full h-auto max-h-[340px] object-contain rounded-xl"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3">
                              <span className="text-[11px] font-medium text-white/90 bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1">
                                <Eye className="w-3 h-3" /> Page 1 Cover
                              </span>
                            </div>
                          </div>
                        ) : (
                          /* Academic Book Cover Graphic for documents without a stored thumbnail */
                          <div className="w-[190px] h-[260px] rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white p-5 shadow-xl border border-indigo-400/20 flex flex-col justify-between mb-5 relative overflow-hidden group">
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
                            <div className="flex items-center justify-between text-indigo-200 text-[10px] font-mono uppercase tracking-widest border-b border-indigo-400/30 pb-2">
                              <span>ResearchMate</span>
                              <span>Source</span>
                            </div>
                            <div className="my-auto text-left">
                              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center mb-3 text-white">
                                <BookOpen className="w-4 h-4" />
                              </div>
                              <h3 className="font-bold text-sm leading-snug line-clamp-4 text-white font-serif">
                                {item.sourceTitle || "Untitled Document"}
                              </h3>
                            </div>
                            <div className="text-left text-[10px] text-indigo-200/80 font-mono border-t border-indigo-400/30 pt-2">
                              Indexed Document
                            </div>
                          </div>
                        )}

                        {/* Title & Document Badges */}
                        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 max-w-lg">
                          {item.sourceTitle || "Untitled Document"}
                        </h2>

                        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40">
                            <FileText className="w-3 h-3" />
                            <span>{item.tags?.includes("pdf") ? "PDF Document" : "Study Document"}</span>
                          </span>
                          {displayText && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                              <Layers className="w-3 h-3" />
                              <span>~{Math.max(1, Math.ceil(displayText.length / 1800))} Estimated Pages</span>
                            </span>
                          )}
                        </div>

                        {/* Primary Actions */}
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <button
                            onClick={() => setActiveLeftTab("preview")}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-98 text-xs cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Read Extracted Pages</span>
                          </button>

                          <button
                            onClick={() => pdfInputRef.current?.click()}
                            disabled={isReindexing}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-all text-xs cursor-pointer shadow-2xs"
                            title="Re-parse PDF file to refresh text and cover"
                          >
                            <Upload className={`w-3.5 h-3.5 ${isReindexing ? "animate-spin" : ""}`} />
                            <span>{isReindexing ? "Updating Cover..." : "Refresh / Re-parse"}</span>
                          </button>
                        </div>
                      </div>

                      {/* AI Executive Summary Card */}
                      {item.aiSummary && (
                        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/50 shadow-xs">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <h4 className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                              AI Document Overview & Key Concepts
                            </h4>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                            {item.aiSummary}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Editorial Layout Page Canvas */
                    <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-slate-200/50 dark:border-slate-800/50 shadow-sm min-h-[400px]">
                      {activeLeftTab === "preview" ? (
                        <div className="text-base text-slate-700 dark:text-slate-300 leading-relaxed font-sans prose dark:prose-invert max-w-none">
                          {isMarkdown(displayText) ? (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
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
                              {sanitizeMathAndOperators(displayText)}
                            </ReactMarkdown>
                          ) : (
                            <span className="whitespace-pre-wrap leading-relaxed block">{displayText}</span>
                          )}
                        </div>
                      ) : (
                        <textarea
                          readOnly
                          value={displayText}
                          className="w-full h-[350px] bg-slate-50 dark:bg-slate-950 font-mono text-sm text-slate-700 dark:text-slate-350 p-4 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed resize-none"
                        />
                      )}
                    </div>
                  )}

                  {/* Dynamic Color Palette Swatch */}
                  <div className="bg-white/40 dark:bg-slate-900/30 backdrop-blur-md rounded-2xl p-4 border border-slate-200/40 dark:border-slate-800/40">
                    <h4 className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                      Highlight Category
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
                          <span className="font-medium text-xs text-slate-600 dark:text-slate-400">{c.label}</span>
                        </button>
                      ))}
                      {item.color && (
                        <button
                          onClick={() => onColorChange(item, "")}
                          className="ml-auto text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition-colors uppercase font-mono font-bold tracking-tight"
                        >
                          Clear Accent
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Premium Framed Image Preview (shown when not on cover tab) */}
                  {item.imageUrl && activeLeftTab !== "cover" && (
                    <div className="bg-white/40 dark:bg-slate-900/30 backdrop-blur-md rounded-2xl p-4 border border-slate-200/40 dark:border-slate-800/40">
                      <h4 className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                        Attached Media
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
                      <h4 className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                        Tags
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="flex items-center gap-1 px-3 py-1 bg-indigo-500/5 border border-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-semibold rounded-full"
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
              <div className="w-full lg:w-[45%] flex flex-col bg-slate-50/50 dark:bg-slate-950/20 overflow-visible lg:overflow-hidden min-h-[400px] lg:min-h-0">
                
                {/* AI Banner */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-wide uppercase">
                        Document Assistant
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                        Active Context • Document Notes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                      title="Select AI Reasoning Model"
                    >
                      <option value="gemini-flash">⚡ Gemini 2.5 Flash (Fast Tutor · Free)</option>
                      <option value="claude-3.5-sonnet">🎓 Claude 3.5 Sonnet (Thesis & Prose · Pro)</option>
                      <option value="deepseek-r1">📐 DeepSeek-R1 (Math Reasoner · Pro)</option>
                      <option value="gemini-pro">📚 Gemini 1.5 Pro (Deep Book Reader · Pro)</option>
                    </select>

                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="px-2 py-1 bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-500/20 transition-all shadow-2xs flex items-center gap-1"
                      title="View Student Pro & Free BYOK details"
                    >
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>Pro</span>
                    </button>
                  </div>
                </div>

                {/* Interactive AI Message Flow */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 font-sans">
                  
                  {/* Static Baseline Spark Query */}
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-500 dark:text-slate-400 text-xs font-medium">
                      You
                    </div>
                    <div className="bg-slate-100/80 dark:bg-slate-800/60 p-3 rounded-2xl rounded-tl-none text-sm text-slate-705 dark:text-slate-300 max-w-[85%]">
                      Can you analyze this research card and index its contents?
                    </div>
                  </div>

                  {/* AI Initial Summary Response */}
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 text-white shadow-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    
                    <div className="space-y-3 max-w-[85%]">
                    <div className="bg-indigo-600/5 dark:bg-indigo-950/20 border border-indigo-500/10 p-3 rounded-2xl rounded-tl-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {item.aiSummary ? (
                          <div className="space-y-2">
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 text-xs">
                              <Sparkles className="w-3 h-3" /> Synthesis Summary:
                            </span>
                            <p>{item.aiSummary}</p>
                          </div>
                        ) : (
                          <div className="text-center py-2 space-y-3">
                            <p className="text-slate-500 dark:text-slate-400 italic">No AI summary generated for this research index yet.</p>
                            <button
                              onClick={() => onGenerateSummary(item)}
                              disabled={isSummarizingItem}
                              className="mx-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-indigo-600/20 active:scale-[0.98]"
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
                          <div className="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-none text-sm max-w-[85%]">
                            {m.text}
                          </div>
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-700 dark:text-slate-200 text-xs font-medium">
                            You
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 text-white">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <div className="bg-indigo-600/5 dark:bg-indigo-950/20 border border-indigo-500/10 p-3 rounded-2xl rounded-tl-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-[85%] prose dark:prose-invert">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {sanitizeMathAndOperators(m.text)}
                            </ReactMarkdown>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {/* AI Thinking Indicator */}
                  {isAiThinking && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 text-white animate-pulse">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div className="bg-indigo-600/5 dark:bg-indigo-950/20 border border-indigo-500/10 p-3 rounded-2xl rounded-tl-none text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        <span>Analyzing document context...</span>
                      </div>
                    </div>
                  )}

                </div>

                {/* Quick-Click Preset Prompts Shelf */}
                <div className="px-6 py-2 border-t border-slate-200/30 dark:border-slate-800/30 bg-slate-50/20 dark:bg-slate-900/20">
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {[
                      { prompt: "Provide the top 3 key insights and takeaways from this document.", label: "Insights" },
                      { prompt: "Summarize the methodology or key problem-solving approach in this document.", label: "Methodology" },
                      { prompt: "Generate 3 practice questions based on this document.", label: "Practice Questions" },
                    ].map((p, i) => (
                      <button
                        key={i}
                        disabled={isAiThinking}
                        onClick={() => {
                          handleSendMessage(undefined, p.prompt);
                        }}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600 border border-slate-200/50 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 rounded-full transition-all disabled:opacity-50"
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
                      className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

          {/* Low-Credit / Upgrade to Student Pro Dialog */}
          <AnimatePresence>
            {showUpgradeModal && (
              <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative"
                >
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                    aria-label="Close dialog"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white" style={{ fontFamily: "var(--font-title)" }}>
                        Student Pro & Free Access
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Choose how you want to power your studying on ResearchMate
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Option 1: Free Forever via BYOK */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">100% Free Forever</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-2">Bring Your Own Key</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          Get a free Gemini API key from Google AI Studio and paste it in Settings. Unlimited studying, zero fees forever.
                        </p>
                      </div>
                      <a
                        href="#/app/settings"
                        onClick={() => {
                          setShowUpgradeModal(false);
                          onClose();
                        }}
                        className="w-full py-2 px-3 text-center bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-lg transition-colors block shadow-2xs"
                      >
                        Open Settings →
                      </a>
                    </div>

                    {/* Option 2: Student Pro Subscription */}
                    <div className="p-4 rounded-xl border-2 border-indigo-500/40 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:bg-slate-800/50 flex flex-col justify-between space-y-3 relative overflow-hidden">
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-bold rounded-full uppercase">
                        Recommended
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Student Pro</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-xl font-extrabold text-slate-900 dark:text-white">₱199</span>
                          <span className="text-xs text-slate-400">/mo ($4.99)</span>
                        </div>
                        <ul className="text-xs text-slate-600 dark:text-slate-300 mt-2 space-y-1">
                          <li className="flex items-center gap-1.5">✓ Claude 3.5 Sonnet unlocked</li>
                          <li className="flex items-center gap-1.5">✓ DeepSeek-R1 Math Reasoner</li>
                          <li className="flex items-center gap-1.5">✓ Gemini Pro 2M Token Context</li>
                          <li className="flex items-center gap-1.5">✓ Unlimited high-speed AI queries</li>
                        </ul>
                      </div>
                      <button
                        onClick={() => {
                          alert("Student Pro payment gateway is connecting! In the meantime, use your own free Google key in Settings.");
                        }}
                        className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                      >
                        Upgrade to Pro
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
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
