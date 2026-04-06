// ============================================
// GALLERY TOOLBAR - Search, Filter, View Mode
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Search, Filter, Grid3X3, List } from "lucide-react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface GalleryToolbarProps {
  searchQuery: string;
  viewMode: "grid" | "list";
  onSearchChange: (query: string) => void;
  onViewModeChange: (mode: "grid" | "list") => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const GalleryToolbar: React.FC<GalleryToolbarProps> = ({
  searchQuery,
  viewMode,
  onSearchChange,
  onViewModeChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search scans..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF9500]/30 transition-all"
        />
      </div>
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Filter className="w-4 h-4" />
          Filter
        </button>
        <div className="flex bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl p-1">
          <button
            onClick={() => onViewModeChange("grid")}
            aria-label="Grid view"
            className={`p-2 rounded-lg transition-colors ${
              viewMode === "grid"
                ? "bg-[#FF9500]/10 text-[#FF9500]"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            aria-label="List view"
            className={`p-2 rounded-lg transition-colors ${
              viewMode === "list"
                ? "bg-[#FF9500]/10 text-[#FF9500]"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default GalleryToolbar;
