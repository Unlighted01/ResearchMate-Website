import React from "react";
import { X, CheckSquare } from "lucide-react";
import { TrashIcon, DownloadIcon } from "../icons";

interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete: () => void;
  onBulkExport: () => void;
  onBulkAddToCollection: () => void;
  isDeleting?: boolean;
}

/**
 * Bulk Actions Bar
 * Shows when items are selected, provides bulk operations
 */
const BulkActions: React.FC<BulkActionsProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onBulkExport,
  onBulkAddToCollection,
  isDeleting = false,
}) => {
  if (selectedCount === 0) return null;

  const allSelected = selectedCount === totalCount;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 duration-300"
      role="region"
      aria-label="Bulk actions"
    >
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center gap-4">
        {/* Selection Info */}
        <div className="flex items-center gap-3 border-r border-gray-200 dark:border-gray-800 pr-4">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {selectedCount} selected
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {allSelected
                ? "All items selected"
                : `${totalCount - selectedCount} remaining`}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Select/Deselect All */}
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={allSelected ? "Deselect all" : "Select all"}
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>

          {/* Export */}
          <button
            onClick={onBulkExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-lg transition-colors"
            aria-label="Export selected items"
          >
            <DownloadIcon size={16} />
            Export
          </button>

          {/* Add to Collection */}
          <button
            onClick={onBulkAddToCollection}
            className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-lg transition-colors"
            aria-label="Add selected items to collection"
          >
            Add to Collection
          </button>

          {/* Delete */}
          <button
            onClick={onBulkDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Delete selected items"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-red-700 dark:border-red-300 border-t-transparent rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <TrashIcon size={16} dangerHover />
                Delete
              </>
            )}
          </button>

          {/* Clear Selection */}
          <button
            onClick={onDeselectAll}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Clear selection"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkActions;
