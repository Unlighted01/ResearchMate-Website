// ============================================
// HERO SECTION - High-Fidelity Marketing Hero & Playground
// ============================================

import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import {
  Sparkles,
  ArrowRight,
  Chrome,
  CheckCircle2,
  FileText,
  Mic,
  Globe,
  Plus,
  RefreshCw,
  Cpu,
  Brain,
  Quote,
} from "lucide-react";

// ============================================
// DRAGGABLE SOURCE PILLS SPEC
// ============================================
interface SourceItem {
  id: string;
  type: "pdf" | "audio" | "web";
  name: string;
  size: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  glowColor: string;
  summary: {
    title: string;
    bullets: string[];
    citation: string;
  };
}

const PLAYGROUND_SOURCES: SourceItem[] = [
  {
    id: "pdf-1",
    type: "pdf",
    name: "quantum_computing_nature.pdf",
    size: "4.2 MB",
    icon: FileText,
    color: "from-purple-500 to-indigo-600",
    glowColor: "rgba(139, 92, 246, 0.4)",
    summary: {
      title: "Quantum Supremacy via Superconducting Qubits",
      bullets: [
        "Demonstrates computational advantage using 53 active qubits.",
        "System handles complex tensor contractions in 200 seconds vs 10,000 years classically.",
        "Establishes foundation for fault-tolerant physical quantum execution gates.",
      ],
      citation: "Google Quantum AI, Nature (2019)",
    },
  },
  {
    id: "audio-1",
    type: "audio",
    name: "neuroscience_lecture_12.mp3",
    size: "18.5 MB",
    icon: Mic,
    color: "from-cyan-500 to-blue-600",
    glowColor: "rgba(6, 182, 212, 0.4)",
    summary: {
      title: "Deep Sleep & Synaptic Re-normalization",
      bullets: [
        "Slow-wave sleep induces global synaptic scaling to protect neural plasticity.",
        "Cerebrospinal fluid cleanses metabolic waste via the glymphatic system.",
        "Memory consolidation occurs via sharp-wave ripples between hippocampus & cortex.",
      ],
      citation: "Dr. Walker, Stanford Neuro-Series (2025)",
    },
  },
  {
    id: "web-1",
    type: "web",
    name: "https://arxiv.org/abs/attention-is-all-you-need",
    size: "Web Link",
    icon: Globe,
    color: "from-amber-500 to-orange-600",
    glowColor: "rgba(245, 158, 11, 0.4)",
    summary: {
      title: "Attention Is All You Need (Transformer)",
      bullets: [
        "Replaces recurrent layers with self-attention networks for massive parallelism.",
        "Achieves state-of-the-art BLEU scores with 10x lower training latency.",
        "Introduces multi-head dot-product attention scales for token association mapping.",
      ],
      citation: "Vaswani et al., arXiv (2017)",
    },
  },
];

const HeroSection: React.FC = () => {
  // Magnet button effect values
  const [btn1Translate, setBtn1Translate] = useState({ x: 0, y: 0 });
  const [btn2Translate, setBtn2Translate] = useState({ x: 0, y: 0 });

  // Playground States
  const [activeItem, setActiveItem] = useState<SourceItem | null>(null);
  const [processingState, setProcessingState] = useState<"idle" | "dragging" | "processing" | "synthesized">("idle");
  const [progressText, setProgressText] = useState("");
  const dropzoneRef = useRef<HTMLDivElement | null>(null);

  // Mouse Spotlight Effect for Hero Background
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleGlobalMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    mouseX.set(clientX);
    mouseY.set(clientY);
  };

  // Convert mouse values to CSS spotlight gradients
  const bgSpotlight = useTransform(
    [mouseX, mouseY],
    ([x, y]) => `radial-gradient(800px circle at ${x}px ${y}px, rgba(99, 102, 241, 0.08), transparent 80%)`
  );

  const handleMagnetMove = (e: React.MouseEvent<HTMLButtonElement>, btnIdx: number) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    if (btnIdx === 1) {
      setBtn1Translate({ x: x * 0.25, y: y * 0.25 });
    } else {
      setBtn2Translate({ x: x * 0.25, y: y * 0.25 });
    }
  };

  const handleMagnetLeave = (btnIdx: number) => {
    if (btnIdx === 1) {
      setBtn1Translate({ x: 0, y: 0 });
    } else {
      setBtn2Translate({ x: 0, y: 0 });
    }
  };

  // Drag handlers
  const handleDragStart = () => {
    if (processingState !== "processing" && processingState !== "synthesized") {
      setProcessingState("dragging");
    }
  };

  const handleDragEnd = (event: any, info: any, item: SourceItem) => {
    if (!dropzoneRef.current) return;
    
    const dropzoneRect = dropzoneRef.current.getBoundingClientRect();
    const dragX = info.point.x;
    const dragY = info.point.y;

    // Check if drag ended inside the dropzone bounding box
    const isInside =
      dragX >= dropzoneRect.left &&
      dragX <= dropzoneRect.right &&
      dragY >= dropzoneRect.top &&
      dragY <= dropzoneRect.bottom;

    if (isInside) {
      triggerProcessing(item);
    } else {
      setProcessingState("idle");
    }
  };

  const triggerProcessing = (item: SourceItem) => {
    setActiveItem(item);
    setProcessingState("processing");
    
    // Simulate multi-stage visual compilation pipeline
    const stages = [
      { text: "Reading raw byte stream...", delay: 0 },
      { text: "Extracting semantic entities via OCR...", delay: 600 },
      { text: "Mapping logical context vectors...", delay: 1300 },
      { text: "Synthesizing dynamic summaries...", delay: 2000 },
    ];

    stages.forEach((stage) => {
      setTimeout(() => {
        setProgressText(stage.text);
      }, stage.delay);
    });

    setTimeout(() => {
      setProcessingState("synthesized");
    }, 2800);
  };

  const resetPlayground = () => {
    setActiveItem(null);
    setProcessingState("idle");
    setProgressText("");
  };

  return (
    <div
      onMouseMove={handleGlobalMouseMove}
      className="relative min-h-screen flex flex-col items-center justify-start px-6 pt-28 pb-20 overflow-hidden bg-slate-50 dark:bg-[#030712] transition-colors duration-500"
    >
      {/* Background Animated Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Dynamic Spotlight */}
        <motion.div
          className="absolute inset-0 hidden md:block"
          style={{ background: bgSpotlight }}
        />
        
        {/* Blob 1 */}
        <motion.div
          animate={{
            x: [0, 80, -40, 0],
            y: [0, -60, 40, 0],
            scale: [1, 1.15, 0.9, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-purple-300/20 dark:bg-purple-900/10 blur-[120px]"
        />

        {/* Blob 2 */}
        <motion.div
          animate={{
            x: [0, -90, 70, 0],
            y: [0, 50, -80, 0],
            scale: [1, 0.85, 1.1, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -right-20 -bottom-20 w-[550px] h-[550px] rounded-full bg-cyan-300/20 dark:bg-cyan-900/10 blur-[100px]"
        />

        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)]" />
      </div>

      {/* ================= HERO CONTENT ================= */}
      <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">
        {/* Sparkles Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-full border border-slate-200/80 dark:border-slate-800/80 shadow-md shadow-slate-100/50 dark:shadow-none mb-8 hover:scale-[1.03] transition-transform duration-300 cursor-default"
        >
          <Sparkles className="w-4 h-4 text-[#007AFF] animate-pulse" />
          <span className="text-xs font-semibold tracking-wide uppercase bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Now Powered by Tailwind CSS v4 & Rust Vite Compiler
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="font-title text-5xl sm:text-6xl md:text-8xl font-black tracking-tight leading-[1.05] mb-6 text-slate-900 dark:text-white"
        >
          Your Research.
          <br />
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 dark:from-[#007AFF] dark:via-[#5856D6] dark:to-[#AF52DE] bg-clip-text text-transparent">
            Everywhere, Instantly.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg sm:text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed font-sans"
        >
          Capture, synthesize, and reference notes across all devices. 
          Experience a beautiful workspace built for academic synthesis, active recall, and knowledge graph mapping.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
        >
          <Link to="/signup">
            <button
              onMouseMove={(e) => handleMagnetMove(e, 1)}
              onMouseLeave={() => handleMagnetLeave(1)}
              style={{ transform: `translate(${btn1Translate.x}px, ${btn1Translate.y}px)` }}
              className="magnetic-btn group flex items-center gap-2.5 px-8 py-4 bg-[#007AFF] hover:bg-[#0066DD] text-white font-semibold rounded-full shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 active:scale-[0.98] transition-shadow duration-300"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
          <button
            onMouseMove={(e) => handleMagnetMove(e, 2)}
            onMouseLeave={() => handleMagnetLeave(2)}
            style={{ transform: `translate(${btn2Translate.x}px, ${btn2Translate.y}px)` }}
            onClick={() =>
              document
                .getElementById("products")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="magnetic-btn flex items-center gap-2.5 px-8 py-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl text-slate-950 dark:text-white font-semibold rounded-full border border-slate-200/80 dark:border-slate-800/80 shadow-md hover:bg-white/95 dark:hover:bg-slate-900 hover:shadow-lg hover:shadow-slate-200/20 active:scale-[0.98] transition-shadow duration-300"
          >
            <Chrome className="w-4 h-4 text-blue-500" />
            Download Extension
          </button>
        </motion.div>

        {/* Feature Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-8 text-sm font-medium text-slate-500 dark:text-slate-400 mb-24"
        >
          {["Free to start", "No credit card required", "Cancel anytime"].map((text, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
              <span>{text}</span>
            </div>
          ))}
        </motion.div>

        {/* ================= INTERACTIVE PLAYGROUND ================= */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 50, damping: 15, delay: 0.4 }}
          className="w-full max-w-4xl relative"
        >
          {/* Glassmorphic Board container */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 rounded-[32px] blur-3xl z-0 pointer-events-none" />
          
          <div className="relative z-10 w-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/50 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 ml-2 uppercase tracking-widest">
                  Interactive AI Playground
                </span>
              </div>
              {processingState !== "idle" && (
                <button
                  onClick={resetPlayground}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200/60 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left Column: Draggable Chips */}
              <div className="lg:col-span-4 flex flex-col gap-3.5">
                <div className="text-left mb-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    1. Choose Source
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Drag a capsule to synthesise instantly.
                  </p>
                </div>

                {PLAYGROUND_SOURCES.map((source) => {
                  const Icon = source.icon;
                  const isDisabled = processingState === "processing" || processingState === "synthesized";

                  return (
                    <motion.div
                      key={source.id}
                      drag={!isDisabled}
                      dragSnapToOrigin
                      dragElastic={0.4}
                      onDragStart={handleDragStart}
                      onDragEnd={(e, info) => handleDragEnd(e, info, source)}
                      whileDrag={{ scale: 1.06, cursor: "grabbing" }}
                      whileHover={{ scale: isDisabled ? 1 : 1.02 }}
                      className={`relative flex items-center justify-between px-4 py-3 bg-gradient-to-r ${
                        source.color
                      } text-white rounded-2xl shadow-lg border border-white/20 select-none ${
                        isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-grab"
                      }`}
                      style={{
                        boxShadow: `0 8px 24px -6px ${source.glowColor}`,
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-white/10 rounded-xl">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-xs font-bold truncate max-w-[150px]">
                            {source.name}
                          </p>
                          <p className="text-[10px] text-white/70">
                            {source.size}
                          </p>
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-white/80 shrink-0" />
                    </motion.div>
                  );
                })}
              </div>

              {/* Right Column: Active Synthesis Target */}
              <div className="lg:col-span-8 h-80 flex items-center justify-center">
                <div
                  ref={dropzoneRef}
                  className={`relative w-full h-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 transition-all duration-300 ${
                    processingState === "idle"
                      ? "border-slate-300 dark:border-slate-800 bg-slate-100/30 dark:bg-slate-900/20"
                      : processingState === "dragging"
                      ? "border-blue-500 dark:border-blue-400 bg-blue-500/5 dark:bg-blue-500/5 scale-[1.01]"
                      : "border-transparent bg-slate-900/5 dark:bg-black/10"
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {/* IDLE state */}
                    {processingState === "idle" && (
                      <motion.div
                        key="idle-view"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="text-center max-w-sm flex flex-col items-center gap-3"
                      >
                        <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 animate-float-slow border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
                          <Brain className="w-6 h-6 text-[#007AFF]" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          2. Synthesizer Dropzone
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                          Drag any item from the left and drop it here. Witness the lightning-fast v4 compiler and OCR engine.
                        </p>
                      </motion.div>
                    )}

                    {/* DRAGGING state */}
                    {processingState === "dragging" && (
                      <motion.div
                        key="dragging-view"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="text-center max-w-sm flex flex-col items-center gap-3 pointer-events-none"
                      >
                        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 animate-ping absolute opacity-25" />
                        <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-500 relative shadow-md">
                          <Cpu className="w-6 h-6 animate-spin-slow" />
                        </div>
                        <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          Release to auto-synthesise
                        </h4>
                        <p className="text-xs text-blue-500/80">
                          Dropping will trigger instant OCR extraction.
                        </p>
                      </motion.div>
                    )}

                    {/* PROCESSING state */}
                    {processingState === "processing" && (
                      <motion.div
                        key="processing-view"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="text-center flex flex-col items-center gap-4"
                      >
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-[#007AFF] animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Brain className="w-6 h-6 text-[#007AFF] animate-pulse" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            Synthesizing Context...
                          </p>
                          <p className="text-xs font-mono text-[#007AFF] animate-pulse">
                            {progressText}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* SYNTHESIZED state */}
                    {processingState === "synthesized" && activeItem && (
                      <motion.div
                        key="synthesized-view"
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="w-full h-full flex flex-col text-left p-4 justify-between bg-white dark:bg-[#151b2d] rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-2xl relative overflow-hidden group/card"
                      >
                        {/* Dynamic Glow Line */}
                        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#007AFF] to-transparent animate-pulse" />

                        {/* Top bar */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                              Insight synthesized
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              2.8s total
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Quote className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-2 leading-tight">
                          {activeItem.summary.title}
                        </h4>

                        {/* Bullets */}
                        <ul className="space-y-1.5 my-3 flex-1 overflow-y-auto pr-1">
                          {activeItem.summary.bullets.map((bullet, idx) => (
                            <motion.li
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.25, delay: idx * 0.1 }}
                              className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-relaxed"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                              <span>{bullet}</span>
                            </motion.li>
                          ))}
                        </ul>

                        {/* Bottom Metadata & Citation */}
                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
                          <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-[250px]">
                            🎓 {activeItem.summary.citation}
                          </p>
                          <Link
                            to="/signup"
                            className="text-[10px] font-bold text-[#007AFF] hover:text-[#0066DD] flex items-center gap-0.5 hover:underline"
                          >
                            Save Insight
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HeroSection;
