// ============================================
// FLASHCARD DECK GRID CARD - Dashboard Active Recall Tile
// Spaced Repetition Deck Launcher with KaTeX Formula Support
// ============================================

import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, Play, Trash2, Calendar, FileText, Layers } from "lucide-react";
import { FlashcardDeckRecord } from "../../../services/examService";

interface FlashcardDeckGridCardProps {
  deck: FlashcardDeckRecord;
  index: number;
  onDelete?: (id: string, e: React.MouseEvent) => void;
}

export const FlashcardDeckGridCard: React.FC<FlashcardDeckGridCardProps> = ({
  deck,
  index,
  onDelete,
}) => {
  const formattedDate = new Date(deck.created_at || deck.updated_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const cardCount = deck.cards?.length || 0;

  return (
    <div
      style={{ animationDelay: `${index * 40}ms` }}
      className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs hover:shadow-md hover:border-indigo-400/80 dark:hover:border-indigo-500/60 transition-all flex flex-col justify-between"
    >
      <div className="space-y-3">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 text-[11px] font-bold font-mono uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              Flashcard Deck
            </span>
          </div>

          {onDelete && (
            <button
              type="button"
              onClick={(e) => onDelete(deck.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
              title="Delete saved deck"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-title tracking-tight line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {deck.title}
          </h3>
          {deck.source_document_title && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5 truncate">
              <FileText className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{deck.source_document_title}</span>
            </p>
          )}
        </div>

        {/* Meta Stats */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {cardCount} Cards
          </span>
          <span>• Active Recall</span>
          <span>• {formattedDate}</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
        <span className="text-[11px] text-slate-400 font-mono">
          Ready to study
        </span>

        <Link
          to={`/app/flashcards?deckId=${deck.id}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs hover:shadow-sm active:scale-95 transition-all"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Study Deck</span>
        </Link>
      </div>
    </div>
  );
};

export default FlashcardDeckGridCard;
