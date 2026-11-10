// ============================================
// COMPACT SPRINT WIDGET - Streamlined Exam Readiness & Drill Bar
// Space-Efficient Dashboard Widget (~68px) Replacing 400px Hero Banner
// ============================================

import React from "react";
import { Link } from "react-router-dom";
import { Zap, Award, ArrowRight } from "lucide-react";
import { ExamReadinessStats } from "../../../services/examReadinessService";
import { QuestionBankStats } from "../../../services/questionBankService";

interface CompactSprintWidgetProps {
  readinessStats: ExamReadinessStats;
  bankStats: QuestionBankStats;
  onStartSprint: () => void;
}

export const CompactSprintWidget: React.FC<CompactSprintWidgetProps> = ({
  readinessStats,
  bankStats,
  onStartSprint,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl px-5 py-3.5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Readiness Metric & Streak */}
        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
          {/* Circular/Pill Score Gauge */}
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
              <span className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900 dark:text-white tracking-tight">
                {readinessStats.isCalibrated ? `${readinessStats.score}%` : "—"}
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                Readiness
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-title">
                  {readinessStats.isCalibrated
                    ? readinessStats.isPassing
                      ? "🟢 Projected Passing"
                      : `🔴 ${readinessStats.passingThreshold - readinessStats.score}% below 80% passing target`
                    : "Exam Readiness Score"}
                </span>
                <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-medium">
                  🔥 {readinessStats.streakDays}-Day Streak
                </span>
              </div>

              {/* Context Badges */}
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                {readinessStats.primaryWeakness ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Priority: <strong>{readinessStats.primaryWeakness}</strong> ({readinessStats.categoryAccuracies[readinessStats.primaryWeakness]?.percent || 0}%)
                  </span>
                ) : (
                  <span>Benchmark: 80% passing target</span>
                )}
                <span>•</span>
                <span>Bank: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{bankStats.totalQuestions} Qs</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions (Sprint CTA & Full Mock Link) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onStartSprint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-semibold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-white shrink-0" />
            <span>Start 5-Min Sprint</span>
          </button>

          <Link
            to="/app/exams"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Full Mock Exam</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CompactSprintWidget;
