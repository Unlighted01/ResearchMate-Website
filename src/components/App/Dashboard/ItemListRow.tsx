// ============================================
// ITEM LIST ROW - Single research item in list view
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Zap, Check } from "lucide-react";
import { TrashIcon } from "../../icons";
import { StorageItem } from "../../../services/storageService";
import { getSourceIcon, getSourceColor, stripMarkdown, isMarkdown } from "./dashboardUtils";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface ItemListRowProps {
  item: StorageItem;
  isSelected: boolean;
  hasAnySelection: boolean;
  onSelect: (id: string) => void;
  onClick: (item: StorageItem) => void;
  onDelete: (id: string) => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const ItemListRow: React.FC<ItemListRowProps> = ({
  item,
  isSelected,
  hasAnySelection,
  onSelect,
  onClick,
  onDelete,
}) => {
  const colorBorderClass =
    item.color === "yellow" ? "border-l-[4px] border-l-[#FBBF24] bg-amber-50/10 dark:bg-amber-900/10" :
    item.color === "green" ? "border-l-[4px] border-l-[#34D399] bg-emerald-50/10 dark:bg-emerald-900/10" :
    item.color === "blue" ? "border-l-[4px] border-l-[#60A5FA] bg-blue-50/10 dark:bg-blue-900/10" :
    item.color === "red" ? "border-l-[4px] border-l-[#F87171] bg-red-50/10 dark:bg-red-900/10" :
    item.color === "purple" ? "border-l-[4px] border-l-[#A78BFA] bg-purple-50/10 dark:bg-purple-900/10" : "";

  const displayText = (() => {
    const t = item.aiSummary || item.text || item.ocrText || "";
    return isMarkdown(t) ? stripMarkdown(t) : t;
  })();

  return (
    <div
      onClick={() => onClick(item)}
      className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group
        ${colorBorderClass}
        ${isSelected ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}
        cursor-pointer`}
    >
      {/* Checkbox + Icon */}
      <div className="flex items-center gap-4 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item.id);
          }}
          className={`flex-shrink-0 z-10 transition-all duration-200 ${
            isSelected || hasAnySelection
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
          }`}
          aria-label={isSelected ? "Deselect item" : "Select item"}
        >
          <div
            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors dark:border-gray-600 ${
              isSelected
                ? "bg-blue-600 border-blue-600"
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-400"
            }`}
          >
            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
          </div>
        </button>

        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            backgroundColor: `${getSourceColor(item.deviceSource || "web")}15`,
          }}
        >
          <span style={{ color: getSourceColor(item.deviceSource || "web") }}>
            {getSourceIcon(item.deviceSource || "web")}
          </span>
        </div>
      </div>

      {/* Text Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 dark:text-white truncate">
          {item.sourceTitle || "Untitled Research"}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {displayText}
        </p>
      </div>

      {/* Footer / Actions */}
      <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0 mt-2 sm:mt-0">
        {item.aiSummary && (
          <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white text-[10px] font-semibold rounded-full">
            <Zap className="w-3 h-3" />
            AI
          </span>
        )}
        <span className="text-xs text-gray-400">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          aria-label="Delete item"
          className="p-2 text-gray-400 hover:text-[#FF3B30] rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <TrashIcon size={16} dangerHover />
        </button>
      </div>
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default ItemListRow;
