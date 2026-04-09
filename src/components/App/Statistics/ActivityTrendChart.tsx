// ============================================
// ActivityTrendChart - Area chart of daily activity
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { DailyPoint } from "./useStatisticsData";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface ActivityTrendChartProps {
  data: DailyPoint[];
}

// ============================================
// PART 3: COMPONENT
// ============================================

const ActivityTrendChart: React.FC<ActivityTrendChartProps> = ({ data }) => {
  return (
    <div className="theme-surface glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#007AFF]/10 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[#007AFF]" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Activity Trend
            </h3>
            <p className="text-xs text-gray-500">Last 14 days</p>
          </div>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#007AFF" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#8E8E93" }}
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
              cursor={{
                stroke: "#8E8E93",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#007AFF"
              strokeWidth={2}
              fill="url(#colorCount)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default ActivityTrendChart;
