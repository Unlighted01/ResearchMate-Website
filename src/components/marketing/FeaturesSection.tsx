// ============================================
// FEATURES SECTION - Feature cards grid + ecosystem overview
// Clean Light Theme
// ============================================

import React from "react";
import {
  Zap,
  Smartphone,
  PenTool,
  Layers,
  Shield,
  RefreshCw,
  Chrome,
  Globe,
  Mic,
  Rss,
  BookOpen,
  Sparkles,
  FileCheck,
} from "lucide-react";
import { AnimateOnScroll } from "../shared/AnimateOnScroll";

interface FeatureItem {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
}

interface DeviceItem {
  icon: React.ElementType;
  name: string;
  desc: string;
  status: string;
}

const FEATURES: FeatureItem[] = [
  {
    icon: Zap,
    title: "AI-Powered Summaries",
    desc: "Instantly distill lengthy research papers into key insights with Gemini 3.6 Flash.",
    color: "#007AFF",
  },
  {
    icon: Mic,
    title: "Media Transcription",
    desc: "Transcribe audio lectures, podcasts, and YouTube video notes directly into readable summaries.",
    color: "#FF2D55",
  },
  {
    icon: Rss,
    title: "Live Paper Feeds",
    desc: "Stay ahead with real-time academic paper feeds from ArXiv, PubMed, bioRxiv, and Nature.",
    color: "#FF9500",
  },
  {
    icon: BookOpen,
    title: "Advanced PDF Reader",
    desc: "Read, annotate, highlight, and extract smart citation notes from heavy PDF documents.",
    color: "#5856D6",
  },
  {
    icon: RefreshCw,
    title: "Real-Time Cloud Sync",
    desc: "Your research updates across browser extensions, mobile camera portal, and web apps automatically.",
    color: "#34C759",
  },
  {
    icon: Smartphone,
    title: "Mobile PWA & Camera Sync",
    desc: "Scan handwritten research pages and book pages using your mobile phone camera.",
    color: "#AF52DE",
  },
  {
    icon: PenTool,
    title: "OCR Handwriting Recognition",
    desc: "Digitize handwritten notes and physical paper citations into searchable digital text.",
    color: "#FF9500",
  },
  {
    icon: Layers,
    title: "Smart Tag Collections",
    desc: "Intelligent AI categorization and automatic tagging for effortless library organization.",
    color: "#5E5CE6",
  },
  {
    icon: Shield,
    title: "Privacy First Architecture",
    desc: "End-to-end encrypted storage and private API credentials so you own your research completely.",
    color: "#FF3B30",
  },
];

const DEVICES: DeviceItem[] = [
  {
    icon: Chrome,
    name: "Browser Extension",
    desc: "Highlight, save, and summarize any web page in 1-click",
    status: "Available",
  },
  {
    icon: Smartphone,
    name: "Mobile Camera Sync",
    desc: "Scan physical documents directly into your inbox",
    status: "Available",
  },
  {
    icon: PenTool,
    name: "Smart Pen OCR",
    desc: "Digitize handwritten notes into structured text",
    status: "Beta",
  },
];

const FeaturesSection: React.FC = () => {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--pointer-x", `${x}px`);
    e.currentTarget.style.setProperty("--pointer-y", `${y}px`);
  };

  return (
    <div className="bg-[#FAFBFD] text-slate-900 py-24 px-6 relative overflow-hidden">
      {/* Background Soft Pastel Beams */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-blue-200/30 blur-[130px] rounded-full" />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-purple-200/30 blur-[130px] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/80 border border-slate-200 rounded-full text-xs font-bold text-[#007AFF] mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Built for Modern Researchers</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-5 tracking-tight font-title">
            Everything you need for better research
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
            High-performance tools engineered to capture, organize, and synthesize knowledge effortlessly across all your workflows.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-28">
          {FEATURES.map((feature, idx) => (
            <AnimateOnScroll key={idx} delay={idx * 80} className="h-full">
              <div
                onMouseMove={handleMouseMove}
                className="spotlight-card group h-full p-7 bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 hover:border-[#007AFF]/40 hover:bg-white transition-all duration-300 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-blue-500/10 flex flex-col justify-between"
              >
                <div>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 shadow-sm"
                    style={{ backgroundColor: `${feature.color}15`, border: `1px solid ${feature.color}30` }}
                  >
                    <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#007AFF] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    {feature.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-slate-700 transition-colors">
                  <span>Explore capability</span>
                  <span style={{ color: feature.color }}>→</span>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>

        {/* Interactive Feature Demo Showcase */}
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-200/90 p-8 md:p-12 shadow-xl shadow-slate-200/60 mb-24 relative overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left text column */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200/80 rounded-full text-[#007AFF] text-xs font-bold mb-6">
                <Globe className="w-4 h-4" />
                <span>Seamless Ecosystem</span>
              </div>

              <h3 className="text-3xl font-extrabold text-slate-900 mb-4 leading-tight font-title">
                One unified library.
                <br />
                <span className="bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#AF52DE] bg-clip-text text-transparent">
                  Every device connected.
                </span>
              </h3>

              <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-8 font-medium">
                Your notes, papers, and transcripts flow seamlessly between your browser extension, mobile camera sync, and desktop dashboard.
              </p>

              {/* Devices List */}
              <div className="space-y-3 mb-8">
                {DEVICES.map((device, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 hover:border-[#007AFF]/50 hover:bg-white transition-all cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#007AFF]">
                        <device.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#007AFF] transition-colors">
                          {device.name}
                        </h4>
                        <p className="text-xs text-slate-500">{device.desc}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        device.status === "Available"
                          ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                      }`}
                    >
                      {device.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Mockup Card */}
            <div className="relative">
              <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 p-6 shadow-2xl relative overflow-hidden">
                {/* Header Mockup */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-mono text-slate-400 ml-2">Live Cloud Sync Preview</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Connected
                  </span>
                </div>

                {/* Content Mockup Body */}
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-3">
                    <FileCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-left">
                      <p className="text-xs font-bold text-white">Quantum_Superconducting_Gate_2026.pdf</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Synthesized 4 key findings from ArXiv paper. Automatically tagged under <span className="text-indigo-400 font-mono">#QuantumPhysics</span>.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-left">
                      <p className="text-xs font-bold text-white">Mobile Camera Scan #1042</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        OCR converted 2 handwritten formula pages into LaTeX format and synced to web dashboard in 1.2s.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer status */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Status: 100% Synced</span>
                  <span>Encryption: AES-256</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default FeaturesSection;
