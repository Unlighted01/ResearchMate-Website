// ============================================
// WeeklyActivityChart - Bar chart of weekly items
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ChartPoint } from "./useStatisticsData";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface WeeklyActivityChartProps {
  data: ChartPoint[];
}

// ============================================
// PART 3: COMPONENT
// ============================================

const WeeklyActivityChart: React.FC<WeeklyActivityChartProps> = ({ data }) => {
  return (
    <div className="theme-surface glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Weekly Activity
        </h3>
        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
          Last 7 days
        </span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#8E8E93" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#8E8E93" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1C1C1E",
                border: "none",
                borderRadius: "12px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
              }}
              labelStyle={{ color: "#fff" }}
              itemStyle={{ color: "#007AFF" }}
              cursor={{ fill: "rgba(142, 142, 147, 0.1)" }}
            />
            <Bar dataKey="count" fill="#007AFF" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default WeeklyActivityChart;
