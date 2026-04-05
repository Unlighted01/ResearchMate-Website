// ============================================
// SearchAndFilters.tsx - Search input, filter button, view mode toggle
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Search, Filter, Grid3X3, List } from "lucide-react";
import { SearchFilters } from "../../shared/AdvancedSearchFilter";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface SearchAndFiltersProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (show: boolean) => void;
  advancedFilters: SearchFilters;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
}

// ============================================
// PART 3: MAIN COMPONENT
// ============================================

const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  searchInputRef,
  showAdvancedFilters,
  setShowAdvancedFilters,
  advancedFilters,
  viewMode,
  setViewMode,
}) => {
  const hasActiveFilters =
    !!(
      advancedFilters.dateRange ||
      advancedFilters.deviceSource?.length ||
      advancedFilters.hasAiSummary !== undefined ||
      advancedFilters.tags?.length
    );

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search research items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="theme-search theme-input w-full pl-11 pr-4 py-3 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition-all"
          aria-label="Search research items"
          aria-describedby="search-hint"
        />
        <span id="search-hint" className="sr-only">
          Press Ctrl+K or Cmd+K to focus search
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowAdvancedFilters(true)}
          className="theme-surface theme-btn theme-btn-outline flex items-center gap-2 px-4 py-3 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          aria-label="Advanced filters"
        >
          <Filter className="w-4 h-4" />
          Filter
          {hasActiveFilters && (
            <span className="ml-1 w-2 h-2 bg-purple-500 rounded-full" />
          )}
        </button>
        <div className="flex bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl p-1">
          <button
            onClick={() => {
              setViewMode("grid");
              localStorage.setItem("researchMate_viewMode", "grid");
            }}
            aria-label="Grid view"
            className={`p-2 rounded-lg transition-colors ${
              viewMode === "grid"
                ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setViewMode("list");
              localStorage.setItem("researchMate_viewMode", "list");
            }}
            aria-label="List view"
            className={`p-2 rounded-lg transition-colors ${
              viewMode === "list"
                ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
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

export default SearchAndFilters;
