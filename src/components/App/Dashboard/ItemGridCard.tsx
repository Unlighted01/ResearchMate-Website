// ============================================
// ITEM GRID CARD - Single research item card
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { motion } from "motion/react";
import { Zap, Clock, Tag, Check } from "lucide-react";
import { TrashIcon } from "../../icons";
import { StorageItem } from "../../../services/storageService";
import { getSourceIcon, getSourceColor } from "./dashboardUtils";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface ItemGridCardProps {
  item: StorageItem;
  index: number;
  isSelected: boolean;
  hasAnySelection: boolean;
  onSelect: (id: string) => void;
  onClick: (item: StorageItem) => void;
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

const isMarkdown = (text: string) => /^#{1,3} |\n#{1,3} |\|.+\|/.test(text);

// ============================================
// PART 4: COMPONENT
// ============================================

const ItemGridCard: React.FC<ItemGridCardProps> = ({
  item,
  index,
  isSelected,
  hasAnySelection,
  onSelect,
  onClick,
  onDelete,
}) => {
  const colorTagClass =
    item.color === "yellow" ? "bg-amber-500" :
    item.color === "green" ? "bg-emerald-500" :
    item.color === "blue" ? "bg-blue-500" :
    item.color === "red" ? "bg-rose-500" :
    item.color === "purple" ? "bg-purple-500" : "bg-slate-400";

  const colorGlowClass =
    item.color === "yellow" ? "from-amber-500/5 to-transparent" :
    item.color === "green" ? "from-emerald-500/5 to-transparent" :
    item.color === "blue" ? "from-blue-500/5 to-transparent" :
    item.color === "red" ? "from-rose-500/5 to-transparent" :
    item.color === "purple" ? "from-purple-500/5 to-transparent" : "from-slate-500/5 to-transparent";

  const displayText = (() => {
    const t = item.aiSummary || item.text || item.ocrText || "";
    return isMarkdown(t) ? stripMarkdown(t) : t;
  })();

  const lastSpotlight = React.useRef(0);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastSpotlight.current < 60) return; // 60ms throttle
    lastSpotlight.current = now;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--pointer-x', `${x}px`);
    e.currentTarget.style.setProperty('--pointer-y', `${y}px`);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index * 0.05, 0.3),
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={{
        y: -6,
        boxShadow: "0 16px 40px -8px rgba(99, 102, 241, 0.15)",
      }}
      onClick={() => onClick(item)}
      className={`spotlight-card group relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 flex flex-col h-[240px] transition-all duration-300 hover:border-indigo-500/30 overflow-hidden
        ${isSelected ? "ring-2 ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20" : ""}
        cursor-pointer`}
    >
      {/* Accent Color Side Indicator */}
      <div className={`absolute left-0 top-12 bottom-12 w-[3px] rounded-r-md ${colorTagClass} transition-all duration-300`} />

      {/* Subtle Color Accent Background Aura */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorGlowClass} opacity-60 pointer-events-none rounded-2xl`} />

      {/* Selected Badge (Visible when card is not hovered but is selected) */}
      {isSelected && (
        <div className="absolute top-3 left-3 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border border-white dark:border-slate-900 transition-all duration-200 group-hover:scale-0 group-hover:opacity-0">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3 z-10">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-sm transition-transform duration-300 group-hover:scale-105"
          style={{
            borderLeft: `3px solid ${getSourceColor(item.deviceSource || "web")}`
          }}
        >
          <span className="text-slate-600 dark:text-slate-300">
            {getSourceIcon(item.deviceSource || "web")}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          {item.aiSummary && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold tracking-wider uppercase rounded-full shadow-sm shadow-indigo-500/20">
              <Zap className="w-2.5 h-2.5 animate-pulse" />
              AI SUM
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 z-10 flex flex-col justify-start">
        <h3
          className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1.5 line-clamp-2 leading-snug tracking-tight transition-colors group-hover:text-slate-950 dark:group-hover:text-white"
          style={{ fontFamily: "var(--font-title, 'Fraunces', Georgia, serif)" }}
        >
          {item.sourceTitle || "Untitled Research"}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed font-sans">
          {displayText}
        </p>
      </div>

      {/* Sleek Monospaced Metadata Columns */}
      <div className="grid grid-cols-2 gap-y-1 mt-auto pt-3 border-t border-slate-200/50 dark:border-slate-800/50 font-mono text-xs text-slate-500/85 dark:text-slate-400/85 tracking-wider z-10">
        <div className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400" />
          <span>DATE // {new Date(item.createdAt).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: '2-digit' })}</span>
        </div>
        <div className="flex items-center justify-end gap-1">
          <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse"></span>
          <span>SRC // {String(item.deviceSource || "web").toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-1">
          <Tag className="w-2.5 h-2.5 text-emerald-500 dark:text-emerald-400" />
          <span>TAGS // {item.tags ? String(item.tags.length).padStart(2, '0') : "00"}</span>
        </div>
        <div className="flex items-center justify-end gap-1">
          <span className="font-semibold text-slate-400 dark:text-slate-500">SIZE //</span>
          <span>{String(displayText.length).padStart(4, '0')}C</span>
        </div>
      </div>

      {/* Premium Hover Action Sheet Bar (Slides up on Hover) */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-white/95 via-white/90 to-white/70 dark:from-slate-950/95 dark:via-slate-900/90 dark:to-slate-900/70 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between transition-all duration-300 translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item.id);
          }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200 ${
            isSelected
              ? "bg-indigo-500 border-indigo-500 text-white shadow-sm shadow-indigo-500/20"
              : "bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
            isSelected ? "bg-white border-white text-indigo-500" : "bg-white dark:bg-gray-800 border-slate-300"
          }`}>
            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
          </div>
          <span>{isSelected ? "Selected" : "Select"}</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(displayText);
              const btn = e.currentTarget;
              const originalContent = btn.innerHTML;
              btn.innerHTML = '<span>Copied!</span>';
              btn.classList.add('bg-emerald-500', 'text-white', 'border-emerald-500');
              setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.classList.remove('bg-emerald-500', 'text-white', 'border-emerald-500');
              }, 1500);
            }}
            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-medium transition-all"
            title="Copy content"
          >
            Copy
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(item);
            }}
            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-all shadow-sm shadow-indigo-600/20"
          >
            Open
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-500/20 rounded-lg transition-all"
            title="Delete research item"
          >
            <TrashIcon size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// PART 5: EXPORTS
// ============================================

export default ItemGridCard;
