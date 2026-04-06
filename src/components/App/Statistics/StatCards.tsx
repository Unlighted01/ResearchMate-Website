// ============================================
// StatCards - Overview Metric Cards Grid
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import type { StatCard } from "./useStatisticsData";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface StatCardsProps {
  statCards: StatCard[];
}

// ============================================
// PART 3: COMPONENT
// ============================================

const StatCards: React.FC<StatCardsProps> = ({ statCards }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, idx) => (
        <div
          key={idx}
          className="theme-surface glass-card rounded-2xl p-5 hover-lift transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${stat.color}15` }}
            >
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
            {stat.change && (
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  stat.change.startsWith("+") || stat.change === "New"
                    ? "text-[#34C759] bg-[#34C759]/10"
                    : stat.change === "—"
                    ? "text-gray-400 bg-gray-100 dark:bg-gray-800"
                    : "text-[#FF3B30] bg-[#FF3B30]/10"
                }`}
              >
                {stat.change}
              </span>
            )}
          </div>
          <p className="theme-stat text-2xl font-bold text-gray-900 dark:text-white">
            {stat.value}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default StatCards;
