// ============================================
// HOW IT WORKS & EXTENSION PROMOTION SECTION
// High-converting product showcase replacing legacy team section
// ============================================

import React from "react";
import { Link } from "react-router-dom";
import {
  Chrome,
  Sparkles,
  Zap,
  Network,
  Download,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  FileText,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { AnimateOnScroll } from "../shared/AnimateOnScroll";

const STEPS = [
  {
    step: "01",
    icon: Chrome,
    title: "1-Click Web & PDF Capture",
    desc: "Install the Chrome Extension to save web articles, ArXiv papers, and PDFs directly into your personal research library while browsing.",
    badge: "Browser Extension",
    color: "#007AFF",
    bgColor: "bg-blue-500/10",
  },
  {
    step: "02",
    icon: Sparkles,
    title: "AI Research Synthesis",
    desc: "Distill complex 50-page research papers into clear, structured summaries, key findings, and interactive Q&A powered by Gemini Flash.",
    badge: "AI Intelligence",
    color: "#5856D6",
    bgColor: "bg-purple-500/10",
  },
  {
    step: "03",
    icon: Network,
    title: "Connected Knowledge Graph",
    desc: "Watch your research automatically organize into an interactive visual graph connecting papers, tags, citations, and handwritten notes.",
    badge: "Knowledge Hub",
    color: "#AF52DE",
    bgColor: "bg-[#AF52DE]/10",
  },
];

const USE_CASES = [
  {
    icon: GraduationCap,
    title: "Students & Candidates",
    desc: "Speed through literature reviews, summarize course readings, and manage sources effortlessly.",
    perks: ["Instant paper summaries", "Mobile camera OCR", "Auto citation notes"],
  },
  {
    icon: BookOpen,
    title: "Academics & Scientists",
    desc: "Build connected knowledge graphs across ArXiv, PubMed, and Nature papers with zero manual tagging.",
    perks: ["Live RSS paper feeds", "LaTeX formula parsing", "Interactive Knowledge Graph"],
  },
  {
    icon: FileText,
    title: "Analysts & Content Writers",
    desc: "Collect web snippets, highlights, and documents into a structured repository ready for synthesis.",
    perks: ["1-click Chrome capture", "Side Panel AI assistant", "Cloud sync everywhere"],
  },
];

const HowItWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="scroll-mt-12 py-24 px-6 bg-[#FAFBFD] relative overflow-hidden">
      {/* Background Soft Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-blue-200/30 via-indigo-200/20 to-purple-200/20 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/90 border border-slate-200 rounded-full text-xs font-bold text-[#007AFF] mb-4 shadow-sm">
            <Zap className="w-3.5 h-3.5" />
            <span>How ResearchMate Works</span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-6 font-title">
            From raw papers to <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#AF52DE] bg-clip-text text-transparent">
              connected research intelligence
            </span>
          </h2>

          <p className="text-lg text-slate-600 font-medium leading-relaxed">
            Stop losing valuable insights in scattered tabs and endless bookmarks. ResearchMate unifies your research workflow into three effortless steps.
          </p>
        </div>

        {/* 3-Step Process Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {STEPS.map((s, idx) => (
            <AnimateOnScroll key={s.step} delay={idx * 150}>
              <div className="group h-full bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-slate-200/90 hover:border-[#007AFF]/40 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-4 right-6 text-5xl font-extrabold font-mono text-slate-100 group-hover:text-blue-50 transition-colors pointer-events-none">
                  {s.step}
                </div>

                <div>
                  <div className={`w-14 h-14 rounded-2xl ${s.bgColor} flex items-center justify-center mb-6`}>
                    <s.icon className="w-7 h-7" style={{ color: s.color }} />
                  </div>

                  <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 mb-3">
                    {s.badge}
                  </span>

                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-[#007AFF] transition-colors">
                    {s.title}
                  </h3>

                  <p className="text-slate-600 text-sm leading-relaxed font-medium">
                    {s.desc}
                  </p>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>

        {/* Chrome Extension Highlight Spotlight Banner */}
        <div className="mb-24">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-2xl border border-white/10">
            {/* Soft Ambient Glow inside Banner */}
            <div className="absolute -right-20 -top-20 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
              <div className="flex-1 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-xs font-bold text-blue-300 mb-4">
                  <Chrome className="w-4 h-4 text-blue-400" />
                  <span>Free Official Chrome Extension</span>
                </div>

                <h3 className="text-3xl sm:text-4xl font-extrabold mb-4 font-title text-white">
                  Supercharge your browser with <br className="hidden sm:inline" /> ResearchMate Extension
                </h3>

                <p className="text-base text-slate-300 mb-8 max-w-xl leading-relaxed font-medium">
                  Capture web articles, highlight key citations, and query AI summaries directly inside your browser side panel — no tab switching required.
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <a
                    href="https://chromewebstore.google.com/detail/researchmate/decekloddlffcnegkfbkfngkjikfchoh"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <button className="flex items-center gap-2.5 px-8 py-4 bg-[#007AFF] hover:bg-[#0066DD] text-white font-bold text-base rounded-full shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all">
                      <Download className="w-5 h-5" />
                      <span>Add to Chrome — Free</span>
                    </button>
                  </a>

                  <Link to="/signup">
                    <button className="flex items-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-bold text-base rounded-full border border-white/20 transition-all">
                      <span>Create Free Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>

              {/* Extension Feature Checklist Box */}
              <div className="w-full lg:w-80 bg-white/10 backdrop-blur-2xl rounded-2xl p-6 border border-white/15 text-left">
                <div className="flex items-center gap-3 mb-5 border-b border-white/10 pb-4">
                  <div className="w-10 h-10 bg-[#007AFF] rounded-xl flex items-center justify-center shadow">
                    <Chrome className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">ResearchMate Extension</p>
                    <p className="text-xs text-blue-300">Chrome Web Store</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    "1-Click Web & Article Capture",
                    "Side Panel AI Assistant",
                    "Instant PDF Summaries",
                    "Real-Time Cloud Sync",
                    "Privacy First Data Architecture",
                  ].map((perk, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs font-semibold text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Who Uses ResearchMate Section */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h3 className="text-3xl font-bold text-slate-900 mb-3 font-title">
              Designed for every stage of research
            </h3>
            <p className="text-slate-600 text-base font-medium">
              Whether you're writing a thesis or synthesizing industry reports, ResearchMate adapts to your workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {USE_CASES.map((uc, idx) => (
              <div key={idx} className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-200/80 shadow-lg shadow-slate-200/50 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
                    <uc.icon className="w-6 h-6 text-[#007AFF]" />
                  </div>

                  <h4 className="text-xl font-bold text-slate-900 mb-2">
                    {uc.title}
                  </h4>

                  <p className="text-slate-600 text-sm leading-relaxed font-medium mb-6">
                    {uc.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  {uc.perks.map((p, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default HowItWorksSection;
