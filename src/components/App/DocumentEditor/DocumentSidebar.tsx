// ============================================
// DocumentSidebar.tsx - Document List Panel
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useState } from "react";
import { Plus, FileText, Trash2, Pencil, Check, X, CheckSquare, Square } from "lucide-react";
import type { Document } from "../../../services/documentService";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface DocumentSidebarProps {
  documents: Document[];
  currentDocId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onDeleteMany?: (ids: string[]) => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  documents,
  currentDocId,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onDeleteMany,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Multi-select state
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const startRename = (doc: Document) => {
    setEditingId(doc.id);
    setEditTitle(doc.title);
  };

  const confirmRename = () => {
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

  const toggleSelectDoc = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitMultiSelect = () => {
    setMultiSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    onDeleteMany?.(Array.from(selectedIds));
    exitMultiSelect();
  };

  const allSelected = documents.length > 0 && selectedIds.size === documents.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map((d) => d.id)));
    }
  };

  return (
    <div className="w-60 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1C1C1E]/50 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-2">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#007AFF] hover:bg-[#0066DD] text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Document
        </button>
        <button
          onClick={() => {
            if (multiSelectMode) {
              exitMultiSelect();
            } else {
              setMultiSelectMode(true);
            }
          }}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors border ${
            multiSelectMode
              ? "border-red-400 text-red-500 bg-red-50 dark:bg-red-900/20"
              : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          {multiSelectMode ? (
            <>
              <X className="w-4 h-4" /> Cancel
            </>
          ) : (
            <>
              <CheckSquare className="w-4 h-4" /> Select
            </>
          )}
        </button>
      </div>

      {/* Multi-select actions bar */}
      {multiSelectMode && (
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-yellow-50/50 dark:bg-yellow-900/10 flex items-center justify-between gap-2">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {allSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-[#007AFF]" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
            {allSelected ? "Deselect All" : "Select All"}
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete ({selectedIds.size})
          </button>
        </div>
      )}

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {documents.length === 0 && (
          <p className="text-center text-sm text-gray-400 mt-8 px-4">
            No documents yet. Create one to get started.
          </p>
        )}
        {documents.map((doc) => (
          <div
            key={doc.id}
            onClick={() => {
              if (multiSelectMode) {
                toggleSelectDoc(doc.id);
              } else if (editingId !== doc.id) {
                onSelect(doc.id);
              }
            }}
            className={`group relative px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
              multiSelectMode && selectedIds.has(doc.id)
                ? "bg-[#007AFF]/10 border border-[#007AFF]/30"
                : currentDocId === doc.id && !multiSelectMode
                ? "bg-[#007AFF]/10 border border-[#007AFF]/20"
                : "hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent"
            }`}
          >
            {editingId === doc.id ? (
              <div className="flex items-center gap-1 min-w-0 w-full overflow-hidden">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                  className="min-w-0 flex-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); confirmRename(); }}
                  className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded flex-shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                  className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 pr-2">
                  {/* Multi-select checkbox */}
                  {multiSelectMode && (
                    <span className="flex-shrink-0 text-[#007AFF]">
                      {selectedIds.has(doc.id) ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </span>
                  )}
                  <FileText
                    className={`w-4 h-4 flex-shrink-0 ${
                      currentDocId === doc.id && !multiSelectMode
                        ? "text-[#007AFF]"
                        : "text-gray-400"
                    }`}
                  />
                  {/* Title — truncated to not get clipped by action buttons */}
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1 min-w-0">
                    {doc.title}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 ml-6">
                  {formatDate(doc.updatedAt)}
                </p>

                {/* Actions — shown below title, no overlap */}
                {!multiSelectMode && (
                  <>
                    {deletingId === doc.id ? (
                      <div className="flex items-center gap-1 mt-1.5 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-lg border border-red-200 dark:border-red-800">
                        <span className="text-[10px] text-red-600 dark:text-red-400 font-medium whitespace-nowrap flex-1">
                          Delete this document?
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(doc.id);
                            setDeletingId(null);
                          }}
                          className="p-0.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(null);
                          }}
                          className="p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="hidden group-hover:flex items-center gap-0.5 mt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(doc);
                          }}
                          className="p-1 text-gray-400 hover:text-[#007AFF] hover:bg-[#007AFF]/10 rounded transition-colors"
                          title="Rename"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(doc.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default DocumentSidebar;
