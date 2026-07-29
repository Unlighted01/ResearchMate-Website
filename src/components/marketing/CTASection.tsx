// ============================================
// CTA SECTION - Final call-to-action banner
// Clean Light Theme
// ============================================

import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";

const CTASection: React.FC = () => {
  return (
    <section className="py-24 px-6 bg-[#FAFBFD] text-slate-900 relative overflow-hidden">
      {/* Background Ambient Soft Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-200/40 via-purple-200/30 to-indigo-200/30 rounded-full blur-[140px]" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/90 border border-slate-200 rounded-full text-xs font-bold text-[#007AFF] mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Start Researching Smarter</span>
        </div>

        <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 font-title tracking-tight leading-tight">
          Ready to transform your research?
        </h2>

        <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
          Join thousands of students, academics, and researchers who have upgraded their knowledge workflow with ResearchMate.
        </p>

        {/* High-Visibility Light-Theme CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-10">
          <Link to="/signup">
            <button className="relative group overflow-hidden flex items-center gap-3 px-9 py-4 bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#0051D5] hover:from-[#0066DD] hover:via-[#4A48C8] hover:to-[#0044B8] text-white font-bold text-base rounded-full shadow-[0_10px_30px_rgba(0,122,255,0.4)] hover:shadow-[0_15px_45px_rgba(0,122,255,0.65)] hover:scale-[1.05] active:scale-[0.97] transition-all duration-300 border border-white/30">
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
            className="flex items-center gap-2 px-8 py-4 bg-white/90 hover:bg-white text-slate-900 font-bold text-base rounded-full border-2 border-slate-200 shadow-md hover:border-[#007AFF] hover:text-[#007AFF] hover:shadow-[0_10px_30px_rgba(0,122,255,0.25)] hover:scale-[1.05] active:scale-[0.97] transition-all duration-300"
          >
            <span>Explore All Products</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-slate-500 font-semibold">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Free Plan Included
          </span>
          <span>•</span>
          <span>No Credit Card Required</span>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
