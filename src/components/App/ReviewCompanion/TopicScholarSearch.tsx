// ============================================
// TOPIC SCHOLAR SEARCH - Academic Literature Directory
// Aesthetic: Matches Landing Page Console (Fraunces + Inter + Geist Mono)
// Curated academic search across Google Scholar, ArXiv, Semantic Scholar, PubMed & Wolfram Alpha
// ============================================

import React, { useState } from "react";
import {
  Search,
  ExternalLink,
  BookOpen,
  GraduationCap,
  Globe,
  FileCode,
  BrainCircuit,
  Calculator,
  ArrowRight,
} from "lucide-react";

interface SearchEngine {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
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
      icon: GraduationCap,
      buildUrl: (q) => `https://scholar.google.com/scholar?q=${encodeURIComponent(q)}`,
      tag: "All Disciplines",
      description: "Comprehensive peer-reviewed papers, citations, theses, and book chapters across global publishers.",
    },
    {
      id: "arxiv",
      name: "arXiv Preprints",
      icon: FileCode,
      buildUrl: (q) => `https://arxiv.org/search/?query=${encodeURIComponent(q)}&searchtype=all`,
      tag: "STEM / Physics / AI",
      description: "Open-access scientific preprints across physics, mathematics, computer science, and quantitative biology.",
    },
    {
      id: "semantic-scholar",
      name: "Semantic Scholar",
      icon: BrainCircuit,
      buildUrl: (q) => `https://www.semanticscholar.org/search?q=${encodeURIComponent(q)}`,
      tag: "AI Citation Graph",
      description: "AI-powered academic search identifying influential citations and key methodology extracts.",
    },
    {
      id: "pubmed",
      name: "PubMed (NIH)",
      icon: BookOpen,
      buildUrl: (q) => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(q)}`,
      tag: "Medicine & Life Sciences",
      description: "Biomedical literature from MEDLINE, life science journals, and clinical research repositories.",
    },
    {
      id: "wolfram",
      name: "Wolfram Alpha",
      icon: Calculator,
      buildUrl: (q) => `https://www.wolframalpha.com/input?i=${encodeURIComponent(q)}`,
      tag: "Computational Knowledge",
      description: "Step-by-step calculus derivations, chemical reaction equilibria, physical constants, and dataset queries.",
    },
  ];

  const suggestedQueries = [
    "Transformer Attention Mechanisms",
    "CRISPR-Cas9 Off-Target Effects",
    "Navier-Stokes Smooth Solutions",
    "Stochastic Gradient Descent Convergence",
    "Quantum Error Correction Thresholds",
  ];

  const handleLaunch = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      {/* Console Header & Search Bar Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white font-title flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            Curated Literature & Scholar Search
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
            Launch focused literature queries across peer-reviewed indexes and open preprints directly relevant to your study notes.
          </p>
        </div>

        {/* Search Query Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search topic, paper title, equation, or methodology..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 font-sans"
          />
        </div>

        {/* Suggested Queries */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mr-1">
            Suggested:
          </span>
          {suggestedQueries.map((suggested, idx) => (
            <button
              key={idx}
              onClick={() => setQuery(suggested)}
              className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors border border-slate-200/60 dark:border-slate-750 font-sans"
            >
              {suggested}
            </button>
          ))}
        </div>
      </div>

      {/* Target Search Engines Academic Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {searchEngines.map((engine) => {
          const Icon = engine.icon;
          const activeUrl = engine.buildUrl(query.trim() || "Academic Literature");

          return (
            <div
              key={engine.id}
              onClick={() => handleLaunch(activeUrl)}
              className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center border border-slate-200/80 dark:border-slate-700">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white font-title group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                        {engine.name}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        {engine.tag}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed mt-2">
                  {engine.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                <span>{query.trim() ? `Search "${query.slice(0, 18)}..."` : "Explore directory"}</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TopicScholarSearch;
