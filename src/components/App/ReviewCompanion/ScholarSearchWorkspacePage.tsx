// ============================================
// SCHOLAR SEARCH WORKSPACE PAGE - Deep Academic & Scientific Search
// First-Class Workstation: ArXiv, Semantic Scholar, CrossRef, and Wolfram Alpha
// ============================================

import React from "react";
import { Globe } from "lucide-react";
import TopicScholarSearch from "./TopicScholarSearch";

export const ScholarSearchWorkspacePage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Workspace Header Context */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-title tracking-tight flex items-center gap-2">
                Scholar Literature Search
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20 font-bold uppercase tracking-wider">
                  Deep Discovery
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Query ArXiv Preprints • Semantic Scholar • CrossRef DOIs • Computational Synthesis
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Scholar Search Interface */}
      <TopicScholarSearch />
    </div>
  );
};

export default ScholarSearchWorkspacePage;
