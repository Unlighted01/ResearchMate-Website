// ============================================
// ResearchItemCard.tsx - Grid card for a single research item
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { motion } from "motion/react";
import { Zap, Clock, Tag, Check } from "lucide-react";
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

interface ResearchItemCardProps {
  item: StorageItem;
  index: number;
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

const ResearchItemCard: React.FC<ResearchItemCardProps> = ({
  item,
  index,
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index * 0.05, 0.3),
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={{
        y: -6,
        boxShadow: "0 16px 40px -8px rgba(0, 122, 255, 0.15)",
      }}
      onClick={() => {
        if (item.deviceSource === "smart_pen") {
          setSelectedSmartPenScan(item);
        } else {
          setSelectedItem(item);
          setIsModalOpen(true);
        }
      }}
      className={`group relative glass-card rounded-2xl p-5 flex flex-col h-[240px] transition-all duration-300 hover:border-[#007AFF]/30
        ${getHighlightColorClasses(item.color)}
        ${
          selectedItems.has(item.id)
            ? "ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
            : ""
        } cursor-pointer`}
    >
      {/* Checkbox — bottom-left, away from AI badge */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleItemSelection(item.id);
        }}
        className={`absolute bottom-3 left-3 z-10 p-1 rounded-lg border bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm transition-all duration-200 ${
          selectedItems.has(item.id) || selectedItems.size > 0
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100"
        } ${
          selectedItems.has(item.id)
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/40"
            : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
        }`}
        aria-label={selectedItems.has(item.id) ? "Deselect item" : "Select item"}
      >
        <div
          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors dark:border-gray-600 ${
            selectedItems.has(item.id)
              ? "bg-blue-600 border-blue-600"
              : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          }`}
        >
          {selectedItems.has(item.id) && (
            <Check className="w-3 h-3 text-white" />
          )}
        </div>
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            backgroundColor: `${getSourceColor(item.deviceSource || "web")}15`,
          }}
        >
          <span style={{ color: getSourceColor(item.deviceSource || "web") }}>
            {getSourceIcon(item.deviceSource || "web")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {item.aiSummary && (
            <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white text-[10px] font-semibold rounded-full">
              <Zap className="w-3 h-3" />
              AI
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 leading-snug">
          {item.sourceTitle || "Untitled Research"}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
          {previewText}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          {new Date(item.createdAt).toLocaleDateString()}
        </div>
        {item.tags && item.tags.length > 0 && (
          <div className="flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-400">{item.tags.length}</span>
          </div>
        )}
      </div>

      {/* Delete Button (on hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteItem(item.id);
        }}
        aria-label="Delete item"
        className="absolute top-3 right-3 p-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-[#FF3B30] rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <TrashIcon size={16} dangerHover />
      </button>
    </motion.div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default ResearchItemCard;
