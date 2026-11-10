// ============================================
// DASHBOARD TOOLBAR - Academic Workstation Search & Controls
// ============================================

import React from "react";
import { Search, Filter, Grid3X3, List, Award, Layers, Database, FileText } from "lucide-react";
import { SearchFilters } from "../../shared/AdvancedSearchFilter";

interface DashboardToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  advancedFilters: SearchFilters;
  onShowAdvancedFilters: () => void;
  assetTab: "all" | "exams" | "flashcards" | "bank" | "materials";
  onAssetTabChange: (tab: "all" | "exams" | "flashcards" | "bank" | "materials") => void;
  examsCount: number;
  decksCount: number;
  batchesCount: number;
  materialsCount: number;
}

const DashboardToolbar: React.FC<DashboardToolbarProps> = ({
  searchQuery,
  onSearchChange,
  searchInputRef,
  viewMode,
  onViewModeChange,
  advancedFilters,
  onShowAdvancedFilters,
  assetTab,
  onAssetTabChange,
  examsCount,
  decksCount,
  batchesCount,
  materialsCount,
}) => {
  const hasActiveFilters =
    advancedFilters.dateRange ||
    (advancedFilters.deviceSource && advancedFilters.deviceSource.length > 0) ||
    advancedFilters.hasAiSummary !== undefined ||
    (advancedFilters.tags && advancedFilters.tags.length > 0);

  const totalCount = examsCount + decksCount + batchesCount + materialsCount;

  return (
    <div className="space-y-3">
      {/* Search and Utility Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search exams, study decks, test banks, and materials..."
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

      {/* Asset Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => onAssetTabChange("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            assetTab === "all"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80"
          }`}
        >
          All Assets ({totalCount})
        </button>

        <button
          onClick={() => onAssetTabChange("exams")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            assetTab === "exams"
              ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80"
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Mock Exams ({examsCount})</span>
        </button>

        <button
          onClick={() => onAssetTabChange("flashcards")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            assetTab === "flashcards"
              ? "bg-indigo-600 text-white font-bold shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Flashcard Decks ({decksCount})</span>
        </button>

        <button
          onClick={() => onAssetTabChange("bank")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            assetTab === "bank"
              ? "bg-emerald-600 text-white font-bold shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80"
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Question Banks ({batchesCount})</span>
        </button>

        <button
          onClick={() => onAssetTabChange("materials")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            assetTab === "materials"
              ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-bold shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Materials & Notes ({materialsCount})</span>
        </button>
      </div>
    </div>
  );
};

export default DashboardToolbar;
