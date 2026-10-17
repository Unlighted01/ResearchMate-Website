// ============================================
// ITEM GRID CARD - Academic Workstation Research Card
// ============================================

import React from "react";
import { motion } from "motion/react";
import { Check, Copy, ExternalLink, Sparkles, Tag, Calendar } from "lucide-react";
import { TrashIcon } from "../../icons";
import { StorageItem } from "../../../services/storageService";
import { getSourceIcon, getSourceColor, stripMarkdown, isMarkdown } from "./dashboardUtils";

interface ItemGridCardProps {
  item: StorageItem;
  index: number;
  isSelected: boolean;
  hasAnySelection: boolean;
  onSelect: (id: string) => void;
  onClick: (item: StorageItem) => void;
  onDelete: (id: string) => void;
}

const ItemGridCard: React.FC<ItemGridCardProps> = ({
  item,
  index,
  isSelected,
  hasAnySelection,
  onSelect,
  onClick,
  onDelete,
}) => {
  const [copied, setCopied] = React.useState(false);

  const displayText = (() => {
    const t = item.aiSummary || item.text || item.ocrText || "";
    return isMarkdown(t) ? stripMarkdown(t) : t;
  })();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const colorTagBorder =
    item.color === "yellow" ? "border-l-amber-500" :
    item.color === "green" ? "border-l-emerald-500" :
    item.color === "blue" ? "border-l-blue-500" :
    item.color === "red" ? "border-l-rose-500" :
    item.color === "purple" ? "border-l-purple-500" : "border-l-slate-300 dark:border-l-slate-700";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        delay: Math.min(index * 0.03, 0.2),
        ease: "easeOut",
      }}
      onClick={() => onClick(item)}
      className={`group relative theme-surface p-5 flex flex-col h-[230px] transition-all cursor-pointer border-l-4 ${colorTagBorder} ${
        isSelected
          ? "border-primary-500 ring-2 ring-primary-500/40 bg-primary-50/20 dark:bg-primary-950/20"
          : "border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-sm"
      }`}
    >
      {/* Top Header Row: Source Badge + Actions */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {/* Checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item.id);
            }}
            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
              isSelected
                ? "bg-indigo-600 border-indigo-600 text-white"
                : hasAnySelection
                ? "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-0 group-hover:opacity-100"
            }`}
            title={isSelected ? "Deselect" : "Select"}
            aria-label="Select item"
          >
            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
          </button>

          {/* Source indicator */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-xs font-mono">
            <span className="w-3.5 h-3.5 flex items-center justify-center">
              {getSourceIcon(item.deviceSource || "web")}
            </span>
            <span className="capitalize">{item.deviceSource || "source"}</span>
          </div>

          {/* AI Summary Badge */}
          {item.aiSummary && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 shrink-0">
              <Sparkles className="w-2.5 h-2.5" />
              Synthesized
            </span>
          )}
        </div>

        {/* Quick Action Buttons (always visible on mobile touch, hover on desktop) */}
        <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Copy excerpt"
            aria-label="Copy excerpt"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            title="Delete item"
            aria-label="Delete item"
          >
            <TrashIcon size={13} />
          </button>
        </div>
      </div>

      {/* Main Title & Excerpt */}
      <div className="flex-1 min-h-0 flex flex-col">
        <h3
          className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-title"
        >
          {item.sourceTitle || "Untitled Document"}
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed font-sans">
          {displayText || "No preview text available."}
        </p>
      </div>

      {/* Clean Academic Metadata Footer */}
      <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-slate-400" />
          {new Date(item.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <div className="flex items-center gap-2">
          {item.tags && item.tags.length > 0 && (
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Tag className="w-2.5 h-2.5 text-slate-400" />
              {item.tags.length} {item.tags.length === 1 ? "tag" : "tags"}
            </span>
          )}
          <span className="text-slate-400">
            {displayText.length}c
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default ItemGridCard;
