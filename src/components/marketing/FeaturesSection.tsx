import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  PenTool,
  Network,
  BookOpen,
  Smartphone,
  Chrome,
  CheckCircle2,
  ArrowRight,
  Maximize2,
  FileText,
  Sparkles,
  RefreshCw,
} from "lucide-react";

const GRAPH_NODES = [
  { id: "trans", label: "Transformer", x: 25, y: 35, size: 28, group: "Core" },
  { id: "attn", label: "Self-Attention", x: 60, y: 25, size: 24, group: "Mechanism" },
  { id: "bert", label: "BERT (2018)", x: 80, y: 60, size: 22, group: "Downstream" },
  { id: "gpt", label: "GPT Architecture", x: 30, y: 75, size: 24, group: "Downstream" },
  { id: "pos", label: "Positional Encoding", x: 70, y: 85, size: 18, group: "Layer" },
];

const GRAPH_EDGES = [
  { from: "trans", to: "attn" },
  { from: "trans", to: "bert" },
  { from: "trans", to: "gpt" },
  { from: "trans", to: "pos" },
  { from: "attn", to: "bert" },
];

const FeaturesSection: React.FC = () => {
  const [ocrMode, setOcrMode] = useState<"handwritten" | "digitized">("digitized");
  const [activeNode, setActiveNode] = useState<string>("trans");

  return (
    <section id="features" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Editorial Section Heading (No eyebrow/kicker ban) */}
      <div className="max-w-3xl mb-14">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-title font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.1] mb-4">
          Architected for how serious researchers actually work.
        </h2>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-sans leading-relaxed max-w-[65ch]">
          Four unified engines replace scattered PDF folders, disconnected notebook scans, and fragmented reference managers.
        </p>
      </div>

      {/* Editorial 4-Quadrant Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Quadrant 1: Smart Pen & Handwriting OCR (Span 7) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-900/60">
                  <PenTool className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-title">
                  Smart Pen & Optical Handwriting Recognition
                </h3>
              </div>

              {/* Toggle State */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium border border-slate-200/70 dark:border-slate-700">
                <button
                  onClick={() => setOcrMode("handwritten")}
                  className={`px-2.5 py-1 rounded transition-all ${
                    ocrMode === "handwritten"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Raw Ink
                </button>
                <button
                  onClick={() => setOcrMode("digitized")}
                  className={`px-2.5 py-1 rounded transition-all ${
                    ocrMode === "digitized"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  OCR Digital
                </button>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed max-w-[55ch]">
              Capture physical notes via smart pen or mobile camera. Equations, chemical structures, and marginalia convert directly into searchable Markdown and LaTeX.
            </p>
          </div>

          {/* Interactive OCR Transformation Canvas */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/80 dark:bg-slate-950/60 p-5 min-h-[170px] flex flex-col justify-center">
            {ocrMode === "handwritten" ? (
              <div className="font-serif italic text-slate-700 dark:text-slate-300 text-base sm:text-lg border border-amber-200/80 dark:border-amber-900/40 p-4 space-y-2 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl">
                <p>∇ × E = -∂B/∂t  (Faraday's Induction)</p>
                <p className="text-sm text-slate-500 font-sans not-italic">Note: Confirmed with 4.2K cryogenic sensor test at 15:30.</p>
              </div>
            ) : (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Parsed LaTeX Structure
                  </span>
                  <span>Confidence: 99.4%</span>
                </div>
                <code className="text-slate-900 dark:text-slate-100 block bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
                  {"\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}"}
                </code>
                <p className="text-[11px] text-slate-500 font-sans">
                  Exported directly as inline block for TipTap Document Editor.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quadrant 2: Connected Citation & Knowledge Graph (Span 5) */}
        <div className="lg:col-span-5 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 p-6 sm:p-8 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-950/80 text-indigo-400 flex items-center justify-center border border-indigo-800/60">
                <Network className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 font-title">
                Co-Citation Knowledge Graph
              </h3>
            </div>

            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Every indexed paper, tagged snippet, and note automatically links into an interactive topological network graph.
            </p>
          </div>

          {/* Interactive Graph Mini-Canvas */}
          <div className="relative h-44 rounded-xl bg-slate-900 border border-slate-800/80 overflow-hidden p-3 flex items-center justify-center">
            {/* SVG Interactive Topology Preview */}
            <svg className="w-full h-full" viewBox="0 0 100 100">
              {GRAPH_EDGES.map((edge, idx) => {
                const source = GRAPH_NODES.find((n) => n.id === edge.from);
                const target = GRAPH_NODES.find((n) => n.id === edge.to);
                if (!source || !target) return null;
                const isHighlighted = activeNode === edge.from || activeNode === edge.to;
                return (
                  <line
                    key={idx}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={isHighlighted ? "#818cf8" : "#334155"}
                    strokeWidth={isHighlighted ? "1.5" : "0.75"}
                    strokeDasharray={isHighlighted ? "none" : "2,2"}
                  />
                );
              })}

              {GRAPH_NODES.map((node) => {
                const isActive = activeNode === node.id;
                return (
                  <g
                    key={node.id}
                    onClick={() => setActiveNode(node.id)}
                    className="cursor-pointer transition-transform hover:scale-110"
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isActive ? 6 : 4.5}
                      fill={isActive ? "#6366f1" : "#1e293b"}
                      stroke={isActive ? "#c7d2fe" : "#475569"}
                      strokeWidth="1.2"
                    />
                    <text
                      x={node.x}
                      y={node.y - 7}
                      textAnchor="middle"
                      fill={isActive ? "#ffffff" : "#94a3b8"}
                      fontSize="3.8"
                      fontFamily="monospace"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="absolute bottom-2 right-2 text-[10px] font-mono text-slate-500 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
              Interactive Nodes
            </div>
          </div>
        </div>

        {/* Quadrant 3: Distraction-Free PDF Reader (Span 5) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-900/60">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-title">
                Distraction-Free PDF Reader
              </h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              Read 80-page manuscripts with instant AI margin notes, customizable typestyle margins, and one-click citation exports.
            </p>
          </div>

          {/* Reader Mockup Frame */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3 font-sans text-xs">
            <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-slate-200 dark:border-slate-800 font-mono">
              <span>Section 3.2 Methodology</span>
              <span>p. 14 of 48</span>
            </div>

            <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/70 dark:border-slate-800">
              <mark className="bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 px-1 py-0.5 rounded">
                "The sample exhibited quantized Hall conductance in steps of e²/h"
              </mark>{" "}
              consistent with integer quantum Hall effect constraints.
            </p>

            <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-900/60 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-indigo-900 dark:text-indigo-200 leading-snug">
                <strong>AI Margin Reference:</strong> Directly corroborates the 1980 von Klitzing fundamental metric.
              </p>
            </div>
          </div>
        </div>

        {/* Quadrant 4: Multi-Device Ecosystem Sync (Span 7) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-900/60">
                <RefreshCw className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-title">
                Zero-Latency Ecosystem Sync
              </h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed max-w-[55ch]">
              Save articles from the browser, snap physical textbooks from your phone camera, and edit on desktop with instant cloud reconciliation.
            </p>
          </div>

          {/* Sync Endpoints Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1.5">
                <Chrome className="w-4 h-4" />
                <span className="text-xs font-semibold">Chrome Extension</span>
              </div>
              <p className="text-[11px] text-slate-500">1-click ArXiv & PubMed paper capture.</p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1.5">
                <Smartphone className="w-4 h-4" />
                <span className="text-xs font-semibold">Mobile Camera</span>
              </div>
              <p className="text-[11px] text-slate-500">Instant OCR upload of paper pages.</p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1.5">
                <FileText className="w-4 h-4" />
                <span className="text-xs font-semibold">Desktop Workspace</span>
              </div>
              <p className="text-[11px] text-slate-500">Full TipTap & PDF annotation suite.</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default FeaturesSection;
