// ============================================
// TOPIC SCHOLAR SEARCH - External Research & Literature Finder
// Curated academic search across Google Scholar, ArXiv, Semantic Scholar & PubMed
// ============================================

import React, { useState } from "react";
import {
  Search,
  ExternalLink,
  BookOpen,
  GraduationCap,
  Globe,
  Sparkles,
  Calculator,
} from "lucide-react";

interface SearchEngine {
  id: string;
  name: string;
  icon: string;
  buildUrl: (q: string) => string;
  tag: string;
  description: string;
}

export const TopicScholarSearch: React.FC = () => {
  const [query, setQuery] = useState("");

  const searchEngines: SearchEngine[] = [
    {
      id: "google-scholar",
      name: "Google Scholar",
      icon: "🎓",
      buildUrl: (q) => `https://scholar.google.com/scholar?q=${encodeURIComponent(q)}`,
      tag: "All Disciplines",
      description: "Comprehensive peer-reviewed papers, citations, theses, and book chapters.",
    },
    {
      id: "arxiv",
      name: "arXiv Preprints",
      icon: "⚛️",
      buildUrl: (q) => `https://arxiv.org/search/?query=${encodeURIComponent(q)}&searchtype=all`,
      tag: "STEM / Physics / AI",
      description: "Open-access scientific preprints across physics, math, computer science, and quantitative biology.",
    },
    {
      id: "semantic-scholar",
      name: "Semantic Scholar",
      icon: "🧠",
      buildUrl: (q) => `https://www.semanticscholar.org/search?q=${encodeURIComponent(q)}`,
      tag: "AI Citation Graph",
      description: "AI-powered academic search identifying influential citations and key methodology extracts.",
    },
    {
      id: "pubmed",
      name: "PubMed (NIH)",
      icon: "🧬",
      buildUrl: (q) => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(q)}`,
      tag: "Medicine & Biology",
      description: "Biomedical literature from MEDLINE, life science journals, and online books.",
    },
    {
      id: "wolfram",
      name: "Wolfram Alpha",
      icon: "➗",
      buildUrl: (q) => `https://www.wolframalpha.com/input?i=${encodeURIComponent(q)}`,
      tag: "Computational Math",
      description: "Step-by-step calculus solutions, chemical reactions, physical constants, and data.",
    },
  ];

  const suggestedQueries = [
    "Transformer Attention Mechanisms",
    "CRISPR-Cas9 Off-Target Effects",
    "Navier-Stokes Smooth Solutions",
    "Stochastic Gradient Descent Convergence",
    "CRISPR Gene Therapy Clinical Trials",
    "Quantum Error Correction Thresholds",
  ];

  const handleLaunch = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      {/* Header & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white font-title flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Curated Literature & Scholar Search
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
            Search peer-reviewed papers, open-access preprints, and computational references directly related to your study materials.
          </p>
        </div>

        {/* Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search topic, paper title, equation, or methodology..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
          />
        </div>

        {/* Suggested Queries */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mr-1">
            Suggested:
          </span>
          {suggestedQueries.map((suggested, idx) => (
            <button
              key={idx}
              onClick={() => setQuery(suggested)}
              className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors border border-slate-200/60 dark:border-slate-700/60"
            >
              {suggested}
            </button>
          ))}
        </div>
      </div>

      {/* Target Search Engines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {searchEngines.map((engine) => {
          const activeUrl = engine.buildUrl(query.trim() || "Academic Literature");

          return (
            <div
              key={engine.id}
              onClick={() => handleLaunch(activeUrl)}
              className="group bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-xl p-5 shadow-xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{engine.icon}</span>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white font-title group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {engine.name}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        {engine.tag}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans leading-relaxed mt-2">
                  {engine.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                <span>Open in {engine.name}</span>
                <span>→</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TopicScholarSearch;
