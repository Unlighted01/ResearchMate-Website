// ============================================
// DASHBOARD PAGE - Apple Design
// Orchestrates sub-components and hooks
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import {
  Sparkles,
  Upload,
  Calculator,
  FileEdit,
  FolderPlus,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Modal } from "../../shared/ui";
import { StorageItem, updateItem } from "../../../services/storageService";
import {
  SkeletonDashboardGrid,
  SkeletonDashboardList,
} from "../../shared/SkeletonLoader";
import {
  useKeyboardShortcuts,
  COMMON_SHORTCUTS,
} from "../../../hooks/useKeyboardShortcuts";
import KeyboardShortcutsModal from "../../shared/KeyboardShortcutsModal";
import BulkActions from "../../shared/BulkActions";
import AdvancedSearchFilter from "../../shared/AdvancedSearchFilter";
import ConfirmDialog from "../../shared/ConfirmDialog";
import LiteratureMatrixModal from "../LiteratureMatrix/LiteratureMatrixModal";
import {
  generateLiteratureMatrix,
  MatrixRow,
} from "../../../services/geminiService";

import { useDashboardData } from "./useDashboardData";
import { useDashboardActions } from "./useDashboardActions";
import DashboardHeader from "./DashboardHeader";
import DashboardToolbar from "./DashboardToolbar";
import DashboardStatsBar from "./DashboardStatsBar";
import ItemGridCard from "./ItemGridCard";
import ItemListRow from "./ItemListRow";
import ItemDetailModal from "./ItemDetailModal";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface DashboardProps {
  useToast: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
  };
}

// ============================================
// PART 3: MAIN COMPONENT
// ============================================

const Dashboard: React.FC<DashboardProps> = ({ useToast }) => {
  const { showToast } = useToast();

  // ---------- PART 3A: DATA HOOK ----------
  const data = useDashboardData(showToast);

  // ---------- PART 3B: ACTIONS HOOK ----------
  const actions = useDashboardActions({
    items: data.items,
    setItems: data.setItems,
    selectedItem: data.selectedItem,
    setSelectedItem: data.setSelectedItem,
    setIsModalOpen: data.setIsModalOpen,
    selectedItems: data.selectedItems,
    setSelectedItems: data.setSelectedItems,
    setIsBulkDeleting: data.setIsBulkDeleting,
    confirmDialog: data.confirmDialog,
    setConfirmDialog: data.setConfirmDialog,
    isSummarizingItem: data.isSummarizingItem,
    setIsSummarizingItem: data.setIsSummarizingItem,
    showCollectionModal: data.showCollectionModal,
    setShowCollectionModal: data.setShowCollectionModal,
    collectionActionType: data.collectionActionType,
    setCollectionActionType: data.setCollectionActionType,
    setIsImporting: data.setIsImporting,
    showToast,
    filteredItems: data.filteredItems,
  });

  // ---------- PART 3C: LITERATURE REVIEW MATRIX (Option A) ----------
  const [showMatrixModal, setShowMatrixModal] = React.useState(false);
  const [matrixData, setMatrixData] = React.useState<MatrixRow[]>([]);
  const [crossPaperGaps, setCrossPaperGaps] = React.useState<string[]>([]);
  const [synthesisDraft, setSynthesisDraft] = React.useState<string>("");
  const [isGeneratingMatrix, setIsGeneratingMatrix] = React.useState(false);

  const handleGenerateLiteratureMatrix = async () => {
    const selectedList = data.items.filter((item) =>
      data.selectedItems.has(item.id),
    );

    if (selectedList.length < 2) {
      showToast(
        "Please select at least 2 papers to generate a comparative literature matrix.",
        "info",
      );
      return;
    }

    setIsGeneratingMatrix(true);
    setShowMatrixModal(true);
    try {
      const result = await generateLiteratureMatrix(selectedList);
      if (!result.ok) {
        throw new Error(result.error || "Failed to generate literature matrix.");
      }
      setMatrixData(result.matrix);
      setCrossPaperGaps(result.crossPaperGaps);
      setSynthesisDraft(result.synthesisDraft);
      showToast("Literature matrix synthesized successfully!", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Matrix generation failed",
        "error",
      );
      setShowMatrixModal(false);
    } finally {
      setIsGeneratingMatrix(false);
    }
  };

  // ---------- PART 3D: KEYBOARD SHORTCUTS ----------
  useKeyboardShortcuts([
    {
      ...COMMON_SHORTCUTS.SEARCH,
      description: "Focus search",
      handler: () => data.searchInputRef.current?.focus(),
    },
    {
      ...COMMON_SHORTCUTS.REFRESH,
      description: "Refresh items",
      handler: () => {
        if (!data.loading) data.fetchItems();
      },
    },
    {
      key: "g",
      description: "Toggle grid/list view",
      handler: () => {
        data.setViewMode(data.viewMode === "grid" ? "list" : "grid");
        localStorage.setItem(
          "researchMate_viewMode",
          data.viewMode === "grid" ? "list" : "grid",
        );
      },
    },
    {
      key: "?",
      shiftKey: true,
      description: "Show keyboard shortcuts",
      handler: () => data.setShowKeyboardShortcuts(true),
    },
  ]);

  // ---------- PART 3D: ITEM CLICK HANDLER ----------
  const handleItemClick = (item: StorageItem) => {
    data.setSelectedItem(item);
    data.setIsModalOpen(true);
  };

  // ---------- PART 3E: DRAG AND DROP HANDLERS ----------
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      await actions.processImportFiles(files);
    }
  };

  // ---------- PART 3F: RENDER ----------
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ========== HEADER ========== */}
      <DashboardHeader
        isRealTimeConnected={data.isRealTimeConnected}
        lastSyncTime={data.lastSyncTime}
        loading={data.loading}
        isImporting={data.isImporting}
        importFileRef={data.importFileRef}
        onRefresh={() => {
          if (!data.loading) data.fetchItems();
        }}
        onShowShortcuts={() => data.setShowKeyboardShortcuts(true)}
        onImport={actions.handleImport}
      />

      {/* ========== SEARCH & FILTERS ========== */}
      <DashboardToolbar
        searchQuery={data.searchQuery}
        onSearchChange={data.setSearchQuery}
        searchInputRef={data.searchInputRef}
        viewMode={data.viewMode}
        onViewModeChange={data.setViewMode}
        advancedFilters={data.advancedFilters}
        onShowAdvancedFilters={() => data.setShowAdvancedFilters(true)}
      />

      {/* ========== STATS BAR ========== */}
      <DashboardStatsBar stats={data.stats} />

      {/* ========== CONTENT ========== */}
      {data.loading ? (
        data.viewMode === "grid" ? (
          <SkeletonDashboardGrid count={8} />
        ) : (
          <SkeletonDashboardList count={8} />
        )
      ) : data.filteredItems.length === 0 ? (
        /* Empty State */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center py-20 px-4 animate-fade-up rounded-3xl transition-all ${
            isDraggingOver
              ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-2 border-dashed border-indigo-500 scale-[1.01]"
              : ""
          }`}
        >
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/40 rounded-3xl flex items-center justify-center mb-6 shadow-xs">
            <Sparkles className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3
            className="text-xl font-bold text-gray-900 dark:text-white mb-2"
            style={{ fontFamily: "var(--font-title, 'Fraunces', serif)" }}
          >
            {data.searchQuery
              ? "No results found"
              : "Synthesize your research"}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-8 text-sm">
            {data.searchQuery
              ? "Try adjusting your search terms or active filters."
              : isDraggingOver
              ? "Drop files here to immediately import into your library!"
              : "Drop PDFs to compare methodologies, transcribe whiteboard derivations to LaTeX, or import your papers."}
          </p>
          {!data.searchQuery && (
            <>
              <button
                type="button"
                onClick={() => data.importFileRef.current?.click()}
                disabled={data.isImporting}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-full transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-95 text-sm cursor-pointer disabled:opacity-60"
              >
                <Upload className={`w-4 h-4 ${data.isImporting ? "animate-bounce" : ""}`} />
                <span>{data.isImporting ? "Importing Sources..." : "Import Papers or PDFs"}</span>
              </button>

              {/* Quick-action grid — 3 core pillars */}
              <div className="mt-10 w-full max-w-xl mx-auto">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 text-center font-mono">
                  Or start with a workflow
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      to: "/app/pdf-reader",
                      icon: BookOpen,
                      label: "Ingest PDF",
                      sub: "Automated analysis",
                      color: "text-indigo-600 dark:text-indigo-400",
                      bg: "bg-indigo-500/10",
                    },
                    {
                      to: "/app/smart-pen",
                      icon: Calculator,
                      label: "STEM Math OCR",
                      sub: "Transcribe to LaTeX",
                      color: "text-amber-600 dark:text-amber-400",
                      bg: "bg-amber-500/10",
                    },
                    {
                      to: "/app/editor",
                      icon: FileEdit,
                      label: "Manuscript Draft",
                      sub: "TipTap + Overleaf export",
                      color: "text-emerald-600 dark:text-emerald-400",
                      bg: "bg-emerald-500/10",
                    },
                  ].map((action) => (
                    <Link
                      key={action.to}
                      to={action.to}
                      className="theme-surface rounded-2xl border border-gray-200/60 dark:border-white/10 p-4 hover:border-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all group text-left"
                    >
                      <div
                        className={`w-9 h-9 rounded-xl ${action.bg} flex items-center justify-center mb-2`}
                      >
                        <action.icon className={`w-4 h-4 ${action.color}`} />
                      </div>
                      <div className="text-xs font-semibold text-gray-900 dark:text-white">
                        {action.label}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {action.sub}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ) : data.viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-stagger">
          {data.filteredItems.map((item, idx) => (
            <ItemGridCard
              key={item.id}
              item={item}
              index={idx}
              isSelected={data.selectedItems.has(item.id)}
              hasAnySelection={data.selectedItems.size > 0}
              onSelect={actions.toggleItemSelection}
              onClick={handleItemClick}
              onDelete={actions.handleDeleteItem}
            />
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-200/50 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 flex flex-col w-full max-w-full overflow-hidden">
          {data.filteredItems.map((item) => (
            <ItemListRow
              key={item.id}
              item={item}
              isSelected={data.selectedItems.has(item.id)}
              hasAnySelection={data.selectedItems.size > 0}
              onSelect={actions.toggleItemSelection}
              onClick={handleItemClick}
              onDelete={actions.handleDeleteItem}
            />
          ))}
        </div>
      )}

      {/* ========== LOAD MORE ========== */}
      {data.hasMore && !data.loading && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={data.loadMoreItems}
            disabled={data.loadingMore}
            className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {data.loadingMore ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </button>
        </div>
      )}

      {/* ========== DETAIL MODAL ========== */}
      <ItemDetailModal
        isOpen={data.isModalOpen}
        onClose={() => data.setIsModalOpen(false)}
        item={data.selectedItem}
        isSummarizingItem={data.isSummarizingItem}
        onGenerateSummary={actions.handleGenerateSummary}
        onColorChange={actions.handleColorChange}
        onCopyMarkdown={actions.handleCopyMarkdown}
        onCopyText={(text) => {
          navigator.clipboard.writeText(text);
          showToast("Copied to clipboard!", "success");
        }}
        onShare={actions.handleShare}
        onAddToCollection={() => {
          data.setCollectionActionType("single");
          data.setShowCollectionModal(true);
        }}
        onDelete={actions.handleDeleteItem}
        onItemUpdated={(updated) => {
          data.setSelectedItem(updated);
          data.setItems((prev) =>
            prev.map((i) => (i.id === updated.id ? updated : i)),
          );
        }}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={data.confirmDialog.isOpen}
        onClose={() =>
          data.setConfirmDialog({
            isOpen: false,
            itemId: null,
            isDeleting: false,
          })
        }
        onConfirm={actions.confirmDeleteItem}
        title="Delete Item"
        message="Are you sure you want to delete this research item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={data.confirmDialog.isDeleting}
      />

      {/* Bulk Actions Bar */}
      <BulkActions
        selectedCount={data.selectedItems.size}
        totalCount={data.filteredItems.length}
        onSelectAll={actions.selectAllItems}
        onDeselectAll={actions.deselectAllItems}
        onBulkDelete={actions.handleBulkDelete}
        onBulkExport={actions.handleBulkExport}
        onBulkAddToCollection={() => {
          data.setCollectionActionType("bulk");
          data.setShowCollectionModal(true);
        }}
        onGenerateMatrix={handleGenerateLiteratureMatrix}
        isGeneratingMatrix={isGeneratingMatrix}
        isDeleting={data.isBulkDeleting}
      />

      {/* Select Collection Modal */}
      <Modal
        isOpen={data.showCollectionModal}
        onClose={() => data.setShowCollectionModal(false)}
        title={
          data.collectionActionType === "bulk"
            ? `Add ${data.selectedItems.size} items to Collection`
            : "Add to Collection"
        }
      >
        <div className="max-h-96 overflow-y-auto space-y-2">
          {data.collections.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No collections found. Create one in the Collections tab.
            </div>
          ) : (
            data.collections.map((col) => (
              <button
                key={col.id}
                onClick={() => actions.handleAddToCollection(col.id)}
                className="w-full flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-md transition-all text-left group"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${col.color}20` }}
                >
                  <FolderPlus
                    className="w-5 h-5 transition-transform group-hover:scale-110"
                    style={{ color: col.color }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                    {col.name}
                  </h4>
                  <p className="text-xs text-gray-500 truncate">
                    {col.description || "No description"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </Modal>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={data.showKeyboardShortcuts}
        onClose={() => data.setShowKeyboardShortcuts(false)}
      />

      {/* Advanced Search Filters Modal */}
      <AdvancedSearchFilter
        isOpen={data.showAdvancedFilters}
        onClose={() => data.setShowAdvancedFilters(false)}
        onApply={data.setAdvancedFilters}
        availableTags={data.allTags}
      />

      {/* Option A: Literature Review Matrix Modal */}
      <LiteratureMatrixModal
        isOpen={showMatrixModal}
        onClose={() => setShowMatrixModal(false)}
        matrix={matrixData}
        crossPaperGaps={crossPaperGaps}
        synthesisDraft={synthesisDraft}
        isLoading={isGeneratingMatrix}
      />
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default Dashboard;
