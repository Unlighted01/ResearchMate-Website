// ============================================
// FLOATING SELECTION TOOLBAR
// Tactile, glassmorphic action bar anchored to text selections in PDF Reader
// Anti-slop: crisp typography, restrained motion, zero neon purple gradient slop
// ============================================

import React, { useState } from "react";
import {
  Quote,
  FilePlus2,
  Sparkles,
  Copy,
  Check,
  Highlighter,
  ChevronRight,
} from "lucide-react";

export type HighlightColor = "yellow" | "green" | "sky" | "pink";

export interface SelectionCoordinates {
  top: number;
  left: number;
  text: string;
  pageNumber: number;
}

interface FloatingSelectionToolbarProps {
  coords: SelectionCoordinates | null;
  onCite: (text: string, pageNumber: number) => void;
  onClipToNotes: (text: string, pageNumber: number) => void;
  onHighlight: (text: string, pageNumber: number, color: HighlightColor) => void;
  onExplainAi: (text: string, pageNumber: number) => void;
  onClose: () => void;
}

export const FloatingSelectionToolbar: React.FC<FloatingSelectionToolbarProps> = ({
  coords,
  onCite,
  onClipToNotes,
  onHighlight,
  onExplainAi,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!coords || !coords.text.trim()) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(coords.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
    }
  };

  const colors: Array<{ color: HighlightColor; bg: string; border: string }> = [
    { color: "yellow", bg: "bg-amber-300 dark:bg-amber-400", border: "border-amber-400" },
    { color: "green", bg: "bg-emerald-300 dark:bg-emerald-400", border: "border-emerald-400" },
    { color: "sky", bg: "bg-sky-300 dark:bg-sky-400", border: "border-sky-400" },
    { color: "pink", bg: "bg-rose-300 dark:bg-rose-400", border: "border-rose-400" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        top: `${Math.max(12, coords.top - 54)}px`,
        left: `${Math.max(16, coords.left)}px`,
        zIndex: 50,
      }}
      className="animate-in fade-in zoom-in-95 duration-150 select-none pointer-events-auto"
    >
      <div className="flex items-center gap-1 p-1 bg-white/95 dark:bg-[#161720]/95 backdrop-blur-md rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-900/10 dark:shadow-black/40 text-slate-700 dark:text-slate-200 text-xs font-medium">
        {/* 1. Cite Selection */}
        <button
          onClick={() => {
            onCite(coords.text, coords.pageNumber);
            onClose();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
          title="Create formatted citation for this quote"
        >
          <Quote className="w-3.5 h-3.5 text-indigo-500" />
          <span>Cite</span>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">p.{coords.pageNumber}</span>
        </button>

        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800" />

        {/* 2. Clip to Notes */}
        <button
          onClick={() => {
            onClipToNotes(coords.text, coords.pageNumber);
            onClose();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors"
          title="Insert quote directly into Studio Notes"
        >
          <FilePlus2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Clip</span>
        </button>

        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800" />

        {/* 3. Highlighter with Color Menu */}
        {!showColorPicker ? (
          <button
            onClick={() => setShowColorPicker(true)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
            title="Highlight selection"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-500" />
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </button>
        ) : (
          <div className="flex items-center gap-1 px-1">
            {colors.map((c) => (
              <button
                key={c.color}
                onClick={() => {
                  onHighlight(coords.text, coords.pageNumber, c.color);
                  setShowColorPicker(false);
                  onClose();
                }}
                className={`w-4 h-4 rounded-full ${c.bg} border ${c.border} hover:scale-110 transition-transform`}
                title={`Highlight in ${c.color}`}
              />
            ))}
          </div>
        )}

        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800" />

        {/* 4. Explain AI */}
        <button
          onClick={() => {
            onExplainAi(coords.text, coords.pageNumber);
            onClose();
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium transition-colors"
          title="Ask AI to break down this passage"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Explain</span>
        </button>

        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800" />

        {/* 5. Copy Text */}
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
