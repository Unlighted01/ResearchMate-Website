// ============================================
// HERO SECTION - High-Fidelity Marketing Hero & Interactive Playground
// Clean Light Theme & Fixed Drag-and-Drop Synthesizer
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
  MessageSquare,
  Zap,
  MousePointer,
  Layers,
  Undo2,
} from "lucide-react";

// ============================================
// SOURCE ITEMS SPEC
// ============================================
interface SourceItem {
  id: string;
  type: "pdf" | "audio" | "web";
  name: string;
  size: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  glowColor: string;
  gradient: string;
  summary: {
    title: string;
    bullets: string[];
    citation: string;
    qa: { question: string; answer: string }[];
  };
}

const PLAYGROUND_SOURCES: SourceItem[] = [
  {
    id: "pdf-1",
    type: "pdf",
    name: "quantum_computing_nature.pdf",
    size: "4.2 MB",
    icon: FileText,
    color: "from-purple-600 to-indigo-600",
    glowColor: "rgba(124, 58, 237, 0.25)",
    gradient: "from-purple-600 via-indigo-600 to-blue-600",
    summary: {
      title: "Quantum Supremacy via Superconducting Qubits",
      bullets: [
        "Demonstrates computational advantage using 53 active physical qubits.",
        "System handles complex tensor contractions in 200 seconds vs 10,000 years classically.",
        "Establishes foundation for fault-tolerant physical quantum execution gates.",
      ],
      citation: "Google Quantum AI, Nature (2019)",
      qa: [
        {
          question: "What is the key benchmark result?",
          answer: "The 53-qubit processor performed a target sampling task in 200 seconds that would take a supercomputer 10,000 years.",
        },
        {
          question: "How does this apply to research?",
          answer: "Enables multi-scale molecular simulation and cryptographic prime factorization research.",
        },
      ],
    },
  },
  {
    id: "audio-1",
    type: "audio",
    name: "neuroscience_lecture_12.mp3",
    size: "18.5 MB",
    icon: Mic,
    color: "from-[#007AFF] to-[#5856D6]",
    glowColor: "rgba(0, 122, 255, 0.25)",
    gradient: "from-[#007AFF] via-blue-600 to-indigo-600",
    summary: {
      title: "Deep Sleep & Synaptic Re-normalization",
      bullets: [
        "Slow-wave sleep induces global synaptic scaling to protect neural plasticity.",
        "Cerebrospinal fluid cleanses metabolic waste via the glymphatic system.",
        "Memory consolidation occurs via sharp-wave ripples between hippocampus & cortex.",
      ],
      citation: "Dr. Walker, Stanford Neuro-Series (2025)",
      qa: [
        {
          question: "What happens during slow-wave sleep?",
          answer: "Synapses undergo global downscaling to restore baseline plasticity while consolidating long-term memories.",
        },
        {
          question: "What is the glymphatic system role?",
          answer: "Flushes beta-amyloid and tau proteins out of the central nervous system during NREM sleep.",
        },
      ],
    },
  },
  {
    id: "web-1",
    type: "web",
    name: "https://arxiv.org/abs/attention-is-all-you-need",
    size: "Web Link",
    icon: Globe,
    color: "from-amber-500 to-orange-600",
    glowColor: "rgba(245, 158, 11, 0.25)",
    gradient: "from-amber-500 via-orange-600 to-red-600",
    summary: {
      title: "Attention Is All You Need (Transformer)",
      bullets: [
        "Replaces recurrent layers with self-attention networks for massive parallelism.",
        "Achieves state-of-the-art BLEU scores with 10x lower training latency.",
        "Introduces multi-head dot-product attention scales for token association mapping.",
      ],
      citation: "Vaswani et al., arXiv (2017)",
      qa: [
        {
          question: "Why drop recurrent layers?",
          answer: "Recurrent networks prevent sequence parallelization during training; self-attention allows global sequence computation in O(1) sequential steps.",
        },
        {
          question: "What is multi-head attention?",
          answer: "Allows the model to jointly attend to information from different representation subspaces at different positions.",
        },
      ],
    },
  },
];

const HeroSection: React.FC = () => {
  // Magnet button effect values
  const [btn1Translate, setBtn1Translate] = useState({ x: 0, y: 0 });
  const [btn2Translate, setBtn2Translate] = useState({ x: 0, y: 0 });

  // Playground States
  const [activeItem, setActiveItem] = useState<SourceItem | null>(null);
  const [processingState, setProcessingState] = useState<"idle" | "processing" | "synthesized">("idle");
  const [isHoveringDropzone, setIsHoveringDropzone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [activeResultTab, setActiveResultTab] = useState<"summary" | "qa">("summary");
  const dropzoneRef = useRef<HTMLDivElement | null>(null);
  // Use a ref to track hover state reliably — React state batching can lose it in onDragEnd
  const isOverDropzoneRef = useRef(false);
  // Track each card's dropped position — cards that miss the dropzone stay where they land
  const [cardPositions, setCardPositions] = useState<Record<string, { x: number; y: number }>>({}); 

  // Mouse Spotlight Effect for Hero Background
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleGlobalMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    mouseX.set(clientX);
    mouseY.set(clientY);
  };

  const bgSpotlight = useTransform(
    [mouseX, mouseY],
    ([x, y]) => `radial-gradient(900px circle at ${x}px ${y}px, rgba(0, 122, 255, 0.06), transparent 80%)`
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

  // Trigger processing pipeline for a selected source (works via click OR drag)
  const triggerProcessing = (item: SourceItem) => {
    if (processingState === "processing") return;
    setActiveItem(item);
    setActiveResultTab("summary");
    setProcessingState("processing");
    setIsHoveringDropzone(false);
    setIsDragging(false);
    isOverDropzoneRef.current = false;

    const stages = [
      { text: "Reading raw byte stream...", delay: 0 },
      { text: "Extracting semantic entities via OCR...", delay: 350 },
      { text: "Mapping logical context vectors...", delay: 800 },
      { text: "Synthesizing dynamic summaries...", delay: 1300 },
    ];

    stages.forEach((stage) => {
      setTimeout(() => {
        setProgressText(stage.text);
      }, stage.delay);
    });

    setTimeout(() => {
      setProcessingState("synthesized");
    }, 1800);
  };

  // Real-time drag pointer tracking — uses raw event.clientX (viewport coords) to match getBoundingClientRect
  const handleDrag = (event: any, _info: any) => {
    if (!dropzoneRef.current) return;
    const dropzoneRect = dropzoneRef.current.getBoundingClientRect();
    // Use raw PointerEvent clientX/clientY — always viewport coords, matching getBoundingClientRect
    const pointerX = event.clientX;
    const pointerY = event.clientY;

    const margin = 40;
    const isOver =
      pointerX >= dropzoneRect.left - margin &&
      pointerX <= dropzoneRect.right + margin &&
      pointerY >= dropzoneRect.top - margin &&
      pointerY <= dropzoneRect.bottom + margin;

    isOverDropzoneRef.current = isOver;
    setIsHoveringDropzone(isOver);
  };

  // Drag End — if dropped on dropzone → synthesize & reset. If missed → card stays stuck where it landed.
  const handleDragEnd = (_event: any, info: any, item: SourceItem) => {
    const dragDistance = Math.hypot(info?.offset?.x || 0, info?.offset?.y || 0);
    const wasOverDropzone = isOverDropzoneRef.current;

    // Clean up drag visual state
    setIsDragging(false);
    setIsHoveringDropzone(false);
    isOverDropzoneRef.current = false;

    // Short drag = click/tap → trigger synthesis and snap card home
    if (dragDistance < 6) {
      setCardPositions((prev) => ({ ...prev, [item.id]: { x: 0, y: 0 } }));
      triggerProcessing(item);
      return;
    }

    // Real drag — dropped on dropzone → synthesize & reset card position
    if (wasOverDropzone) {
      setCardPositions((prev) => ({ ...prev, [item.id]: { x: 0, y: 0 } }));
      triggerProcessing(item);
    } else {
      // TROLL: Card missed! Save its landed position — it stays stuck there
      const offsetX = info?.offset?.x || 0;
      const offsetY = info?.offset?.y || 0;
      const prevPos = cardPositions[item.id] || { x: 0, y: 0 };
      setCardPositions((prev) => ({
        ...prev,
        [item.id]: { x: prevPos.x + offsetX, y: prevPos.y + offsetY },
      }));
      if (processingState !== "synthesized" && processingState !== "processing") {
        setProcessingState("idle");
      }
    }
  };

  // Click a "lost" card to snap it home and trigger synthesis
  const handleCardClick = (item: SourceItem) => {
    if (processingState === "processing") return;
    setCardPositions((prev) => ({ ...prev, [item.id]: { x: 0, y: 0 } }));
    triggerProcessing(item);
  };

  const resetPlayground = () => {
    setActiveItem(null);
    setProcessingState("idle");
    setProgressText("");
    setIsHoveringDropzone(false);
    setIsDragging(false);
    isOverDropzoneRef.current = false;
    // Snap all escaped cards back home
    setCardPositions({});
  };

  return (
    <div
      onMouseMove={handleGlobalMouseMove}
      className="relative min-h-screen flex flex-col items-center justify-start px-6 pt-28 pb-24 overflow-hidden bg-[#FAFBFD] text-slate-900 transition-colors duration-500"
    >
      {/* Background Soft Mesh & Pastel Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          className="absolute inset-0 hidden md:block"
          style={{ background: bgSpotlight }}
        />

        {/* Ambient Pastel Glow Blobs (Eye-pleasing) */}
        <motion.div
          animate={{
            x: [0, 80, -40, 0],
            y: [0, -60, 40, 0],
            scale: [1, 1.15, 0.9, 1],
          }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-[650px] h-[650px] rounded-full bg-blue-200/40 blur-[130px]"
        />

        <motion.div
          animate={{
            x: [0, -90, 70, 0],
            y: [0, 50, -80, 0],
            scale: [1, 0.85, 1.1, 1],
          }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-20 -bottom-20 w-[600px] h-[600px] rounded-full bg-purple-200/40 blur-[120px]"
        />

        {/* Light Subtly Grid Backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      {/* ================= HERO CONTENT ================= */}
      <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">
        
        {/* Sparkles Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/80 backdrop-blur-2xl rounded-full border border-blue-200/80 shadow-md shadow-blue-500/5 mb-8 hover:scale-[1.04] transition-all duration-300 cursor-default"
        >
          <Sparkles className="w-4 h-4 text-[#007AFF] animate-pulse" />
          <span className="text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#AF52DE] bg-clip-text text-transparent">
            Powered by Gemini AI & Realtime Sync Engine
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="font-title text-5xl sm:text-6xl md:text-8xl font-black tracking-tight leading-[1.05] mb-6 text-slate-900"
        >
          Your Research.
          <br />
          <span className="bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#AF52DE] bg-clip-text text-transparent">
            Everywhere, Instantly.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg sm:text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed font-sans font-medium"
        >
          Capture, synthesize, and reference notes across all devices. 
          Experience a beautiful workspace built for academic synthesis, active recall, and knowledge graph mapping.
        </motion.p>

        {/* High-Visibility Light-Theme CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-16"
        >
          {/* Primary CTA Button */}
          <Link to="/signup">
            <button
              onMouseMove={(e) => handleMagnetMove(e, 1)}
              onMouseLeave={() => handleMagnetLeave(1)}
              style={{ transform: `translate(${btn1Translate.x}px, ${btn1Translate.y}px)` }}
              className="relative group overflow-hidden flex items-center gap-3 px-9 py-4 bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#0051D5] hover:from-[#0066DD] hover:via-[#4A48C8] hover:to-[#0044B8] text-white font-bold text-base rounded-full shadow-[0_10px_30px_rgba(0,122,255,0.4)] hover:shadow-[0_15px_45px_rgba(0,122,255,0.65)] hover:scale-[1.05] active:scale-[0.97] transition-all duration-300 border border-white/30"
            >
              {/* Shimmer Light Sweep Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
              <span className="relative z-10">Get Started Free</span>
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1.5 transition-transform" />
            </button>
          </Link>

          {/* Secondary CTA Button */}
          <button
            onMouseMove={(e) => handleMagnetMove(e, 2)}
            onMouseLeave={() => handleMagnetLeave(2)}
            style={{ transform: `translate(${btn2Translate.x}px, ${btn2Translate.y}px)` }}
            onClick={() =>
              document
                .getElementById("products")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="relative group overflow-hidden flex items-center gap-3 px-8 py-4 bg-white/90 backdrop-blur-2xl text-slate-900 font-bold text-base rounded-full border-2 border-slate-200 shadow-lg shadow-slate-200/50 hover:border-[#007AFF] hover:text-[#007AFF] hover:shadow-[0_10px_30px_rgba(0,122,255,0.25)] hover:scale-[1.05] active:scale-[0.97] transition-all duration-300"
          >
            <Chrome className="w-5 h-5 text-[#007AFF] relative z-10 group-hover:rotate-12 transition-transform" />
            <span className="relative z-10">Download Extension</span>
          </button>
        </motion.div>

        {/* Feature Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-8 text-sm font-semibold text-slate-500 mb-20"
        >
          {["Free to start", "No credit card required", "Cancel anytime"].map((text, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{text}</span>
            </div>
          ))}
        </motion.div>

        {/* ================= INTERACTIVE PLAYGROUND ================= */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 50, damping: 15, delay: 0.4 }}
          className="w-full max-w-4xl relative overflow-visible"
        >
          {/* Glass Board Soft Shadow Backdrop */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-purple-400/10 to-indigo-400/10 rounded-[36px] blur-3xl z-0 pointer-events-none" />

          <div className="relative z-10 w-full bg-white/90 backdrop-blur-2xl border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-visible text-left">
            
            {/* Header Bar */}
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-xs font-mono font-bold text-slate-600 ml-2 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-[#007AFF]" />
                  Interactive AI Playground
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-[#007AFF] bg-blue-50 px-3 py-1 rounded-full border border-blue-200/80">
                  <MousePointer className="w-3 h-3" />
                  Drag or Click Source
                </span>

                {processingState !== "idle" && (
                  <button
                    onClick={resetPlayground}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center overflow-visible">
              
              {/* Left Column: Source Items (Clickable & Draggable) */}
              <div className="lg:col-span-5 flex flex-col gap-3.5 overflow-visible">
                <div className="mb-1">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    1. Select Research Source
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Drag card into synthesizer box or simply click it.
                  </p>
                </div>

                {PLAYGROUND_SOURCES.map((source) => {
                  const Icon = source.icon;
                  const isSelected = activeItem?.id === source.id;
                  const isProcessingThis = isSelected && processingState === "processing";
                  const pos = cardPositions[source.id] || { x: 0, y: 0 };
                  const isLost = pos.x !== 0 || pos.y !== 0;

                  return (
                    <motion.div
                      key={source.id}
                      drag={processingState !== "processing"}
                      dragMomentum={false}
                      dragElastic={0}
                      onDrag={handleDrag}
                      onDragStart={() => {
                        setIsDragging(true);
                        setActiveItem(source);
                      }}
                      onDragEnd={(e, info) => handleDragEnd(e, info, source)}
                      onClick={() => isLost && handleCardClick(source)}
                      animate={{
                        x: pos.x,
                        y: pos.y,
                        rotate: isLost ? (pos.x > 0 ? 3 : -3) : 0,
                        opacity: isLost ? 0.85 : 1,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 22,
                      }}
                      whileDrag={{
                        scale: 1.12,
                        zIndex: 50,
                        rotate: 2,
                        cursor: "grabbing",
                        boxShadow: `0 20px 50px -8px ${source.glowColor}, 0 0 0 2px rgba(255,255,255,0.4)`,
                      }}
                      whileHover={{ scale: 1.03, y: isLost ? pos.y - 3 : -2 }}
                      whileTap={{ scale: 0.97 }}
                      className={`relative flex items-center justify-between px-4 py-3.5 bg-gradient-to-r ${
                        source.gradient
                      } text-white rounded-2xl shadow-lg select-none cursor-grab active:cursor-grabbing transition-shadow border border-white/20 ${
                        isSelected ? "ring-4 ring-blue-400/50 shadow-blue-500/30" : ""
                      } ${
                        isLost ? "z-40" : ""
                      }`}
                      style={{
                        boxShadow: isLost
                          ? `0 16px 40px -4px ${source.glowColor}, 0 0 0 1px rgba(255,255,255,0.3)`
                          : `0 8px 24px -6px ${source.glowColor}`,
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl shrink-0">
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate max-w-[170px]">
                            {source.name}
                          </p>
                          <p className="text-[10px] text-white/80 font-mono">
                            {source.size}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isLost ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/30 text-white flex items-center gap-1">
                            <Undo2 className="w-3 h-3" />
                            Click to return
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/25 text-white">
                            {isProcessingThis ? "Synthesizing..." : "Click / Drag →"}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Right Column: Active Synthesizer Dropzone / Result Display */}
              <div className="lg:col-span-7 h-80 flex items-center justify-center">
                <div
                  ref={dropzoneRef}
                  className={`relative w-full h-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-5 transition-all duration-300 overflow-hidden ${
                    isHoveringDropzone
                      ? "border-[#007AFF] bg-blue-50 scale-[1.03] shadow-[0_0_40px_rgba(0,122,255,0.15)]"
                      : isDragging
                      ? "border-blue-400/60 bg-blue-50/40 scale-[1.01]"
                      : processingState === "idle"
                      ? "border-slate-300 bg-slate-50/70"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  {/* Animated ring pulse when user is dragging */}
                  {isDragging && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className={`absolute inset-2 rounded-xl border-2 border-dashed transition-colors duration-300 ${
                        isHoveringDropzone ? "border-[#007AFF] animate-pulse" : "border-blue-300/50"
                      }`} />
                    </div>
                  )}
                  <AnimatePresence mode="wait">
                    
                    {/* IDLE State — shows different content when user is dragging */}
                    {processingState === "idle" && (
                      <motion.div
                        key="idle-view"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="text-center max-w-sm flex flex-col items-center gap-3 pointer-events-none"
                      >
                        <motion.div
                          animate={isHoveringDropzone
                            ? { scale: [1, 1.15, 1], borderColor: "#007AFF" }
                            : isDragging
                            ? { scale: [1, 1.05, 1] }
                            : { scale: 1 }
                          }
                          transition={{ duration: 0.8, repeat: isHoveringDropzone || isDragging ? Infinity : 0, ease: "easeInOut" }}
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-colors duration-300 ${
                            isHoveringDropzone
                              ? "bg-[#007AFF] border-2 border-[#007AFF] text-white"
                              : isDragging
                              ? "bg-blue-100 border-2 border-blue-400 text-[#007AFF]"
                              : "bg-blue-50 border border-blue-200 text-[#007AFF]"
                          }`}
                        >
                          {isHoveringDropzone ? (
                            <Plus className="w-7 h-7 text-white" />
                          ) : isDragging ? (
                            <Cpu className="w-7 h-7 animate-spin" />
                          ) : (
                            <Brain className="w-7 h-7" />
                          )}
                        </motion.div>
                        <h4 className={`text-sm font-bold transition-colors duration-200 ${
                          isHoveringDropzone ? "text-[#007AFF]" : "text-slate-900"
                        }`}>
                          {isHoveringDropzone
                            ? "Release to synthesize!"
                            : isDragging
                            ? "Drop it here →"
                            : "2. Synthesizer Dropzone"
                          }
                        </h4>
                        <p className={`text-xs leading-relaxed ${
                          isHoveringDropzone ? "text-[#007AFF]" : "text-slate-500"
                        }`}>
                          {isHoveringDropzone
                            ? "Gemini will instantly extract key context from this source."
                            : isDragging
                            ? "Move the card over this area and release."
                            : "Drag any research card from the left (or click it) to test real-time AI OCR extraction."
                          }
                        </p>
                      </motion.div>
                    )}

                    {/* PROCESSING State */}
                    {processingState === "processing" && (
                      <motion.div
                        key="processing-view"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="text-center flex flex-col items-center gap-4"
                      >
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-[#007AFF] animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Brain className="w-6 h-6 text-[#007AFF] animate-pulse" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-900">
                            Synthesizing Context...
                          </p>
                          <p className="text-xs font-mono text-[#007AFF] animate-pulse">
                            {progressText}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* SYNTHESIZED State (With Interactive Result Tabs) */}
                    {processingState === "synthesized" && activeItem && (
                      <motion.div
                        key="synthesized-view"
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="w-full h-full flex flex-col text-left p-4 justify-between bg-white rounded-xl border border-slate-200 shadow-xl relative overflow-hidden group/card"
                      >
                        {/* Glowing Header Accent */}
                        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#AF52DE]" />

                        {/* Top Bar: Status + Result Tabs */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-[#007AFF] border border-blue-200">
                              Synthesized in 1.8s
                            </span>
                          </div>

                          {/* Result Tabs */}
                          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button
                              onClick={() => setActiveResultTab("summary")}
                              className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                activeResultTab === "summary"
                                  ? "bg-white text-[#007AFF] shadow-sm"
                                  : "text-slate-500 hover:text-slate-900"
                              }`}
                            >
                              Summary
                            </button>
                            <button
                              onClick={() => setActiveResultTab("qa")}
                              className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                activeResultTab === "qa"
                                  ? "bg-white text-[#007AFF] shadow-sm"
                                  : "text-slate-500 hover:text-slate-900"
                              }`}
                            >
                              Ask AI Q&A
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-bold text-slate-900 mt-2 leading-snug truncate">
                          {activeItem.summary.title}
                        </h4>

                        {/* TAB 1: Summary Bullets */}
                        {activeResultTab === "summary" && (
                          <ul className="space-y-1.5 my-2 flex-1 overflow-y-auto pr-1">
                            {activeItem.summary.bullets.map((bullet, idx) => (
                              <motion.li
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.25, delay: idx * 0.08 }}
                                className="text-xs text-slate-700 flex items-start gap-2 leading-relaxed"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] shrink-0 mt-1.5" />
                                <span>{bullet}</span>
                              </motion.li>
                            ))}
                          </ul>
                        )}

                        {/* TAB 2: Q&A */}
                        {activeResultTab === "qa" && (
                          <div className="space-y-2 my-2 flex-1 overflow-y-auto pr-1">
                            {activeItem.summary.qa.map((qaItem, idx) => (
                              <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                                <p className="text-[11px] font-bold text-[#007AFF] flex items-center gap-1.5">
                                  <MessageSquare className="w-3 h-3" />
                                  {qaItem.question}
                                </p>
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                  {qaItem.answer}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Bottom Metadata & Citation */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                          <p className="text-[10px] font-mono text-slate-500 truncate max-w-[240px]">
                            🎓 {activeItem.summary.citation}
                          </p>
                          <Link
                            to="/signup"
                            className="text-[10px] font-bold text-[#007AFF] hover:text-[#0051D5] flex items-center gap-1 hover:underline"
                          >
                            Save to Library
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
