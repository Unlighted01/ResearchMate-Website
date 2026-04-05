// ============================================
// Dashboard.tsx - Research Items Dashboard (compositor)
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

// React
import React from "react";

// Third-party
import { motion } from "motion/react";

// Sub-components
import DashboardHeader from "./DashboardHeader";
import SearchAndFilters from "./SearchAndFilters";
import StatsBar from "./StatsBar";
import ResearchItemCard from "./ResearchItemCard";
import ResearchItemRow from "./ResearchItemRow";
import ItemDetailModal from "./ItemDetailModal";
import CollectionPickerModal from "./CollectionPickerModal";

// Shared components
import SmartPenScanModal from "../SmartPenScanModal";
import ConfirmDialog from "../../shared/ConfirmDialog";
import {
  SkeletonDashboardGrid,
  SkeletonDashboardList,
} from "../../shared/SkeletonLoader";
import KeyboardShortcutsModal from "../../shared/KeyboardShortcutsModal";
import BulkActions from "../../shared/BulkActions";
import AdvancedSearchFilter from "../../shared/AdvancedSearchFilter";

// Icons
import { Sparkles, Chrome } from "lucide-react";

// Services
import { updateItem } from "../../../services/storageService";
import { runOcr } from "../../../services/importService";

// Hooks
import {
  useKeyboardShortcuts,
  COMMON_SHORTCUTS,
} from "../../../hooks/useKeyboardShortcuts";
import { useDashboardData } from "./useDashboardData";
import { useDashboardActions } from "./useDashboardActions";

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

  const {
    items,
    setItems,
    filteredItems,
    loading,
    hasMore,
    loadingMore,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    stats,
    allTags,
    collections,
    isRealTimeConnected,
    lastSyncTime,
    selectedItem,
    setSelectedItem,
    isModalOpen,
    setIsModalOpen,
    selectedSmartPenScan,
    setSelectedSmartPenScan,
    selectedItems,
    setSelectedItems,
    showKeyboardShortcuts,
    setShowKeyboardShortcuts,
    showAdvancedFilters,
    setShowAdvancedFilters,
    showCollectionModal,
    setShowCollectionModal,
    collectionActionType,
    setCollectionActionType,
    isImporting,
    setIsImporting,
    importFileRef,
    isSummarizingSmartPen,
    setIsSummarizingSmartPen,
    isSummarizingItem,
    setIsSummarizingItem,
    isBulkDeleting,
    setIsBulkDeleting,
    confirmDialog,
    setConfirmDialog,
    advancedFilters,
    setAdvancedFilters,
    fetchItems,
    loadMoreItems,
    searchInputRef,
  } = useDashboardData(showToast);

  // ---------- PART 3B: ACTIONS HOOK ----------

  const {
    handleGenerateSummary,
    handleDeleteItem,
    handleColorChange,
    confirmDeleteItem,
    toggleItemSelection,
    selectAllItems,
    deselectAllItems,
    handleBulkDelete,
    handleBulkExport,
    handleShare,
    handleCopyMarkdown,
    handleAddToCollection,
    handleImport,
  } = useDashboardActions({
    items,
    setItems,
    selectedItem,
    setSelectedItem,
    setIsModalOpen,
    selectedItems,
    setSelectedItems,
    setIsBulkDeleting,
    confirmDialog,
    setConfirmDialog,
    isSummarizingItem,
    setIsSummarizingItem,
    showCollectionModal,
    setShowCollectionModal,
    collectionActionType,
    setCollectionActionType,
    setIsImporting,
    showToast,
    filteredItems,
  });

  // ---------- PART 3C: KEYBOARD SHORTCUTS ----------

  useKeyboardShortcuts([
    {
      ...COMMON_SHORTCUTS.SEARCH,
      description: "Focus search",
      handler: () => searchInputRef.current?.focus(),
    },
    {
      ...COMMON_SHORTCUTS.REFRESH,
      description: "Refresh items",
      handler: () => {
        if (!loading) fetchItems();
      },
    },
    {
      key: "g",
      description: "Toggle grid/list view",
      handler: () => {
        setViewMode((prev) => {
          const next = prev === "grid" ? "list" : "grid";
          localStorage.setItem("researchMate_viewMode", next);
          return next;
        });
      },
    },
    {
      key: "?",
      shiftKey: true,
      description: "Show keyboard shortcuts",
      handler: () => setShowKeyboardShortcuts(true),
    },
  ]);

  // ---------- PART 3D: LOCAL HANDLERS ----------

  const handleApplyFilters = (
    filters: Parameters<typeof setAdvancedFilters>[0]
  ) => setAdvancedFilters(filters);

  // ---------- PART 3E: RENDER ----------

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <DashboardHeader
        isRealTimeConnected={isRealTimeConnected}
        lastSyncTime={lastSyncTime}
        loading={loading}
        isImporting={isImporting}
        fetchItems={fetchItems}
        importFileRef={importFileRef}
        handleImport={handleImport}
        setShowKeyboardShortcuts={setShowKeyboardShortcuts}
      />

      {/* Search & Filters */}
      <SearchAndFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchInputRef={searchInputRef}
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        advancedFilters={advancedFilters}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Stats Bar */}
      <StatsBar stats={stats} />

      {/* Content */}
      {loading ? (
        viewMode === "grid" ? (
          <SkeletonDashboardGrid count={8} />
        ) : (
          <SkeletonDashboardList count={8} />
        )
      ) : filteredItems.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 px-4 animate-fade-up">
          <div className="w-20 h-20 bg-gradient-to-br from-[#007AFF]/10 to-[#5856D6]/10 rounded-3xl flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-[#007AFF]" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {searchQuery ? "No results found" : "Start your research journey"}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-8">
            {searchQuery
              ? "Try adjusting your search terms"
              : "Install the browser extension to capture content from any website instantly."}
          </p>
          {!searchQuery && (
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
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-stagger">
          {filteredItems.map((item, idx) => (
            <ResearchItemCard
              key={item.id}
              item={item}
              index={idx}
              selectedItems={selectedItems}
              toggleItemSelection={toggleItemSelection}
              setSelectedSmartPenScan={setSelectedSmartPenScan}
              setSelectedItem={setSelectedItem}
              setIsModalOpen={setIsModalOpen}
              handleDeleteItem={handleDeleteItem}
            />
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-200/50 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 flex flex-col w-full max-w-full overflow-hidden">
          {filteredItems.map((item) => (
            <ResearchItemRow
              key={item.id}
              item={item}
              selectedItems={selectedItems}
              toggleItemSelection={toggleItemSelection}
              setSelectedSmartPenScan={setSelectedSmartPenScan}
              setSelectedItem={setSelectedItem}
              setIsModalOpen={setIsModalOpen}
              handleDeleteItem={handleDeleteItem}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && !loading && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={loadMoreItems}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loadingMore ? (
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

      {/* Detail Modal */}
      <ItemDetailModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        selectedItem={selectedItem}
        handleCopyMarkdown={handleCopyMarkdown}
        handleColorChange={handleColorChange}
        handleGenerateSummary={handleGenerateSummary}
        isSummarizingItem={isSummarizingItem}
        handleShare={handleShare}
        handleDeleteItem={handleDeleteItem}
        setCollectionActionType={setCollectionActionType}
        setShowCollectionModal={setShowCollectionModal}
        showToast={showToast}
      />

      {/* Smart Pen Scan Modal */}
      <SmartPenScanModal
        scan={selectedSmartPenScan}
        onClose={() => setSelectedSmartPenScan(null)}
        onUpdate={(id, updates) => {
          setItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
          );
          if (selectedSmartPenScan?.id === id) {
            setSelectedSmartPenScan((prev) =>
              prev ? { ...prev, ...updates } : null
            );
          }
        }}
        onDelete={(id) => handleDeleteItem(id)}
        onGenerateSummary={async (scan) => {
          setIsSummarizingSmartPen(true);
          await handleGenerateSummary(scan);
          setIsSummarizingSmartPen(false);
        }}
        onRunOCR={async (scan) => {
          if (!scan.imageUrl) return;
          try {
            const result = await runOcr(scan.imageUrl, true);
            const updates = {
              text: result.ocrText,
              ocrText: result.ocrText,
              aiSummary: result.aiSummary || undefined,
            };
            await updateItem(scan.id, updates);
            setItems((prev) =>
              prev.map((i) => (i.id === scan.id ? { ...i, ...updates } : i))
            );
            setSelectedSmartPenScan((prev) =>
              prev ? { ...prev, ...updates } : null
            );
            showToast("Text extracted!", "success");
          } catch (err) {
            showToast(
              err instanceof Error ? err.message : "OCR failed",
              "error"
            );
          }
        }}
        isSummarizing={isSummarizingSmartPen}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() =>
          setConfirmDialog({ isOpen: false, itemId: null, isDeleting: false })
        }
        onConfirm={confirmDeleteItem}
        title="Delete Item"
        message="Are you sure you want to delete this research item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={confirmDialog.isDeleting}
      />

      {/* Bulk Actions Bar */}
      <BulkActions
        selectedCount={selectedItems.size}
        totalCount={filteredItems.length}
        onSelectAll={selectAllItems}
        onDeselectAll={deselectAllItems}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleBulkExport}
        onBulkAddToCollection={() => {
          setCollectionActionType("bulk");
          setShowCollectionModal(true);
        }}
        isDeleting={isBulkDeleting}
      />

      {/* Collection Picker Modal */}
      <CollectionPickerModal
        showCollectionModal={showCollectionModal}
        setShowCollectionModal={setShowCollectionModal}
        collectionActionType={collectionActionType}
        selectedItems={selectedItems}
        collections={collections}
        handleAddToCollection={handleAddToCollection}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      {/* Advanced Search Filters Modal */}
      <AdvancedSearchFilter
        isOpen={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        onApply={handleApplyFilters}
        availableTags={allTags}
      />
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default Dashboard;
