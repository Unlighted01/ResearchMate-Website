// ============================================
// ActivityTrendChart - High-Fidelity Area Chart with SVG Glow
// ============================================

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Sparkles } from "lucide-react";
import type { DailyPoint } from "./useStatisticsData";

interface ActivityTrendChartProps {
  data: DailyPoint[];
}

const ActivityTrendChart: React.FC<ActivityTrendChartProps> = ({ data }) => {
  return (
    <div className="theme-surface glass-card rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800/80 shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl flex items-center justify-center border border-blue-500/10 shadow-sm animate-float-slow">
            <TrendingUp className="w-5 h-5 text-[#007AFF]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              Synthesis Trend
              <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            </h3>
            <p className="text-[11px] text-slate-400">Chronological daily knowledge capturing rate</p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold text-blue-500 bg-blue-500/5 px-2.5 py-1 rounded-lg border border-blue-500/10 uppercase tracking-widest">
          Active Range: 14 Days
        </span>
      </div>

      <div className="h-68">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {/* Primary Area Fill Gradient */}
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#007AFF" stopOpacity={0.25} />
                <stop offset="50%" stopColor="#5856D6" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#AF52DE" stopOpacity={0.0} />
              </linearGradient>

              {/* Stroke Gradient */}
              <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#007AFF" />
                <stop offset="50%" stopColor="#5856D6" />
                <stop offset="100%" stopColor="#AF52DE" />
              </linearGradient>

              {/* Native SVG Blur Filter for glowing line effect */}
              <filter id="neonGlow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Subtle mesh grid backing */}
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-slate-200/50 dark:text-slate-800/40"
            />

            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#8E8E93", fontWeight: 500 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#8E8E93", fontWeight: 500 }}
              dx={-5}
            />

            {/* High-Fidelity Custom Tooltip */}
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(148, 163, 184, 0.18)",
                borderRadius: "16px",
                boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.12)",
              }}
              labelStyle={{ fontSize: "11px", fontWeight: "bold", color: "#64748b" }}
              itemStyle={{ fontSize: "12px", fontWeight: "extrabold", color: "#007AFF" }}
              cursor={{
                stroke: "url(#trendStroke)",
                strokeWidth: 1.5,
                strokeDasharray: "4 4",
              }}
              formatter={(value) => [`${value} items synthesized`, "Activity"]}
            />

            {/* Glowing background line */}
            <Area
              type="monotone"
              dataKey="count"
              stroke="url(#trendStroke)"
              strokeWidth={3}
              fill="url(#trendFill)"
              filter="url(#neonGlow)"
              activeDot={{
                r: 6,
                stroke: "#ffffff",
                strokeWidth: 2,
                fill: "#007AFF",
                boxShadow: "0 4px 10px rgba(0,74,255,0.4)",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ActivityTrendChart;
