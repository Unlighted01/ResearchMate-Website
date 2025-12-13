// ============================================
// STATISTICS PAGE - Apple Design
// ============================================

import React, { useState, useEffect } from "react";
import { getAllItems } from "../../services/storageService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  BarChart2,
  TrendingUp,
  Calendar,
  Layers,
  Zap,
  Clock,
  Target,
  Activity,
} from "lucide-react";

const Statistics = () => {
  const [stats, setStats] = useState({
    total: 0,
    withSummary: 0,
    bySource: [] as any[],
    weekly: [] as any[],
    daily: [] as any[],
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("week");

  useEffect(() => {
    getAllItems().then((items) => {
      const sourceCount = { extension: 0, mobile: 0, web: 0, smart_pen: 0 };
      const weekMap: Record<string, number> = {};
      const dayMap: Record<string, number> = {};
      let withSummary = 0;

      items.forEach((item) => {
        const src = (item.deviceSource || "web") as keyof typeof sourceCount;
        if (sourceCount[src] !== undefined) sourceCount[src]++;
        if (item.aiSummary) withSummary++;

        const day = new Date(item.createdAt).toLocaleDateString("en-US", {
          weekday: "short",
        });
        weekMap[day] = (weekMap[day] || 0) + 1;

        const date = new Date(item.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        dayMap[date] = (dayMap[date] || 0) + 1;
      });

      const pieColors = {
        extension: "#007AFF",
        mobile: "#5856D6",
        web: "#34C759",
        smart_pen: "#FF9500",
      };

      const pieData = Object.entries(sourceCount)
        .map(([name, value]) => ({
          name: name.replace("_", " "),
          value,
          color: pieColors[name as keyof typeof pieColors],
        }))
        .filter((d) => d.value > 0);

      const weeklyData = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
        (day) => ({ name: day, count: weekMap[day] || 0 })
      );

      const dailyData = Object.entries(dayMap)
        .slice(-14)
        .map(([date, count]) => ({ date, count }));

      setStats({
        total: items.length,
        withSummary,
        bySource: pieData,
        weekly: weeklyData,
        daily: dailyData,
      });
      setLoading(false);
    });
  }, []);

  const statCards = [
    {
      label: "Total Items",
      value: stats.total,
      icon: Layers,
      color: "#007AFF",
      change: "+12%",
    },
    {
      label: "AI Summaries",
      value: stats.withSummary,
      icon: Zap,
      color: "#5856D6",
      change: "+8%",
    },
    {
      label: "This Week",
      value: stats.weekly.reduce((a, b) => a + b.count, 0),
      icon: Calendar,
      color: "#34C759",
      change: "+24%",
    },
    {
      label: "Avg/Day",
      value: Math.round(stats.total / 7) || 0,
      icon: Activity,
      color: "#FF9500",
      change: "+5%",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="h-8 w-48 skeleton rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 h-28 skeleton"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 h-80 skeleton" />
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 h-80 skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ========== HEADER ========== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
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
        <div className="flex bg-gray-100 dark:bg-[#2C2C2E] rounded-xl p-1">
          {(["week", "month", "all"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
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

      {/* ========== STAT CARDS ========== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-gray-200/50 dark:border-gray-800 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <span className="text-xs font-medium text-[#34C759] bg-[#34C759]/10 px-2 py-1 rounded-full">
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stat.value}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* ========== CHARTS ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800">
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
              <BarChart data={stats.weekly} barCategoryGap="20%">
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
                />
                <Bar dataKey="count" fill="#007AFF" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source Breakdown */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Source Breakdown
            </h3>
            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
              All time
            </span>
          </div>
          <div className="h-64 flex items-center justify-center">
            {stats.bySource.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.bySource}
                    dataKey="value"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    strokeWidth={0}
                  >
                    {stats.bySource.map((entry, i) => (
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
            {stats.bySource.map((d) => (
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
      </div>

      {/* ========== ACTIVITY TREND ========== */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800">
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
            <AreaChart data={stats.daily}>
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

      {/* ========== INSIGHTS ========== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: Target,
            title: "Most Active Day",
            value: stats.weekly.reduce((a, b) => (a.count > b.count ? a : b), {
              name: "—",
              count: 0,
            }).name,
            color: "#FF9500",
          },
          {
            icon: Clock,
            title: "Items This Week",
            value: stats.weekly.reduce((a, b) => a + b.count, 0),
            color: "#5856D6",
          },
          {
            icon: Zap,
            title: "AI Coverage",
            value:
              stats.total > 0
                ? `${Math.round((stats.withSummary / stats.total) * 100)}%`
                : "0%",
            color: "#34C759",
          },
        ].map((insight, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-[#1C1C1E] rounded-xl p-4 border border-gray-200/50 dark:border-gray-800 flex items-center gap-4"
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
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {insight.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Statistics;
