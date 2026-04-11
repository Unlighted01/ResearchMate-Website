// ============================================
// FEATURES SECTION - Feature cards grid + ecosystem overview
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
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
} from "lucide-react";
import { AnimateOnScroll } from "../shared/AnimateOnScroll";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

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

// ============================================
// PART 3: CONSTANTS
// ============================================

const FEATURES: FeatureItem[] = [
  {
    icon: Zap,
    title: "AI-Powered Summaries",
    desc: "Instantly distill lengthy research into key insights with advanced AI.",
    color: "#007AFF",
  },
  {
    icon: Mic,
    title: "Media Transcription",
    desc: "Transcribe lectures, podcasts, and YouTube videos instantly with Gemini Flash.",
    color: "#FF2D55",
  },
  {
    icon: Rss,
    title: "Live Paper Alerts",
    desc: "Stay ahead of the curve with daily feeds from ArXiv, PubMed, and Nature.",
    color: "#FF9500",
  },
  {
    icon: BookOpen,
    title: "Advanced PDF Reader",
    desc: "Read, annotate, and summarize heavy academic papers from start to finish.",
    color: "#5E5CE6",
  },
  {
    icon: RefreshCw,
    title: "Real-time Sync",
    desc: "Your research stays updated across all devices, automatically.",
    color: "#34C759",
  },
  {
    icon: Smartphone,
    title: "Multi-Platform",
    desc: "Access from browser extension, mobile app, or web dashboard.",
    color: "#5856D6",
  },
  {
    icon: PenTool,
    title: "Smart Pen Ready",
    desc: "Digitize handwritten notes with OCR-powered smart pen support.",
    color: "#FF9500",
  },
  {
    icon: Layers,
    title: "Smart Collections",
    desc: "AI-generated tags and intelligent organization for your research.",
    color: "#AF52DE",
  },
  {
    icon: Shield,
    title: "Privacy First",
    desc: "Your data is encrypted and never shared. You own your research.",
    color: "#FF3B30",
  },
];

const DEVICES: DeviceItem[] = [
  {
    icon: Chrome,
    name: "Browser Extension",
    desc: "Save and highlight while you browse",
    status: "Available",
  },
  {
    icon: Smartphone,
    name: "Mobile App",
    desc: "Research on the go with iOS & Android",
    status: "Coming Soon",
  },
  {
    icon: PenTool,
    name: "Smart Pen",
    desc: "Digitize handwritten notes instantly",
    status: "Beta",
  },
];

// ============================================
// PART 4: COMPONENT
// ============================================

const FeaturesSection: React.FC = () => {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--pointer-x', `${x}px`);
    e.currentTarget.style.setProperty('--pointer-y', `${y}px`);
  };

  return (
    <>
      {/* Features */}
      <div className="py-24 px-6 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need for better research
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to help you capture, organize, and
              understand your research.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, idx) => (
              <AnimateOnScroll key={idx} delay={idx * 100} className="h-full">
                <div 
                  onMouseMove={handleMouseMove}
                  className="spotlight-card group h-full p-6 bg-white/50 backdrop-blur-md rounded-2xl border border-white/50 hover:bg-white/70 transition-all duration-300 hover-lift hover:shadow-xl">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: `${feature.color}15` }}
                  >
                    <feature.icon
                      className="w-6 h-6"
                      style={{ color: feature.color }}
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </div>

      {/* Ecosystem */}
      <div className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 backdrop-blur-md rounded-full text-purple-700 text-sm font-medium mb-6">
                <Globe className="w-4 h-4" />
                Ecosystem
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                One platform.
                <br />
                Every device.
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Research flows seamlessly between your browser, phone, and desk.
                Save an article on your laptop, annotate it on your phone, and
                reference it anywhere.
              </p>

              <div className="space-y-4">
                {DEVICES.map((device, idx) => (
                  <AnimateOnScroll
                    key={idx}
                    delay={idx * 150}
                    animation="fade-in"
                  >
                    <div className="flex items-center gap-4 p-4 bg-white/50 backdrop-blur-md rounded-xl border border-white/50 shadow-sm hover:bg-white/70 hover:shadow-md transition-all duration-300 hover-lift">
                      <div className="w-10 h-10 bg-[#007AFF]/10 rounded-xl flex items-center justify-center">
                        <device.icon className="w-5 h-5 text-[#007AFF]" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {device.name}
                        </h4>
                        <p className="text-sm text-gray-500">{device.desc}</p>
                      </div>
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          device.status === "Available"
                            ? "bg-green-500/10 text-green-700"
                            : device.status === "Beta"
                              ? "bg-orange-500/10 text-orange-700"
                              : "bg-gray-500/10 text-gray-600"
                        }`}
                      >
                        {device.status}
                      </span>
                    </div>
                  </AnimateOnScroll>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-[#007AFF]/10 via-[#5856D6]/10 to-[#AF52DE]/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/30">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
                    <span className="text-4xl font-bold text-white">R</span>
                  </div>
                  <p className="text-gray-600 font-medium">
                    Synced across all devices
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ============================================
// PART 5: EXPORTS
// ============================================

export default FeaturesSection;
