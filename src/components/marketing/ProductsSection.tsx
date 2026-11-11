import React from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Table2,
  Database,
  Layers,
  ArrowRight,
  Check,
  Sparkles,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  status: string;
  features: string[];
  cta: string;
  ctaLink: string;
}

const PRODUCTS: Product[] = [
  {
    id: "exam_simulator",
    name: "Seeded Mock Exam Engine",
    tagline: "Deterministic Simulated Testing & OMR Sheets",
    description:
      "Generate verifiable, reproducible practice exams with PRNG seed codes. Automatically filters enemy items to prevent stem answer leaks and outputs printable physical OMR bubble sheets.",
    icon: GraduationCap,
    status: "Version 2.0",
    features: [
      "Reproducible Mulberry32 PRNG seeds (`EXAM-xxx`)",
      "Printable 50 & 100-question A4/Letter OMR bubble sheets",
      "Automated enemy-item filter to prevent answer leakage",
      "Dual-write local & cloud attempt history tracking",
      "Timed exam modes with customizable benchmark thresholds",
    ],
    cta: "Launch Exam Engine",
    ctaLink: "/signup",
  },
  {
    id: "literature_matrix",
    name: "Literature Matrix Synthesizer",
    tagline: "Multi-Paper Comparative Analysis",
    description:
      "Drop 10+ PDFs simultaneously. Automatically builds an exhaustive comparative matrix extracting methodologies, benchmark datasets, quantitative metrics, and research gaps without tedious manual highlighting.",
    icon: Table2,
    status: "Core Engine",
    features: [
      "Compare 2 to 15 academic PDFs simultaneously",
      "Auto-extracts methodologies, datasets & benchmarks",
      "Identifies conflicting results & literature gaps",
      "Export comparison tables to CSV, Excel & LaTeX",
      "Direct Overleaf (.tex) citation bridge",
    ],
    cta: "Explore Matrix Engine",
    ctaLink: "/signup",
  },
  {
    id: "question_bank",
    name: "Question Bank & Ingestion Studio",
    tagline: "100% In-Browser Ingestion • Zero AI Cost for Structured PDFs",
    description:
      "Ingest full textbook PDFs, past bar/board reviewers, and question banks completely in your browser. Our 2-pass parser extracts stems, choices, and correlated chapter answer keys with zero AI cost for structured PDFs.",
    icon: Database,
    status: "Client-Side Engine",
    features: [
      "Two-pass client parser for PDF books and exams",
      "Auto-correlates chapter answer keys and rationales",
      "One-click batch rollback by import batch ID",
      "Distractor quality linter and anomaly detector",
      "Full provenance attribution (source, chapter, page)",
    ],
    cta: "Explore Question Bank",
    ctaLink: "/signup",
  },
  {
    id: "flashcards",
    name: "Active Recall Flashcards Studio",
    tagline: "Spaced Repetition Companion Decks",
    description:
      "Every imported question or synthesized note automatically generates a companion flashcard deck. Study with keyboard controls (Space / 1-3), track mastery, and review difficult concepts on a spaced retention curve.",
    icon: Layers,
    status: "Available",
    features: [
      "Auto-converts ingested materials into flashcard cards",
      "Spaced repetition intervals (Hard / Good / Easy)",
      "Keyboard-driven review (Space / 1-3 keys)",
      "Category grouping and mastery rate tracking",
      "Offline-first sync with full local caching",
    ],
    cta: "Open Flashcard Studio",
    ctaLink: "/signup",
  },
];

const ProductsSection: React.FC = () => {
  return (
    <section id="products" className="scroll-mt-12 py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="max-w-3xl mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 mb-4 border border-slate-200 dark:border-slate-700">
          <span>The Academic Suite</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-title font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.1] mb-4">
          Four integrated engines for high-stakes academic work.
        </h2>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-sans leading-relaxed max-w-[65ch]">
          Designed for graduate researchers, medical and legal candidates, and STEM students who need verifiable accuracy, not conversational guesswork.
        </p>
      </div>

      {/* 2x2 Grid of Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {PRODUCTS.map((product) => {
          const Icon = product.icon;
          return (
            <div
              key={product.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-7 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 flex items-center justify-center border border-slate-200/80 dark:border-slate-700">
                      <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-title">
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-sans">
                        {product.tagline}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-800/50">
                    {product.status}
                  </span>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans mb-6">
                  {product.description}
                </p>

                {/* Features List */}
                <div className="space-y-2 mb-8">
                  {product.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="leading-normal">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <Link
                to={product.ctaLink}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold transition-all active:scale-[0.98]"
              >
                <span>{product.cta}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ProductsSection;
