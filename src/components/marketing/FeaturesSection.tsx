import React, { useState } from "react";
import {
  PenTool,
  Table2,
  FileEdit,
  ArrowRight,
  CheckCircle2,
  Download,
  Globe,
  Smartphone,
  Check,
  FileText,
} from "lucide-react";

const MATRIX_SAMPLE = [
  {
    paper: "Attention Is All You Need (2017)",
    method: "Self-Attention",
    metric: "28.4 BLEU",
    gap: "O(N²) context memory explosion",
  },
  {
    paper: "FlashAttention (2022)",
    method: "IO-Aware Tiling",
    metric: "2-4x speedup, O(N) memory",
    gap: "Hardware-specific SRAM kernel tuning",
  },
  {
    paper: "Mamba: Linear-Time Sequence (2023)",
    method: "Selective State Space (SSM)",
    metric: "5x throughput on 1M context",
    gap: "Inability to perform exact associative recall",
  },
];

const FeaturesSection: React.FC = () => {
  const [copiedLatex, setCopiedLatex] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("\\oint_{\\partial \\Sigma} \\mathbf{E} \\cdot d\\boldsymbol{\\ell} = -\\frac{d}{dt} \\iint_{\\Sigma} \\mathbf{B} \\cdot d\\mathbf{A}");
    setCopiedLatex(true);
    setTimeout(() => setCopiedLatex(false), 2000);
  };

  return (
    <section id="features" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Editorial Section Heading */}
      <div className="max-w-3xl mb-14">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-title font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.1] mb-4">
          Replace manual highlighting with automated synthesis.
        </h2>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-sans leading-relaxed max-w-[65ch]">
          A specialized research pipeline built to compare multi-paper methodologies, transcribe handwritten equations to LaTeX, and generate verifiable manuscript drafts.
        </p>
      </div>

      {/* Editorial 4-Quadrant Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Quadrant 1: STEM Math & Handwritten Derivations (Option B) (Span 7) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-900/60">
                  <PenTool className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-title">
                  Handwritten Math & Equations to LaTeX (Option B)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200/50">
                STEM Vision
              </span>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed max-w-[55ch]">
              Derive proofs on paper, whiteboards, or scratchpads. Gemini Vision transcribes ink directly into formatted LaTeX blocks ready for Overleaf or your active manuscript.
            </p>
          </div>

          {/* Derivation Canvas Preview */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/80 dark:bg-slate-950/60 p-5 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pb-2 border-b border-slate-200 dark:border-slate-800">
              <span>Whiteboard OCR Detection</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Rendered Math Block</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 overflow-x-auto">
              {"\\oint_{\\partial \\Sigma} \\mathbf{E} \\cdot d\\boldsymbol{\\ell} = -\\frac{d}{dt} \\iint_{\\Sigma} \\mathbf{B} \\cdot d\\mathbf{A}"}
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-500 font-mono text-[11px]">Formatted for Overleaf & TipTap</span>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-900 text-white text-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 transition-colors"
              >
                {copiedLatex ? <Check className="w-3 h-3 text-emerald-400" /> : null}
                <span>{copiedLatex ? "Copied" : "Copy LaTeX"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quadrant 2: Multi-Paper Literature Matrix (Option A) (Span 5) */}
        <div className="lg:col-span-5 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 p-6 sm:p-8 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-950/80 text-indigo-400 flex items-center justify-center border border-indigo-800/60">
                  <Table2 className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-semibold text-slate-100 font-title">
                  Literature Review Matrix (Option A)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/60">
                Multi-Paper
              </span>
            </div>

            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Drop 10 PDFs at once. Automatically generates a comparative matrix extracting core methodologies, quantitative benchmarks, and critical research gaps.
            </p>
          </div>

          {/* Mini Matrix Table */}
          <div className="rounded-xl bg-slate-900 border border-slate-800/80 p-3 space-y-2 overflow-x-auto text-[11px] font-sans">
            {MATRIX_SAMPLE.map((row, idx) => (
              <div key={idx} className="p-2 rounded bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{row.paper.split("(")[0]}</span>
                  <span className="text-emerald-400 font-mono text-[10px]">{row.metric}</span>
                </div>
                <p className="text-slate-400 text-[10px] truncate">
                  <strong className="text-slate-300">Method:</strong> {row.method} • <span className="text-amber-400">Gap:</span> {row.gap}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quadrant 3: Full-Cycle Synthesis-to-Draft Bridge (Span 5) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-900/60">
                <FileEdit className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-title">
                One-Click Synthesis to Draft
              </h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              Never get stuck staring at a blank page. The matrix converts directly into a structured Related Work section with verified, non-hallucinated in-text citations.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
            <p className="italic text-slate-600 dark:text-slate-400">
              "While Vaswani et al. (2017) eliminated recurrence via self-attention, context length remained memory-bound until Dao et al. (2022) leveraged IO-aware tiling..."
            </p>
            <div className="flex items-center justify-between text-[11px] font-mono text-indigo-600 dark:text-indigo-400 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>Verified In-Text Citations</span>
              <span>Direct TipTap Insertion</span>
            </div>
          </div>
        </div>

        {/* Quadrant 4: Zero Manual Highlighting Ingestion (Span 7) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-900/60">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-title">
                Automated Ingestion (Zero Highlighting)
              </h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed max-w-[55ch]">
              Ingest preprints directly from ArXiv, PubMed, and Nature without copy-pasting snippets. Camera capture auto-detects formulas and tables.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1.5">
                <Globe className="w-4 h-4" />
                <span className="text-xs font-semibold">1-Click ArXiv/PubMed</span>
              </div>
              <p className="text-[11px] text-slate-500">Auto-downloads open-access PDF & BibTeX.</p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1.5">
                <Smartphone className="w-4 h-4" />
                <span className="text-xs font-semibold">Mobile Camera OCR</span>
              </div>
              <p className="text-[11px] text-slate-500">Snaps whiteboard math directly to LaTeX.</p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1.5">
                <Download className="w-4 h-4" />
                <span className="text-xs font-semibold">Export to Overleaf</span>
              </div>
              <p className="text-[11px] text-slate-500">Generates clean .tex and .bib bundles.</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default FeaturesSection;
