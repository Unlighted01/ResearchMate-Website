import React from "react";
import { Link } from "react-router-dom";
import {
  UploadCloud,
  Table2,
  FileEdit,
  GraduationCap,
  BookOpen,
  FileCode,
  CheckCircle2,
} from "lucide-react";

const WORKFLOW_STEPS = [
  {
    icon: UploadCloud,
    title: "1. Ingest Without Manual Highlighting",
    desc: "Drop a folder of 5–15 PDFs, paste ArXiv IDs, or snap a photo of a whiteboard math derivation. No tedious copy-pasting or line-by-line highlighting required.",
  },
  {
    icon: Table2,
    title: "2. Generate Comparative Literature Matrix",
    desc: "Gemini Vision & Synthesis extracts core methodologies, benchmark datasets, quantitative findings, and conflicting gaps into an interactive side-by-side matrix.",
  },
  {
    icon: FileEdit,
    title: "3. 1-Click Synthesis to Manuscript Draft",
    desc: "The matrix synthesizes into a cohesive, structured Related Work section with verified in-text citations. Export directly to Overleaf (.tex) or Microsoft Word (.docx).",
  },
];

const USE_CASES = [
  {
    icon: GraduationCap,
    title: "PhD Candidates & Graduate Students",
    desc: "Slash 3 weeks of manual reading off your literature review. Instantly spot the research gaps and conflicting findings needed to justify your thesis contribution.",
    perks: ["Automated Literature Matrix", "Related Work draft generation", "BibTeX auto-indexing"],
  },
  {
    icon: FileCode,
    title: "STEM Researchers (Math, Physics, AI)",
    desc: "Stop retyping equations. Transcribe physical lab notebook derivations and blackboard proofs into clean mathematical LaTeX ready for Overleaf.",
    perks: ["Handwritten Math OCR ($$...$$)", "Proof derivation tracking", "Direct Overleaf (.tex) export"],
  },
  {
    icon: BookOpen,
    title: "Principal Investigators & Academics",
    desc: "Synthesize multi-paper meta-analyses across dozens of submissions and maintain synchronized reference libraries across the entire lab team.",
    perks: ["Zero-highlight multi-PDF ingestion", "Comparative methodology tables", "End-to-end data encryption"],
  },
];

const HowItWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="scroll-mt-12 py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Editorial Section Header */}
      <div className="max-w-3xl mb-14">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-title font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.1] mb-4">
          From scattered PDFs to a finished thesis section.
        </h2>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-sans leading-relaxed max-w-[65ch]">
          A specialized 3-stage synthesis pipeline designed to replace manual highlighting with automated comparative analysis.
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

      {/* Domain Disciplines */}
      <div>
        <h3 className="text-2xl font-title font-semibold text-slate-900 dark:text-slate-100 mb-8">
          Engineered for academic rigor
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
