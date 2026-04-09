// ============================================
// STATISTICS PAGE - Orchestrates sub-components
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import useStatisticsData from "./useStatisticsData";
import StatsHeader from "./StatsHeader";
import StatCards from "./StatCards";
import WeeklyActivityChart from "./WeeklyActivityChart";
import SourceBreakdownChart from "./SourceBreakdownChart";
import ActivityTrendChart from "./ActivityTrendChart";
import InsightsBar from "./InsightsBar";
import StatsSkeleton from "./StatsSkeleton";

// ============================================
// PART 2: COMPONENT
// ============================================

const Statistics: React.FC = () => {
  const { loading, timeRange, setTimeRange, stats, computedStats, statCards } =
    useStatisticsData();

  // ---------- PART 2A: LOADING STATE ----------
  if (loading) return <StatsSkeleton />;

  // ---------- PART 2B: RENDER ----------
  return (
    <div className="space-y-6 animate-fade-in-up">
      <StatsHeader timeRange={timeRange} onTimeRangeChange={setTimeRange} />
      <StatCards statCards={statCards} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeeklyActivityChart data={stats.weekly} />
        <SourceBreakdownChart data={stats.bySource} />
      </div>

      <ActivityTrendChart data={stats.daily} />
      <InsightsBar computedStats={computedStats} />
    </div>
  );
};

// ============================================
// PART 3: EXPORTS
// ============================================

export default Statistics;
