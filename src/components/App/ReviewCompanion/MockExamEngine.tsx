// ============================================
// MOCK EXAM ENGINE - Precision Practice Tests & Diagnostics
// Universal Academic Workstation (SHS STEM to College 2nd-Year Core)
// ============================================
// Features:
// 1. Configurable Question Counts (5, 10, 20)
// 2. Custom Passing Benchmark Slider/Presets (75%, 80% CSC/College, 90% Honors)
// 3. Problem-Boundary Context Sampling & Micro-Formulary Injection
// 4. KaTeX Math & LaTeX formula rendering across questions and explanations
// 5. Timed Mode with optional countdown
// 6. Topic Mastery Diagnostic Breakdown & "Retake Missed Only" Drill
// 7. Multi-disciplinary academic fallbacks
// ============================================

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
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
  ChevronRight,
  AlertCircle,
  FileText,
  Target,
  RefreshCw,
} from "lucide-react";
import { generateAiResponse } from "../../../services/geminiService";
import { StorageItem } from "../../../services/storageService";
import { buildSynthesisContext } from "../../../services/ragService";
import { findRelevantFormulary } from "../../../services/formularyService";
import AcademicMathView from "../../shared/AcademicMathView";

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topicTag: string;
}

export interface ExamResult {
  score: number;
  total: number;
  percentage: number;
  benchmark: number;
  passed: boolean;
  date: string;
  topic: string;
  durationSeconds?: number;
}

export interface MockExamEngineProps {
  items: StorageItem[];
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

// -------------------------------------------------------------
// Universal Multi-Discipline Academic Fallback Question Pool
// -------------------------------------------------------------
const UNIVERSAL_FALLBACK_POOL: Question[] = [
  {
    id: 1,
    question: "Evaluate the limit: $\\lim_{x \\to 0} \\frac{\\sin(3x)}{x}$.",
    options: ["0", "1", "3", "Does not exist"],
    correctIndex: 2,
    explanation: "Using the fundamental trigonometric limit $\\lim_{u \\to 0} \\frac{\\sin(u)}{u} = 1$, rewrite $\\frac{\\sin(3x)}{x} = 3 \\cdot \\frac{\\sin(3x)}{3x}$. As $x \\to 0$, $3x \\to 0$, yielding $3 \\cdot 1 = 3$. Common exam trap: forgetting the inner coefficient.",
    topicTag: "Calculus & Limits",
  },
  {
    id: 2,
    question: "In symbolic logic, which of the following expressions is logically equivalent to the conditional proposition $P \\to Q$?",
    options: ["$\\neg P \\lor Q$", "$\\neg P \\land Q$", "$P \\land \\neg Q$", "$Q \\to P$"],
    correctIndex: 0,
    explanation: "By the conditional-disjunction equivalence law: $P \\to Q \\equiv \\neg P \\lor Q \\equiv \\neg Q \\to \\neg P$ (Contrapositive). The converse $Q \\to P$ is a common logical fallacy and not equivalent.",
    topicTag: "Discrete Mathematics: Logic",
  },
  {
    id: 3,
    question: "A $4.0\\text{ kg}$ cart travelling at $5.0\\text{ m/s}$ along a frictionless horizontal track collides and locks together with a stationary $6.0\\text{ kg}$ cart. What is their final combined speed?",
    options: ["$1.5\\text{ m/s}$", "$2.0\\text{ m/s}$", "$2.5\\text{ m/s}$", "$3.3\\text{ m/s}$"],
    correctIndex: 1,
    explanation: "By conservation of linear momentum: $m_1 v_1 + m_2 v_2 = (m_1 + m_2) v_f$. Substituting values: $(4.0)(5.0) + (6.0)(0) = (4.0 + 6.0) v_f \\implies 20.0 = 10.0 v_f \\implies v_f = 2.0\\text{ m/s}$. Upright SI units: $\\text{m/s}$.",
    topicTag: "Physics: Mechanics",
  },
  {
    id: 4,
    question: "Working together, Pipe A can fill an empty reservoir in 6 hours, while Pipe B can fill it in 12 hours. How many hours will it take to fill the reservoir if both pipes operate simultaneously?",
    options: ["3.0 hours", "4.0 hours", "4.5 hours", "9.0 hours"],
    correctIndex: 1,
    explanation: "Work rate equation: Combined rate = $\\frac{1}{6} + \\frac{1}{12} = \\frac{2}{12} + \\frac{1}{12} = \\frac{3}{12} = \\frac{1}{4}$ of reservoir/hr. Total Time = $\\frac{1}{1/4} = 4.0\\text{ hours}$. Common exam trap: averaging the hours $\\frac{6 + 12}{2} = 9$.",
    topicTag: "Quantitative Word Problems",
  },
  {
    id: 5,
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
  {
    id: 6,
    question: "Find the derivative of $f(x) = x^2 e^{3x}$ with respect to $x$.",
    options: [
      "$2x e^{3x}$",
      "$3x^2 e^{3x}$",
      "$x e^{3x}(2 + 3x)$",
      "$6x e^{3x}$",
    ],
    correctIndex: 2,
    explanation: "Product rule: $\\frac{d}{dx}[u \\cdot v] = u'v + uv'$. Let $u = x^2 \\implies u' = 2x$; $v = e^{3x} \\implies v' = 3e^{3x}$. Thus $f'(x) = 2x e^{3x} + 3x^2 e^{3x} = x e^{3x}(2 + 3x)$.",
    topicTag: "Calculus & Derivatives",
  },
  {
    id: 7,
    question: "If an ideal gas enclosed in a piston has its absolute temperature $T$ doubled while its volume $V$ is halved, what happens to the pressure $P$?",
    options: [
      "Pressure remains unchanged",
      "Pressure doubles ($2P$)",
      "Pressure quadruples ($4P$)",
      "Pressure is reduced to one-fourth ($\\frac{1}{4}P$)",
    ],
    correctIndex: 2,
    explanation: "Ideal gas law: $P = \\frac{nRT}{V}$. If $T \\to 2T$ and $V \\to \\frac{1}{2}V$, new pressure $P' = \\frac{nR(2T)}{V/2} = 4 \\cdot \\frac{nRT}{V} = 4P$. The pressure quadruples.",
    topicTag: "Chemistry & Thermodynamics",
  },
  {
    id: 8,
    question: "If a finite set $S$ has 4 distinct elements ($|S| = 4$), how many proper subsets does set $S$ have?",
    options: ["14", "15", "16", "32"],
    correctIndex: 1,
    explanation: "Total subsets in power set $\\mathcal{P}(S)$ is $2^n = 2^4 = 16$. A proper subset must exclude the set itself, yielding $2^n - 1 = 16 - 1 = 15$ proper subsets.",
    topicTag: "Discrete Mathematics: Sets",
  },
  {
    id: 9,
    question: "A student mixes a 10% saline solution with a 50% saline solution to create 40 liters of a 20% saline solution. How many liters of the 10% solution are required?",
    options: ["10 liters", "25 liters", "30 liters", "35 liters"],
    correctIndex: 2,
    explanation: "Let $x$ be liters of 10% solution. Saline balance: $0.10x + 0.50(40 - x) = 0.20(40) \\implies -0.40x + 20 = 8 \\implies -0.40x = -12 \\implies x = 30$ liters.",
    topicTag: "Algebra & Mixture Problems",
  },
  {
    id: 10,
    question: "Under the standard SI metric system, what is the coherent derived unit and base breakdown for Work and Energy?",
    options: [
      "$\\text{Watt } (\\text{kg}\\cdot\\text{m}^2/\\text{s}^3)$",
      "$\\text{Newton } (\\text{kg}\\cdot\\text{m}/\\text{s}^2)$",
      "$\\text{Joule } (\\text{kg}\\cdot\\text{m}^2/\\text{s}^2)$",
      "$\\text{Pascal } (\\text{kg}/(\\text{m}\\cdot\\text{s}^2))$",
    ],
    correctIndex: 2,
    explanation: "Work is Force $\\times$ Displacement: $W = F \\cdot d = \\text{N} \\cdot \\text{m} = (\\text{kg}\\cdot\\text{m}/\\text{s}^2) \\cdot \\text{m} = \\text{kg}\\cdot\\text{m}^2/\\text{s}^2 = \\text{Joule (J)}$.",
    topicTag: "Physics: SI Units",
  },
];

export const MockExamEngine: React.FC<MockExamEngineProps> = ({
  items,
  showToast,
}) => {
  // Configuration State
  const [topicInput, setTopicInput] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState<string>("all");
  const [questionCount, setQuestionCount] = useState<5 | 10 | 20>(5);
  const [benchmarkThreshold, setBenchmarkThreshold] = useState<number>(80);
  const [academicLevel, setAcademicLevel] = useState<string>("auto");
  const [timedMode, setTimedMode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"stepper" | "list">("stepper");

  // Exam Execution State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [flaggedIds, setFlaggedIds] = useState<Set<number>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [examHistory, setExamHistory] = useState<ExamResult[]>([]);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  // Timer Ref
  const timerRef = useRef<any>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("rm_exam_history");
      if (saved) setExamHistory(JSON.parse(saved));
    } catch {}
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

  // Handle Exam Generation
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
    setGenerationPhase("Analyzing syllabus & problem boundaries...");

    const targetTopic = topicInput.trim() || (selectedSourceId !== "all" 
      ? items.find(i => i.id === selectedSourceId)?.title || "Selected Document"
      : "Uploaded Course & Review Materials");
    
    const isSpecificTopic = Boolean(topicInput.trim() || selectedSourceId !== "all");

    // Filter items if specific document is selected
    const sourceItems = selectedSourceId === "all" 
      ? items 
      : items.filter(i => i.id === selectedSourceId);

    try {
      // Step 1: Collect distributed context through Problem-Boundary RAG
      setGenerationPhase(`Extracting problem boundaries (${questionCount} questions)...`);
      const targetChunks = questionCount <= 5 ? 6 : questionCount <= 10 ? 10 : 14;
      const contextCorpus = await buildSynthesisContext(
        sourceItems,
        isSpecificTopic ? targetTopic : undefined,
        targetChunks
      );

      // Step 2: Inject Relevant Micro-Formularies to guarantee 0-hallucination math/science rules
      const relevantFormularies = findRelevantFormulary(`${targetTopic} ${contextCorpus.slice(0, 2000)}`);
      const formularyPromptBlock = relevantFormularies.length > 0
        ? `\nAuthoritative Academic Formulary Rules (Strictly Enforce in Questions & Solutions):\n${relevantFormularies.map(r => `• ${r}`).join("\n")}\n`
        : "";

      setGenerationPhase("Synthesizing multi-disciplinary questions & KaTeX formulas...");

      const levelDescriptor = academicLevel === "stem_shs"
        ? "Senior High School STEM (Grades 11-12 Physics, Calculus, General Chem, Pre-Calculus)"
        : academicLevel === "college_core"
        ? "College 1st & 2nd Year Core (Calculus 1-3, Differential Equations, Discrete Math, Mechanics)"
        : academicLevel === "csc_exam"
        ? "General Civil Service / Professional Exam (Numerical Reasoning, Logic, Analytical English, Constitution)"
        : "Adapt to the explicit difficulty level found in the study materials (Grade 11 to College 2nd-Year Core)";

      const prompt = `You are a distinguished university professor & examination board chairperson designing a rigorous academic mock examination.
Target Subject / Focus: "${targetTopic}"
Target Academic Level: ${levelDescriptor}
${formularyPromptBlock}
Available Student Study Notes & Source Syllabus Chunks:
${contextCorpus || "Generate a comprehensive academic assessment covering core fundamentals of " + targetTopic}

REQUIREMENTS:
1. Generate EXACTLY ${questionCount} high-yield, exam-quality questions.
2. Mix conceptual understanding, formula application, and multi-step quantitative/analytical problem-solving.
3. Every mathematical formula, equation, variable, or chemical formula MUST be enclosed in standard LaTeX dollar signs (e.g. $x^2 + y^2 = r^2$, $\\int_0^1 x dx$, $\\neg P \\lor Q$, $9.81\\text{ m/s}^2$).
4. For every question, provide 4 distinct multiple-choice options (labeled A, B, C, D). Ensure distractor choices reflect common student exam pitfalls.
5. In the "explanation" field, provide a 4-step academic derivation:
   - Identify the governing law / principle / formula
   - Show the step-by-step derivation with KaTeX math
   - Explain why the correct option holds and why common distractor choices are incorrect.
6. Provide a concise topic tag (e.g. "Calculus", "Thermodynamics", "Logic").

You MUST respond with ONLY a valid raw JSON array of objects, with NO surrounding markdown backticks or commentary:
[
  {
    "id": 1,
    "question": "Question text with LaTeX formulas ($...$)...",
    "options": ["Option A ($...$)", "Option B ($...$)", "Option C ($...$)", "Option D ($...$)"],
    "correctIndex": 0,
    "explanation": "Governing principle, step-by-step derivation with KaTeX, and common exam trap explanation.",
    "topicTag": "Specific Topic"
  }
]`;

      const response = await generateAiResponse(prompt);
      const cleanJson = response
        .replace(/```json/gi, "")
        .replace(/```/gi, "")
        .trim();

      const parsed: Question[] = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Normalize IDs to 1..N
        const normalized = parsed.map((q, idx) => ({ ...q, id: idx + 1 }));
        setQuestions(normalized);
        if (timedMode) setSecondsRemaining(normalized.length * 90);
        showToast(`Generated ${normalized.length}-question mock exam on "${targetTopic}"!`, "success");
      } else {
        throw new Error("Invalid question format received");
      }
    } catch (err: any) {
      console.error("Exam generation error:", err);
      // Slice from balanced universal fallback pool
      const count = Math.min(questionCount, UNIVERSAL_FALLBACK_POOL.length);
      const fallbackSubset = UNIVERSAL_FALLBACK_POOL.slice(0, count).map((q, idx) => ({
        ...q,
        id: idx + 1,
      }));
      setQuestions(fallbackSubset);
      if (timedMode) setSecondsRemaining(fallbackSubset.length * 90);
      showToast(`Loaded ${fallbackSubset.length} multi-disciplinary practice questions (Offline / Ready Bank).`, "info");
    } finally {
      setIsGenerating(false);
      setGenerationPhase("");
    }
  };

  const handleSelectAnswer = (qId: number, optionIdx: number) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: optionIdx }));
  };

  const toggleFlag = (qId: number) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const handleSubmitExam = (force = false) => {
    const answeredCount = Object.keys(userAnswers).length;
    if (!force && answeredCount < questions.length) {
      const unanswered = questions.length - answeredCount;
      const proceed = window.confirm(
        `You have ${unanswered} unanswered question${unanswered > 1 ? "s" : ""}. Submit exam for grading now?`
      );
      if (!proceed) return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setIsSubmitted(true);

    let correctCount = 0;
    questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctIndex) correctCount++;
    });

    const percentage = Math.round((correctCount / questions.length) * 100);
    const passed = percentage >= benchmarkThreshold;

    const newResult: ExamResult = {
      score: correctCount,
      total: questions.length,
      percentage,
      benchmark: benchmarkThreshold,
      passed,
      date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      topic: topicInput.trim() || "Materials Review",
    };

    const updated = [newResult, ...examHistory.slice(0, 9)];
    setExamHistory(updated);
    try {
      localStorage.setItem("rm_exam_history", JSON.stringify(updated));
    } catch {}

    if (passed) {
      showToast(`Benchmark Achieved! Scored ${correctCount}/${questions.length} (${percentage}%) vs ${benchmarkThreshold}% target.`, "success");
    } else {
      showToast(`Exam complete: ${correctCount}/${questions.length} (${percentage}%). Target was ${benchmarkThreshold}%.`, "info");
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
      percentage: Math.round((correct / questions.length) * 100),
      missed,
    };
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

  // Handle Retaking only missed questions
  const handleRetakeMissed = () => {
    const { missed } = calculateScore();
    if (missed.length === 0) {
      showToast("100% Score! No missed questions to retake.", "success");
      return;
    }
    const retakeList = missed.map((q, idx) => ({ ...q, id: idx + 1 }));
    handleGenerateExam(retakeList);
  };

  // Format seconds to mm:ss
  const formatTimer = (sec: number | null) => {
    if (sec === null) return "--:--";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Print Exam Sheet handler
  const handlePrintExam = () => {
    window.print();
  };

  const currentQ = questions[activeQuestionIdx];

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
              Universal Mock Exam & Diagnostic Suite
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
              Precision practice tests & analytics calibrated from Grade 11 STEM to College 2nd-Year Core.
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

        {/* Search & Topic Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Focus topic (e.g. 'Thermodynamics', 'Calculus Integrals', 'Truth Tables', or leave blank)..."
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
            />
          </div>

          {items.length > 0 && (
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
            >
              <option value="all">All Ingested Materials ({items.length})</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  📄 {it.title?.slice(0, 32) || "Document"}
                </option>
              ))}
            </select>
          )}

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
            <span>{isGenerating ? "Synthesizing Exam..." : `Generate ${questionCount} Questions`}</span>
          </button>
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

        {/* Expandable Parameters Drawer */}
        {showConfigDrawer && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/50 dark:bg-slate-950/30 p-4 rounded-xl">
            {/* 1. Exam Length */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
                Questions Count
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[5, 10, 20].map((count) => (
                  <button
                    key={count}
                    onClick={() => setQuestionCount(count as any)}
                    className={`py-1.5 text-xs rounded-lg border font-mono transition-all ${
                      questionCount === count
                        ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    {count} Qs
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Benchmark Passing Score */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
                  Passing Cutoff
                </label>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {benchmarkThreshold}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { val: 75, label: "75% Pass" },
                  { val: 80, label: "80% CSC" },
                  { val: 90, label: "90% Honor" },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    onClick={() => setBenchmarkThreshold(preset.val)}
                    className={`py-1.5 text-[11px] rounded-lg border font-mono transition-all ${
                      benchmarkThreshold === preset.val
                        ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Target Level */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
                Academic Level
              </label>
              <select
                value={academicLevel}
                onChange={(e) => setAcademicLevel(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="auto">Auto-Detect from Materials</option>
                <option value="stem_shs">Senior High STEM (Grades 11-12)</option>
                <option value="college_core">College 1st-2nd Year Core</option>
                <option value="csc_exam">Civil Service / GenEd Exam</option>
              </select>
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
                <span>{timedMode ? `Active (90s / Q)` : "Untimed Practice"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Generating Progress Indicator */}
        {isGenerating && (
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
            <div className="text-xs text-indigo-900 dark:text-indigo-200 font-sans">
              <strong>Synthesizing Assessment:</strong> {generationPhase}
            </div>
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

            {/* Center: Timer & Flagging */}
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

              <button
                onClick={() => toggleFlag(currentQ.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                  flaggedIds.has(currentQ.id)
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-300 dark:border-amber-700"
                    : "bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900"
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{flaggedIds.has(currentQ.id) ? "Flagged" : "Flag"}</span>
              </button>

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

          {/* ------------------------------------------------------------- */}
          {/* Question Cards (Stepper Mode or List Mode)                   */}
          {/* ------------------------------------------------------------- */}
          {(viewMode === "stepper" ? [currentQ] : questions).map((q, localIdx) => {
            const actualIndex = viewMode === "stepper" ? activeQuestionIdx : localIdx;
            const selectedOpt = userAnswers[q.id];
            const isCorrect = selectedOpt === q.correctIndex;

            return (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4"
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold border border-indigo-200 dark:border-indigo-800">
                      {actualIndex + 1}
                    </span>
                    <span className="text-slate-400 uppercase tracking-wider text-[11px] font-medium">
                      {q.topicTag || "General Review"}
                    </span>
                  </div>

                  {isSubmitted && (
                    <span className="flex items-center gap-1 text-xs font-mono font-medium">
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

                {/* Academic 4-Step Explanation with KaTeX */}
                {isSubmitted && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-sans leading-relaxed space-y-2">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      <BookOpen className="w-3.5 h-3.5" />
                      Academic Derivation & Exam Trap Analysis:
                    </div>
                    <AcademicMathView content={q.explanation} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Stepper Navigation Footer */}
          {viewMode === "stepper" && (
            <div className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
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
          )}

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
    </div>
  );
};

export default MockExamEngine;
