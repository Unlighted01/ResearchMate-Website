// ============================================
// CollectionPickerModal.tsx - Modal to pick a collection for adding items
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { FolderPlus } from "lucide-react";
import { Modal } from "../../shared/ui";
import { Collection } from "../../../services/collectionsService";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface CollectionPickerModalProps {
  showCollectionModal: boolean;
  setShowCollectionModal: (show: boolean) => void;
  collectionActionType: "single" | "bulk";
  selectedItems: Set<string>;
  collections: Collection[];
  handleAddToCollection: (collectionId: string) => void;
}

// ============================================
// PART 3: MAIN COMPONENT
// ============================================

const CollectionPickerModal: React.FC<CollectionPickerModalProps> = ({
  showCollectionModal,
  setShowCollectionModal,
  collectionActionType,
  selectedItems,
  collections,
  handleAddToCollection,
}) => {
  return (
    <Modal
      isOpen={showCollectionModal}
      onClose={() => setShowCollectionModal(false)}
      title={
        collectionActionType === "bulk"
          ? `Add ${selectedItems.size} items to Collection`
          : "Add to Collection"
      }
    >
      <div className="max-h-96 overflow-y-auto space-y-2">
        {collections.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No collections found. Create one in the Collections tab.
          </div>
        ) : (
          collections.map((col) => (
            <button
              key={col.id}
              onClick={() => handleAddToCollection(col.id)}
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
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default CollectionPickerModal;
