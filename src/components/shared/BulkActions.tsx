import React from "react";
import { X, CheckSquare, FolderMinus } from "lucide-react";
import { TrashIcon, DownloadIcon } from "../icons";

interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete?: () => void;
  onBulkExport?: (format: "json" | "csv" | "md" | "pdf") => void;
  onBulkAddToCollection?: () => void;
  onBulkRemoveFromCollection?: () => void;
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
  onBulkRemoveFromCollection,
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

          {/* Export Dropdown */}
          {onBulkExport && (
            <div className="relative group">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-lg transition-colors"
                aria-label="Export selected items dropdown"
              >
                <DownloadIcon size={16} />
                Export
              </button>

              <div className="absolute bottom-full left-0 mb-2 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all z-50">
                <button
                  onClick={() => onBulkExport("pdf")}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Export as PDF
                </button>
                <button
                  onClick={() => onBulkExport("json")}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Export as JSON
                </button>
                <button
                  onClick={() => onBulkExport("csv")}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => onBulkExport("md")}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Export as Markdown
                </button>
              </div>
            </div>
          )}

          {/* Add to Collection */}
          {onBulkAddToCollection && (
            <button
              onClick={onBulkAddToCollection}
              className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-lg transition-colors"
              aria-label="Add selected items to collection"
            >
              Add to Collection
            </button>
          )}

          {/* Remove from Collection */}
          {onBulkRemoveFromCollection && (
            <button
              onClick={onBulkRemoveFromCollection}
              className="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-medium rounded-lg transition-colors"
              aria-label="Remove selected items from collection"
            >
              <FolderMinus className="w-4 h-4" />
              Remove
            </button>
          )}

          {/* Delete */}
          {onBulkDelete && (
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
          )}

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
