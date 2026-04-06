// ============================================
// AddItemsModal.tsx - Modal for Adding Items to a Collection
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Search, Check } from "lucide-react";
import { StorageItem } from "../../../services/storageService";
import { Button, Input, Modal } from "../../shared/ui";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface AddItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionName: string;
  availableItems: StorageItem[];
  selectedAvailableItems: Set<string>;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onToggleItem: (id: string) => void;
  onConfirm: () => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const AddItemsModal: React.FC<AddItemsModalProps> = ({
  isOpen,
  onClose,
  collectionName,
  availableItems,
  selectedAvailableItems,
  searchQuery,
  onSearchChange,
  onToggleItem,
  onConfirm,
}) => {
  const filtered = availableItems.filter(
    (i) =>
      !searchQuery ||
      i.sourceTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.text?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add items to ${collectionName}`}
    >
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search available items..."
            value={searchQuery}
            onChange={(e: any) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto pr-2 space-y-2 mb-4">
        {filtered.map((item) => {
          const isSelected = selectedAvailableItems.has(item.id);
          return (
            <div
              key={item.id}
              onClick={() => onToggleItem(item.id)}
              className={`p-3 rounded-xl border cursor-pointer transition-colors flex items-start gap-3 ${
                isSelected
                  ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                  : "bg-white border-gray-100 hover:border-blue-200 dark:bg-gray-800 dark:border-gray-700"
              }`}
            >
              <div
                className={`mt-1 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors dark:border-gray-600 ${
                  isSelected
                    ? "bg-blue-600 border-blue-600"
                    : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {item.sourceTitle || "Untitled"}
                </p>
                <p className="text-sm text-gray-500 line-clamp-1">
                  {item.aiSummary || item.text || "No content"}
                </p>
              </div>
            </div>
          );
        })}

        {availableItems.length === 0 && (
          <p className="text-center text-gray-500 py-10">
            No items available to add.
          </p>
        )}
      </div>

      <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-800 pt-4">
        <span className="text-sm text-gray-500">
          {selectedAvailableItems.size} items selected
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={selectedAvailableItems.size === 0}
          >
            Add to Collection
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default AddItemsModal;
