// ============================================
// InsightsBar - Quick insight metric cards
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Target, Clock, Zap } from "lucide-react";
import type { ComputedStats } from "./useStatisticsData";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface InsightsBarProps {
  computedStats: ComputedStats;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const InsightsBar: React.FC<InsightsBarProps> = ({ computedStats }) => {
  const insights = [
    {
      icon: Target,
      title: "Most Active Day",
      value: computedStats.mostActiveDay,
      color: "#FF9500",
    },
    {
      icon: Clock,
      title: "Items This Week",
      value: computedStats.weekTotal,
      color: "#5856D6",
    },
    {
      icon: Zap,
      title: "AI Coverage",
      value: computedStats.aiCoverage,
      color: "#34C759",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {insights.map((insight, idx) => (
        <div
          key={idx}
          className="theme-surface glass-card rounded-xl p-4 hover-lift flex items-center gap-4"
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${insight.color}15` }}
          >
            <insight.icon
              className="w-6 h-6"
              style={{ color: insight.color }}
            />
          </div>
          <div>
            <p className="text-xs text-gray-500">{insight.title}</p>
            <p className="theme-stat text-xl font-bold text-gray-900 dark:text-white">
              {insight.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default InsightsBar;
