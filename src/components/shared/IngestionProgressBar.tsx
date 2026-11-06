// ============================================
// INGESTION PROGRESS BAR
// Linear/NotebookLM-grade floating progress widget
// Shows live page-by-page and multi-file batch extraction
// ============================================

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  FileCode,
  Image as ImageIcon,
  Clock,
} from "lucide-react";
import { useIngestion, IngestionFileItem } from "../../context/IngestionContext";

const getFileIcon = (fileName: string) => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return <FileText className="w-3.5 h-3.5 text-rose-500" />;
  if (lower.endsWith(".docx")) return <FileText className="w-3.5 h-3.5 text-blue-500" />;
  if (lower.endsWith(".txt") || lower.endsWith(".md")) return <FileCode className="w-3.5 h-3.5 text-emerald-500" />;
  return <ImageIcon className="w-3.5 h-3.5 text-purple-500" />;
};

export const IngestionProgressBar: React.FC = () => {
  const { batch, toggleMinimize, dismiss } = useIngestion();

  if (!batch.isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[420px] max-w-[420px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden font-sans select-none"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5 min-w-0">
            {batch.isCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
            )}
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {batch.isCompleted
                  ? batch.hasErrors
                    ? "Ingestion Finished with Issues"
                    : "Ingestion Complete"
                  : `Ingesting Materials (${batch.completedCount}/${batch.totalFiles})`}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
              {batch.overallPercent}%
            </span>
            <button
              onClick={toggleMinimize}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={batch.isMinimized ? "Expand details" : "Collapse"}
              aria-label="Toggle details"
            >
              {batch.isMinimized ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={dismiss}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Close"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Master Progress Bar */}
        <div className="px-4 pt-3 pb-2.5">
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                batch.isCompleted
                  ? "bg-emerald-500"
                  : "bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"
              }`}
              style={{ width: `${Math.max(4, batch.overallPercent)}%` }}
            />
          </div>

          {/* Subtitle / Active Status */}
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400 gap-2">
            <span className="truncate font-mono text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              {batch.currentFileName || "Processing..."}
            </span>
            <span className="shrink-0 text-[11px]">
              {batch.statusMessage}
            </span>
          </div>
        </div>

        {/* Expandable Multi-File Breakdown */}
        {!batch.isMinimized && batch.files.length > 0 && (
          <div className="px-4 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800/60 max-h-48 overflow-y-auto space-y-2">
            {batch.files.map((file: IngestionFileItem, idx: number) => {
              const isCurrent = idx === batch.currentFileIndex && !batch.isCompleted;
              return (
                <div
                  key={file.id}
                  className={`p-2 rounded-xl text-xs flex flex-col gap-1 transition-all ${
                    isCurrent
                      ? "bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60"
                      : "bg-slate-50/60 dark:bg-slate-800/30 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {getFileIcon(file.name)}
                      <span className="truncate font-medium text-slate-800 dark:text-slate-200 text-[11px]">
                        {file.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {file.status === "completed" && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Done
                        </span>
                      )}
                      {file.status === "error" && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-rose-500 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Failed
                        </span>
                      )}
                      {file.status === "queued" && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="w-3 h-3" /> Queued
                        </span>
                      )}
                      {(file.status === "extracting" ||
                        file.status === "ocr" ||
                        file.status === "summarizing" ||
                        file.status === "saving") && (
                        <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                          {file.percent}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Individual Mini Progress Bar for active file */}
                  {isCurrent && (
                    <div className="space-y-1 mt-0.5">
                      <div className="w-full bg-indigo-200/60 dark:bg-indigo-900/60 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 dark:bg-indigo-400 h-full rounded-full transition-all duration-200"
                          style={{ width: `${file.percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                        <span>{file.statusMessage}</span>
                        {file.totalPages ? (
                          <span>
                            p. {file.currentPage || 1}/{file.totalPages}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {file.status === "error" && file.errorMessage && (
                    <p className="text-[10px] text-rose-500 truncate">
                      {file.errorMessage}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
