import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  FileText,
  Copy,
  Check,
  Table2,
  PenTool,
  FileEdit,
  Sparkles,
  Download,
} from "lucide-react";

type SynthesizerMode = "matrix" | "math_ocr" | "draft";

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
    paper: "Devlin et al. (2018)",
    title: "BERT: Pre-training Deep Bidirectional",
    method: "Masked Language Modeling (MLM)",
    dataset: "BooksCorpus (800M) + Wikipedia",
    finding: "SOTA on 11 NLP tasks; bidirectional representations",
    gap: "Pretrain-finetune mismatch due to [MASK] token",
  },
  {
    paper: "Brown et al. (2020)",
    title: "Language Models are Few-Shot Learners",
    method: "Autoregressive 175B Transformer",
    dataset: "Common Crawl + WebText2 (300B tokens)",
    finding: "Competitive few-shot without gradient updates",
    gap: "Extremely high inference compute; hallucinations",
  },
];

const HeroSection: React.FC = () => {
  const [activeMode, setActiveMode] = useState<SynthesizerMode>("matrix");
  const [copiedDraft, setCopiedDraft] = useState(false);

  const sampleDraft = `While Vaswani et al. (2017) demonstrated that replacing recurrent networks with multi-head self-attention eliminates sequential dependency, the architecture remains constrained by quadratic memory complexity O(N²). Subsequent developments in bidirectional representation learning (Devlin et al., 2018) addressed contextual grounding via masked language modeling, yet retained token discrepancy artifacts. More recently, autoregressive scaling approaches (Brown et al., 2020) demonstrated emergent few-shot task adaptation across 300B tokens, though real-time deployment remains severely bottlenecked by compute intensity and lack of grounded verification.`;

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(sampleDraft);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  return (
    <section className="pt-12 sm:pt-16 lg:pt-20 pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Editorial Header Stack (Max 4 elements: Headline, Subtext, CTAs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start mb-14">
        <div className="lg:col-span-7 space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-title font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.08] max-w-[22ch]">
            From unread PDFs and lab derivations to a cited research draft.
          </h1>

          <p className="text-lg text-slate-600 dark:text-slate-400 font-sans leading-relaxed max-w-[55ch]">
            Stop highlighting PDFs manually. Drop 10 papers to generate a comparative literature matrix, transcribe whiteboard derivations to LaTeX, and export publication-ready drafts in seconds.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 transition-all active:scale-[0.98] shadow-sm"
            >
              <span>Try Early Access Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#features"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium text-sm border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-[0.98]"
            >
              <Table2 className="w-4 h-4 text-slate-500" />
              <span>Preview Core Features</span>
            </a>
          </div>
        </div>

        {/* Feature Highlights Card */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
              New Research Engine
            </span>
            <span className="text-xs font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-800/50">
              Pivot Preview
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Table2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Automated Literature Matrix
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Drop 10 PDFs: extract methodologies, datasets, quantitative findings & gaps in one table.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PenTool className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Handwritten Math to LaTeX
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Snap whiteboard equations or lab notebooks; get clean, copyable LaTeX blocks.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileEdit className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Synthesized Related Work Draft
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Turn comparison matrices straight into cited prose ready for Overleaf (.tex) or Word (.docx).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Core Engine Console */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Console Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-900/60">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Interactive Engine Preview
              </p>
              <p className="text-xs text-slate-500 font-mono">
                Compare Papers • OCR Derivations • Generate Draft
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={() => setActiveMode("matrix")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeMode === "matrix"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              1. Literature Matrix (Option A)
            </button>
            <button
              onClick={() => setActiveMode("math_ocr")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeMode === "math_ocr"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              2. Lab Math to LaTeX (Option B)
            </button>
            <button
              onClick={() => setActiveMode("draft")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeMode === "draft"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              3. Synthesized Draft
            </button>
          </div>
        </div>

        {/* Console Workspace */}
        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {activeMode === "matrix" && (
              <motion.div
                key="matrix"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Multi-Paper Synthesis Matrix (3 Papers Ingested)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Auto-extracted without manual highlighting. Compare findings and identify literature gaps.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded border border-indigo-200/50 self-start">
                    Zero-Highlight Automation
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="p-3">Paper / Citation</th>
                        <th className="p-3">Methodology</th>
                        <th className="p-3">Dataset / Benchmarks</th>
                        <th className="p-3">Key Quant Finding</th>
                        <th className="p-3">Identified Limitation / Gap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {MATRIX_DATA.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            <p>{row.paper}</p>
                            <p className="text-[10px] text-slate-400 italic">{row.title}</p>
                          </td>
                          <td className="p-3">{row.method}</td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">{row.dataset}</td>
                          <td className="p-3 text-emerald-700 dark:text-emerald-400 font-medium">{row.finding}</td>
                          <td className="p-3 text-amber-700 dark:text-amber-400">{row.gap}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeMode === "math_ocr" && (
              <motion.div
                key="math_ocr"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch"
              >
                {/* Left: Handwritten Whiteboard Input */}
                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-amber-50/30 dark:bg-amber-950/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-amber-200/60 dark:border-amber-900/40 text-xs font-mono text-amber-800 dark:text-amber-400">
                      <span>Camera / Smart Pen Ingestion</span>
                      <span>Raw Handwritten Ink</span>
                    </div>
                    <div className="font-serif italic text-base sm:text-lg text-slate-800 dark:text-slate-200 p-4 border border-dashed border-amber-300 dark:border-amber-800 rounded-lg bg-white/60 dark:bg-slate-900/40 space-y-2">
                      <p>∮_∂Σ E · dl = - d/dt ∬_Σ B · dA</p>
                      <p className="text-xs text-slate-500 font-sans not-italic">
                        Derivation: Maxwell-Faraday equation evaluated over cryogenic cavity boundary ∂Σ.
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-4">
                    Captured from physical lab notebook via mobile camera sync.
                  </p>
                </div>

                {/* Right: Parsed LaTeX Math Block */}
                <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-xs font-mono text-slate-400">
                      <span>Standard LaTeX Transcribed</span>
                      <span className="text-emerald-400">Confidence: 99.8%</span>
                    </div>
                    <code className="text-xs font-mono text-emerald-400 block p-3 rounded-lg bg-slate-950 border border-slate-800 overflow-x-auto leading-relaxed">
                      {"\\oint_{\\partial \\Sigma} \\mathbf{E} \\cdot d\\boldsymbol{\\ell} = -\\frac{d}{dt} \\iint_{\\Sigma} \\mathbf{B} \\cdot d\\mathbf{A}"}
                    </code>
                    <div className="mt-3 p-2 rounded bg-slate-800/60 text-xs text-slate-300 flex items-center justify-between">
                      <span>Rendered Form:</span>
                      <span className="font-mono text-indigo-300">{"$$\\oint \\mathbf{E} \\cdot d\\boldsymbol{\\ell} = -\\dot{\\Phi}_B$$"}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Export target: Overleaf (.tex)</span>
                    <button
                      onClick={() => navigator.clipboard.writeText("\\oint_{\\partial \\Sigma} \\mathbf{E} \\cdot d\\boldsymbol{\\ell} = -\\frac{d}{dt} \\iint_{\\Sigma} \\mathbf{B} \\cdot d\\mathbf{A}")}
                      className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 text-[11px]"
                    >
                      Copy LaTeX
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeMode === "draft" && (
              <motion.div
                key="draft"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Synthesized Related Work Draft
                    </h3>
                    <p className="text-xs text-slate-500">
                      Synthesized from the Literature Matrix with verifiable in-text citations.
                    </p>
                  </div>
                  <button
                    onClick={handleCopyDraft}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    {copiedDraft ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied Draft</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy to Clipboard</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 font-sans text-sm text-slate-800 dark:text-slate-200 leading-relaxed space-y-3">
                  <p>{sampleDraft}</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500 font-mono">
                  <span>Export: TipTap Editor • Overleaf (.tex) • Microsoft Word (.docx)</span>
                  <Link
                    to="/signup"
                    className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    Generate your own synthesis
                    <ArrowRight className="w-3 h-3" />
                  </Link>
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
