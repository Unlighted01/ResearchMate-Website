// ============================================
// StatsBar.tsx - Dashboard statistics bar (4 stat cards)
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface Stats {
  total: number;
  withAiSummary: number;
  fromExtension: number;
  thisWeek: number;
}

interface StatsBarProps {
  stats: Stats;
}

// ============================================
// PART 3: CONSTANTS
// ============================================

const STAT_CONFIG = [
  { label: "Total Items", key: "total" as const, color: "#007AFF" },
  { label: "With AI Summary", key: "withAiSummary" as const, color: "#5856D6" },
  { label: "From Extension", key: "fromExtension" as const, color: "#34C759" },
  { label: "This Week", key: "thisWeek" as const, color: "#FF9500" },
];

// ============================================
// PART 4: MAIN COMPONENT
// ============================================

const StatsBar: React.FC<StatsBarProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-stagger">
      {STAT_CONFIG.map((stat, idx) => (
        <div
          key={stat.key}
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
            {stats[stat.key]}
          </p>
        </div>
      ))}
    </div>
  );
};

// ============================================
// PART 5: EXPORTS
// ============================================

export default StatsBar;
