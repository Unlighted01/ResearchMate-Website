// ============================================
// MOCK EXAM ENGINE - Precision Practice Tests & Diagnostics
// Universal Academic Workstation (SHS STEM to College 2nd-Year Core)
// Dual-Entry: Grounded AI Multi-Batch Generation + Manual Editor & TXT/CSV Importer
// ============================================

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Award,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  GraduationCap,
  Clock,
  Flag,
  SlidersHorizontal,
  BarChart2,
  Printer,
  AlertCircle,
  FileText,
  Plus,
  Upload,
  Edit2,
  Trash2,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { StorageItem } from "../../../services/storageService";
import {
  Question,
  generateUUID,
  saveExam,
  saveExamAttempt,
  getExamAttempts,
  generateExamInBatches,
  BatchProgress,
  ExamSectionConfig,
  ExamAttemptRecord,
} from "../../../services/examService";
import AcademicMathView from "../../shared/AcademicMathView";
import QuestionEditorModal from "./QuestionEditorModal";
import QuestionImportModal from "./QuestionImportModal";
import MaterialScopeSelector, { MaterialScopeSelection } from "./MaterialScopeSelector";

export interface MockExamEngineProps {
  items: StorageItem[];
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

// -------------------------------------------------------------
// Universal Academic Starter Pool (Standard Fallback Bank)
// -------------------------------------------------------------
const UNIVERSAL_FALLBACK_POOL: Question[] = [
  {
    id: "fallback-q1",
    question: "Evaluate the limit: $\\lim_{x \\to 0} \\frac{\\sin(3x)}{x}$.",
    options: ["0", "1", "3", "Does not exist"],
    correctIndex: 2,
    explanation: "Using the fundamental trigonometric limit $\\lim_{u \\to 0} \\frac{\\sin(u)}{u} = 1$, rewrite $\\frac{\\sin(3x)}{x} = 3 \\cdot \\frac{\\sin(3x)}{3x}$. As $x \\to 0$, $3x \\to 0$, yielding $3 \\cdot 1 = 3$. Common exam trap: forgetting the inner coefficient.",
    topicTag: "Calculus & Limits",
  },
  {
    id: "fallback-q2",
    question: "In symbolic logic, which of the following expressions is logically equivalent to the conditional proposition $P \\to Q$?",
    options: ["$\\neg P \\lor Q$", "$\\neg P \\land Q$", "$P \\land \\neg Q$", "$Q \\to P$"],
    correctIndex: 0,
    explanation: "By the conditional-disjunction equivalence law: $P \\to Q \\equiv \\neg P \\lor Q \\equiv \\neg Q \\to \\neg P$ (Contrapositive). The converse $Q \\to P$ is a common logical fallacy and not equivalent.",
    topicTag: "Discrete Mathematics: Logic",
  },
  {
    id: "fallback-q3",
    question: "A $4.0\\text{ kg}$ cart travelling at $5.0\\text{ m/s}$ along a frictionless horizontal track collides and locks together with a stationary $6.0\\text{ kg}$ cart. What is their final combined speed?",
    options: ["$1.5\\text{ m/s}$", "$2.0\\text{ m/s}$", "$2.5\\text{ m/s}$", "$3.3\\text{ m/s}$"],
    correctIndex: 1,
    explanation: "By conservation of linear momentum: $m_1 v_1 + m_2 v_2 = (m_1 + m_2) v_f$. Substituting values: $(4.0)(5.0) + (6.0)(0) = (4.0 + 6.0) v_f \\implies 20.0 = 10.0 v_f \\implies v_f = 2.0\\text{ m/s}$. Upright SI units: $\\text{m/s}$.",
    topicTag: "Physics: Mechanics",
  },
  {
    id: "fallback-q4",
    question: "Working together, Pipe A can fill an empty reservoir in 6 hours, while Pipe B can fill it in 12 hours. How many hours will it take to fill the reservoir if both pipes operate simultaneously?",
    options: ["3.0 hours", "4.0 hours", "4.5 hours", "9.0 hours"],
    correctIndex: 1,
    explanation: "Work rate equation: Combined rate = $\\frac{1}{6} + \\frac{1}{12} = \\frac{2}{12} + \\frac{1}{12} = \\frac{3}{12} = \\frac{1}{4}$ of reservoir/hr. Total Time = $\\frac{1}{1/4} = 4.0\\text{ hours}$. Common exam trap: averaging the hours $\\frac{6 + 12}{2} = 9$.",
    topicTag: "Quantitative Word Problems",
  },
  {
    id: "fallback-q5",
    question: "Identify the sentence that correctly adheres to grammatical subject-verb agreement:",
    options: [
      "Neither the supervising professor nor the research scholars was in the laboratory.",
      "Neither the supervising professor nor the research scholars were in the laboratory.",
      "Neither the supervising professor nor the research scholars has been in the laboratory.",
      "Neither the supervising professor nor the research scholars is in the laboratory.",
    ],
    correctIndex: 1,
    explanation: "Under the Proximity Rule for correlative conjunctions ('Neither... nor'), the finite verb agrees with the closer subject. Here, 'research scholars' is plural and adjacent to the verb, requiring 'were'.",
    topicTag: "Verbal & Written Grammar",
  },
];

export const MockExamEngine: React.FC<MockExamEngineProps> = ({
  items,
  showToast,
}) => {
  // Configuration State
  const [topicInput, setTopicInput] = useState("");
  const [scopeSelection, setScopeSelection] = useState<MaterialScopeSelection>({
    mode: "all",
    selectedIds: [],
  });
  const [presetCount, setPresetCount] = useState<"10" | "25" | "50" | "100" | "160">("10");
  const [difficulty, setDifficulty] = useState<"easy" | "mixed" | "hard">("mixed");
  const [benchmarkThreshold, setBenchmarkThreshold] = useState<number>(80);
  const [timedMode, setTimedMode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"stepper" | "list">("stepper");
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  // Modals State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<Question | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Exam Execution State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState("");
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [examHistory, setExamHistory] = useState<ExamAttemptRecord[]>([]);
  const [activeExamId, setActiveExamId] = useState<string>(() => generateUUID());

  // Generation abort controller ref
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<any>(null);

  // Load history from Supabase / Local cache
  useEffect(() => {
    getExamAttempts().then((attempts) => {
      setExamHistory(attempts);
    }).catch(() => {});
  }, []);

  // Timer Countdown Effect
  useEffect(() => {
    if (timedMode && questions.length > 0 && !isSubmitted && secondsRemaining !== null) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmitExam(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timerRef.current);
    }
  }, [timedMode, questions.length, isSubmitted, secondsRemaining]);

  // Extract quick suggested topics from available documents
  const suggestedTopics = useMemo(() => {
    const list: string[] = [];
    items.forEach((item) => {
      const title = (item.title || item.sourceTitle || "").replace(/\.[^/.]+$/, "").trim();
      if (title && !list.includes(title)) {
        list.push(title);
      }
    });
    return list.slice(0, 5);
  }, [items]);

  // Filter items based on Scope Selector
  const targetScopeItems = useMemo(() => {
    if (scopeSelection.mode === "all") return items;
    if (scopeSelection.mode === "single") {
      const singleId = scopeSelection.selectedIds[0];
      return items.filter((i) => i.id === singleId);
    }
    return items.filter((i) => scopeSelection.selectedIds.includes(i.id));
  }, [scopeSelection, items]);

  // Build section configuration based on preset and actual study material
  const buildExamSections = (targetPreset: string, customTopic: string): ExamSectionConfig[] => {
    const docTitle = targetScopeItems.length > 0
      ? (targetScopeItems[0].title || targetScopeItems[0].sourceTitle || "").replace(/\.[^/.]+$/, "").trim()
      : "";
    const topic = customTopic || docTitle || "Course Material";

    if (targetPreset === "160") {
      return [
        { name: "Foundational Concepts & Principles", questionCount: 40, mode: "grounded", topicFocus: `${topic} - Fundamentals & Core Concepts` },
        { name: "Core Methodology & Applications", questionCount: 40, mode: "grounded", topicFocus: `${topic} - Applications & Problem Solving` },
        { name: "Advanced Analysis & Scenarios", questionCount: 40, mode: "grounded", topicFocus: `${topic} - Intermediate to Advanced Analysis` },
        { name: "Comprehensive Diagnostics & Synthesis", questionCount: 40, mode: "grounded", topicFocus: `${topic} - Multi-Step Problems & Synthesis` },
      ];
    }
    if (targetPreset === "100") {
      return [
        { name: "Core Principles & Direct Applications", questionCount: 50, mode: "grounded", topicFocus: `${topic} - Core Principles` },
        { name: "Advanced Synthesis & Problem Solving", questionCount: 50, mode: "grounded", topicFocus: `${topic} - Advanced Scenarios` },
      ];
    }
    if (targetPreset === "50") {
      return [
        { name: "Midterm Comprehensive Assessment", questionCount: 50, mode: "grounded", topicFocus: topic },
      ];
    }
    if (targetPreset === "25") {
      return [
        { name: "Standard Assessment Test", questionCount: 25, mode: "grounded", topicFocus: topic },
      ];
    }
    return [
      { name: "Quick Diagnostic Drill", questionCount: 10, mode: "grounded", topicFocus: topic },
    ];
  };

  // Handle Multi-Batch Exam Generation
  const handleGenerateExam = async (customQuestionList?: Question[]) => {
    if (customQuestionList && customQuestionList.length > 0) {
      setQuestions(customQuestionList);
      setIsSubmitted(false);
      setUserAnswers({});
      setFlaggedIds(new Set());
      setActiveQuestionIdx(0);
      if (timedMode) setSecondsRemaining(customQuestionList.length * 90);
      showToast(`Started targeted review on ${customQuestionList.length} questions!`, "info");
      return;
    }

    setIsGenerating(true);
    setIsSubmitted(false);
    setUserAnswers({});
    setFlaggedIds(new Set());
    setActiveQuestionIdx(0);
    setActiveExamId(generateUUID());
    setBatchProgress(null);
    setGenerationError(null);
    setQuestions([]); // Clear any previous questions so fresh batches stream in
    setGenerationPhase("Initializing multi-batch question synthesis...");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const sections = buildExamSections(presetCount, topicInput.trim());

    try {
      const generated = await generateExamInBatches(
        targetScopeItems,
        sections,
        difficulty,
        (progress) => {
          setBatchProgress(progress);
          setGenerationPhase(`Synthesizing Batch ${progress.currentBatch}/${progress.totalBatches} (${progress.currentSection})...`);
          // Progressive Streaming: update questions as each batch finishes!
          setQuestions([...progress.questionsSoFar]);
          if (timedMode && !secondsRemaining) {
            setSecondsRemaining(progress.totalQuestions * 90);
          }
        },
        controller.signal
      );

      if (generated.length > 0) {
        setQuestions(generated);
        if (timedMode) setSecondsRemaining(generated.length * 90);
        showToast(`Successfully assembled ${generated.length}-question simulation!`, "success");
      }
    } catch (err: any) {
      if (err.message?.includes("aborted")) {
        showToast("Generation cancelled.", "info");
      } else {
        console.error("Exam generation failed:", err);
        const errMsg = err.message || "Request timed out or API failed";
        setGenerationError(errMsg);
        // If we already accumulated some questions before the error, PRESERVE them!
        setQuestions((prevQuestions) => {
          if (prevQuestions && prevQuestions.length > 0) {
            showToast(`Generation stopped: ${errMsg}. Preserved ${prevQuestions.length} questions ready to practice.`, "info");
            return prevQuestions;
          }
          // Only fallback to offline bank if zero questions could be generated
          if (timedMode) setSecondsRemaining(UNIVERSAL_FALLBACK_POOL.length * 90);
          showToast(`AI generation issue: ${errMsg}. Loaded 5 offline practice questions.`, "error");
          return UNIVERSAL_FALLBACK_POOL;
        });
      }
    } finally {
      setIsGenerating(false);
      setGenerationPhase("");
    }
  };

  // Append 10 More Questions to Active Exam Session
  const handleAppendTenQuestions = async () => {
    setIsGenerating(true);
    setGenerationPhase("Synthesizing 10 additional questions...");
    try {
      const extraSection: ExamSectionConfig[] = [
        {
          name: topicInput.trim() || "Extended Review",
          questionCount: 10,
          mode: "grounded",
        },
      ];
      const extraQuestions = await generateExamInBatches(
        targetScopeItems,
        extraSection,
        difficulty
      );
      setQuestions((prev) => [...prev, ...extraQuestions]);
      showToast(`Appended +${extraQuestions.length} new questions to your active exam!`, "success");
    } catch {
      showToast("Failed to generate additional questions.", "error");
    } finally {
      setIsGenerating(false);
      setGenerationPhase("");
    }
  };

  const handleSelectAnswer = (qId: string, optionIdx: number) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: optionIdx }));
  };

  const toggleFlag = (qId: string) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  // CRUD: Save question from QuestionEditorModal
  const handleSaveQuestion = (updatedQ: Question) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === updatedQ.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedQ;
        showToast("Question updated successfully!", "success");
        return next;
      }
      showToast("Custom question added to exam!", "success");
      return [...prev, updatedQ];
    });
  };

  // CRUD: Delete question from active exam
  const handleDeleteQuestion = (qId: string) => {
    setQuestions((prev) => {
      const next = prev.filter((q) => q.id !== qId);
      if (activeQuestionIdx >= next.length) {
        setActiveQuestionIdx(Math.max(0, next.length - 1));
      }
      return next;
    });
    // Remove from answers and flags
    setUserAnswers((prev) => {
      const next = { ...prev };
      delete next[qId];
      return next;
    });
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      next.delete(qId);
      return next;
    });
    showToast("Question removed from exam session.", "info");
  };

  // CRUD: Batch Import questions
  const handleImportQuestions = (imported: Question[], mode: "append" | "replace") => {
    if (mode === "replace") {
      setQuestions(imported);
      setUserAnswers({});
      setFlaggedIds(new Set());
      setActiveQuestionIdx(0);
      setActiveExamId(generateUUID());
      setIsSubmitted(false);
      showToast(`Replaced exam with ${imported.length} imported questions!`, "success");
    } else {
      setQuestions((prev) => [...prev, ...imported]);
      showToast(`Appended ${imported.length} questions to active exam!`, "success");
    }
  };

  const calculateScore = () => {
    let correct = 0;
    const missed: Question[] = [];
    questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctIndex) {
        correct++;
      } else {
        missed.push(q);
      }
    });
    return {
      correct,
      total: questions.length,
      percentage: questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0,
      missed,
    };
  };

  const handleSubmitExam = async (isAutoSubmit = false) => {
    if (questions.length === 0) return;
    setIsSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const { correct, percentage } = calculateScore();
    const passed = percentage >= benchmarkThreshold;

    // Ensure parent exam is registered so foreign key cascade and analytics succeed cleanly
    try {
      await saveExam({
        id: activeExamId,
        title: topicInput.trim() ? `${topicInput.trim()} Simulation` : "Custom Practice Exam",
        questions: [...questions],
        config: {
          difficulty,
          timedMode,
          benchmarkScore: benchmarkThreshold,
          sections: buildExamSections(presetCount, topicInput.trim()),
        },
      });
    } catch (saveErr) {
      console.warn("Auto-registering exam session for attempt failed:", saveErr);
    }

    const attempt = await saveExamAttempt({
      exam_id: activeExamId,
      score: correct,
      total: questions.length,
      percentage,
      answers: userAnswers,
      questions_snapshot: [...questions], // Immutable snapshot
      duration_seconds: timedMode && secondsRemaining !== null ? questions.length * 90 - secondsRemaining : undefined,
      passed,
    });

    setExamHistory((prev) => [attempt, ...prev.slice(0, 9)]);

    if (passed) {
      showToast(`Benchmark Achieved! Scored ${correct}/${questions.length} (${percentage}%) vs ${benchmarkThreshold}% target.`, "success");
    } else {
      showToast(`Exam complete: ${correct}/${questions.length} (${percentage}%). Target was ${benchmarkThreshold}%.`, "info");
    }
  };

  // Topic Breakdown calculation for post-exam analytics
  const topicMastery = useMemo(() => {
    if (!isSubmitted || questions.length === 0) return [];
    const map: Record<string, { total: number; correct: number }> = {};
    questions.forEach((q) => {
      const tag = q.topicTag || "General";
      if (!map[tag]) map[tag] = { total: 0, correct: 0 };
      map[tag].total += 1;
      if (userAnswers[q.id] === q.correctIndex) {
        map[tag].correct += 1;
      }
    });
    return Object.entries(map).map(([topic, data]) => ({
      topic,
      total: data.total,
      correct: data.correct,
      pct: Math.round((data.correct / data.total) * 100),
    }));
  }, [isSubmitted, questions, userAnswers]);

  const handleRetakeMissed = () => {
    const { missed } = calculateScore();
    if (missed.length === 0) {
      showToast("100% Score! No missed questions to retake.", "success");
      return;
    }
    handleGenerateExam(missed);
  };

  const formatTimer = (sec: number | null) => {
    if (sec === null) return "--:--";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handlePrintExam = () => {
    window.print();
  };

  const currentQ = questions[activeQuestionIdx] || questions[0];

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. Console Header & Exam Customization Bar                    */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white font-title flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Universal Mock Exam & Simulator
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
              Precision practice tests, manual question builder, past paper importer & high-capacity full-length exam simulations.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {examHistory.length > 0 && (
              <div className="px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300">
                Diagnostic Avg: <strong className="text-slate-900 dark:text-slate-100">{Math.round(examHistory.reduce((a, b) => a + b.percentage, 0) / examHistory.length)}%</strong>
              </div>
            )}
            <button
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
              <span>Exam Parameters</span>
            </button>
          </div>
        </div>

        {/* Material Scope Selector Component */}
        <MaterialScopeSelector
          items={items}
          selection={scopeSelection}
          onChange={setScopeSelection}
        />

        {/* Search, Action Toolbar & Generator Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Focus topic / subject (e.g. 'Calculus', 'Word Problems', 'Organic Chemistry', or leave blank)..."
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Manual Question Creator */}
            <button
              type="button"
              onClick={() => {
                setQuestionToEdit(null);
                setIsEditorOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="Manually create a custom exam question"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-500" />
              <span>Add Question</span>
            </button>

            {/* Batch Question Importer */}
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="Paste questions from handouts, past exams or upload CSV"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-500" />
              <span>Import</span>
            </button>

            {/* AI Multi-Batch Generator */}
            <button
              onClick={() => handleGenerateExam()}
              disabled={isGenerating}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isGenerating ? "Synthesizing Exam..." : `Generate ${presetCount} Qs`}</span>
            </button>
          </div>
        </div>

        {/* Quick Suggested Topic Chips */}
        {suggestedTopics.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-slate-500">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Quick Focus:</span>
            {suggestedTopics.map((top, idx) => (
              <button
                key={idx}
                onClick={() => setTopicInput(top)}
                className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/60 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              >
                {top}
              </button>
            ))}
          </div>
        )}

        {/* Smart Q&A Review Book Detection Callout */}
        {targetScopeItems.some((item) => /problem|exam|review|math|csc|test|question/i.test(item.title || item.sourceTitle || "")) && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-indigo-50/90 to-purple-50/70 dark:from-indigo-950/40 dark:to-purple-950/30 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl text-xs">
            <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-200">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>
                <strong>Review Material Detected:</strong> <em>{targetScopeItems[0]?.title || targetScopeItems[0]?.sourceTitle || "Your document"}</em> has real questions and answer keys printed inside.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs shrink-0 cursor-pointer shadow-xs transition-colors"
            >
              Import 160+ Qs from Book ($0 Cost) &rarr;
            </button>
          </div>
        )}

        {/* AI Server Error / Key Exhaustion Callout */}
        {generationError && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl space-y-2 text-xs">
            <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>AI Generation Offline: Server API keys are exhausted ({generationError})</span>
            </div>
            <p className="text-amber-700 dark:text-amber-300">
              The public shared AI credits for the server are currently exhausted. You have two immediate options:
            </p>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => {
                  setGenerationError(null);
                  setIsImportOpen(true);
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                1. Import 160+ Qs Directly from PDF Book ($0 Cost, Instant) &rarr;
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.hash = "#/app/settings";
                }}
                className="px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                2. Connect Free Gemini Key in Settings (BYOK) ⚙️
              </button>
            </div>
          </div>
        )}

        {/* Expandable Parameters Drawer */}
        {showConfigDrawer && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/50 dark:bg-slate-950/30 p-4 rounded-xl">
            {/* 1. Exam Length / Presets Dropdown */}
            <div className="space-y-1.5">
              <label htmlFor="exam-length-select" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono block">
                Simulation Length
              </label>
              <div className="relative">
                <select
                  id="exam-length-select"
                  value={presetCount}
                  onChange={(e) => setPresetCount(e.target.value as any)}
                  className="w-full appearance-none pl-3 pr-8 py-2 text-xs font-medium rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs font-sans"
                >
                  <option value="10">10 Questions · Quick Drill (Exam Timer: 15m · Gen: ~5s)</option>
                  <option value="25">25 Questions · Standard Test (Exam Timer: 35m · Gen: ~12s)</option>
                  <option value="50">50 Questions · Midterm Review (Exam Timer: 75m · Gen: ~25s)</option>
                  <option value="100">100 Questions · Comprehensive Mock (Exam Timer: 2.5h · Gen: ~50s)</option>
                  <option value="160">160 Questions · Full Licensure Simulation (Exam Timer: 3.5h · Gen: ~75s)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                {presetCount === "10" && "⚡ Fast 2-batch parallel drill · 15 mins test duration"}
                {presetCount === "25" && "📘 5-batch standard test · 35 mins test duration"}
                {presetCount === "50" && "📊 10-batch midterm review · 75 mins test duration"}
                {presetCount === "100" && "🎯 20-batch parallel synthesis · 2.5 hours test duration"}
                {presetCount === "160" && "🏆 Full-scale 32-batch simulation · 3.5 hours test duration"}
              </p>
            </div>

            {/* 2. Difficulty Level */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["easy", "mixed", "hard"] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={`py-1.5 text-xs rounded-lg border capitalize font-sans transition-all ${
                      difficulty === diff
                        ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Passing Score Threshold */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-700 dark:text-slate-300">
                <span className="font-semibold uppercase tracking-wider">Passing Target</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{benchmarkThreshold}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="95"
                step="5"
                value={benchmarkThreshold}
                onChange={(e) => setBenchmarkThreshold(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>70% Passing</span>
                <span>80% Standard Target</span>
                <span>90% Honors</span>
              </div>
            </div>

            {/* 4. Timed Exam Mode */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
                Timed Simulation
              </label>
              <button
                onClick={() => setTimedMode(!timedMode)}
                className={`w-full py-1.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  timedMode
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40 font-semibold"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{timedMode ? "Active (90s / Q)" : "Untimed Practice"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Multi-Batch Progress & Progressive Start Banner */}
        {isGenerating && (
          <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                {generationPhase}
              </span>
              <span className="font-mono text-indigo-700 dark:text-indigo-300 font-bold">
                {batchProgress?.completedQuestions || 0} / {batchProgress?.totalQuestions || presetCount} Qs (Batch {batchProgress?.currentBatch || 1}/{batchProgress?.totalBatches || 1})
              </span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      ((batchProgress?.completedQuestions || 0) / Number(presetCount)) * 100
                    ) || 15
                  )}%`,
                }}
              />
            </div>

            {/* Progressive Start: Student doesn't have to wait for all 160 */}
            {batchProgress?.isFirstBatchReady && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                  ✓ {batchProgress.completedQuestions} questions ready! You can start answering immediately while the rest stream in.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsGenerating(false);
                    setActiveQuestionIdx(0);
                    showToast(`Started exam session with ${batchProgress.completedQuestions} questions ready! Background questions will stream in.`, "info");
                  }}
                  className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Start Answering Now (Q1–Q{batchProgress.completedQuestions}) &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Active Exam Simulation & Questions Station                */}
      {/* ------------------------------------------------------------- */}
      {questions.length > 0 && (
        <div className="space-y-4">
          {/* Top Exam Navigation & Status Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
            <div className="flex items-center gap-3">
              <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                Question {activeQuestionIdx + 1} of {questions.length}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                ({Object.keys(userAnswers).length} answered)
              </div>
            </div>

            {/* Center & Right Controls: Timer, Flagging, ViewMode */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              {timedMode && secondsRemaining !== null && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-xs font-bold border ${
                    secondsRemaining < 120
                      ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-300 animate-pulse"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTimer(secondsRemaining)}</span>
                </div>
              )}

              {currentQ && (
                <button
                  onClick={() => toggleFlag(currentQ.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                    flaggedIds.has(currentQ.id)
                      ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-300 dark:border-amber-700"
                      : "bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900"
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>{flaggedIds.has(currentQ.id) ? "Flagged" : "Flag"}</span>
                </button>
              )}

              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden text-xs">
                <button
                  onClick={() => setViewMode("stepper")}
                  className={`px-2.5 py-1 ${viewMode === "stepper" ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-medium" : "text-slate-500"}`}
                >
                  Stepper
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-2.5 py-1 ${viewMode === "list" ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-medium" : "text-slate-500"}`}
                >
                  All Qs
                </button>
              </div>
            </div>
          </div>

          {/* Quick Jump Map (Pills 1..N) */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            {questions.map((q, idx) => {
              const isAnswered = userAnswers[q.id] !== undefined;
              const isFlagged = flaggedIds.has(q.id);
              const isActive = idx === activeQuestionIdx;
              const isCorrect = isSubmitted && userAnswers[q.id] === q.correctIndex;
              const isWrong = isSubmitted && userAnswers[q.id] !== undefined && !isCorrect;

              let pillClass = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700";
              if (isSubmitted) {
                if (isCorrect) pillClass = "bg-emerald-500 text-white border-emerald-600";
                else if (isWrong) pillClass = "bg-rose-500 text-white border-rose-600";
                else pillClass = "bg-slate-200 dark:bg-slate-700 text-slate-500";
              } else if (isFlagged) {
                pillClass = "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300";
              } else if (isAnswered) {
                pillClass = "bg-indigo-600 text-white border-indigo-600";
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setActiveQuestionIdx(idx)}
                  className={`w-8 h-8 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 border transition-all ${pillClass} ${
                    isActive ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-105" : ""
                  }`}
                  title={`Question ${idx + 1}: ${q.topicTag}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Question Cards (Stepper Mode or List Mode) */}
          {(viewMode === "stepper" ? (currentQ ? [currentQ] : []) : questions).map((q, localIdx) => {
            const actualIndex = viewMode === "stepper" ? activeQuestionIdx : localIdx;
            const selectedOpt = userAnswers[q.id];
            const isCorrect = selectedOpt === q.correctIndex;

            return (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 relative group"
              >
                {/* Question Header & Action Controls (Edit & Delete) */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold border border-indigo-200 dark:border-indigo-800">
                      {actualIndex + 1}
                    </span>
                    <span className="text-slate-400 uppercase tracking-wider text-[11px] font-medium">
                      {q.topicTag || "General Review"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Edit Question */}
                    <button
                      type="button"
                      onClick={() => {
                        setQuestionToEdit(q);
                        setIsEditorOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit this question statement, choices or explanation"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Question */}
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Remove question from exam"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {isSubmitted && (
                      <span className="flex items-center gap-1 text-xs font-mono font-medium ml-2">
                        {isCorrect ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                            <XCircle className="w-3.5 h-3.5" /> Incorrect
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Text with KaTeX Math Rendering */}
                <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-50 font-title leading-relaxed">
                  <AcademicMathView content={q.question} />
                </div>

                {/* Options List */}
                <div className="space-y-2.5 pt-2">
                  {q.options.map((option, optIdx) => {
                    const isSelected = selectedOpt === optIdx;
                    const isOptionCorrect = q.correctIndex === optIdx;

                    let btnStyle = "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-850/60";

                    if (isSubmitted) {
                      if (isOptionCorrect) {
                        btnStyle = "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500";
                      } else if (isSelected && !isCorrect) {
                        btnStyle = "border-rose-400 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 line-through opacity-80";
                      }
                    } else if (isSelected) {
                      btnStyle = "border-indigo-600 dark:border-indigo-400 ring-2 ring-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-950/50 text-indigo-950 dark:text-white font-medium";
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectAnswer(q.id, optIdx)}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-start gap-3 cursor-pointer ${btnStyle}`}
                      >
                        <span className="font-mono text-slate-400 dark:text-slate-500 font-bold shrink-0 w-5 pt-0.5">
                          {String.fromCharCode(65 + optIdx)}.
                        </span>
                        <div className="leading-relaxed flex-1">
                          <AcademicMathView content={option} inline />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Academic Explanation with KaTeX */}
                {isSubmitted && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-sans leading-relaxed space-y-2">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      <BookOpen className="w-3.5 h-3.5" />
                      Academic Derivation & Solution Rationale:
                    </div>
                    <AcademicMathView content={q.explanation} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Stepper Navigation Footer & Extender Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
            {viewMode === "stepper" ? (
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  onClick={() => setActiveQuestionIdx((prev) => Math.max(0, prev - 1))}
                  disabled={activeQuestionIdx === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="text-xs font-mono text-slate-400">
                  {activeQuestionIdx + 1} / {questions.length}
                </div>

                <button
                  onClick={() => setActiveQuestionIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                  disabled={activeQuestionIdx === questions.length - 1}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="text-xs font-mono text-slate-400">
                Total Exam Items: {questions.length} Questions
              </div>
            )}

            {/* Extender & Add buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  setQuestionToEdit(null);
                  setIsEditorOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-500" />
                <span>Add Question</span>
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={handleAppendTenQuestions}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors"
                title="Synthesize 10 more grounded questions and append them to this exam session"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>+ Generate 10 More</span>
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* Submission and Diagnostic Scoring Console                   */}
          {/* ------------------------------------------------------------- */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-6">
            {isSubmitted ? (
              <div className="space-y-6">
                {/* Result Hero Banner */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold font-title text-xl shadow-xs ${
                        calculateScore().percentage >= benchmarkThreshold
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-600 text-white"
                      }`}
                    >
                      {calculateScore().percentage}%
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-900 dark:text-white font-title flex items-center gap-2">
                        {calculateScore().percentage >= benchmarkThreshold ? (
                          <>
                            <Award className="w-5 h-5 text-emerald-500" />
                            Benchmark Achieved ({calculateScore().correct} / {calculateScore().total} Correct)
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                            Needs Reinforcement ({calculateScore().correct} / {calculateScore().total} Correct)
                          </>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-sans mt-0.5">
                        Target Benchmark was <strong>{benchmarkThreshold}%</strong>. 
                        {calculateScore().percentage >= benchmarkThreshold
                          ? " Exemplary mastery demonstrated across tested concepts."
                          : " Review the academic explanations above to reinforce missed concepts."}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {calculateScore().missed.length > 0 && (
                      <button
                        onClick={handleRetakeMissed}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retake Missed Only ({calculateScore().missed.length})</span>
                      </button>
                    )}

                    <button
                      onClick={handlePrintExam}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print / Export Exam</span>
                    </button>

                    <button
                      onClick={() => handleGenerateExam()}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>New Mock Exam</span>
                    </button>
                  </div>
                </div>

                {/* Topic Breakdown Analytics */}
                {topicMastery.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-indigo-500" />
                      Topic Mastery Breakdown:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {topicMastery.map((tm, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                              {tm.topic}
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                              {tm.correct}/{tm.total} ({tm.pct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${tm.pct >= benchmarkThreshold ? "bg-emerald-500" : "bg-amber-500"}`}
                              style={{ width: `${tm.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                  <span>Answered {Object.keys(userAnswers).length} of {questions.length} questions</span>
                  {flaggedIds.size > 0 && (
                    <span className="text-amber-500">• {flaggedIds.size} flagged for review</span>
                  )}
                </div>
                <button
                  onClick={() => handleSubmitExam(false)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer w-full sm:w-auto justify-center"
                >
                  <Check className="w-4 h-4" />
                  <span>Submit & Grade Exam</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Question Editor Modal */}
      <QuestionEditorModal
        isOpen={isEditorOpen}
        questionToEdit={questionToEdit}
        onSave={handleSaveQuestion}
        onClose={() => {
          setIsEditorOpen(false);
          setQuestionToEdit(null);
        }}
        defaultTopic={topicInput.trim() || "General"}
      />

      {/* Question Importer Modal */}
      <QuestionImportModal
        isOpen={isImportOpen}
        onImport={handleImportQuestions}
        onClose={() => setIsImportOpen(false)}
        defaultTopic={topicInput.trim() || "General"}
      />
    </div>
  );
};

export default MockExamEngine;
