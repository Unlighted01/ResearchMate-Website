// ============================================
// ResearchItemRow.tsx - List row for a single research item
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Zap, Check } from "lucide-react";
import { TrashIcon } from "../../icons";
import { StorageItem } from "../../../services/storageService";
import {
  getHighlightColorClasses,
  getSourceColor,
} from "../../../constants/colors";
import { getSourceIcon } from "../../../constants/sources";
import { isMarkdown, stripMarkdown } from "./helpers";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface ResearchItemRowProps {
  item: StorageItem;
  selectedItems: Set<string>;
  toggleItemSelection: (id: string) => void;
  setSelectedSmartPenScan: (item: StorageItem | null) => void;
  setSelectedItem: (item: StorageItem) => void;
  setIsModalOpen: (open: boolean) => void;
  handleDeleteItem: (id: string) => void;
}

// ============================================
// PART 3: MAIN COMPONENT
// ============================================

const ResearchItemRow: React.FC<ResearchItemRowProps> = ({
  item,
  selectedItems,
  toggleItemSelection,
  setSelectedSmartPenScan,
  setSelectedItem,
  setIsModalOpen,
  handleDeleteItem,
}) => {
  const previewText = (() => {
    const t = item.aiSummary || item.text || item.ocrText || "";
    return isMarkdown(t) ? stripMarkdown(t) : t;
  })();

  return (
    <div
      onClick={() => {
        if (item.deviceSource === "smart_pen") {
          setSelectedSmartPenScan(item);
        } else {
          setSelectedItem(item);
          setIsModalOpen(true);
        }
      }}
      className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group
        ${getHighlightColorClasses(item.color)}
        ${
          selectedItems.has(item.id)
            ? "bg-blue-50/50 dark:bg-blue-900/10"
            : ""
        } cursor-pointer`}
    >
      {/* Leftmost Checkbox + Icon Container */}
      <div className="flex items-center gap-4 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleItemSelection(item.id);
          }}
          className={`flex-shrink-0 z-10 transition-all duration-200 ${
            selectedItems.has(item.id) || selectedItems.size > 0
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
          }`}
          aria-label={
            selectedItems.has(item.id) ? "Deselect item" : "Select item"
          }
        >
          <div
            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors dark:border-gray-600 ${
              selectedItems.has(item.id)
                ? "bg-blue-600 border-blue-600"
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-400"
            }`}
          >
            {selectedItems.has(item.id) && (
              <Check className="w-3.5 h-3.5 text-white" />
            )}
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
          {previewText}
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
            handleDeleteItem(item.id);
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

export default ResearchItemRow;
