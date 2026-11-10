// ============================================
// QUESTION BANK GRID CARD - Dashboard Test Bank Tile
// Grounded Ingested Bank with 1-Click Practice & Study Launchers
// ============================================

import React from "react";
import { Link } from "react-router-dom";
import { Database, Play, BookOpen, Trash2, CheckCircle2, FileText } from "lucide-react";
import { ImportBatch } from "../../../services/questionBankService";

interface QuestionBankGridCardProps {
  batch: ImportBatch;
  index: number;
  onDelete?: (batchId: string, e: React.MouseEvent) => void;
}

export const QuestionBankGridCard: React.FC<QuestionBankGridCardProps> = ({
  batch,
  index,
  onDelete,
}) => {
  const formattedDate = new Date(batch.timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      style={{ animationDelay: `${index * 40}ms` }}
      className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs hover:shadow-md hover:border-emerald-400/80 dark:hover:border-emerald-500/60 transition-all flex flex-col justify-between"
    >
      <div className="space-y-3">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold font-mono uppercase tracking-wider">
              <Database className="w-3.5 h-3.5" />
              Question Bank
            </span>
          </div>

          {onDelete && (
            <button
              type="button"
              onClick={(e) => onDelete(batch.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
              title="Delete question bank batch"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-title tracking-tight line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {batch.subject}
          </h3>
          {batch.sourceFile && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5 truncate">
              <FileText className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{batch.sourceFile}</span>
            </p>
          )}
        </div>

        {/* Meta Stats */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono pt-1 border-t border-slate-100 dark:border-slate-800/80 flex-wrap">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {batch.totalQuestions} Questions
          </span>
          <span>•</span>
          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> {batch.verifiedCount} Verified
          </span>
          <span>• {formattedDate}</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
        <Link
          to={`/app/flashcards`}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <BookOpen className="w-3 h-3" />
          <span>Flashcards</span>
        </Link>

        <Link
          to={`/app/exams`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs hover:shadow-sm active:scale-95 transition-all"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Practice Exam</span>
        </Link>
      </div>
    </div>
  );
};

export default QuestionBankGridCard;
