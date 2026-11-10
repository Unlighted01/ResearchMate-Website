import React, { useState } from "react";
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
  Clock,
  ShieldCheck,
} from "lucide-react";
import { AcademicMathView } from "../shared/AcademicMathView";

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

  // Sample Exam Question
  const sampleQuestion = {
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-900/60">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
                Interactive Engine Playground
              </p>
              <p className="text-[11px] text-slate-500">
                Click any tab to test live components with real academic datasets.
              </p>
            </div>
          </div>

          {/* Tabs */}
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
        </div>

        {/* Playground Workspace */}
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
                      {sampleQuestion.seed}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">{sampleQuestion.topicTag}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Enemy Filter Passed
                    </span>
                  </div>

                  <button
                    onClick={() => setShowOmrPreview(!showOmrPreview)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>{showOmrPreview ? "Back to Question" : "Inspect Printable OMR Sheet"}</span>
                  </button>
                </div>

                {!showOmrPreview ? (
                  /* Question Card */
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-md bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          1
                        </span>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed font-sans">
                          {sampleQuestion.stem}
                        </p>
                      </div>
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {sampleQuestion.options.map((opt, idx) => {
                        const letter = String.fromCharCode(65 + idx);
                        const isSelected = selectedExamOption === idx;
                        const isCorrect = idx === sampleQuestion.correctIndex;
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
                            onClick={() => setSelectedExamOption(idx)}
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
                            {selectedExamOption === sampleQuestion.correctIndex
                              ? "Correct! Verified Statutory Key"
                              : "Review Note: Correct answer is Option B (30 days)"}
                          </span>
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          {sampleQuestion.explanation}
                        </p>
                      </motion.div>
                    )}
                  </div>
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
                            Code: EXAM-RA6713-V1 • Layout: 2-Column Standard MCQ
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                        Printable A4 / Letter
                      </span>
                    </div>

                    {/* Simulated Bubbles Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((qNum) => (
                        <div
                          key={qNum}
                          className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                        >
                          <span className="font-bold text-slate-500 w-4">{qNum}.</span>
                          <div className="flex items-center gap-1">
                            {["A", "B", "C", "D"].map((b, bIdx) => (
                              <span
                                key={b}
                                className={`w-4 h-4 rounded-full border text-[9px] flex items-center justify-center font-bold ${
                                  qNum === 1 && b === "B"
                                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-slate-900"
                                    : "border-slate-300 dark:border-slate-700 text-slate-400"
                                }`}
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] text-slate-500 pt-1">
                      💡 Scanned by mobile camera or camera pen. Answer key is automatically reconstructed from the QR seed code.
                    </p>
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
                    {copiedMatrix ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
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
                          <td className="p-2.5 text-slate-500 font-mono text-[11px]">{row.dataset}</td>
                          <td className="p-2.5 text-emerald-700 dark:text-emerald-400 font-medium">{row.finding}</td>
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
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/50">
                    Spaced Repetition
                  </span>
                </div>

                {/* Flip Card Container */}
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="p-6 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 dark:from-slate-900 dark:to-slate-950 min-h-[160px] flex flex-col justify-between cursor-pointer hover:border-indigo-400 transition-all select-none shadow-xs"
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
                        What is the core quadratic bottleneck in standard Multi-Head Attention, and how does FlashAttention's IO-aware tiling achieve linear memory complexity?
                      </p>
                    ) : (
                      <div className="space-y-2 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                        <p>
                          Standard attention materializes the intermediate N × N attention matrix to High Bandwidth Memory (HBM), resulting in O(N²) memory reads and writes.
                        </p>
                        <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                          FlashAttention tiles queries, keys, and values into fast on-chip SRAM blocks, computing softmax normalization incrementally without writing large intermediate matrices back to HBM.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <span>Category: Machine Learning Architecture</span>
                    <span>Card 1 of 24</span>
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
      </div>
    </section>
  );
};

export default HeroSection;
