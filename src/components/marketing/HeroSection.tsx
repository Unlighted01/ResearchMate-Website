import React, { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Sparkles,
  Table2,
  GraduationCap,
  PenTool,
  RotateCw,
  Check,
  CheckCircle2,
  Copy,
  Printer,
  QrCode,
  FileText,
  Layers,
  ChevronRight,
  ChevronLeft,
  Clock,
  ShieldCheck,
  UploadCloud,
  Loader2,
  AlertCircle,
  X,
  FileCheck,
  BookmarkCheck,
  Trophy,
} from "lucide-react";
import { AcademicMathView } from "../shared/AcademicMathView";
import type { ParsedQaItem } from "../../services/pdfQuestionImporter";
import type { Flashcard } from "../../services/examService";
import {
  savePlaygroundPendingPdf,
  clearPlaygroundPendingPdf,
} from "../../services/localPdfStore";

type PlaygroundMode = "exam" | "matrix" | "flashcards" | "math_ocr";

const MATRIX_DATA = [
  {
    paper: "Vaswani et al. (2017)",
    title: "Attention Is All You Need",
    method: "Multi-Head Self-Attention",
    dataset: "WMT 2014 En-De / En-Fr",
    finding: "28.4 BLEU; O(1) sequential training step",
    gap: "Quadratic O(N²) memory scaling on long contexts",
  },
  {
    paper: "Dao et al. (2022)",
    title: "FlashAttention: Fast & IO-Aware",
    method: "SRAM IO-Aware Tiling & Recomputation",
    dataset: "BERT-large, GPT-2, Long-Range Arena",
    finding: "2-4x wall-clock speedup; O(N) memory",
    gap: "Hardware-specific SRAM kernel tuning required",
  },
  {
    paper: "Gu & Dao (2023)",
    title: "Mamba: Linear-Time Sequence Modeling",
    method: "Selective State Space Model (SSM)",
    dataset: "The Pile (300B tokens) & Audio/Genomics",
    finding: "5x inference throughput; linear scaling",
    gap: "Lacks exact associative recall on needle tasks",
  },
];

const HeroSection: React.FC = () => {
  const [activeMode, setActiveMode] = useState<PlaygroundMode>("exam");
  const [selectedExamOption, setSelectedExamOption] = useState<number | null>(null);
  const [showOmrPreview, setShowOmrPreview] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardRating, setFlashcardRating] = useState<string | null>(null);
  const [copiedLatex, setCopiedLatex] = useState(false);
  const [copiedMatrix, setCopiedMatrix] = useState(false);

  // PDF Testing Sandbox State (In-Memory Only)
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [parseProgress, setParseProgress] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [totalParsedCount, setTotalParsedCount] = useState<number>(0);
  const [customQuestions, setCustomQuestions] = useState<ParsedQaItem[]>([]);
  const [customFlashcards, setCustomFlashcards] = useState<Flashcard[]>([]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);

  // Auto-advance & Answer State
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const [isPlaygroundComplete, setIsPlaygroundComplete] = useState(false);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  // Default Sample Question (Republic Act No. 6713)
  const defaultSampleQuestion = {
    id: "q-ra6713-sample",
    stem: "Under Republic Act No. 6713 (Code of Conduct and Ethical Standards), public officials and employees must file their Statement of Assets, Liabilities, and Net Worth (SALN) within how many days after assumption of office?",
    options: [
      "Fifteen (15) days after assumption of office",
      "Thirty (30) days after assumption of office",
      "Sixty (60) days after assumption of office",
      "Ninety (90) days after assumption of office",
    ],
    correctIndex: 1, // 30 days
    explanation:
      "Section 8(A) of RA 6713 explicitly mandates the filing of the SALN within thirty (30) days after assumption of office, on or before April 30 of every year thereafter, and within thirty (30) days after separation from service.",
    topicTag: "Civil Service & Statutory Ethics",
    seed: "EXAM-RA6713-V1",
  };

  // Resolve currently active question
  const hasCustomQuestions = customQuestions.length > 0;
  const currentExamItem = hasCustomQuestions
    ? {
        id: customQuestions[activeQuestionIdx].id,
        stem: customQuestions[activeQuestionIdx].stem,
        options: customQuestions[activeQuestionIdx].options,
        correctIndex: customQuestions[activeQuestionIdx].correctIndex,
        explanation:
          customQuestions[activeQuestionIdx].explanation ||
          (customQuestions[activeQuestionIdx].sourceQuote
            ? `Source Quote: "${customQuestions[activeQuestionIdx].sourceQuote}"`
            : "Extracted directly from source document."),
        topicTag:
          customQuestions[activeQuestionIdx].chapter ||
          uploadedFileName?.replace(/\.[^/.]+$/, "") ||
          "Imported Document",
        seed: `EXAM-${(uploadedFileName || "DOC").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}-V1`,
        page: customQuestions[activeQuestionIdx].sourcePage,
      }
    : defaultSampleQuestion;

  // Resolve currently active flashcard
  const hasCustomFlashcards = customFlashcards.length > 0;
  const currentFlashcard = hasCustomFlashcards
    ? customFlashcards[activeCardIdx]
    : {
        id: "flashcard-sample-1",
        front:
          "What is the core quadratic bottleneck in standard Multi-Head Attention, and how does FlashAttention's IO-aware tiling achieve linear memory complexity?",
        back: "Standard attention materializes the intermediate N × N attention matrix to High Bandwidth Memory (HBM), resulting in O(N²) memory reads and writes.\n\nFlashAttention tiles queries, keys, and values into fast on-chip SRAM blocks, computing softmax normalization incrementally without writing large intermediate matrices back to HBM.",
        category: "Machine Learning Architecture",
      };

  // Handle Option Selection with Auto-Advancing
  const handleSelectExamOption = (idx: number) => {
    setSelectedExamOption(idx);
    setUserAnswers((prev) => ({
      ...prev,
      [activeQuestionIdx]: idx,
    }));

    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    setIsAutoAdvancing(true);

    const questionCount = hasCustomQuestions ? customQuestions.length : 1;

    autoAdvanceTimerRef.current = setTimeout(() => {
      setIsAutoAdvancing(false);
      if (activeQuestionIdx < questionCount - 1) {
        const nextIdx = activeQuestionIdx + 1;
        setActiveQuestionIdx(nextIdx);
        setSelectedExamOption(userAnswers[nextIdx] ?? null);
      } else {
        // Reached end of playground questions
        setIsPlaygroundComplete(true);
      }
    }, 1200);
  };

  // Handle Manual Question Navigation
  const handleNavigateQuestion = (newIdx: number) => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setIsAutoAdvancing(false);
    setActiveQuestionIdx(newIdx);
    setSelectedExamOption(userAnswers[newIdx] ?? null);
  };

  // Calculate live score
  const playgroundScore = useMemo(() => {
    if (!hasCustomQuestions) {
      return selectedExamOption === defaultSampleQuestion.correctIndex ? 1 : 0;
    }
    return customQuestions.reduce((score, q, idx) => {
      return userAnswers[idx] === q.correctIndex ? score + 1 : score;
    }, 0);
  }, [hasCustomQuestions, customQuestions, userAnswers, selectedExamOption, defaultSampleQuestion.correctIndex]);

  // Handle PDF Upload for Guest Sandbox (Zero Server Upload, In-Memory & IndexedDB)
  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setParseError("Please upload a standard .pdf document.");
      return;
    }

    setIsParsingPdf(true);
    setParseError(null);
    setParseProgress("Extracting layout & text in-browser...");
    setSelectedExamOption(null);
    setShowOmrPreview(false);
    setUserAnswers({});
    setIsPlaygroundComplete(false);

    try {
      const { extractAllPagesWithLayout } = await import("../../services/pdfService");
      const { parseTwoPassQuestionsAndAnswers, toFlashcards } = await import(
        "../../services/pdfQuestionImporter"
      );

      // Fast, memory-safe playground preview: extracts up to the first 25 pages
      const extraction = await extractAllPagesWithLayout(file, (current, total) => {
        setParseProgress(`Processing page ${current} of ${Math.min(total, 25)} in-browser...`);
      });

      const pagesToParse = extraction.pages.slice(0, 25);
      const cleanSubject = file.name.replace(/\.[^/.]+$/, "").trim();

      const parsedItems = parseTwoPassQuestionsAndAnswers(pagesToParse);

      if (!parsedItems || parsedItems.length === 0) {
        setParseError(
          "No multiple-choice questions or structured sections found in the first 25 pages. Try an exam reviewer, past paper, or textbook PDF."
        );
        setIsParsingPdf(false);
        return;
      }

      // Restrict playground preview to exactly 10 questions for immediate testing
      const PLAYGROUND_PREVIEW_LIMIT = 10;
      const previewSlice = parsedItems.slice(0, PLAYGROUND_PREVIEW_LIMIT);

      setUploadedFileName(file.name);
      setTotalParsedCount(parsedItems.length);
      setCustomQuestions(previewSlice);
      setCustomFlashcards(toFlashcards(previewSlice));
      setActiveQuestionIdx(0);
      setActiveCardIdx(0);
      setActiveMode("exam");

      // Save full PDF & all parsed items in local IndexedDB so it automatically
      // becomes available in the user's dashboard if they register or log in!
      try {
        await savePlaygroundPendingPdf(file, parsedItems);
      } catch (storeErr) {
        console.warn("Could not stash pending playground PDF in IndexedDB:", storeErr);
      }

      // Stash preview into sessionStorage
      try {
        sessionStorage.setItem(
          "rm_pending_playground_exam",
          JSON.stringify({
            fileName: file.name,
            totalParsedCount: parsedItems.length,
            previewCount: previewSlice.length,
            questions: previewSlice.map((q) => ({
              id: q.id,
              question: q.stem,
              options: q.options,
              correctIndex: q.correctIndex,
              explanation: q.explanation,
              topicTag: q.chapter || cleanSubject,
            })),
          })
        );
      } catch (_) {
        // Ignore quota limits
      }
    } catch (err: any) {
      console.error("Playground PDF parse error:", err);
      setParseError(
        err?.message || "Failed to parse PDF in-browser. Please ensure the PDF is not password-protected."
      );
    } finally {
      setIsParsingPdf(false);
      event.target.value = "";
    }
  };

  const handleResetToDefault = async () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setIsAutoAdvancing(false);
    setIsPlaygroundComplete(false);
    setUserAnswers({});
    setUploadedFileName(null);
    setTotalParsedCount(0);
    setCustomQuestions([]);
    setCustomFlashcards([]);
    setActiveQuestionIdx(0);
    setActiveCardIdx(0);
    setSelectedExamOption(null);
    setShowOmrPreview(false);
    setParseError(null);
    try {
      await clearPlaygroundPendingPdf();
    } catch (_) {}
  };

  const handleCopyLatex = () => {
    navigator.clipboard.writeText(
      "\\oint_{\\partial \\Sigma} \\mathbf{E} \\cdot d\\boldsymbol{\\ell} = -\\frac{d}{dt} \\iint_{\\Sigma} \\mathbf{B} \\cdot d\\mathbf{A}"
    );
    setCopiedLatex(true);
    setTimeout(() => setCopiedLatex(false), 2000);
  };

  const handleCopyMatrix = () => {
    const text = MATRIX_DATA.map(
      (m) => `${m.paper} | ${m.method} | Finding: ${m.finding} | Limitation: ${m.gap}`
    ).join("\n");
    navigator.clipboard.writeText(text);
    setCopiedMatrix(true);
    setTimeout(() => setCopiedMatrix(false), 2000);
  };

  return (
    <section className="pt-10 sm:pt-14 lg:pt-16 pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Editorial Header Stack (Max 4 elements: Eyebrow, Headline, Subtext, CTAs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start mb-12">
        <div className="lg:col-span-7 space-y-5">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-mono text-slate-700 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ResearchMate 2.0 • The Academic Engine</span>
          </div>

          {/* Headline - Max 2 lines on desktop */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-title font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.08] max-w-[22ch]">
            From unread papers and lab notes to cited drafts and verified exams.
          </h1>

          {/* Subtext - Max 20 words */}
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-sans leading-relaxed max-w-[56ch]">
            Synthesize multi-paper literature matrices, transcribe whiteboard math into LaTeX, and generate seeded mock exams with printable OMR sheets.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 transition-all active:scale-[0.98] shadow-xs"
            >
              <span>Start Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#playground"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("playground")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium text-sm border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Try Interactive Playground</span>
            </a>
          </div>
        </div>

        {/* System Capabilities Overview Card */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
              Platform Modules
            </span>
            <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-800/50">
              100% Offline Capable
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Seeded Mock Exam & OMR Engine
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                Deterministic PRNG seeds (`EXAM-xxx`), anti-leak enemy filtering, and printable 50/100 OMR bubble sheets.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Table2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Comparative Literature Matrix
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                Drop 10+ PDFs to automatically extract methodologies, benchmark datasets, findings & research gaps.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Active Recall Flashcards Studio
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                Auto-generate companion decks with spaced repetition ratings straight from ingested books and notes.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Whiteboard Math to LaTeX
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                Snap handwritten proofs and scratchpad derivations into publication-ready KaTeX blocks ($$...$$).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Core Engine Console / Playground */}
      <div
        id="playground"
        className="scroll-mt-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
      >
        {/* Playground Top Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-900/60">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
                Interactive Engine Playground
              </p>
              <p className="text-[11px] text-slate-500">
                Test pre-loaded datasets or upload your own PDF for a zero-save, in-browser live preview.
              </p>
            </div>
          </div>

          {/* Action Row: Mode Switcher + Upload Own PDF Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mode Tabs */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-medium border border-slate-200/80 dark:border-slate-700/80 overflow-x-auto">
              <button
                onClick={() => setActiveMode("exam")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeMode === "exam"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-2xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                <span>Exam Simulator & OMR</span>
              </button>

              <button
                onClick={() => setActiveMode("matrix")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeMode === "matrix"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-2xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Table2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Literature Matrix</span>
              </button>

              <button
                onClick={() => setActiveMode("flashcards")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeMode === "flashcards"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-2xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                <span>Active Recall Cards</span>
              </button>

              <button
                onClick={() => setActiveMode("math_ocr")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeMode === "math_ocr"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-2xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <PenTool className="w-3.5 h-3.5 text-amber-500" />
                <span>Whiteboard Math OCR</span>
              </button>
            </div>

            {/* Test Your Own PDF Button */}
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-semibold text-indigo-900 dark:text-indigo-200 transition-colors cursor-pointer shadow-2xs">
              <UploadCloud className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Test Your Own PDF</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                disabled={isParsingPdf}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Error Alert Banner */}
        {parseError && (
          <div className="px-5 py-3 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 flex items-center justify-between text-xs text-rose-800 dark:text-rose-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{parseError}</span>
            </div>
            <button
              onClick={() => setParseError(null)}
              className="text-rose-600 hover:text-rose-800 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Guest In-Memory Live Preview Notice */}
        {uploadedFileName && (
          <div className="px-5 py-3.5 bg-amber-50/70 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-start sm:items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold font-title">Guest Memory Sandbox:</span>
                  <span className="font-semibold underline decoration-amber-300 dark:decoration-amber-700">"{uploadedFileName}"</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-semibold">
                    10 Playground Questions
                  </span>
                </div>
                <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90 font-mono mt-0.5">
                  🔒 Running in client memory. {totalParsedCount > 10 ? `Create an account to unlock all ${totalParsedCount} questions and full literature matrix in your dashboard.` : "Create an account to save this document to your dashboard."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/signup"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold text-xs hover:bg-slate-800 transition-all shadow-xs"
              >
                <span>Save to Free Account</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <button
                onClick={handleResetToDefault}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs transition-colors cursor-pointer"
                title="Discard temporary PDF and return to default"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* In-Browser PDF Parsing Loader */}
        {isParsingPdf && (
          <div className="py-12 px-6 flex flex-col items-center justify-center space-y-3 bg-slate-50/40 dark:bg-slate-950/40">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Parsing PDF layout in-browser...
            </p>
            <p className="text-xs text-slate-500 font-mono text-center">
              {parseProgress || "Extracting text coordinates, choices, and chapter answer keys..."}
            </p>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/50">
              100% Client-Side Privacy • Zero API Cost • File Never Leaves Device
            </span>
          </div>
        )}

        {/* Playground Workspace */}
        {!isParsingPdf && (
          <div className="p-5 sm:p-7">
            <AnimatePresence mode="wait">
              {/* 1. EXAM SIMULATOR & OMR PREVIEW */}
              {activeMode === "exam" && (
                <motion.div
                  key="exam"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  {/* Meta Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 font-semibold">
                        {currentExamItem.seed}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 truncate max-w-[200px] sm:max-w-xs">
                        {currentExamItem.topicTag}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Enemy Filter Passed
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Auto-advancing indicator */}
                      {isAutoAdvancing && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/50 animate-pulse">
                          <Clock className="w-3 h-3 animate-spin" /> Advancing...
                        </span>
                      )}

                      {/* Pagination if multiple custom questions loaded */}
                      {hasCustomQuestions && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono pr-2 border-r border-slate-200 dark:border-slate-800">
                          <button
                            onClick={() => handleNavigateQuestion(Math.max(0, activeQuestionIdx - 1))}
                            disabled={activeQuestionIdx === 0}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                            title="Previous question"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span>
                            {activeQuestionIdx + 1} / {customQuestions.length}
                          </span>
                          <button
                            onClick={() =>
                              handleNavigateQuestion(
                                Math.min(customQuestions.length - 1, activeQuestionIdx + 1)
                              )
                            }
                            disabled={activeQuestionIdx === customQuestions.length - 1}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                            title="Next question"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => setShowOmrPreview(!showOmrPreview)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        <span>{showOmrPreview ? "Back to Question" : "Inspect Printable OMR Sheet"}</span>
                      </button>
                    </div>
                  </div>

                  {!showOmrPreview ? (
                    isPlaygroundComplete ? (
                      /* 10-Question Completion & Conversion Card */
                      <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 mx-auto">
                          <Trophy className="w-7 h-7" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-xl font-title font-bold text-slate-900 dark:text-slate-100">
                            Playground Test Complete!
                          </h3>
                          <p className="text-sm font-mono text-slate-600 dark:text-slate-400">
                            Your Score: <span className="font-bold text-emerald-600 dark:text-emerald-400">{playgroundScore} / {hasCustomQuestions ? customQuestions.length : 1}</span> ({Math.round((playgroundScore / (hasCustomQuestions ? customQuestions.length : 1)) * 100)}% accuracy)
                          </p>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                          {uploadedFileName ? (
                            <>
                              You just completed 10 questions from <strong>"{uploadedFileName}"</strong>.
                              {totalParsedCount > 10
                                ? ` The remaining ${totalParsedCount - 10} questions, active recall flashcards, and literature matrix are ready to unlock.`
                                : " Your full document, flashcard decks, and literature matrix are ready to unlock in your dashboard."}
                            </>
                          ) : (
                            "You just completed the statutory ethics sample test. Sign up for a free account to upload your own papers and textbooks."
                          )}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                          <Link
                            to="/signup"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold text-xs hover:bg-slate-800 transition-all shadow-sm"
                          >
                            <span>Save Document & Unlock Full Dashboard</span>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setIsPlaygroundComplete(false);
                              handleNavigateQuestion(0);
                            }}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            Review 10 Questions
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Question Card */
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                          <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-md bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {hasCustomQuestions ? activeQuestionIdx + 1 : 1}
                            </span>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed font-sans">
                              {currentExamItem.stem}
                            </p>
                          </div>
                        </div>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {currentExamItem.options.map((opt, idx) => {
                            const letter = String.fromCharCode(65 + idx);
                            const isSelected = selectedExamOption === idx;
                            const isCorrect = idx === currentExamItem.correctIndex;
                            let optionStyle =
                              "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200";

                            if (selectedExamOption !== null) {
                              if (isCorrect) {
                                optionStyle =
                                  "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/50";
                              } else if (isSelected) {
                                optionStyle =
                                  "border-rose-400 bg-rose-50/50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200";
                              }
                            }

                            return (
                              <button
                                key={idx}
                                onClick={() => handleSelectExamOption(idx)}
                                className={`p-3 rounded-xl border text-left text-xs font-sans transition-all flex items-start gap-2.5 cursor-pointer ${optionStyle}`}
                              >
                                <span
                                  className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 border ${
                                    isSelected
                                      ? isCorrect
                                        ? "bg-emerald-600 text-white border-emerald-600"
                                        : "bg-rose-500 text-white border-rose-500"
                                      : "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                  }`}
                                >
                                  {letter}
                                </span>
                                <span className="leading-relaxed mt-0.5">{opt}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Immediate Tactile Explanation Banner */}
                        {selectedExamOption !== null && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="p-3.5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 text-xs text-slate-700 dark:text-slate-300 space-y-1"
                          >
                            <p className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span>
                                {selectedExamOption === currentExamItem.correctIndex
                                  ? "Correct! Verified Key"
                                  : `Review Note: Correct answer is Option ${String.fromCharCode(
                                      65 + currentExamItem.correctIndex
                                    )}`}
                              </span>
                            </p>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                              {currentExamItem.explanation}
                            </p>
                            {isAutoAdvancing && (
                              <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 pt-1.5 border-t border-indigo-200/50 dark:border-indigo-900/50">
                                <Clock className="w-3 h-3 animate-spin" /> Moving to next question automatically...
                              </p>
                            )}
                          </motion.div>
                        )}
                      </div>
                    )
                  ) : (
                    /* OMR Sheet Preview */
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3 font-mono">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                          <QrCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">
                              ResearchMate OMR Sheet (50/100 Format)
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Code: {currentExamItem.seed} • Document:{" "}
                              {uploadedFileName || "Statutory Reviewer"}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                          Printable A4 / Letter
                        </span>
                      </div>

                      {/* Simulated Bubbles Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((qNum) => {
                          const item = hasCustomQuestions ? customQuestions[qNum - 1] : null;
                          const correctLetter = item
                            ? String.fromCharCode(65 + item.correctIndex)
                            : qNum === 1
                            ? "B"
                            : null;

                          return (
                            <div
                              key={qNum}
                              className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                            >
                              <span className="font-bold text-slate-500 w-4">{qNum}.</span>
                              <div className="flex items-center gap-1">
                                {["A", "B", "C", "D"].map((b) => (
                                  <span
                                    key={b}
                                    className={`w-4 h-4 rounded-full border text-[9px] flex items-center justify-center font-bold ${
                                      correctLetter === b
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-slate-900"
                                        : "border-slate-300 dark:border-slate-700 text-slate-400"
                                    }`}
                                  >
                                    {b}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-[11px] text-slate-500">
                        <p>
                          💡 Mobile camera pen grading reads QR code to reconstruct key without internet access.
                        </p>
                        {!uploadedFileName ? (
                          <Link
                            to="/signup"
                            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                          >
                            Sign in to download full PDF sheet →
                          </Link>
                        ) : (
                          <Link
                            to="/signup"
                            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                          >
                            Save this exam to download PDF sheet →
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* 2. LITERATURE MATRIX */}
              {activeMode === "matrix" && (
                <motion.div
                  key="matrix"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 font-title uppercase tracking-wider">
                        Multi-Paper Synthesis Matrix (3 Breakthrough Architecture Papers)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Auto-extracted comparative table. Highlights core methodologies and unaddressed literature gaps.
                      </p>
                    </div>

                    <button
                      onClick={handleCopyMatrix}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      {copiedMatrix ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>{copiedMatrix ? "Copied" : "Copy Citations"}</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs font-sans">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                        <tr>
                          <th className="p-2.5">Paper / Author</th>
                          <th className="p-2.5">Methodology</th>
                          <th className="p-2.5">Dataset / Benchmarks</th>
                          <th className="p-2.5">Key Finding</th>
                          <th className="p-2.5">Identified Limitation / Gap</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {MATRIX_DATA.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              <p>{row.paper}</p>
                              <p className="text-[10px] text-slate-400 italic">{row.title}</p>
                            </td>
                            <td className="p-2.5">{row.method}</td>
                            <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                              {row.dataset}
                            </td>
                            <td className="p-2.5 text-emerald-700 dark:text-emerald-400 font-medium">
                              {row.finding}
                            </td>
                            <td className="p-2.5 text-amber-700 dark:text-amber-400">{row.gap}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* 3. ACTIVE RECALL FLASHCARDS */}
              {activeMode === "flashcards" && (
                <motion.div
                  key="flashcards"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 font-title uppercase tracking-wider">
                        Interactive Flashcard Companion
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Click card or press flip to test recall. Rates mastery for spaced repetition scheduling.
                      </p>
                    </div>

                    {/* Card pagination if custom flashcards loaded */}
                    {hasCustomFlashcards && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                        <button
                          onClick={() => {
                            setActiveCardIdx((prev) => Math.max(0, prev - 1));
                            setIsFlipped(false);
                            setFlashcardRating(null);
                          }}
                          disabled={activeCardIdx === 0}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                          title="Previous card"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span>
                          {activeCardIdx + 1} / {customFlashcards.length}
                        </span>
                        <button
                          onClick={() => {
                            setActiveCardIdx((prev) =>
                              Math.min(customFlashcards.length - 1, prev + 1)
                            );
                            setIsFlipped(false);
                            setFlashcardRating(null);
                          }}
                          disabled={activeCardIdx === customFlashcards.length - 1}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                          title="Next card"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Flip Card Container */}
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="p-6 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 dark:from-slate-900 dark:to-slate-950 min-h-[170px] flex flex-col justify-between cursor-pointer hover:border-indigo-400 transition-all select-none shadow-xs"
                  >
                    <div className="flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-mono">
                      <span>{isFlipped ? "BACK • ANSWER & DERIVATION" : "FRONT • ACTIVE PROMPT"}</span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <RotateCw className="w-3 h-3" /> Click anywhere to flip
                      </span>
                    </div>

                    <div className="py-3">
                      {!isFlipped ? (
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-title leading-relaxed">
                          {currentFlashcard.front}
                        </p>
                      ) : (
                        <div className="space-y-2 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-line">
                          {currentFlashcard.back}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <span>Category: {currentFlashcard.category || "General Review"}</span>
                      <span>
                        Card {hasCustomFlashcards ? activeCardIdx + 1 : 1} of{" "}
                        {hasCustomFlashcards ? customFlashcards.length : 24}
                      </span>
                    </div>
                  </div>

                  {/* Rating Pills */}
                  {isFlipped && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center gap-3 pt-1"
                    >
                      <span className="text-xs text-slate-500">Rate Recall:</span>
                      <button
                        onClick={() => setFlashcardRating("Hard")}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          flashcardRating === "Hard"
                            ? "bg-rose-600 text-white border-rose-600"
                            : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        Hard (1 day)
                      </button>
                      <button
                        onClick={() => setFlashcardRating("Good")}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          flashcardRating === "Good"
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        Good (3 days)
                      </button>
                      <button
                        onClick={() => setFlashcardRating("Easy")}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          flashcardRating === "Easy"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        Easy (7 days)
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* 4. WHITEBOARD MATH OCR */}
              {activeMode === "math_ocr" && (
                <motion.div
                  key="math_ocr"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch"
                >
                  {/* Left: Input Whiteboard Derivation */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pb-2 border-b border-slate-200 dark:border-slate-800">
                        <span>Input: Camera / Scratchpad</span>
                        <span className="text-amber-600 dark:text-amber-400">Faraday's Law of Induction</span>
                      </div>

                      <div className="p-4 rounded-lg bg-amber-50/30 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 font-mono text-xs text-slate-800 dark:text-slate-200 space-y-1">
                        <p className="text-slate-400 italic text-[11px]">// Physical Whiteboard Ink Transcription</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          contour_integral(E . dl) = - d/dt (surface_integral(B . dA))
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Identified: closed line integral of electric field along boundary Sigma equals rate of change of magnetic flux.
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 pt-3">
                      📷 Upload phone camera photos, tablet drawings, or PDF scan pages.
                    </p>
                  </div>

                  {/* Right: Rendered KaTeX Equation */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-xs">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Output: KaTeX Equation</span>
                        <span>Overleaf & Typst Ready</span>
                      </div>

                      <div className="py-2 text-center overflow-x-auto">
                        <AcademicMathView
                          text={"$$\\oint_{\\partial \\Sigma} \\mathbf{E} \\cdot d\\boldsymbol{\\ell} = -\\frac{d}{dt} \\iint_{\\Sigma} \\mathbf{B} \\cdot d\\mathbf{A}$$"}
                        />
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 font-mono text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto">
                        {"\\oint_{\\partial \\Sigma} \\mathbf{E} \\cdot d\\boldsymbol{\\ell} = -\\frac{d}{dt} \\iint_{\\Sigma} \\mathbf{B} \\cdot d\\mathbf{A}"}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 text-xs">
                      <span className="text-[11px] text-slate-500 font-mono">LaTeX block syntax ($$...$$)</span>
                      <button
                        onClick={handleCopyLatex}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer"
                      >
                        {copiedLatex ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedLatex ? "Copied" : "Copy LaTeX"}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
