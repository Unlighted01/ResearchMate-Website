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
  Chrome,
  FolderPlus,
  BookOpen,
  Mic,
  Rss,
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
import SmartPenScanModal from "../SmartPenScanModal";
import ConfirmDialog from "../../shared/ConfirmDialog";

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

  // ---------- PART 3C: KEYBOARD SHORTCUTS ----------
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
    if (item.deviceSource === "smart_pen") {
      data.setSelectedSmartPenScan(item);
    } else {
      data.setSelectedItem(item);
      data.setIsModalOpen(true);
    }
  };

  // ---------- PART 3E: RENDER ----------
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
        <div className="flex flex-col items-center justify-center py-20 px-4 animate-fade-up">
          <div className="w-20 h-20 bg-gradient-to-br from-[#007AFF]/10 to-[#5856D6]/10 rounded-3xl flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-[#007AFF]" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {data.searchQuery
              ? "No results found"
              : "Start your research journey"}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-8">
            {data.searchQuery
              ? "Try adjusting your search terms"
              : "Install the browser extension to capture content from any website instantly."}
          </p>
          {!data.searchQuery && (
            <>
              <a
                href="https://chromewebstore.google.com/detail/researchmate/decekloddlffcnegkfbkfngkjikfchoh"
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="flex items-center gap-2 px-6 py-3 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-full transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95 hover-lift">
                  <Chrome className="w-5 h-5" />
                  Get Extension
                </button>
              </a>

              {/* Quick-action grid — expose other capture/discover entry points */}
              <div className="mt-10 w-full max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 text-center">
                  Or jump straight in
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      to: "/app/pdf-reader",
                      icon: BookOpen,
                      label: "Read a PDF",
                      sub: "Upload and annotate",
                      color: "text-[#FF9500]",
                      bg: "bg-[#FF9500]/10",
                    },
                    {
                      to: "/app/transcribe",
                      icon: Mic,
                      label: "Transcribe",
                      sub: "Audio, video, YouTube",
                      color: "text-[#AF52DE]",
                      bg: "bg-[#AF52DE]/10",
                    },
                    {
                      to: "/app/feeds",
                      icon: Rss,
                      label: "Subscribe",
                      sub: "RSS from arXiv, Nature",
                      color: "text-[#34C759]",
                      bg: "bg-[#34C759]/10",
                    },
                    {
                      to: "/app/ai-assistant",
                      icon: MessageSquare,
                      label: "Ask AI",
                      sub: "Chat about your library",
                      color: "text-[#007AFF]",
                      bg: "bg-[#007AFF]/10",
                    },
                  ].map((action) => (
                    <Link
                      key={action.to}
                      to={action.to}
                      className="theme-surface rounded-2xl border border-gray-200/60 dark:border-white/10 p-4 hover:border-[#007AFF]/40 hover:scale-[1.02] active:scale-[0.98] transition-all group text-left"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center mb-2`}
                      >
                        <action.icon className={`w-5 h-5 ${action.color}`} />
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {action.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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
      />

      {/* ========== SMART PEN SCAN MODAL ========== */}
      <SmartPenScanModal
        scan={data.selectedSmartPenScan}
        onClose={() => data.setSelectedSmartPenScan(null)}
        onUpdate={(id, updates) => {
          data.setItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, ...updates } : i)),
          );
          if (data.selectedSmartPenScan?.id === id) {
            data.setSelectedSmartPenScan((prev) =>
              prev ? { ...prev, ...updates } : null,
            );
          }
        }}
        onDelete={(id) => actions.handleDeleteItem(id)}
        onGenerateSummary={async (scan) => {
          data.setIsSummarizingSmartPen(true);
          await actions.handleGenerateSummary(scan);
          data.setIsSummarizingSmartPen(false);
        }}
        onRunOCR={async (scan) => {
          if (!scan.imageUrl) return;
          try {
            const response = await fetch("/api/ocr", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                image: scan.imageUrl,
                includeSummary: true,
              }),
            });
            if (!response.ok)
              throw new Error(
                (await response.json()).error || "OCR failed",
              );
            const result = await response.json();
            const updates = {
              text: result.ocrText,
              ocrText: result.ocrText,
              aiSummary: result.aiSummary || undefined,
            };
            await updateItem(scan.id, updates);
            data.setItems((prev) =>
              prev.map((i) =>
                i.id === scan.id ? { ...i, ...updates } : i,
              ),
            );
            data.setSelectedSmartPenScan((prev) =>
              prev ? { ...prev, ...updates } : null,
            );
            showToast("Text extracted!", "success");
          } catch (err) {
            showToast(
              err instanceof Error ? err.message : "OCR failed",
              "error",
            );
          }
        }}
        isSummarizing={data.isSummarizingSmartPen}
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
