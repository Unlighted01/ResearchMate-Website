// ============================================
// CollectionCard.tsx - Single Collection Grid Card
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { FolderOpen, Edit2 } from "lucide-react";
import { Collection as CollectionType } from "../../../services/collectionsService";
import { TrashIcon } from "../../icons";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface CollectionCardProps {
  collection: CollectionType;
  onView: (col: CollectionType) => void;
  onEdit: (col: CollectionType) => void;
  onDelete: (col: CollectionType) => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  onView,
  onEdit,
  onDelete,
}) => {
  const col = collection;

  return (
    <div
      onClick={() => onView(col)}
      className="group relative bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* Color accent bar */}
      <div
        className="absolute top-0 left-0 w-full h-1"
        style={{ backgroundColor: col.color }}
      />

      <div className="flex justify-between items-start mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{
            backgroundColor: `${col.color}20`,
            color: col.color,
          }}
        >
          <FolderOpen className="w-6 h-6" />
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(col);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            aria-label="Edit collection"
            title="Edit collection"
          >
            <Edit2 className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(col);
            }}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            aria-label="Delete collection"
            title="Delete collection"
          >
            <TrashIcon size={16} color="#EF4444" dangerHover />
          </button>
        </div>
      </div>

      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {col.name}
      </h3>
      <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">
        {col.description}
      </p>

      <div className="flex items-center text-xs text-gray-400 font-medium">
        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
          {col.itemCount || 0} items
        </span>
        <span className="mx-2">•</span>
        <span>Created {new Date(col.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default CollectionCard;
