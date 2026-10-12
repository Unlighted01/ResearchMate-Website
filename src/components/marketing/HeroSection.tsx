import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  FileText,
  Copy,
  Check,
  Share2,
  Network,
  BookOpen,
  Sparkles,
  Layers,
} from "lucide-react";

type SynthesizerMode = "findings" | "bibtex" | "graph";

interface PaperSample {
  id: string;
  title: string;
  authors: string;
  journal: string;
  doi: string;
  excerpt: string;
  formula: string;
  formulaLabel: string;
  findings: string[];
  bibtex: string;
  graphNodes: { label: string; group: string; connections: number }[];
}

const SAMPLE_PAPERS: PaperSample[] = [
  {
    id: "transformer",
    title: "Attention Is All You Need",
    authors: "Vaswani et al. (Google Brain)",
    journal: "Advances in Neural Information Processing Systems, 2017",
    doi: "arXiv:1706.03762",
    excerpt:
      "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose the Transformer, a model architecture eschewing recurrence and entirely relying on an attention mechanism to draw global dependencies between input and output.",
    formulaLabel: "Scaled Dot-Product Attention",
    formula: "Attention(Q, K, V) = softmax((Q K^T) / sqrt(d_k)) V",
    findings: [
      "Replaces recurrence with multi-head self-attention, enabling O(1) parallel sequence steps.",
      "Achieves 28.4 BLEU on WMT 2014 English-to-German, improving existing best results by >2 BLEU.",
      "Reduces training compute requirements by an order of magnitude compared to recurrent baselines.",
    ],
    bibtex: `@article{vaswani2017attention,
  author    = {Vaswani, Ashish and Shazeer, Noam and Parmar, Niki},
  title     = {Attention Is All You Need},
  journal   = {Advances in Neural Information Processing Systems},
  volume    = {30},
  year      = {2017}
}`,
    graphNodes: [
      { label: "Self-Attention", group: "Mechanism", connections: 14 },
      { label: "Multi-Head Attention", group: "Architecture", connections: 9 },
      { label: "Positional Encoding", group: "Input", connections: 6 },
      { label: "BERT & GPT", group: "Downstream", connections: 28 },
    ],
  },
  {
    id: "quantum",
    title: "Quantum Computational Supremacy Using Superconducting Qubits",
    authors: "Arute et al. (Google Quantum AI)",
    journal: "Nature 574, 505–510, 2019",
    doi: "10.1038/s41586-019-1666-5",
    excerpt:
      "The promise of quantum computers is that certain computational tasks might be executed exponentially faster on a quantum processor than on a classical processor. We demonstrate computational supremacy using a programmable superconducting processor.",
    formulaLabel: "Cross-Entropy Benchmarking Fidelity",
    formula: "F_XEB = 2^n * <P(x_i)> - 1",
    findings: [
      "Programmable superconducting processor with 53 active qubits executes target circuit in ~200 seconds.",
      "Classical simulation on summit supercomputer estimated to require ~10,000 years for equivalent task.",
      "Validates quantum mechanics in computational Hilbert space dimension of 2^53 (~9 × 10^15).",
    ],
    bibtex: `@article{arute2019quantum,
  author  = {Arute, Frank and Arya, Kunal and Babbush, Ryan},
  title   = {Quantum computational supremacy using a programmable superconducting processor},
  journal = {Nature},
  volume  = {574},
  pages   = {505--510},
  year    = {2019}
}`,
    graphNodes: [
      { label: "Sycamore Processor", group: "Hardware", connections: 12 },
      { label: "Cross-Entropy Benchmark", group: "Metric", connections: 7 },
      { label: "Hilbert Space 2^53", group: "Theory", connections: 18 },
      { label: "Fault-Tolerant Gates", group: "Roadmap", connections: 11 },
    ],
  },
];

const HeroSection: React.FC = () => {
  const [selectedPaperIndex, setSelectedPaperIndex] = useState(0);
  const [activeMode, setActiveMode] = useState<SynthesizerMode>("findings");
  const [copiedBibtex, setCopiedBibtex] = useState(false);

  const paper = SAMPLE_PAPERS[selectedPaperIndex];

  const handleCopyBibtex = () => {
    navigator.clipboard.writeText(paper.bibtex);
    setCopiedBibtex(true);
    setTimeout(() => setCopiedBibtex(false), 2000);
  };

  return (
    <section className="pt-12 sm:pt-16 lg:pt-20 pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Editorial Header Stack (Max 4 text elements: Headline, Subtext, CTAs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start mb-14">
        <div className="lg:col-span-7 space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-title font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.08] max-w-[22ch]">
            The unified workspace for literature, notes, and citations.
          </h1>

          <p className="text-lg text-slate-600 dark:text-slate-400 font-sans leading-relaxed max-w-[55ch]">
            Synthesize dense academic papers, extract formulas, digitize handwritten lab notes, and map connections in one distraction-free canvas.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 transition-all active:scale-[0.98] shadow-sm"
            >
              <span>Start Researching Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#features"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium text-sm border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-[0.98]"
            >
              <BookOpen className="w-4 h-4 text-slate-500" />
              <span>Explore Architecture</span>
            </a>
          </div>
        </div>

        {/* Paper Quick Selector Bar */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
              Selected Literature
            </span>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-800/50">
              Verified Source
            </span>
          </div>

          <div className="space-y-2">
            {SAMPLE_PAPERS.map((item, index) => {
              const isSelected = index === selectedPaperIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedPaperIndex(index)}
                  className={`w-full text-left p-3 rounded-lg border transition-all text-xs ${
                    isSelected
                      ? "bg-slate-50 dark:bg-slate-800/80 border-slate-900/20 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.authors} • {item.journal.split(",")[0]}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Research Synthesizer Bento Console */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Console Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-900/60">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Research Synthesizer
              </p>
              <p className="text-xs text-slate-500 font-mono">
                {paper.doi}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={() => setActiveMode("findings")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeMode === "findings"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Key Findings & LaTeX
            </button>
            <button
              onClick={() => setActiveMode("bibtex")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeMode === "bibtex"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              BibTeX Citation
            </button>
            <button
              onClick={() => setActiveMode("graph")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeMode === "graph"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Knowledge Nodes
            </button>
          </div>
        </div>

        {/* Console Workspace: Source Excerpt + Synthesis Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          {/* Left Column: Primary Literature Ingestion Excerpt */}
          <div className="lg:col-span-5 p-6 sm:p-8 space-y-4 bg-slate-50/30 dark:bg-slate-900/30">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>ORIGINAL DOCUMENT EXCERPT</span>
            </div>

            <h3 className="font-title text-xl font-semibold text-slate-900 dark:text-slate-100 leading-snug">
              {paper.title}
            </h3>

            <p className="text-xs text-slate-500 font-mono">
              {paper.authors} • {paper.journal}
            </p>

            <blockquote className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed border-l-2 border-slate-300 dark:border-slate-700 pl-4 py-1">
              "{paper.excerpt}"
            </blockquote>

            <div className="pt-2 text-xs text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Extracted directly from indexed publication</span>
            </div>
          </div>

          {/* Right Column: Dynamic Academic Synthesizer View */}
          <div className="lg:col-span-7 p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {activeMode === "findings" && (
                <motion.div
                  key="findings"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">
                      Synthesized Takeaways
                    </h4>
                    <ul className="space-y-3">
                      {paper.findings.map((finding, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-mono shrink-0 mt-0.5 border border-indigo-200/40">
                            {idx + 1}
                          </span>
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 text-slate-100 dark:bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-mono text-slate-400">
                      <span>{paper.formulaLabel}</span>
                      <span className="text-indigo-400">LaTeX Mathematical Extraction</span>
                    </div>
                    <code className="text-xs sm:text-sm font-mono text-emerald-400 block break-all">
                      {paper.formula}
                    </code>
                  </div>
                </motion.div>
              )}

              {activeMode === "bibtex" && (
                <motion.div
                  key="bibtex"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                      Standardized BibTeX Record
                    </h4>
                    <button
                      onClick={handleCopyBibtex}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      {copiedBibtex ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy BibTeX</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="p-4 rounded-xl bg-slate-900 dark:bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto border border-slate-800 leading-relaxed">
                    {paper.bibtex}
                  </pre>
                </motion.div>
              )}

              {activeMode === "graph" && (
                <motion.div
                  key="graph"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                      Knowledge Graph Inferred Associations
                    </h4>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Network className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Co-citation Mapping</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {paper.graphNodes.map((node, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                            {node.group}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {node.connections} edges
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-2">
                          {node.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
