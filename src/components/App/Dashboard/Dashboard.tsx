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
  Award,
  CheckCircle2,
  Loader2,
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

import { useDashboardData } from "./useDashboardData";
import { useDashboardActions } from "./useDashboardActions";
import { useIngestion } from "../../../context/IngestionContext";
import DashboardHeader from "./DashboardHeader";
import DashboardToolbar from "./DashboardToolbar";
import DashboardStatsBar from "./DashboardStatsBar";
import ItemGridCard from "./ItemGridCard";
import ItemListRow from "./ItemListRow";
import ItemDetailModal from "./ItemDetailModal";
import { DailySprintModal } from "./DailySprintModal";
import { getReadinessStats, ExamReadinessStats } from "../../../services/examReadinessService";
import { Zap, Target, Flame } from "lucide-react";

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
  const { batch } = useIngestion();
  const [readinessStats, setReadinessStats] = React.useState<ExamReadinessStats>(() => getReadinessStats());
  const [isSprintModalOpen, setIsSprintModalOpen] = React.useState(false);
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

      {/* ========== EXAM COMMAND CENTER HERO ========== */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Column: Readiness Gauge & Streaks */}
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 text-indigo-200 border border-white/10 font-bold">
                Civil Service & Entrance Exam Benchmark
              </span>
              <span className="text-xs font-mono text-indigo-300 flex items-center gap-1">
                🔥 {readinessStats.streakDays}-Day Streak
              </span>
            </div>

            <div className="flex items-baseline gap-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl sm:text-5xl font-extrabold font-mono tracking-tight text-white">
                  {readinessStats.isCalibrated ? `${readinessStats.score}%` : "—"}
                </span>
                <span className="text-xs font-mono text-indigo-300">
                  {readinessStats.isCalibrated ? "/ 100" : ""}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-200 font-title">
                  Exam Readiness Score
                </span>
                <p className="text-xs text-indigo-300/80 font-mono">
                  {!readinessStats.isCalibrated
                    ? "Uncalibrated • Take a 5-min sprint to gauge readiness"
                    : readinessStats.isPassing
                    ? "🟢 Projected Passing (Target: ≥80% passing benchmark)"
                    : `🔴 ${readinessStats.passingThreshold - readinessStats.score}% below the 80% passing threshold`}
                </p>
              </div>
            </div>

            {/* Readiness Progress Gauge Bar */}
            <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden relative">
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10"
                style={{ left: "80%" }}
                title="80% Passing Benchmark"
              />
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  !readinessStats.isCalibrated
                    ? "bg-slate-700 w-0"
                    : readinessStats.isPassing
                    ? "bg-emerald-400"
                    : "bg-gradient-to-r from-amber-400 to-rose-400"
                }`}
                style={{ width: `${Math.min(100, Math.max(5, readinessStats.score))}%` }}
              />
            </div>

            {/* Weakness Alert */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              {readinessStats.primaryWeakness ? (
                <span className="inline-flex items-center gap-1.5 text-amber-300 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-xl font-mono text-[11px]">
                  ⚠️ Priority Focus: <strong>{readinessStats.primaryWeakness}</strong> ({readinessStats.categoryAccuracies[readinessStats.primaryWeakness]?.percent}% accuracy)
                </span>
              ) : (
                <span className="text-indigo-200/80 text-[11px] font-mono">
                  Benchmark: 80% on Numerical, Verbal & General Info.
                </span>
              )}
              <span className="text-slate-400 font-mono text-[11px]">
                • {readinessStats.totalQuestionsSolved} questions solved
              </span>
            </div>
          </div>

          {/* Right Column: 1-Click Action */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => setIsSprintModalOpen(true)}
              className="flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-400 hover:to-emerald-400 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer group"
            >
              <Zap className="w-5 h-5 fill-white group-hover:scale-110 transition-transform shrink-0" />
              <div className="text-left">
                <div className="text-sm font-bold leading-tight">Start 5-Minute Daily Sprint</div>
                <div className="text-[10px] font-mono text-indigo-100/80 font-normal">5 Rapid-Fire Questions • PracticePacer</div>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <Link
                to="/app/review?tab=exams"
                className="flex-1 text-center py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition-colors"
              >
                Full Mock Exam
              </Link>
              <Link
                to="/app/assistant"
                className="flex-1 text-center py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition-colors"
              >
                Shortcut Tutor
              </Link>
            </div>
          </div>
        </div>
      </div>
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

      {/* ========== LIVE INGESTION PROGRESS BANNER ========== */}
      {batch.isActive && (
        <div className="bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200/90 dark:border-indigo-800/60 rounded-2xl p-4 shadow-xs animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {batch.isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
              )}
              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {batch.isCompleted
                  ? "All Materials Ingested Successfully!"
                  : `Ingesting Material ${batch.completedCount + 1} of ${batch.totalFiles}`}
              </span>
            </div>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
              {batch.overallPercent}%
            </span>
          </div>

          <div className="w-full bg-indigo-100 dark:bg-indigo-900/60 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                batch.isCompleted
                  ? "bg-emerald-500"
                  : "bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"
              }`}
              style={{ width: `${Math.max(4, batch.overallPercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="font-mono font-medium truncate max-w-xs sm:max-w-md text-slate-800 dark:text-slate-200">
              {batch.currentFileName}
            </span>
            <span>{batch.statusMessage}</span>
          </div>
        </div>
      )}

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
              : "Build your study library"}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-8 text-sm">
            {data.searchQuery
              ? "Try adjusting your search terms or active filters."
              : isDraggingOver
              ? "Drop files here to immediately import into your library!"
              : "Drop your reviewer PDFs, exam question sets, or study materials here to start practice and review."}
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
                <span>{data.isImporting ? "Importing Sources..." : "Upload Reviewers or PDFs"}</span>
              </button>

              {/* Quick-action grid — 3 core pillars */}
              <div className="mt-10 w-full max-w-xl mx-auto">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 text-center font-mono">
                  Or start with a workflow
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      to: "/app/review?tab=exams",
                      icon: Award,
                      label: "Mock Exams & Practice",
                      sub: "Timed tests, scoring & review",
                      color: "text-amber-600 dark:text-amber-400",
                      bg: "bg-amber-500/10",
                    },
                    {
                      to: "/app/research?tab=pdf",
                      icon: BookOpen,
                      label: "Study Materials & Reader",
                      sub: "Read, annotate & study PDFs",
                      color: "text-indigo-600 dark:text-indigo-400",
                      bg: "bg-indigo-500/10",
                    },
                    {
                      to: "/app/assistant",
                      icon: MessageSquare,
                      label: "AI Study Assistant",
                      sub: "Grounded Q&A & explanations",
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


    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default Dashboard;
