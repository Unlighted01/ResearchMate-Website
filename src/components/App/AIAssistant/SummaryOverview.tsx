// ============================================
// SUMMARY OVERVIEW - AI Assistant Overview Tab
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import {
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Brain,
  Wand2,
} from "lucide-react";
import { StorageItem } from "../../../services/storageService";
import type { SummaryMode } from "../../../services/geminiService";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface SummaryOverviewProps {
  items: StorageItem[];
  itemsWithoutSummary: StorageItem[];
  itemsWithSummary: StorageItem[];
  summarizing: string | null;
  batchProcessing: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  summaryMode: SummaryMode;
  setSummaryMode: (mode: SummaryMode) => void;
  handleSummarize: (item: StorageItem) => Promise<void>;
  handleBatchSummarize: () => Promise<void>;
  setSelectedItem: (item: StorageItem | null) => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const SUMMARY_MODES: { key: SummaryMode; label: string; desc: string }[] = [
  { key: "ultra-short", label: "⚡ Short", desc: "5-10%" },
  { key: "standard", label: "📝 Standard", desc: "15-25%" },
  { key: "detailed", label: "📖 Detailed", desc: "30-40%" },
];

const SummaryOverview: React.FC<SummaryOverviewProps> = ({
  items,
  itemsWithoutSummary,
  itemsWithSummary,
  summarizing,
  batchProcessing,
  searchQuery,
  setSearchQuery,
  summaryMode,
  setSummaryMode,
  handleSummarize,
  handleBatchSummarize,
  setSelectedItem,
}) => {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-gray-200/50 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#FF9500]/10 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#FF9500]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {itemsWithoutSummary.length}
              </p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-gray-200/50 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#34C759]/10 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-[#34C759]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {itemsWithSummary.length}
              </p>
              <p className="text-xs text-gray-500">Summarized</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-gray-200/50 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#007AFF]/10 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-[#007AFF]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {items.length > 0
                  ? Math.round((itemsWithSummary.length / items.length) * 100)
                  : 0}
                %
              </p>
              <p className="text-xs text-gray-500">Coverage</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <div className="flex items-center justify-between">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition-all"
          />
        </div>
        {itemsWithoutSummary.length > 0 && (
          <button
            onClick={handleBatchSummarize}
            disabled={batchProcessing}
            className="ml-4 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95 disabled:opacity-50"
          >
            {batchProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Summarize All ({Math.min(5, itemsWithoutSummary.length)})
              </>
            )}
          </button>
        )}
      </div>

      {/* Summary Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          Mode:
        </span>
        <div className="flex bg-gray-100 dark:bg-[#2C2C2E] rounded-lg p-0.5">
          {SUMMARY_MODES.map((mode) => (
            <button
              key={mode.key}
              onClick={() => setSummaryMode(mode.key)}
              title={`${mode.label} — ${mode.desc} of original`}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                summaryMode === mode.key
                  ? "bg-white dark:bg-[#3A3A3C] text-[#007AFF] shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* List Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Needs Summary
          </h3>
          {itemsWithoutSummary.length === 0 ? (
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-8 border border-gray-200/50 dark:border-gray-800 text-center">
              <p className="text-gray-500">All caught up!</p>
            </div>
          ) : (
            itemsWithoutSummary.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-[#1C1C1E] p-4 rounded-xl border border-gray-200/50 dark:border-gray-800 flex justify-between items-center"
              >
                <div className="truncate pr-4 flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                    {item.sourceTitle || "Untitled"}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleSummarize(item)}
                  disabled={summarizing === item.id}
                  className="px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-lg text-xs font-medium hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] transition-colors"
                >
                  {summarizing === item.id ? "..." : "Summarize"}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Completed */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Completed
          </h3>
          {itemsWithSummary.length === 0 ? (
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-8 border border-gray-200/50 dark:border-gray-800 text-center">
              <p className="text-gray-500">No summaries yet</p>
            </div>
          ) : (
            itemsWithSummary.slice(0, 5).map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="bg-white dark:bg-[#1C1C1E] p-4 rounded-xl border border-gray-200/50 dark:border-gray-800 cursor-pointer hover:border-[#34C759]/50 transition-colors"
              >
                <h4 className="font-medium text-gray-900 dark:text-white truncate">
                  {item.sourceTitle || "Untitled"}
                </h4>
                <p className="text-xs text-[#34C759] mt-1 line-clamp-1">
                  "{item.aiSummary}"
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default SummaryOverview;
