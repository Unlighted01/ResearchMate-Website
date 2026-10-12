// ============================================
// DASHBOARD STATS BAR - Quick stat cards
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface DashboardStatsBarProps {
  stats: {
    total: number;
    withAiSummary: number;
    fromExtension: number;
    thisWeek: number;
  };
}

// ============================================
// PART 3: COMPONENT
// ============================================

const DashboardStatsBar: React.FC<DashboardStatsBarProps> = ({ stats }) => {
  const statItems = [
    { label: "Total Documents", value: stats.total },
    { label: "Synthesized", value: stats.withAiSummary },
    { label: "STEM & LaTeX", value: stats.fromExtension },
    { label: "Added This Week", value: stats.thisWeek },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statItems.map((stat, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-2xs"
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mb-1 font-medium">
            {stat.label}
          </p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default DashboardStatsBar;
