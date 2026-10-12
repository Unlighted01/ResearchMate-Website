import React from "react";
import { Link } from "react-router-dom";
import {
  Chrome,
  Sparkles,
  Network,
  Download,
  BookOpen,
  GraduationCap,
  FileText,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const WORKFLOW_STEPS = [
  {
    icon: Chrome,
    title: "1-Click Web & Preprint Ingestion",
    desc: "Save papers from ArXiv, PubMed, and Nature directly into your encrypted library. The extension automatically detects and downloads the open-access PDF.",
  },
  {
    icon: Sparkles,
    title: "AI Synthesis & LaTeX Parsing",
    desc: "Extract mathematical formulas, research methodologies, and core findings into structured markdown without hallucinated claims.",
  },
  {
    icon: Network,
    title: "Topological Knowledge Graph",
    desc: "Trace co-citations, shared authors, and thematic clusters automatically. Your library becomes a living map of your research domain.",
  },
];

const USE_CASES = [
  {
    icon: GraduationCap,
    title: "Graduate Researchers & PhDs",
    desc: "Accelerate literature reviews, track hundreds of citations across multiple thesis chapters, and verify benchmark equations.",
    perks: ["Automated BibTeX exports", "LaTeX math parsing", "Co-citation mapping"],
  },
  {
    icon: BookOpen,
    title: "Principal Investigators & Academics",
    desc: "Maintain unified lab references, digitize whiteboard meeting notes, and synthesize multi-paper meta-analyses.",
    perks: ["Cross-device sync", "Multi-paper indexing", "Distraction-free reader"],
  },
  {
    icon: FileText,
    title: "Independent Scholars & Analysts",
    desc: "Synthesize dense regulatory filings, technical preprints, and industry documentation with verifiable source attribution.",
    perks: ["Browser side panel assistant", "Custom export formats", "End-to-end privacy"],
  },
];

const HowItWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="scroll-mt-12 py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Editorial Section Header */}
      <div className="max-w-3xl mb-14">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-title font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.1] mb-4">
          From unread PDFs to connected literature intelligence.
        </h2>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-sans leading-relaxed max-w-[65ch]">
          A streamlined three-stage pipeline transforms fragmented documents and physical notebook sketches into an interconnected knowledge base.
        </p>
      </div>

      {/* 3-Stage Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        {WORKFLOW_STEPS.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 rounded-2xl p-7 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 flex items-center justify-center border border-slate-200/80 dark:border-slate-700">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Stage 0{idx + 1}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-title mb-2">
                  {step.title}
                </h3>

                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Domain Use Cases */}
      <div>
        <h3 className="text-2xl font-title font-semibold text-slate-900 dark:text-slate-100 mb-8">
          Built for rigorous academic disciplines
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {USE_CASES.map((uc, idx) => {
            const Icon = uc.icon;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-2xl p-7 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 border border-indigo-200/50 dark:border-indigo-900/50">
                    <Icon className="w-4 h-4" />
                  </div>

                  <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-title mb-2">
                    {uc.title}
                  </h4>

                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                    {uc.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  {uc.perks.map((perk, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
