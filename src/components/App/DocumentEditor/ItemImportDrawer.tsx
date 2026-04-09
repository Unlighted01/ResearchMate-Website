// ============================================
// ItemImportDrawer.tsx - Insert Dashboard Items
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useState, useMemo } from "react";
import { X, Search, FileText, Globe, PenTool, Zap } from "lucide-react";
import { Editor } from "@tiptap/react";
import type { StorageItem } from "../../../services/storageService";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface ItemImportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: StorageItem[];
  loading: boolean;
  editor: Editor | null;
  onItemInserted?: (itemId: string) => void;
}

// ============================================
// PART 3: HELPERS
// ============================================

const getSourceIcon = (source: string) => {
  switch (source) {
    case "smart_pen":
      return PenTool;
    case "extension":
      return Globe;
    default:
      return FileText;
  }
};

const buildInsertContent = (item: StorageItem) => {
  const content: Record<string, unknown>[] = [];

  // Blockquote with item text
  const text = item.ocrText || item.text || "";
  if (text) {
    content.push({
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text }],
        },
      ],
    });
  }

  // Source line
  const sourceParts: Record<string, unknown>[] = [];
  if (item.sourceTitle) {
    sourceParts.push({
      type: "text",
      marks: [{ type: "bold" }],
      text: `Source: `,
    });
    sourceParts.push({
      type: "text",
      text: item.sourceTitle,
    });
  }
  if (item.sourceUrl) {
    sourceParts.push({
      type: "text",
      text: ` (${item.sourceUrl})`,
    });
  }
  if (sourceParts.length > 0) {
    content.push({ type: "paragraph", content: sourceParts });
  }

  // AI Summary
  if (item.aiSummary) {
    content.push({
      type: "paragraph",
      content: [
        { type: "text", marks: [{ type: "bold" }], text: "Summary: " },
        { type: "text", text: item.aiSummary },
      ],
    });
  }

  // Citation
  if (item.citation) {
    content.push({
      type: "paragraph",
      content: [
        { type: "text", marks: [{ type: "italic" }], text: item.citation },
      ],
    });
  }

  // Spacer
  content.push({ type: "paragraph" });

  return content;
};

// ============================================
// PART 4: COMPONENT
// ============================================

const ItemImportDrawer: React.FC<ItemImportDrawerProps> = ({
  isOpen,
  onClose,
  items,
  loading,
  editor,
  onItemInserted,
}) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.text?.toLowerCase().includes(q) ||
        item.sourceTitle?.toLowerCase().includes(q) ||
        item.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [items, search]);

  const handleInsert = (item: StorageItem) => {
    if (!editor) return;
    const nodes = buildInsertContent(item);
    editor.chain().focus().insertContent(nodes).run();
    onItemInserted?.(item.id);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-96 max-w-[90vw] bg-white dark:bg-[#1C1C1E] border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Insert Research Item
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-[#2C2C2E] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
            />
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#007AFF]" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 mt-8">
              {search ? "No matching items" : "No dashboard items yet"}
            </p>
          ) : (
            filtered.map((item) => {
              const Icon = getSourceIcon(item.deviceSource);
              return (
                <button
                  key={item.id}
                  onClick={() => handleInsert(item)}
                  className="w-full text-left p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-[#007AFF]/30 hover:bg-[#007AFF]/5 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 group-hover:bg-[#007AFF]/10">
                      <Icon className="w-4 h-4 text-gray-400 group-hover:text-[#007AFF]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {item.sourceTitle || "Untitled"}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                        {item.text?.slice(0, 120) || item.ocrText?.slice(0, 120) || "No content"}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {item.aiSummary && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded-full">
                            <Zap className="w-2.5 h-2.5" /> AI Summary
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

// ============================================
// PART 5: EXPORTS
// ============================================

export default ItemImportDrawer;
