// ============================================
// PRODUCTS SECTION - Product showcase cards + extension spotlight
// Clean Light Theme
// ============================================

import React from "react";
import { Link } from "react-router-dom";
import {
  Zap,
  Smartphone,
  PenTool,
  Shield,
  RefreshCw,
  ArrowRight,
  Chrome,
  Globe,
  Cloud,
  Check,
  Download,
  ExternalLink,
  Star,
  Sparkles,
} from "lucide-react";
import { AnimateOnScroll } from "../shared/AnimateOnScroll";

interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
  status: string;
  features: string[];
  cta: string;
  ctaLink: string;
}

interface FeatureBar {
  icon: React.ElementType;
  title: string;
  description: string;
}

const PRODUCTS: Product[] = [
  {
    id: "extension",
    name: "Browser Extension",
    tagline: "Research while you browse",
    description:
      "Capture highlights, save articles, and generate AI summaries directly from any webpage. Works seamlessly with Chrome, Firefox, and Edge.",
    icon: Chrome,
    color: "#007AFF",
    gradient: "from-[#007AFF] to-[#0051D5]",
    status: "Available",
    features: [
      "One-click save from any website",
      "Highlight and annotate text",
      "AI-powered summaries",
      "Auto-sync to cloud",
      "Keyboard shortcuts",
      "Context menu integration",
    ],
    cta: "Add to Chrome",
    ctaLink:
      "https://chromewebstore.google.com/detail/researchmate/decekloddlffcnegkfbkfngkjikfchoh",
  },
  {
    id: "mobile",
    name: "Mobile App & Camera Sync",
    tagline: "Research on the go",
    description:
      "Access your entire research library from your phone. Capture handwritten notes via OCR camera mode and sync instantly with your workspace.",
    icon: Smartphone,
    color: "#5856D6",
    gradient: "from-[#5856D6] to-[#AF52DE]",
    status: "Available",
    features: [
      "Full research library access",
      "Standalone PWA & offline mode",
      "Camera capture with OCR",
      "Real-time pair code sync",
      "Direct inbox upload",
      "Mobile quick widgets",
    ],
    cta: "Open Mobile Portal",
    ctaLink: "/mobile-sync",
  },
  {
    id: "smartpen",
    name: "Handwriting OCR & Vision",
    tagline: "Handwriting meets digital",
    description:
      "Bridge the gap between physical paper and digital notes. Your handwritten notes and physical textbooks are transcribed and synthesized into your library.",
    icon: PenTool,
    color: "#FF9500",
    gradient: "from-[#FF9500] to-[#FF6B00]",
    status: "Available",
    features: [
      "Camera scan upload",
      "OCR text recognition",
      "Diagram & math indexing",
      "Mobile pair code sync",
      "Cloud backup",
      "Search handwritten notes",
    ],
    cta: "Scan Notes",
    ctaLink: "/mobile-sync",
  },
  {
    id: "web",
    name: "Web Dashboard",
    tagline: "Your research command center",
    description:
      "The central hub for all your research. Organize, search, and analyze your entire library with powerful tools, PDF readers, and AI assistance.",
    icon: Globe,
    color: "#34C759",
    gradient: "from-[#34C759] to-[#30D158]",
    status: "Available",
    features: [
      "Unified research library",
      "Advanced search & filters",
      "Collections & smart tags",
      "AI assistant chat",
      "Citation generator",
      "Focus Pomodoro timer",
    ],
    cta: "Open Dashboard",
    ctaLink: "/app/dashboard",
  },
];

const FEATURE_BARS: FeatureBar[] = [
  {
    icon: RefreshCw,
    title: "Real-Time Sync",
    description: "Changes sync instantly across all your connected devices",
  },
  {
    icon: Zap,
    title: "AI Powered",
    description: "Intelligent summaries and context extractions powered by Gemini",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your research is encrypted and never sold or shared",
  },
  {
    icon: Cloud,
    title: "Cloud Backup",
    description: "Access your research from anywhere, anytime with full uptime",
  },
];

const ProductsSection: React.FC = () => {
  return (
    <section id="products" className="scroll-mt-12 bg-[#FAFBFD] text-slate-900 py-24 px-6 relative overflow-hidden">
      {/* Background Soft Pastel Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-blue-200/30 blur-[150px] rounded-full pointer-events-none" />

      {/* Hero Header */}
      <div className="relative z-10 max-w-4xl mx-auto text-center mb-20">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/90 border border-slate-200 rounded-full text-xs font-bold text-[#007AFF] mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Product Ecosystem</span>
        </div>

        <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 font-title">
          One ecosystem.
          <br />
          <span className="bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#AF52DE] bg-clip-text text-transparent">
            Every device connected.
          </span>
        </h2>

        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          ResearchMate works seamlessly across your browser, phone, and desk. Your research flows with you everywhere.
        </p>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-6 text-center">
          {[
            { value: "4", label: "Core Products" },
            { value: "Beta", label: "Public Testing" },
            { value: "24/7", label: "Real-time Sync" },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-white/80 backdrop-blur-xl rounded-2xl px-8 py-5 border border-slate-200/80 shadow-lg shadow-slate-200/50"
            >
              <p className="text-3xl font-extrabold text-slate-900 font-mono">{stat.value}</p>
              <p className="text-xs font-bold text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-6xl mx-auto mb-20 relative z-10">
        <div className="grid md:grid-cols-2 gap-8">
          {PRODUCTS.map((product, idx) => (
            <AnimateOnScroll key={product.id} delay={idx * 120}>
              <div className="group h-full bg-white/90 backdrop-blur-2xl rounded-3xl p-8 hover:bg-white transition-all duration-500 border border-slate-200/90 hover:border-[#007AFF]/40 shadow-xl shadow-slate-200/60 hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-6">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${product.gradient} flex items-center justify-center shadow-lg`}
                      style={{ boxShadow: `0 8px 24px ${product.color}35` }}
                    >
                      <product.icon className="w-7 h-7 text-white" />
                    </div>
                    <span
                      className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                        product.status === "Available"
                          ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                      }`}
                    >
                      {product.status}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-[#007AFF] transition-colors">
                    {product.name}
                  </h3>
                  <p
                    className="text-xs font-extrabold uppercase tracking-wider mb-3"
                    style={{ color: product.color }}
                  >
                    {product.tagline}
                  </p>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">
                    {product.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2.5 mb-8">
                    {product.features.map((feature, fIdx) => (
                      <div
                        key={fIdx}
                        className="flex items-center gap-2 text-xs text-slate-700 font-medium"
                      >
                        <Check
                          className="w-4 h-4 shrink-0"
                          style={{ color: product.color }}
                        />
                        <span className="truncate">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <div>
                  {product.status === "Available" ? (
                    product.ctaLink.startsWith("/") ? (
                      <Link to={product.ctaLink}>
                        <button
                          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl font-bold text-white transition-all shadow-lg hover:scale-[1.03] active:scale-[0.97] bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#0051D5] hover:shadow-[0_10px_30px_rgba(0,122,255,0.4)] border border-white/20"
                        >
                          <span>{product.cta}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </Link>
                    ) : (
                      <a
                        href={product.ctaLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <button
                          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl font-bold text-white transition-all shadow-lg hover:scale-[1.03] active:scale-[0.97] bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#0051D5] hover:shadow-[0_10px_30px_rgba(0,122,255,0.4)] border border-white/20"
                        >
                          <span>{product.cta}</span>
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </a>
                    )
                  ) : (
                    <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed">
                      <span>{product.cta}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>

      {/* Feature Bars */}
      <div className="max-w-6xl mx-auto mb-20 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {FEATURE_BARS.map((feature, idx) => (
            <div key={idx} className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl border border-slate-200/80 text-center shadow-md shadow-slate-200/40">
              <div className="w-12 h-12 bg-blue-50 border border-blue-200/80 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#007AFF]">
                <feature.icon className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">
                {feature.title}
              </h4>
              <p className="text-xs text-slate-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Extension Spotlight Banner */}
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#0051D5] rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-blue-500/20 border border-white/20">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold mb-4">
                <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                <span>Featured Chrome Extension</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-extrabold mb-4 font-title">
                Get the Browser Extension
              </h3>
              <p className="text-base text-slate-100 mb-6 max-w-lg leading-relaxed font-medium">
                The fastest way to capture, highlight, and summarize web content. One click adds any paper or article directly into your workspace.
              </p>
              <a
                href="https://chromewebstore.google.com/detail/researchmate/decekloddlffcnegkfbkfngkjikfchoh"
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="flex items-center gap-2.5 px-8 py-4 bg-white text-[#007AFF] font-bold text-base rounded-full hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-xl">
                  <Download className="w-5 h-5" />
                  <span>Add to Chrome - Free</span>
                </button>
              </a>
            </div>

            <div className="w-full md:w-80 bg-white/10 backdrop-blur-2xl rounded-2xl p-6 border border-white/20 text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow">
                  <span className="text-[#007AFF] font-black text-lg">R</span>
                </div>
                <div>
                  <p className="font-bold text-sm text-white">ResearchMate</p>
                  <p className="text-xs text-white/80">Chrome Store Extension</p>
                </div>
              </div>
              <div className="space-y-2">
                {["1-Click Web Capture", "Instant AI Summaries", "Auto-Tag & Highlight"].map((action, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl text-xs font-semibold"
                  >
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};

export default ProductsSection;
