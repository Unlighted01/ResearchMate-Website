import React from "react";
import {
  UploadCloud,
  Table2,
  GraduationCap,
  Scale,
  FileCode,
  BookOpen,
  CheckCircle2,
  FileText,
  Layers,
} from "lucide-react";

const WORKFLOW_STEPS = [
  {
    icon: UploadCloud,
    title: "1. Ingest Without Manual Highlighting",
    desc: "Drop a folder of academic PDFs, paste DOI identifiers, or upload full reviewer books. Our client-side two-pass engine extracts questions, stems, and citations with $0 AI cost.",
  },
  {
    icon: Table2,
    title: "2. Synthesize & Model With Strict Rigor",
    desc: "Compare 10+ papers simultaneously in a literature matrix, transcribe whiteboard derivations into standard LaTeX, and run anti-leak enemy checks across practice question banks.",
  },
  {
    icon: GraduationCap,
    title: "3. Test, Memorize & Export to Overleaf",
    desc: "Sit deterministic timed mock exams with printable physical OMR bubble sheets, reinforce memory retention with flashcards, and export manuscript drafts directly to Overleaf (.tex) or Word.",
  },
];

const USE_CASES = [
  {
    icon: BookOpen,
    title: "PhD Candidates & Graduate Students",
    desc: "Slash 3 weeks of manual reading off your literature review. Instantly spot the research gaps and conflicting findings needed to justify your thesis contribution.",
    perks: ["Automated Literature Matrix", "Related Work draft generation", "BibTeX reference indexing"],
  },
  {
    icon: Scale,
    title: "Bar, Board & Civil Service Candidates",
    desc: "Simulate high-stakes exam conditions with deterministic seed codes, balanced choices, and physical A4/Letter OMR bubble sheets with camera grading.",
    perks: ["Printable 50/100 OMR sheets", "Zero-leak enemy filtering", "Two-pass book parser ($0 AI cost)"],
  },
  {
    icon: FileCode,
    title: "STEM Researchers (Math, Physics, AI)",
    desc: "Stop manually retyping derivations. Transcribe physical lab notebook calculations and blackboard proofs into clean KaTeX blocks ($$...$$) ready for Overleaf.",
    perks: ["Whiteboard Math OCR", "Step-by-step proof tracking", "Direct Overleaf (.tex) bundle"],
  },
];

const HowItWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="scroll-mt-12 py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Editorial Section Header */}
      <div className="max-w-3xl mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 mb-4 border border-slate-200 dark:border-slate-700">
          <span>End-to-End Workflow</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-title font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.1] mb-4">
          From unread PDFs to verified exam mastery and publication.
        </h2>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-sans leading-relaxed max-w-[65ch]">
          A specialized 3-stage synthesis pipeline designed to eliminate manual highlighting and replace guesswork with deterministic reproducibility.
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
                    <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
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
          Built for rigorous academic disciplines
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {USE_CASES.map((useCase, idx) => {
            const Icon = useCase.icon;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-2xl p-7 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-900/60 mb-5">
                    <Icon className="w-5 h-5" />
                  </div>

                  <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-title mb-2">
                    {useCase.title}
                  </h4>

                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans mb-6">
                    {useCase.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  {useCase.perks.map((perk, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
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
