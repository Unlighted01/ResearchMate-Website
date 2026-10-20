// ============================================
// MATERIAL SCOPE SELECTOR - Targeted Grounding Control
// 3 Modes: All Materials, Single Document, or Curated Multi-Select
// Orphan-safe & displays active chunk count
// ============================================

import React, { useState, useMemo } from "react";
import { Layers, FileText, CheckSquare, Square, ChevronDown, ChevronUp } from "lucide-react";
import { StorageItem } from "../../../services/storageService";

export type ScopeMode = "all" | "single" | "multi";

export interface MaterialScopeSelection {
  mode: ScopeMode;
  selectedIds: string[];
}

interface MaterialScopeSelectorProps {
  items: StorageItem[];
  selection: MaterialScopeSelection;
  onChange: (newSelection: MaterialScopeSelection) => void;
}

export const MaterialScopeSelector: React.FC<MaterialScopeSelectorProps> = ({
  items,
  selection,
  onChange,
}) => {
  const [showMultiDrawer, setShowMultiDrawer] = useState(false);

  // Filter out any orphaned IDs that no longer exist in items
  const validItemIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const activeIds = useMemo(
    () => selection.selectedIds.filter((id) => validItemIds.has(id)),
    [selection.selectedIds, validItemIds]
  );

  // Compute resolved items based on mode
  const resolvedItems = useMemo(() => {
    if (selection.mode === "all") return items;
    if (selection.mode === "single") {
      const singleId = activeIds[0];
      return items.filter((i) => i.id === singleId);
    }
    return items.filter((i) => activeIds.includes(i.id));
  }, [selection.mode, items, activeIds]);

  const handleModeChange = (mode: ScopeMode) => {
    if (mode === "all") {
      onChange({ mode: "all", selectedIds: [] });
      setShowMultiDrawer(false);
    } else if (mode === "single") {
      const firstId = activeIds[0] || items[0]?.id || "";
      onChange({ mode: "single", selectedIds: firstId ? [firstId] : [] });
      setShowMultiDrawer(false);
    } else if (mode === "multi") {
      const ids = activeIds.length > 0 ? activeIds : items.slice(0, 2).map((i) => i.id);
      onChange({ mode: "multi", selectedIds: ids });
      setShowMultiDrawer(true);
    }
  };

  const handleSingleSelect = (id: string) => {
    onChange({ mode: "single", selectedIds: [id] });
  };

  const handleToggleMultiItem = (id: string) => {
    const isSelected = activeIds.includes(id);
    let updated: string[];
    if (isSelected) {
      updated = activeIds.filter((item) => item !== id);
    } else {
      updated = [...activeIds, id];
    }
    onChange({ mode: "multi", selectedIds: updated });
  };

  const handleSelectAllInMulti = () => {
    onChange({ mode: "multi", selectedIds: items.map((i) => i.id) });
  };

  const handleClearAllInMulti = () => {
    onChange({ mode: "multi", selectedIds: [] });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
          <span>Material Grounding Scope</span>
        </label>

        {/* 3-Mode Segmented Pill Switcher */}
        <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium border border-slate-200/80 dark:border-slate-700">
          <button
            type="button"
            onClick={() => handleModeChange("all")}
            className={`px-2.5 py-1 rounded-md transition-all ${
              selection.mode === "all"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            All Materials ({items.length})
          </button>

          <button
            type="button"
            onClick={() => handleModeChange("single")}
            className={`px-2.5 py-1 rounded-md transition-all ${
              selection.mode === "single"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Single Document
          </button>

          <button
            type="button"
            onClick={() => handleModeChange("multi")}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
              selection.mode === "multi"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <span>Custom Selection ({activeIds.length})</span>
            {showMultiDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Mode 2: Single Document Dropdown */}
      {selection.mode === "single" && items.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <select
            value={activeIds[0] || ""}
            onChange={(e) => handleSingleSelect(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
          >
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                📄 {it.sourceTitle || it.title || "Untitled Document"} ({it.text ? `${Math.round(it.text.length / 500)} chunks` : "Note"})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Mode 3: Multi-Select Expandable Drawer */}
      {selection.mode === "multi" && (
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5 pt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-200/50 dark:border-slate-800 pb-1.5">
            <span>Check the materials to include in this review:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllInMulti}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                Select All
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={handleClearAllInMulti}
                className="text-slate-500 hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
            {items.map((it) => {
              const checked = activeIds.includes(it.id);
              return (
                <div
                  key={it.id}
                  onClick={() => handleToggleMultiItem(it.id)}
                  className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    checked
                      ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-slate-900 dark:text-slate-100 font-medium"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {checked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">{it.sourceTitle || it.title || "Document"}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                    {it.tags?.includes("pdf") ? "PDF" : "Note"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grounding Context Status Badge */}
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-0.5">
        <FileText className="w-3 h-3 text-indigo-500 shrink-0" />
        <span>
          Grounding Corpus:{" "}
          <strong className="text-slate-800 dark:text-slate-200 font-semibold">
            {resolvedItems.length} material(s) selected
          </strong>{" "}
          {selection.mode === "single" && resolvedItems[0]
            ? `(${resolvedItems[0].sourceTitle || resolvedItems[0].title})`
            : ""}
        </span>
      </div>
    </div>
  );
};

export default MaterialScopeSelector;
