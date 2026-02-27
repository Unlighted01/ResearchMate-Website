// ============================================
// SMART PEN SCAN MODAL
// Exclusive detail view for Smart Pen scans.
// No URL, no web citation, no "Open Source".
// Citation = book search for physical scans.
// ============================================

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { StorageItem, updateItem } from "../../services/storageService";
import { LibrarySearch, OpenLibraryDoc } from "./LibrarySearch";

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

  // Sync note when scan changes
  useEffect(() => {
    setNoteValue(scan?.note || "");
    setIsLinkingBook(false);
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

  const handleLinkBook = async (book: OpenLibraryDoc) => {
    const title = book.title;
    const author = book.author_name?.join(", ") || "Unknown Author";
    const year = book.first_publish_year ? String(book.first_publish_year) : "n.d.";
    const publisher = book.publisher?.[0] || "Unknown Publisher";
    const citation = `${author}. (${year}). ${title}. ${publisher}.`;

    const updates: Partial<StorageItem> = {
      sourceTitle: title,
      sourceUrl: `https://openlibrary.org${book.key}`,
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
      {/* ===== BACKDROP ===== */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />

      {/* ===== MODAL PANEL ===== */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-4xl h-[90vh] bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ---- HEADER ---- */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-gradient-to-br from-[#FF9500] to-[#FF6B00] rounded-xl flex items-center justify-center flex-shrink-0">
                <PenTool className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-gray-900 dark:text-white truncate text-base">
                  {scan.sourceTitle || "Untitled Scan"}
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(scan.createdAt)}</span>
                  <span className="px-1.5 py-0.5 bg-[#FF9500]/10 text-[#FF9500] rounded-full font-medium">
                    Smart Pen
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ---- BODY ---- */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 h-full lg:divide-x divide-gray-100 dark:divide-gray-800">

              {/* ==== LEFT: IMAGE ==== */}
              <div className="p-6 flex flex-col gap-4 overflow-y-auto">
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

              {/* ==== RIGHT: DETAILS ==== */}
              <div className="p-6 flex flex-col gap-5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">

                {/* -- OCR TEXT -- */}
                <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#FF9500]" />
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                        OCR Text
                      </h4>
                    </div>
                    {ocrText && (
                      <button
                        onClick={handleCopyOCR}
                        aria-label="Copy OCR text"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-[#FF9500]/50 transition-colors"
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
                    )}
                  </div>
                  {ocrText ? (
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap max-h-[120px] overflow-y-auto font-mono">
                      {ocrText}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic text-center py-4">
                      No text extracted yet. Use "Extract Text" on the left.
                    </p>
                  )}
                </div>

                {/* -- AI SUMMARY -- */}
                <div className="bg-gradient-to-br from-[#007AFF]/10 via-[#5856D6]/10 to-[#AF52DE]/10 rounded-xl p-4 border border-[#007AFF]/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-[#007AFF]" />
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                      AI Summary
                    </h4>
                  </div>
                  {scan.aiSummary ? (
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {scan.aiSummary}
                      </p>
                      <button
                        onClick={() => onGenerateSummary(scan)}
                        disabled={isSummarizing || !ocrText}
                        className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#007AFF] hover:text-[#0066DD] disabled:opacity-40 transition-colors"
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
                      <p className="text-sm text-gray-500 mb-3">
                        {ocrText
                          ? "Generate a quick AI summary of this scan."
                          : "Extract text first to enable AI summary."}
                      </p>
                      <button
                        onClick={() => onGenerateSummary(scan)}
                        disabled={isSummarizing || !ocrText}
                        className="flex items-center justify-center gap-2 w-full py-2 bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white text-sm font-medium rounded-lg transition-all hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-40"
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
                <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-primary-600" />
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                      Book Citation
                    </h4>
                  </div>
                  {scan.citation ? (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">
                        Saved Citation (APA)
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg p-3">
                        {scan.citation}
                      </p>
                      <button
                        onClick={() => setIsLinkingBook(true)}
                        className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Change book
                      </button>
                    </div>
                  ) : isLinkingBook ? (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
                      <LibrarySearch
                        showToast={() => {}}
                        onSelectBook={handleLinkBook}
                      />
                      <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <button
                          onClick={() => setIsLinkingBook(false)}
                          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-sm text-gray-500 mb-3">
                        Is this scan from a physical book? Search it to generate a citation.
                      </p>
                      <button
                        onClick={() => setIsLinkingBook(true)}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Search Book to Cite
                      </button>
                    </div>
                  )}
                </div>

                {/* -- NOTES -- */}
                <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <StickyNote className="w-4 h-4 text-gray-400" />
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
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
                    className="w-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF9500]/30 resize-none transition-all"
                  />
                  <p className="text-xs text-gray-400 mt-1">Auto-saves when you click away</p>
                </div>

                {/* -- FOOTER / DELETE -- */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs text-gray-400">
                    Captured {formatDate(scan.createdAt)}
                  </span>
                  <button
                    onClick={() => onDelete(scan.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== LIGHTBOX ===== */}
      {isLightboxOpen && scan.imageUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
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
        </div>
      )}
    </>
  );
};

export default SmartPenScanModal;
