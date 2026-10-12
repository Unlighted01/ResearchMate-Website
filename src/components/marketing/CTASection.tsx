import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const CTASection: React.FC = () => {
  return (
    <section className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 p-8 sm:p-14 lg:p-16 text-center max-w-5xl mx-auto shadow-sm">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-title font-semibold tracking-tight text-white mb-5 leading-tight max-w-[24ch] mx-auto">
          Start your literature review on a canvas built for focus.
        </h2>

        <p className="text-base sm:text-lg text-slate-300 font-sans max-w-[55ch] mx-auto mb-10 leading-relaxed">
          Join thousands of researchers, PhD candidates, and students synthesizing literature without fragmented tools.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <Link
            to="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-lg bg-white text-slate-950 font-medium text-sm hover:bg-slate-100 active:scale-[0.98] transition-all shadow-sm"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-slate-800/80 text-slate-200 font-medium text-sm border border-slate-700 hover:bg-slate-800 active:scale-[0.98] transition-all"
          >
            <span>Sign In to Existing Workspace</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Free Core Tier
          </span>
          <span>•</span>
          <span>No Credit Card Required</span>
          <span>•</span>
          <span>Full Export Rights</span>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
