// ============================================
// SourceBreakdownChart - Pie chart of item sources
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SourceDatum } from "./useStatisticsData";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface SourceBreakdownChartProps {
  data: SourceDatum[];
}

// ============================================
// PART 3: COMPONENT
// ============================================

const SourceBreakdownChart: React.FC<SourceBreakdownChartProps> = ({ data }) => {
  return (
    <div className="theme-surface glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Source Breakdown
        </h3>
        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
          All time
        </span>
      </div>
      <div className="h-64 flex items-center justify-center">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                strokeWidth={0}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1C1C1E",
                  border: "none",
                  borderRadius: "12px",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                }}
                labelStyle={{ color: "#fff" }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400">No data available</p>
        )}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
              {d.name}
            </span>
            <span className="text-xs font-medium text-gray-900 dark:text-white">
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default SourceBreakdownChart;
