// ============================================
// useStatisticsData - Data Fetching & Computation Hook
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import { useState, useEffect, useMemo } from "react";
import { getAllItems, StorageItem } from "../../../services/storageService";
import { Activity, Calendar, Layers, Zap } from "lucide-react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

export type TimeRange = "week" | "month" | "all";

export interface ChartPoint {
  name: string;
  count: number;
}

export interface DailyPoint {
  date: string;
  count: number;
}

export interface SourceDatum {
  [key: string]: string | number;
  name: string;
  value: number;
  color: string;
}

export interface StatCard {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  change: string;
}

export interface ComputedStats {
  weekTotal: number;
  avgPerDay: number;
  mostActiveDay: string;
  aiCoverage: string;
}

export interface StatsData {
  total: number;
  withSummary: number;
  bySource: SourceDatum[];
  weekly: ChartPoint[];
  daily: DailyPoint[];
}

export interface UseStatisticsDataReturn {
  allItems: StorageItem[];
  loading: boolean;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  stats: StatsData;
  computedStats: ComputedStats;
  statCards: StatCard[];
}

// ============================================
// PART 3: HOOK
// ============================================

const useStatisticsData = (): UseStatisticsDataReturn => {
  // ---------- PART 3A: STATE ----------
  const [allItems, setAllItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("week");

  // ---------- PART 3B: EFFECTS ----------
  useEffect(() => {
    getAllItems(1000).then((items) => {
      setAllItems(items);
      setLoading(false);
    });
  }, []);

  // ---------- PART 3C: COMPUTED STATS ----------
  const { stats, computedStats, statCards } = useMemo(() => {
    const now = new Date();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const periodDays =
      timeRange === "week" ? 7 : timeRange === "month" ? 30 : null;

    const cutoff = periodDays
      ? new Date(now.getTime() - periodDays * ONE_DAY)
      : null;
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

    // Chart data
    let weekly: ChartPoint[] = [];
    let daily: DailyPoint[] = [];

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
        map[
          d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        ] = 0;
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
      // All time: group by YYYY-MM
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
          name: d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
          }),
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

    // This-week vs prev-week counts (always fixed)
    const thisWeekItems = allItems.filter(
      (i) => (now.getTime() - new Date(i.createdAt).getTime()) / ONE_DAY < 7
    ).length;
    const prevWeekItems = allItems.filter((i) => {
      const daysAgo =
        (now.getTime() - new Date(i.createdAt).getTime()) / ONE_DAY;
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

    // Most active period
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

    const calcChange = (curr: number, prev: number): string => {
      if (!periodDays) return "";
      if (prev === 0) return curr > 0 ? "New" : "—";
      const pct = Math.round(((curr - prev) / prev) * 100);
      return (pct >= 0 ? "+" : "") + pct + "%";
    };

    const computedStatCards: StatCard[] = [
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

  return {
    allItems,
    loading,
    timeRange,
    setTimeRange,
    stats,
    computedStats,
    statCards,
  };
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default useStatisticsData;
