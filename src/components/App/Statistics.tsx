// ============================================
// STATISTICS PAGE - Apple Design
// ============================================

import React, { useState, useEffect, useMemo } from "react";
import { getAllItems, StorageItem } from "../../services/storageService";
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
  // ============================================
  // PART 5A: STATE
  // ============================================
  const [allItems, setAllItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("week");

  // ============================================
  // PART 5B: FETCH — runs once on mount
  // ============================================
  useEffect(() => {
    getAllItems(1000).then((items) => {
      setAllItems(items);
      setLoading(false);
    });
  }, []);

  // ============================================
  // PART 5C: COMPUTED STATS — re-runs on timeRange change
  // ============================================
  const { stats, computedStats, statCards } = useMemo(() => {
    const now = new Date();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const periodDays = timeRange === "week" ? 7 : timeRange === "month" ? 30 : null;

    // Period date boundaries
    const cutoff = periodDays ? new Date(now.getTime() - periodDays * ONE_DAY) : null;
    const prevCutoff = periodDays
      ? new Date(now.getTime() - 2 * periodDays * ONE_DAY)
      : null;

    const currentItems = cutoff
      ? allItems.filter((i) => new Date(i.createdAt) >= cutoff)
      : allItems;
    const prevItems =
      prevCutoff && cutoff
        ? allItems.filter((i) => {
            const d = new Date(i.createdAt);
            return d >= prevCutoff && d < cutoff;
          })
        : [];

    // Source counts + summary count
    const sourceCount = { extension: 0, mobile: 0, web: 0, smart_pen: 0 };
    let withSummary = 0;
    currentItems.forEach((item) => {
      const src = (item.deviceSource || "web") as keyof typeof sourceCount;
      if (src in sourceCount) sourceCount[src]++;
      if (item.aiSummary) withSummary++;
    });
    const prevWithSummary = prevItems.filter((i) => i.aiSummary).length;

    // Chart data — shape depends on timeRange
    let weekly: { name: string; count: number }[] = [];
    let daily: { date: string; count: number }[] = [];

    if (timeRange === "week") {
      const map: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * ONE_DAY);
        map[d.toLocaleDateString("en-US", { weekday: "short" })] = 0;
      }
      currentItems.forEach((item) => {
        const daysAgo = Math.floor(
          (now.getTime() - new Date(item.createdAt).getTime()) / ONE_DAY
        );
        if (daysAgo >= 0 && daysAgo <= 6) {
          const key = new Date(item.createdAt).toLocaleDateString("en-US", {
            weekday: "short",
          });
          if (key in map) map[key]++;
        }
      });
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * ONE_DAY);
        const name = d.toLocaleDateString("en-US", { weekday: "short" });
        weekly.push({ name, count: map[name] || 0 });
      }
      daily = weekly.map((d) => ({ date: d.name, count: d.count }));
    } else if (timeRange === "month") {
      const map: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * ONE_DAY);
        map[d.toLocaleDateString("en-US", { month: "short", day: "numeric" })] = 0;
      }
      currentItems.forEach((item) => {
        const key = new Date(item.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        if (key in map) map[key]++;
      });
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * ONE_DAY);
        const name = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        weekly.push({ name, count: map[name] || 0 });
      }
      daily = weekly.map((d) => ({ date: d.name, count: d.count }));
    } else {
      // All time: group by YYYY-MM for reliable sorting
      const map: Record<string, number> = {};
      allItems.forEach((item) => {
        const d = new Date(item.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        map[key] = (map[key] || 0) + 1;
      });
      const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
      weekly = sorted.map(([key, count]) => {
        const [yr, mo] = key.split("-");
        const d = new Date(Number(yr), Number(mo) - 1, 1);
        return {
          name: d.toLocaleDateString("en-US", { year: "numeric", month: "short" }),
          count,
        };
      });
      daily = weekly.map((d) => ({ date: d.name, count: d.count }));
    }

    // Pie chart data
    const pieColors = {
      extension: "#007AFF",
      mobile: "#5856D6",
      web: "#34C759",
      smart_pen: "#FF9500",
    };
    const bySource = Object.entries(sourceCount)
      .map(([name, value]) => ({
        name: name.replace("_", " "),
        value,
        color: pieColors[name as keyof typeof pieColors],
      }))
      .filter((d) => d.value > 0);

    // This-week vs prev-week counts (always fixed regardless of timeRange)
    const thisWeekItems = allItems.filter(
      (i) => (now.getTime() - new Date(i.createdAt).getTime()) / ONE_DAY < 7
    ).length;
    const prevWeekItems = allItems.filter((i) => {
      const daysAgo = (now.getTime() - new Date(i.createdAt).getTime()) / ONE_DAY;
      return daysAgo >= 7 && daysAgo < 14;
    }).length;

    // Avg/day
    const avgPerDay = periodDays
      ? Math.round(currentItems.length / periodDays) || 0
      : Math.round(currentItems.length / 365) || 0;
    const prevAvgPerDay =
      prevItems.length > 0 && periodDays
        ? Math.round(prevItems.length / periodDays)
        : 0;

    // Most active period label
    let maxCount = -1;
    let mostActiveDay = "—";
    weekly.forEach((d) => {
      if (d.count > maxCount) {
        maxCount = d.count;
        mostActiveDay = d.name;
      }
    });
    if (maxCount === 0) mostActiveDay = "—";

    const aiCoverage =
      currentItems.length > 0
        ? `${Math.round((withSummary / currentItems.length) * 100)}%`
        : "0%";

    const weekTotal = weekly.reduce((a, b) => a + b.count, 0);

    // Real percentage change — empty string when timeRange is "all" (no comparison)
    const calcChange = (curr: number, prev: number): string => {
      if (!periodDays) return "";
      if (prev === 0) return curr > 0 ? "New" : "—";
      const pct = Math.round(((curr - prev) / prev) * 100);
      return (pct >= 0 ? "+" : "") + pct + "%";
    };

    const computedStatCards = [
      {
        label: "Total Items",
        value: currentItems.length,
        icon: Layers,
        color: "#007AFF",
        change: calcChange(currentItems.length, prevItems.length),
      },
      {
        label: "AI Summaries",
        value: withSummary,
        icon: Zap,
        color: "#5856D6",
        change: calcChange(withSummary, prevWithSummary),
      },
      {
        label: "This Week",
        value: thisWeekItems,
        icon: Calendar,
        color: "#34C759",
        change: calcChange(thisWeekItems, prevWeekItems),
      },
      {
        label: "Avg/Day",
        value: avgPerDay,
        icon: Activity,
        color: "#FF9500",
        change: calcChange(avgPerDay, prevAvgPerDay),
      },
    ];

    return {
      stats: { total: currentItems.length, withSummary, bySource, weekly, daily },
      computedStats: { weekTotal, avgPerDay, mostActiveDay, aiCoverage },
      statCards: computedStatCards,
    };
  }, [allItems, timeRange]);

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
          <h1 className="theme-title text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
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
        <div className="theme-surface flex bg-gray-100 dark:bg-[#2C2C2E] rounded-xl p-1">
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

      {/* ========== CHARTS ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity */}
        {/* Weekly Activity */}
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
                  cursor={{ fill: "rgba(142, 142, 147, 0.1)" }}
                />
                <Bar dataKey="count" fill="#007AFF" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source Breakdown */}
        {/* Source Breakdown */}
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
      {/* ========== ACTIVITY TREND ========== */}
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

      {/* ========== INSIGHTS ========== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
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
        ].map((insight, idx) => (
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
    </div>
  );
};

export default Statistics;
