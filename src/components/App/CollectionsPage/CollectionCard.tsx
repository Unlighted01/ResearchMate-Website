// ============================================
// CollectionCard.tsx - Academic Workstation Collection Card
// ============================================

import React from "react";
import { FolderOpen, Edit2, Calendar } from "lucide-react";
import { Collection as CollectionType } from "../../../services/collectionsService";
import { TrashIcon } from "../../icons";

interface CollectionCardProps {
  collection: CollectionType;
  onView: (col: CollectionType) => void;
  onEdit: (col: CollectionType) => void;
  onDelete: (col: CollectionType) => void;
}

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
      className="group relative bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-sm transition-all cursor-pointer overflow-hidden border-t-3"
      style={{ borderTopColor: col.color || "#6366F1" }}
    >
      <div className="flex justify-between items-start mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: `${col.color || "#6366F1"}18`,
            color: col.color || "#6366F1",
          }}
        >
          <FolderOpen className="w-4 h-4" />
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(col);
            }}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors"
            aria-label="Edit collection"
            title="Edit collection"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(col);
            }}
            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors"
            aria-label="Delete collection"
            title="Delete collection"
          >
            <TrashIcon size={14} dangerHover />
          </button>
        </div>
      </div>

      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1.5 font-title group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {col.name}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 h-8 font-sans leading-relaxed">
        {col.description || "No description provided."}
      </p>

      <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-600 dark:text-slate-300">
          {col.itemCount || 0} {col.itemCount === 1 ? "source" : "sources"}
        </span>
        <span className="text-[11px]">
          {new Date(col.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>
    </div>
  );
};

export default CollectionCard;
