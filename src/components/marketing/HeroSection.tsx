// ============================================
// HERO SECTION - Marketing home hero banner
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  Chrome,
  CheckCircle2,
} from "lucide-react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

// No external props — self-contained section

// ============================================
// PART 3: COMPONENT
// ============================================

const HeroSection: React.FC = () => {
  return (
    <div className="relative min-h-[90vh] flex items-center justify-center px-6 pt-20 pb-16 overflow-hidden">
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md rounded-full border border-white/50 shadow-lg mb-8 animate-fade-in-up">
          <Sparkles className="w-4 h-4 text-[#007AFF]" />
          <span className="text-sm font-medium text-gray-700">
            Now with Smart Pen Integration
          </span>
        </div>

        <h1
          className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          <span className="text-gray-900">Your Research.</span>
          <br />
          <span className="bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#AF52DE] bg-clip-text text-transparent">
            Everywhere.
          </span>
        </h1>

        <p
          className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          Capture, organize, and understand your research across all your
          devices with AI-powered insights.
        </p>

        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <Link to="/signup">
            <button className="group flex items-center gap-2 px-8 py-4 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-full transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]">
              Get Started Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </Link>
          <button
            onClick={() =>
              document
                .getElementById("products")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="flex items-center gap-2 px-8 py-4 bg-white/70 backdrop-blur-md text-gray-900 font-medium rounded-full border border-white/50 shadow-lg hover:bg-white/90 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Chrome className="w-4 h-4" />
            Download Extension
          </button>
        </div>

        <div
          className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 animate-fade-in-up"
          style={{ animationDelay: "0.4s" }}
        >
          {["Free to start", "No credit card required", "Cancel anytime"].map(
            (text, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                <span>{text}</span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default HeroSection;
