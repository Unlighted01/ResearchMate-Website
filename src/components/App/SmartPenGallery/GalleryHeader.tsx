// ============================================
// GALLERY HEADER - STEM Math OCR & Pen Ingestion
// ============================================

import React from "react";
import { Calculator, Plus, RefreshCw, PenTool, Sparkles } from "lucide-react";

interface GalleryHeaderProps {
  scanCount: number;
  onPairPen: () => void;
  onRefresh: () => void;
}

const GalleryHeader: React.FC<GalleryHeaderProps> = ({
  scanCount,
  onPairPen,
  onRefresh,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-title tracking-tight flex items-center gap-2">
            <Calculator className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            STEM Math OCR & Pen Ingest
          </h1>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400">
            LaTeX • SymPy
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
          Digitize handwritten equations, physical textbook formulas, and smart pen strokes into live LaTeX & computational code.
        </p>
      </div>

      {/* Actions & Stats */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPairPen}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-850 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors shadow-xs"
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Connect Pen / Hardware</span>
        </button>

        <button
          onClick={onRefresh}
          className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-lg transition-colors"
          title="Refresh Ingested Scans"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <div className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-lg">
          <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300">
            {scanCount} {scanCount === 1 ? "formula" : "formulas"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GalleryHeader;
