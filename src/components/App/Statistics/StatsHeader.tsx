// ============================================
// StatsHeader - Page Title & Time Range Selector
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { BarChart2 } from "lucide-react";
import type { TimeRange } from "./useStatisticsData";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface StatsHeaderProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const StatsHeader: React.FC<StatsHeaderProps> = ({
  timeRange,
  onTimeRangeChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="theme-title text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#34C759] to-[#30D158] rounded-xl flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          Statistics
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Track your research activity and insights
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="theme-surface flex bg-gray-100 dark:bg-[#2C2C2E] rounded-xl p-1">
        {(["week", "month", "all"] as const).map((range) => (
          <button
            key={range}
            onClick={() => onTimeRangeChange(range)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              timeRange === range
                ? "bg-white dark:bg-[#3A3A3C] text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default StatsHeader;
