// ============================================
// CTA SECTION - Final call-to-action banner
// ============================================

import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";

const CTASection: React.FC = () => {
  return (
    <section className="py-24 px-6 bg-[#030712] text-slate-100 relative overflow-hidden">
      {/* Background Accent Mesh */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-purple-600/20 rounded-full blur-[140px]" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-full text-xs font-semibold text-cyan-400 mb-6 shadow-lg">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Start Researching Smarter</span>
        </div>

        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-6 font-title tracking-tight leading-tight">
          Ready to transform your research?
        </h2>

        <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
          Join thousands of students, academics, and researchers who have upgraded their knowledge workflow with ResearchMate.
        </p>

        {/* High-Visibility Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-10">
          <Link to="/signup">
            <button className="relative group overflow-hidden flex items-center gap-3 px-9 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 text-white font-bold text-base rounded-full shadow-[0_0_25px_rgba(79,70,229,0.4)] hover:shadow-[0_0_40px_rgba(79,70,229,0.7)] hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
              <span className="relative z-10">Get Started Free</span>
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1.5 transition-transform" />
            </button>
          </Link>

          <button
            onClick={() =>
              document
                .getElementById("products")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="flex items-center gap-2 px-8 py-4 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-bold text-base rounded-full border border-slate-700 hover:border-slate-600 transition-all hover:scale-105 active:scale-95 shadow-lg"
          >
            <span>Explore All Products</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Free Plan Included
          </span>
          <span>•</span>
          <span>No Credit Card Required</span>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
