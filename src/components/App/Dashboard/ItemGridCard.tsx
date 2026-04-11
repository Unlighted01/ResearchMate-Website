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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
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
        boxShadow: "0 16px 40px -8px rgba(0, 122, 255, 0.15)",
      }}
      onClick={() => onClick(item)}
      className={`spotlight-card group relative glass-card rounded-2xl p-5 flex flex-col h-[240px] transition-all duration-300 hover:border-[#007AFF]/30
        ${colorBorderClass}
        ${isSelected ? "ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10" : ""}
        cursor-pointer`}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect(item.id);
        }}
        className={`absolute bottom-3 left-3 z-10 p-1 rounded-lg border bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm transition-all duration-200 ${
          isSelected || hasAnySelection
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100"
        } ${
          isSelected
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/40"
            : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
        }`}
        aria-label={isSelected ? "Deselect item" : "Select item"}
      >
        <div
          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors dark:border-gray-600 ${
            isSelected
              ? "bg-blue-600 border-blue-600"
              : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          }`}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
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
          {displayText}
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
          onDelete(item.id);
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
// PART 5: EXPORTS
// ============================================

export default ItemGridCard;
