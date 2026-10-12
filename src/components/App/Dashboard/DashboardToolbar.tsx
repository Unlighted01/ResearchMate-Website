// ============================================
// DASHBOARD TOOLBAR - Academic Workstation Search & Controls
// ============================================

import React from "react";
import { Search, Filter, Grid3X3, List } from "lucide-react";
import { SearchFilters } from "../../shared/AdvancedSearchFilter";

interface DashboardToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  advancedFilters: SearchFilters;
  onShowAdvancedFilters: () => void;
}

const DashboardToolbar: React.FC<DashboardToolbarProps> = ({
  searchQuery,
  onSearchChange,
  searchInputRef,
  viewMode,
  onViewModeChange,
  advancedFilters,
  onShowAdvancedFilters,
}) => {
  const hasActiveFilters =
    advancedFilters.dateRange ||
    (advancedFilters.deviceSource && advancedFilters.deviceSource.length > 0) ||
    advancedFilters.hasAiSummary !== undefined ||
    (advancedFilters.tags && advancedFilters.tags.length > 0);

  return (
    <div className="flex flex-col sm:flex-row gap-2.5">
      <div className="flex-1 relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Filter corpus by title, quote text, or author..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-xs"
          aria-label="Filter library items"
          aria-describedby="search-hint"
        />
        <span id="search-hint" className="sr-only">
          Press Ctrl+K or Cmd+K to focus search
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onShowAdvancedFilters}
          className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium transition-colors shadow-xs ${
            hasActiveFilters
              ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
              : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
          aria-label="Advanced filters"
        >
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>
        <div className="flex bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-lg p-0.5 shadow-xs">
          <button
            onClick={() => {
              onViewModeChange("grid");
              localStorage.setItem("researchMate_viewMode", "grid");
            }}
            aria-label="Grid view"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === "grid"
                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              onViewModeChange("list");
              localStorage.setItem("researchMate_viewMode", "list");
            }}
            aria-label="List view"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === "list"
                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardToolbar;
