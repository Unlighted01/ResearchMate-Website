// ============================================
// EXAM GRID CARD - Dashboard Simulation Tile
// Board-Grade Mock Exam Launcher with Deterministic Seed & Analytics
// ============================================

import React from "react";
import { Link } from "react-router-dom";
import { Award, Play, Trash2, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { StoredExam } from "../../../services/examService";

interface ExamGridCardProps {
  exam: StoredExam;
  index: number;
  onDelete?: (id: string, e: React.MouseEvent) => void;
}

export const ExamGridCard: React.FC<ExamGridCardProps> = ({
  exam,
  index,
  onDelete,
}) => {
  const formattedDate = new Date(exam.created_at || exam.updated_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const questionCount = exam.questions?.length || 0;
  const difficulty = exam.config?.difficulty || "mixed";
  const seed = exam.seed || (exam.config as any)?.seed;

  return (
    <div
      style={{ animationDelay: `${index * 40}ms` }}
      className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs hover:shadow-md hover:border-amber-400/80 dark:hover:border-amber-500/60 transition-all flex flex-col justify-between"
    >
      <div className="space-y-3">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[11px] font-bold font-mono uppercase tracking-wider">
              <Award className="w-3.5 h-3.5" />
              Mock Exam
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-mono capitalize">
              {difficulty}
            </span>
          </div>

          {onDelete && (
            <button
              type="button"
              onClick={(e) => onDelete(exam.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
              title="Delete saved exam"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-title tracking-tight line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            {exam.title}
          </h3>
          {exam.source_document_title && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5 truncate">
              <FileText className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{exam.source_document_title}</span>
            </p>
          )}
        </div>

        {/* Meta Stats */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {questionCount} Questions
          </span>
          {seed && <span>• Seed: {seed}</span>}
          <span>• {formattedDate}</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
        <span className="text-[11px] text-slate-400 font-mono">
          Ready to test
        </span>

        <Link
          to={`/app/exams?examId=${exam.id}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs hover:shadow-sm active:scale-95 transition-all"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Take Exam</span>
        </Link>
      </div>
    </div>
  );
};

export default ExamGridCard;
