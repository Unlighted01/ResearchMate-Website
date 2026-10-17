// ============================================
// ITEM LIST ROW - Academic Workstation List Row
// ============================================

import React from "react";
import { Sparkles, Check, Tag } from "lucide-react";
import { TrashIcon } from "../../icons";
import { StorageItem } from "../../../services/storageService";
import { getSourceIcon, getSourceColor, stripMarkdown, isMarkdown } from "./dashboardUtils";

interface ItemListRowProps {
  item: StorageItem;
  isSelected: boolean;
  hasAnySelection: boolean;
  onSelect: (id: string) => void;
  onClick: (item: StorageItem) => void;
  onDelete: (id: string) => void;
}

const ItemListRow: React.FC<ItemListRowProps> = ({
  item,
  isSelected,
  hasAnySelection,
  onSelect,
  onClick,
  onDelete,
}) => {
  const displayText = (() => {
    const t = item.aiSummary || item.text || item.ocrText || "";
    return isMarkdown(t) ? stripMarkdown(t) : t;
  })();

  const colorTagBorder =
    item.color === "yellow" ? "border-l-amber-500" :
    item.color === "green" ? "border-l-emerald-500" :
    item.color === "blue" ? "border-l-blue-500" :
    item.color === "red" ? "border-l-rose-500" :
    item.color === "purple" ? "border-l-purple-500" : "border-l-transparent";

  return (
    <div
      onClick={() => onClick(item)}
      className={`flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-850/60 border-b border-slate-200/80 dark:border-slate-800 transition-colors group cursor-pointer border-l-3 ${colorTagBorder} ${
        isSelected ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""
      }`}
    >
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
        aria-label={isSelected ? "Deselect item" : "Select item"}
      >
        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
      </button>

      {/* Source Icon */}
      <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-400">
        {getSourceIcon(item.deviceSource || "web")}
      </div>

      {/* Text Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate font-title group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {item.sourceTitle || "Untitled Document"}
          </h3>
          {item.aiSummary && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 shrink-0">
              <Sparkles className="w-2.5 h-2.5" />
              Synthesized
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-sans">
          {displayText}
        </p>
      </div>

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="hidden md:flex items-center gap-1 shrink-0">
          <span className="text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            {item.tags.length} {item.tags.length === 1 ? "tag" : "tags"}
          </span>
        </div>
      )}

      {/* Date & Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs font-mono text-slate-400">
          {new Date(item.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          aria-label="Delete item"
          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-rose-50 dark:hover:bg-rose-950/30"
        >
          <TrashIcon size={14} dangerHover />
        </button>
      </div>
    </div>
  );
};

export default ItemListRow;
