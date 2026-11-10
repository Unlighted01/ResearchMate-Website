import React from "react";
import {
  GraduationCap,
  Table2,
  Layers,
  Database,
  PenTool,
  ShieldCheck,
  Printer,
  Sparkles,
  WifiOff,
  CheckCircle2,
  FileText,
  RotateCw,
  QrCode,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="max-w-3xl mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 mb-4 border border-slate-200 dark:border-slate-700">
          <span>Engineered for Academic Rigor</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-title font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.1] mb-4">
          Replace manual highlighting with verifiable academic synthesis.
        </h2>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-sans leading-relaxed max-w-[65ch]">
          From literature matrices and handwritten LaTeX to seeded mock exams and active recall decks — everything you need to study, model, and publish.
        </p>
      </div>

      {/* Asymmetric Bento Grid (5 purposeful cells, rhythmically balanced) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Bento 1: Seeded Mock Exam Simulator (Span 7) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-900/60">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-title">
                  Seeded Exam Simulator & OMR Bubble Sheets
                </h3>
              </div>
              <span className="text-[11px] font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/50">
                Core Simulator
              </span>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed max-w-[55ch]">
              Generate reproducible practice exams powered by Mulberry32 PRNG seed codes (`EXAM-xxx`). Automatically filters out enemy items so question stems never leak answers, and prints standard A4/Letter OMR bubble sheets with QR code matching.
            </p>
          </div>

          {/* Feature Badge Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1">
                <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                QR Seed Codes
              </span>
              <p className="text-[11px] text-slate-500">Every exam is deterministic & retakeable anywhere.</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Enemy Item Filter
              </span>
              <p className="text-[11px] text-slate-500">Zero duplicate quotes or answer leakage across items.</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1">
                <Printer className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Printable OMR
              </span>
              <p className="text-[11px] text-slate-500">Physical 50 & 100-item sheets with camera grading.</p>
            </div>
          </div>
        </div>

        {/* Bento 2: Literature Synthesis Matrix (Span 5) */}
        <div className="lg:col-span-5 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 p-6 sm:p-8 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-950/80 text-blue-400 flex items-center justify-center border border-blue-800/60">
                  <Table2 className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-semibold text-slate-100 font-title">
                  Comparative Literature Matrix
                </h3>
              </div>
              <span className="text-[11px] font-mono text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60">
                Multi-Paper
              </span>
            </div>

            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Ingest 10–15 papers simultaneously. ResearchMate extracts methodologies, benchmarks, datasets, findings, and research gaps into an interactive side-by-side comparison table without tedious manual snippet copying.
            </p>
          </div>

          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3.5 space-y-2 text-xs font-sans">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-1.5 border-b border-slate-800">
              <span>Paper & Dataset</span>
              <span>Gap Extracted</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-200">Vaswani et al. (WMT14)</span>
              <span className="text-amber-400">O(N²) context memory</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-200">Dao et al. (BERT / GPT-2)</span>
              <span className="text-emerald-400">IO-aware tiling speedup</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-200">Gu et al. (The Pile 300B)</span>
              <span className="text-blue-400">Linear state space (SSM)</span>
            </div>
          </div>
        </div>

        {/* Bento 3: Active Recall Flashcards Studio (Span 5) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-900/60">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-title">
                  Active Recall Flashcards Studio
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/50">
                Spaced Repetition
              </span>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              Every imported question or synthesized note automatically generates a companion flashcard deck. Study with keyboard controls (Space / 1-3), track mastery, and review difficult concepts on a spaced retention curve.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs space-y-2">
            <div className="flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-400 font-mono">
              <span>Flashcard Companion</span>
              <span>1-Click Deck Export</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 font-medium">
              "Flip to review correct statutory provision, math derivations, and detailed rationales."
            </p>
          </div>
        </div>

        {/* Bento 4: Zero-AI-Cost Question Ingestion & Bank (Span 7) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-200/60 dark:border-cyan-900/60">
                  <Database className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-title">
                  Question Bank & Ingestion Pipeline
                </h3>
              </div>
              <span className="text-[11px] font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-200/50">
                $0 AI Cost • In-Browser
              </span>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed max-w-[55ch]">
              Ingest full PDF textbooks (e.g. 1001 Math Problems, Bar & Board reviewers) completely inside your browser. Our 2-pass parser extracts stems, choices, and correlated chapter answer keys without cloud API costs, with full provenance and 1-click batch rollbacks.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              <p className="font-semibold text-slate-900 dark:text-slate-100 mb-0.5">Two-Pass Client Parser</p>
              <p className="text-[11px] text-slate-500">Correlates chapter answer keys and masks answer leakage.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              <p className="font-semibold text-slate-900 dark:text-slate-100 mb-0.5">One-Click Rollbacks</p>
              <p className="text-[11px] text-slate-500">Every import has an ID; delete or edit entire batches safely.</p>
            </div>
          </div>
        </div>

        {/* Bento 5: Handwritten Math OCR & Dual-Write Offline Persistence (Span 12) */}
        <div className="lg:col-span-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-900/60">
                  <PenTool className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-title">
                  Whiteboard Math OCR + Local-First Dual Sync
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Snap whiteboard proofs and scratchpad derivations straight into formatted LaTeX blocks ready for Overleaf. Everything is stored in local browser IndexedDB first, syncing smoothly to Supabase with automatic retry backoff.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <WifiOff className="w-3.5 h-3.5 text-slate-500" /> 100% Offline Capable
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Cloud Dual-Write
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" /> Overleaf (.tex) Export
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-slate-200 dark:border-slate-800">
                <span>Sync Status Verification</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">ONLINE & SYNCED</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[11px]">
                <code>exams, attempts, question_bank, flashcard_decks $\rightarrow$ LocalStorage & IndexedDB + Supabase</code>
              </div>
              <p className="text-[11px] text-slate-500">
                No session timeouts will ever erase your in-progress exams or study decks.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default FeaturesSection;
