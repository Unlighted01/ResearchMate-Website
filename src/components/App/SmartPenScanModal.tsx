// ============================================
// SMART PEN SCAN MODAL
// Exclusive detail view for Smart Pen scans.
// No URL, no web citation, no "Open Source".
// Citation = book search for physical scans.
// ============================================

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  PenTool,
  FileText,
  Zap,
  BookOpen,
  StickyNote,
  Trash2,
  Copy,
  Check,
  Loader2,
  ZoomIn,
  RotateCcw,
  Calendar,
  Maximize2,
  Pencil,
  Save,
} from "lucide-react";
import { StorageItem, updateItem } from "../../services/storageService";
import { LibrarySearch, BookDocument } from "./LibrarySearch";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ----------------------------------------
// Props
// ----------------------------------------
interface SmartPenScanModalProps {
  scan: StorageItem | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<StorageItem>) => void;
  onDelete: (id: string) => void;
  onGenerateSummary: (scan: StorageItem) => Promise<void>;
  onRunOCR: (scan: StorageItem) => Promise<void>;
  isSummarizing?: boolean;
  isRunningOCR?: boolean;
}

// ----------------------------------------
// Component
// ----------------------------------------
const SmartPenScanModal: React.FC<SmartPenScanModalProps> = ({
  scan,
  onClose,
  onUpdate,
  onDelete,
  onGenerateSummary,
  onRunOCR,
  isSummarizing = false,
  isRunningOCR = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isLinkingBook, setIsLinkingBook] = useState(false);
  const [noteValue, setNoteValue] = useState(scan?.note || "");
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // OCR edit state (T-1)
  const [isEditingOCR, setIsEditingOCR] = useState(false);
  const [editedOCRText, setEditedOCRText] = useState("");
  const [isSavingOCR, setIsSavingOCR] = useState(false);
  const [showCitationRegen, setShowCitationRegen] = useState(false);

  // Sync note + reset OCR edit when scan changes
  useEffect(() => {
    setNoteValue(scan?.note || "");
    setIsLinkingBook(false);
    setIsEditingOCR(false);
    setShowCitationRegen(false);
  }, [scan?.id]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (scan) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [scan]);

  if (!scan) return null;

  // ----------------------------------------
  // Handlers
  // ----------------------------------------
  const handleCopyOCR = async () => {
    const text = scan.ocrText || scan.text || "";
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNoteSave = async () => {
    if (noteValue === (scan.note || "")) return;
    await updateItem(scan.id, { note: noteValue });
    onUpdate(scan.id, { note: noteValue });
  };

  const handleSaveOCR = async () => {
    if (editedOCRText === ocrText) {
      setIsEditingOCR(false);
      return;
    }
    setIsSavingOCR(true);
    try {
      // Encode ocrEdited flag as "ocr:edited" tag (same pattern as color:*)
      const cleanTags = (scan.tags || []).filter((t) => t !== "ocr:edited");
      const newTags = [...cleanTags, "ocr:edited"];
      await updateItem(scan.id, { text: editedOCRText, ocrText: editedOCRText, tags: newTags });
      onUpdate(scan.id, { text: editedOCRText, ocrText: editedOCRText, tags: newTags });
      setIsEditingOCR(false);
      // T-3: prompt to re-link citation if one exists
      if (scan.citation) setShowCitationRegen(true);
    } finally {
      setIsSavingOCR(false);
    }
  };

  const handleLinkBook = async (book: BookDocument) => {
    const title = book.title;
    const author = book.author_name?.join(", ") || "Unknown Author";
    const year = book.first_publish_year ? String(book.first_publish_year) : "n.d.";
    const publisher = book.publisher?.[0] || "Unknown Publisher";
    const citation = `${author}. (${year}). ${title}. ${publisher}.`;

    const updates: Partial<StorageItem> = {
      sourceTitle: title,
      sourceUrl: `https://books.google.com/books?id=${book.key}`,
      citation,
    };
    await updateItem(scan.id, updates);
    onUpdate(scan.id, updates);
    setIsLinkingBook(false);
  };

  const formatDate = (date: string | Date) =>
    new Date(date).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const ocrText = scan.ocrText || scan.text || "";

  // ----------------------------------------
  // Render
  // ----------------------------------------
  return (
    <>
      {createPortal(
        <AnimatePresence>
          {scan && (
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
                    <span className="p-2 bg-[#FF9500]/10 text-[#FF9500] rounded-lg">
                      <PenTool className="w-5 h-5" />
                    </span>
                    <div>
                      <h2 
                        className="text-lg font-bold text-slate-800 dark:text-slate-100 max-w-[500px] truncate leading-tight"
                        style={{ fontFamily: "var(--font-title, 'Fraunces', Georgia, serif)" }}
                      >
                        {scan.sourceTitle || "Untitled Scan"}
                      </h2>
                      <div className="flex items-center gap-2 mt-0.5 text-sm text-slate-400 font-mono">
                        <span>{formatDate(scan.createdAt)}</span>
                        <span>•</span>
                        <span className="uppercase tracking-wider text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 font-bold">
                          Smart Pen
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={onClose}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                      aria-label="Close workspace"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Split Screen Double-Pane Workspace */}
                <div className="flex-1 flex overflow-hidden">
                  
                  {/* LEFT PANE: Premium Scanned Image Sheet (50% width) */}
                  <div className="w-[50%] border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col bg-slate-50/20 dark:bg-slate-950/10 overflow-y-auto p-6 space-y-4">
                    {scan.imageUrl ? (
                      <div className="relative group">
                        <div
                          className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-zoom-in"
                          onClick={() => setIsLightboxOpen(true)}
                        >
                          <img
                            src={scan.imageUrl}
                            alt="Scan"
                            className="w-full object-contain max-h-[380px]"
                          />
                        </div>
                        {/* Zoom hint overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                          <div className="bg-white/90 dark:bg-gray-900/90 rounded-full p-2">
                            <Maximize2 className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 aspect-[3/4] flex flex-col items-center justify-center gap-3 text-gray-400">
                        <FileText className="w-12 h-12 opacity-30" />
                        <p className="text-sm">No image available</p>
                      </div>
                    )}

                    {/* Re-run OCR button */}
                    {scan.imageUrl && (
                      <button
                        onClick={() => onRunOCR(scan)}
                        disabled={isRunningOCR}
                        className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-[#FF9500]/10 hover:bg-[#FF9500]/20 text-[#FF9500] rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {isRunningOCR ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Running OCR...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4" />
                            {ocrText ? "Re-run OCR" : "Extract Text (OCR)"}
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* RIGHT PANE: OCR & Citation Workspace (50% width) */}
                  <div className="w-[50%] flex flex-col bg-slate-50/50 dark:bg-slate-950/30 overflow-y-auto p-6 space-y-5">
                    {/* -- OCR TEXT -- */}
                    <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="w-4 h-4 text-[#FF9500]" />
                          <h4 className="font-semibold text-sm text-slate-850 dark:text-slate-200">
                            OCR Text
                          </h4>
                          {/* Confidence badge */}
                          {scan.ocrConfidence !== undefined && (
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                scan.ocrConfidence >= 80
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                  : scan.ocrConfidence >= 60
                                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              }`}
                            >
                              {scan.ocrConfidence}% confidence
                            </span>
                          )}
                          {/* Edited badge */}
                          {scan.tags?.includes("ocr:edited") && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                              Edited
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {ocrText && !isEditingOCR && (
                            <>
                              <button
                                onClick={() => {
                                  setEditedOCRText(ocrText);
                                  setIsEditingOCR(true);
                                }}
                                aria-label="Edit OCR text"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-[#FF9500]/50 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit
                              </button>
                              <button
                                onClick={handleCopyOCR}
                                aria-label="Copy OCR text"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-[#FF9500]/50 transition-colors"
                              >
                                {copied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-green-500" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {isEditingOCR ? (
                        <div className="space-y-2">
                          <textarea
                            value={editedOCRText}
                            onChange={(e) => setEditedOCRText(e.target.value)}
                            rows={6}
                            className="w-full text-sm bg-white dark:bg-gray-800 border border-[#FF9500]/40 rounded-lg p-3 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF9500]/30 resize-none font-mono"
                            autoFocus
                          />
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => setIsEditingOCR(false)}
                              className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveOCR}
                              disabled={isSavingOCR}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF9500] hover:bg-[#E68600] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              {isSavingOCR ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                              Save
                            </button>
                          </div>
                        </div>
                      ) : ocrText ? (
                        <div className="text-base text-gray-700 dark:text-gray-300 leading-relaxed max-h-[120px] overflow-y-auto">
                          {/^#{1,3} |\n#{1,3} |\|.+\|/.test(ocrText) ? (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1: ({ children }) => <h1 className="text-sm font-bold text-gray-900 dark:text-white mt-2 mb-0.5">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-xs font-bold text-blue-900 dark:text-blue-300 mt-1.5 mb-0.5">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">{children}</h3>,
                                p: ({ children }) => <p className="mb-1 leading-relaxed">{children}</p>,
                                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                em: ({ children }) => <em className="italic text-gray-500">{children}</em>,
                                ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-1">{children}</ul>,
                                table: ({ children }) => <div className="overflow-x-auto my-1"><table className="w-full text-xs border-collapse">{children}</table></div>,
                                thead: ({ children }) => <thead className="bg-blue-50 dark:bg-blue-900/30">{children}</thead>,
                                th: ({ children }) => <th className="border border-gray-200 dark:border-gray-700 px-1.5 py-1 font-semibold text-left">{children}</th>,
                                td: ({ children }) => <td className="border border-gray-200 dark:border-gray-700 px-1.5 py-1 align-top">{children}</td>,
                              }}
                            >
                              {ocrText}
                            </ReactMarkdown>
                          ) : (
                            <span className="whitespace-pre-wrap font-mono">{ocrText}</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic text-center py-4">
                          No text extracted yet. Use "Extract Text" on the left.
                        </p>
                      )}
                      {/* Citation regen prompt after OCR edit */}
                      {showCitationRegen && (
                        <div className="mt-3 flex items-center gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <span className="text-xs text-blue-700 dark:text-blue-300 flex-1">
                            Text updated — re-link the book citation to reflect the corrected content.
                          </span>
                          <button
                            onClick={() => {
                              setIsLinkingBook(true);
                              setShowCitationRegen(false);
                            }}
                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                          >
                            Re-link →
                          </button>
                          <button
                            onClick={() => setShowCitationRegen(false)}
                            aria-label="Dismiss"
                            className="text-blue-400 hover:text-blue-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* -- AI SUMMARY -- */}
                    <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-200/50 dark:border-slate-800/50 shadow-sm bg-gradient-to-br from-indigo-500/5 to-purple-600/5">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-indigo-500" />
                        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                          AI Summary
                        </h4>
                      </div>
                      {scan.aiSummary ? (
                        <div>
                          <p className="text-base text-slate-700 dark:text-slate-350 leading-relaxed">
                            {scan.aiSummary}
                          </p>
                          <button
                            onClick={() => onGenerateSummary(scan)}
                            disabled={isSummarizing || !ocrText}
                            className="mt-3 flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:opacity-40 transition-colors"
                          >
                            {isSummarizing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            Regenerate
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-sm text-slate-500 mb-3">
                            {ocrText
                              ? "Generate a quick AI summary of this scan."
                              : "Extract text first to enable AI summary."}
                          </p>
                          <button
                            onClick={() => onGenerateSummary(scan)}
                            disabled={isSummarizing || !ocrText}
                            className="flex items-center justify-center gap-2 w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg transition-all hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-40"
                          >
                            {isSummarizing ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4" />
                                Generate AI Summary
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* -- BOOK CITATION -- */}
                    <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="w-4 h-4 text-indigo-500" />
                        <h4 className="font-semibold text-sm text-slate-850 dark:text-slate-200">
                          Book Citation
                        </h4>
                      </div>
                      {scan.citation ? (
                        <div>
                          <p className="text-sm font-semibold text-slate-400 mb-1">
                            Saved Citation (APA)
                          </p>
                          <p className="text-base text-slate-750 dark:text-slate-350 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-slate-800/50 rounded-lg p-3">
                            {scan.citation}
                          </p>
                          <button
                            onClick={() => setIsLinkingBook(true)}
                            className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium"
                          >
                            Change book
                          </button>
                        </div>
                      ) : isLinkingBook ? (
                        <div className="border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden">
                          <LibrarySearch
                            showToast={() => {}}
                            onSelectBook={handleLinkBook}
                          />
                          <div className="p-3 border-t border-slate-200 dark:border-slate-850 flex justify-end">
                            <button
                              onClick={() => setIsLinkingBook(false)}
                              className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-3">
                          <p className="text-sm text-slate-500 mb-3">
                            Is this scan from a physical book? Search it to generate a citation.
                          </p>
                          <button
                            onClick={() => setIsLinkingBook(true)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                          >
                            Search Book to Cite
                          </button>
                        </div>
                      )}
                    </div>

                    {/* -- NOTES -- */}
                    <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <StickyNote className="w-4 h-4 text-slate-400" />
                        <h4 className="font-semibold text-sm text-slate-850 dark:text-slate-200">
                          Notes
                        </h4>
                      </div>
                      <textarea
                        ref={noteRef}
                        value={noteValue}
                        onChange={(e) => setNoteValue(e.target.value)}
                        onBlur={handleNoteSave}
                        placeholder="Add a personal note about this scan..."
                        rows={3}
                        className="w-full text-base bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-3 text-slate-700 dark:text-slate-350 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none transition-all"
                      />
                      <p className="text-xs text-slate-400 mt-1.5 font-mono">Auto-saves when you click away</p>
                    </div>

                    {/* -- FOOTER / DELETE -- */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200/30 dark:border-slate-800/30">
                      <span className="text-xs text-slate-450">
                        Captured {formatDate(scan.createdAt)}
                      </span>
                      <button
                        onClick={() => onDelete(scan.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-450 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Scan
                      </button>
                    </div>

                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ===== LIGHTBOX (separate portal so it renders above the modal) ===== */}
      {isLightboxOpen && scan.imageUrl && createPortal(
        <div
          className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Close lightbox"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={scan.imageUrl}
            alt="Scan fullscreen"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </>
  );
};

export default SmartPenScanModal;
