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
    { label: "Total Items", value: stats.total, color: "#007AFF" },
    { label: "With AI Summary", value: stats.withAiSummary, color: "#5856D6" },
    { label: "From Extension", value: stats.fromExtension, color: "#34C759" },
    { label: "This Week", value: stats.thisWeek, color: "#FF9500" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-stagger">
      {statItems.map((stat, idx) => (
        <div
          key={idx}
          className="theme-surface glass-card hover-lift rounded-xl p-4 animate-fade-up"
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {stat.label}
          </p>
          <p
            className="theme-stat text-2xl font-bold"
            style={{ color: stat.color }}
          >
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
