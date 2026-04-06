// ============================================
// CollectionDetailView.tsx - Detail View for a Single Collection
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, FolderOpen, Plus, X, Check } from "lucide-react";
import { Collection as CollectionType } from "../../../services/collectionsService";
import { StorageItem } from "../../../services/storageService";
import { Button, Card } from "../../shared/ui";
import BulkActions from "../../shared/BulkActions";
import { SkeletonDashboardGrid } from "../../shared/SkeletonLoader";
import AddItemsModal from "./AddItemsModal";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface CollectionDetailViewProps {
  collection: CollectionType;
  items: StorageItem[];
  loadingItems: boolean;
  removingItemId: string | null;
  selectedItems: Set<string>;
  isBulkRemoving: boolean;
  isBulkDeleting: boolean;
  // Add Items Modal
  showAddModal: boolean;
  availableItems: StorageItem[];
  selectedAvailableItems: Set<string>;
  searchQuery: string;
  // Callbacks
  onBack: () => void;
  onOpenAddModal: () => void;
  onToggleItemSelection: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkRemove: () => void;
  onBulkDelete: () => void;
  onCloseAddModal: () => void;
  onSearchChange: (value: string) => void;
  onToggleAvailableItem: (id: string) => void;
  onAddSelectedItems: () => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const CollectionDetailView: React.FC<CollectionDetailViewProps> = ({
  collection,
  items,
  loadingItems,
  removingItemId,
  selectedItems,
  isBulkRemoving,
  isBulkDeleting,
  showAddModal,
  availableItems,
  selectedAvailableItems,
  searchQuery,
  onBack,
  onOpenAddModal,
  onToggleItemSelection,
  onRemoveItem,
  onSelectAll,
  onDeselectAll,
  onBulkRemove,
  onBulkDelete,
  onCloseAddModal,
  onSearchChange,
  onToggleAvailableItem,
  onAddSelectedItems,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Go back to collections"
          title="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: collection.color }}
        />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {collection.name}
          </h1>
          <p className="text-xs text-gray-500">
            {collection.description || "No description"}
          </p>
        </div>
        <div className="ml-auto">
          <Button onClick={onOpenAddModal}>
            <Plus className="w-4 h-4 mr-2" /> Add Items
          </Button>
        </div>
      </div>

      {/* Items Grid */}
      {loadingItems ? (
        <SkeletonDashboardGrid count={6} />
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="mb-6 text-gray-900 dark:text-white">
            This collection is empty.
          </p>
          <Link
            to="/"
            className="px-6 py-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors inline-flex mt-4"
          >
            Go to Dashboard to add items
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const isSelected = selectedItems.has(item.id);
            return (
              <Card
                key={item.id}
                className={`p-4 hover:shadow-md transition-shadow relative group ${isSelected ? "ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
                onClick={() => onToggleItemSelection(item.id)}
              >
                {/* Selection Checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleItemSelection(item.id);
                  }}
                  className={`absolute top-4 left-4 z-10 p-1.5 rounded-lg border bg-white/90 backdrop-blur-sm transition-all duration-200 ${
                    isSelected || selectedItems.size > 0
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100"
                  } ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                  }`}
                  aria-label={isSelected ? "Deselect item" : "Select item"}
                >
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors dark:border-gray-600 ${
                      isSelected
                        ? "bg-blue-600 border-blue-600"
                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                </button>

                {/* Remove Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!removingItemId) onRemoveItem(item.id);
                  }}
                  disabled={removingItemId === item.id}
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove item from collection"
                  title="Remove from collection"
                >
                  <X className="w-4 h-4" />
                </button>

                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                  {item.sourceTitle || "Untitled"}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-3">
                  {item.aiSummary || item.text}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedItems.size}
        totalCount={items.length}
        onSelectAll={onSelectAll}
        onDeselectAll={onDeselectAll}
        onBulkRemoveFromCollection={onBulkRemove}
        onBulkDelete={onBulkDelete}
        isDeleting={isBulkDeleting}
      />

      {/* Add Items Modal */}
      <AddItemsModal
        isOpen={showAddModal}
        onClose={onCloseAddModal}
        collectionName={collection.name}
        availableItems={availableItems}
        selectedAvailableItems={selectedAvailableItems}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onToggleItem={onToggleAvailableItem}
        onConfirm={onAddSelectedItems}
      />
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default CollectionDetailView;
