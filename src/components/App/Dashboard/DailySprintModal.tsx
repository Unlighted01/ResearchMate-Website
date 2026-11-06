// ============================================
// DAILY 5-MINUTE SPRINT MODAL
// Fast, zero-setup, timed 5-question exam drill
// Implements PracticePacer timer, 30-second shortcut breakdowns,
// inline Twin Question generator, and persistent readiness scoring.
// ============================================

import React, { useState, useEffect } from "react";
import {
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  X,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Award,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  DEFAULT_SPRINT_QUESTIONS,
  recordExamAttempt,
  ExamReadinessStats,
} from "../../../services/examReadinessService";
import { generateTwinQuestion, ExamQuestion } from "../../../services/examService";
import LatexRenderer from "../../shared/LatexRenderer";

interface DailySprintModalProps {
  isOpen: boolean;
  onClose: (updatedStats?: ExamReadinessStats) => void;
}

interface SprintQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  category: string;
  explanation: string;
}

export const DailySprintModal: React.FC<DailySprintModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [questions, setQuestions] = useState<SprintQuestion[]>(DEFAULT_SPRINT_QUESTIONS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [isFinished, setIsFinished] = useState(false);
  const [finalStats, setFinalStats] = useState<ExamReadinessStats | null>(null);

  // Twin question state: maps question index to the generated twin question & state
  const [twinQuestions, setTwinQuestions] = useState<Record<number, {
    loading: boolean;
    data: ExamQuestion | null;
    userAnswer: string | null;
    isCorrect: boolean | null;
  }>>({});

  // Reset and shuffle sprint on open
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setUserAnswers({});
      setTimeLeft(300);
      setIsFinished(false);
      setFinalStats(null);
      setTwinQuestions({});
    }
  }, [isOpen]);

  // PracticePacer countdown timer
  useEffect(() => {
    if (!isOpen || isFinished) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isFinished, userAnswers]);

  if (!isOpen) return null;

  const handleSelectOption = (option: string) => {
    setUserAnswers((prev) => ({ ...prev, [currentIndex]: option }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    setIsFinished(true);

    let correctCount = 0;
    const categoryBreakdown: Record<string, { correct: number; total: number }> = {};

    questions.forEach((q, idx) => {
      const isCorrect = userAnswers[idx] === q.correctAnswer;
      if (isCorrect) correctCount++;

      const cat = q.category || "General";
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { correct: 0, total: 0 };
      categoryBreakdown[cat].total += 1;
      if (isCorrect) categoryBreakdown[cat].correct += 1;
    });

    const scorePercent = Math.round((correctCount / questions.length) * 100);

    const stats = recordExamAttempt({
      scorePercent,
      correctCount,
      totalQuestions: questions.length,
      mode: "sprint",
      categoryBreakdown,
    });

    setFinalStats(stats);
  };

  const handleGenerateTwin = async (idx: number, original: SprintQuestion) => {
    setTwinQuestions((prev) => ({
      ...prev,
      [idx]: { loading: true, data: null, userAnswer: null, isCorrect: null },
    }));

    try {
      const twin = await generateTwinQuestion({
        question: original.question,
        options: original.options,
        correctAnswer: original.correctAnswer,
        explanation: original.explanation,
        topic: original.category,
      });

      setTwinQuestions((prev) => ({
        ...prev,
        [idx]: { loading: false, data: twin, userAnswer: null, isCorrect: null },
      }));
    } catch (err) {
      console.error("Twin generation failed:", err);
      setTwinQuestions((prev) => ({
        ...prev,
        [idx]: { loading: false, data: null, userAnswer: null, isCorrect: null },
      }));
    }
  };

  const handleAnswerTwin = (idx: number, chosenOption: string, twin: ExamQuestion) => {
    const isCorrect = chosenOption === twin.correctAnswer;
    setTwinQuestions((prev) => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        userAnswer: chosenOption,
        isCorrect,
      },
    }));
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const activeQ = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <Zap className="w-4 h-4 fill-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-title tracking-tight">
                Daily 5-Minute Exam Sprint
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {isFinished ? "Performance Diagnostic" : `Question ${currentIndex + 1} of ${questions.length} • Rapid Fire`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isFinished && (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border transition-colors ${
                timeLeft < 60
                  ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/60 dark:border-rose-900/60 animate-pulse"
                  : "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/60 dark:border-indigo-900/60"
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(timeLeft)}</span>
              </div>
            )}
            <button
              onClick={() => onClose(finalStats || undefined)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sprint Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {!isFinished ? (
            /* ACTIVE EXAM QUESTION */
            <div className="space-y-5 animate-fade-in">
              {/* Category tag */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                  {activeQ.category}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {answeredCount}/{questions.length} answered
                </span>
              </div>

              {/* Question Text */}
              <div className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                <LatexRenderer text={activeQ.question} />
              </div>

              {/* 4 Options */}
              <div className="space-y-2.5 pt-2">
                {activeQ.options.map((opt, oIdx) => {
                  const letter = String.fromCharCode(65 + oIdx);
                  const isSelected = userAnswers[currentIndex] === opt;
                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelectOption(opt)}
                      className={`w-full text-left p-3.5 rounded-2xl border text-xs sm:text-sm font-medium transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 dark:border-indigo-500 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-xs"
                          : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 border transition-colors ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                      }`}>
                        {letter}
                      </span>
                      <span className="flex-1">
                        <LatexRenderer text={opt} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* SPRINT COMPLETED: DIAGNOSTIC SCORE & TWIN GENERATOR */
            <div className="space-y-6 animate-fade-in">
              {/* Score Header */}
              {finalStats && (
                <div className={`p-5 rounded-2xl border text-center ${
                  finalStats.isPassing
                    ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200"
                    : "bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-200"
                }`}>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 shadow-xs mb-3">
                    <Award className={`w-6 h-6 ${finalStats.isPassing ? "text-emerald-500" : "text-amber-500"}`} />
                  </div>
                  <h4 className="text-xl font-bold font-title">
                    Sprint Score: {questions.filter((q, i) => userAnswers[i] === q.correctAnswer).length}/{questions.length} ({Math.round((questions.filter((q, i) => userAnswers[i] === q.correctAnswer).length / questions.length) * 100)}%)
                  </h4>
                  <p className="text-xs font-mono mt-1 opacity-80">
                    {finalStats.isPassing
                      ? `🟢 Above the 80% passing threshold! Updated Readiness: ${finalStats.score}%`
                      : `🔴 Below the 80% threshold. Practice the 30-sec shortcuts below to boost your Readiness score (${finalStats.score}%).`}
                  </p>
                </div>
              )}

              {/* Breakdown of Every Question */}
              <div className="space-y-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Detailed Answer Key & 30-Second Exam Shortcuts
                </h5>

                {questions.map((q, idx) => {
                  const userAnswer = userAnswers[idx];
                  const isCorrect = userAnswer === q.correctAnswer;
                  const twinState = twinQuestions[idx];

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border text-xs space-y-2.5 transition-all ${
                        isCorrect
                          ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40"
                          : "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          )}
                          <span className="font-semibold text-slate-900 dark:text-white">
                            Question {idx + 1} • {q.category}
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          isCorrect
                            ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300"
                            : "bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300"
                        }`}>
                          {isCorrect ? "Correct (+1)" : "Missed"}
                        </span>
                      </div>

                      <p className="text-slate-800 dark:text-slate-200 font-medium">
                        <LatexRenderer text={q.question} />
                      </p>

                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center text-[11px] font-mono pt-1">
                        <span className="text-slate-500">Your choice: <strong className={isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>{userAnswer || "None"}</strong></span>
                        <span className="hidden sm:inline text-slate-300">•</span>
                        <span className="text-slate-500">Correct: <strong className="text-emerald-600 dark:text-emerald-400">{q.correctAnswer}</strong></span>
                      </div>

                      {/* Explanation / Shortcut */}
                      {q.explanation && (
                        <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                          <LatexRenderer text={q.explanation} />
                        </div>
                      )}

                      {/* INLINE TWIN QUESTION MASTER LOOP */}
                      {!isCorrect && (
                        <div className="pt-2">
                          {!twinState ? (
                            <button
                              onClick={() => handleGenerateTwin(idx, q)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-all shadow-xs cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>⚡ Practice Twin Question (Test Comprehension)</span>
                            </button>
                          ) : twinState.loading ? (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/50 text-indigo-600 text-xs font-mono">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Synthesizing identical question with new numbers...</span>
                            </div>
                          ) : twinState.data ? (
                            <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2.5 animate-fade-in">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                                  Twin Practice Question
                                </span>
                                {twinState.isCorrect !== null && (
                                  <span className={`text-[10px] font-mono font-bold ${
                                    twinState.isCorrect ? "text-emerald-600" : "text-rose-600"
                                  }`}>
                                    {twinState.isCorrect ? "✓ Mastered!" : "Review shortcut formula"}
                                  </span>
                                )}
                              </div>

                              <p className="font-medium text-slate-900 dark:text-slate-100 text-xs">
                                <LatexRenderer text={twinState.data.question} />
                              </p>

                              {/* Twin options */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {twinState.data.options.map((tOpt, tIdx) => {
                                  const isTwinSelected = twinState.userAnswer === tOpt;
                                  return (
                                    <button
                                      key={tIdx}
                                      onClick={() => handleAnswerTwin(idx, tOpt, twinState.data!)}
                                      disabled={twinState.userAnswer !== null}
                                      className={`p-2 rounded-lg border text-left text-[11px] font-medium transition-all ${
                                        twinState.userAnswer !== null
                                          ? tOpt === twinState.data!.correctAnswer
                                            ? "bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold"
                                            : isTwinSelected
                                            ? "bg-rose-100 dark:bg-rose-950/80 border-rose-500 text-rose-900 dark:text-rose-200"
                                            : "opacity-60 border-slate-200 dark:border-slate-800"
                                          : isTwinSelected
                                          ? "bg-indigo-600 text-white border-indigo-600"
                                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-indigo-50/50"
                                      }`}
                                    >
                                      <LatexRenderer text={tOpt} />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between">
          {!isFinished ? (
            <>
              <button
                onClick={() => {
                  if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
                }}
                disabled={currentIndex === 0}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
              >
                Previous
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <span>{isLastQuestion ? "Submit Sprint" : "Next Question"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => onClose(finalStats || undefined)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-950 text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
            >
              Close & Update Readiness Score
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
