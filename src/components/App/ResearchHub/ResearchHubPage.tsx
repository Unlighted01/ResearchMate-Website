// ============================================
// RESEARCH & THESIS HUB - Unified Academic Suite
// Compiles Literature Matrix, Manuscript Editor, Citations & PDF Reader
// ============================================

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Table2,
  FileEdit,
  Quote,
  BookOpen,
  GraduationCap,
} from "lucide-react";

import LiteratureMatrixPage from "../LiteratureMatrix/LiteratureMatrixPage";
import DocumentEditor from "../DocumentEditor";
import { CitationGenerator } from "../Citations";
import PdfReader from "../PdfReader";

interface ResearchHubProps {
  useToast: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
  };
}

type TabType = "matrix" | "editor" | "citations" | "pdf";

const ResearchHubPage: React.FC<ResearchHubProps> = ({ useToast }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabType) || "matrix";
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabType;
    if (tabParam && ["matrix", "editor", "citations", "pdf"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
    {
      id: "matrix",
      label: "Literature Review Matrix",
      icon: Table2,
      description: "Synthesize papers side-by-side across methodology, benchmarks, findings, and research gaps.",
    },
    {
      id: "editor",
      label: "Manuscript Editor",
      icon: FileEdit,
      description: "Distraction-free academic writing with live KaTeX math and integrated citations.",
    },
    {
      id: "citations",
      label: "Citations & BibTeX",
      icon: Quote,
      description: "Generate BibTeX, APA, IEEE, and MLA references directly for your thesis.",
    },
    {
      id: "pdf",
      label: "PDF Reader & Ingest",
      icon: BookOpen,
      description: "High-fidelity in-browser PDF reader for papers, lab manuals, and preprints.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <GraduationCap className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white font-title tracking-tight">
                Research & Thesis Suite
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
              Unified workspace for literature reviews, paper drafting, reference citations, and PDF reading.
            </p>
          </div>

          <div className="text-xs font-mono text-slate-400">
            Active: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{tabs.find((t) => t.id === activeTab)?.label}</span>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all ${
                  isActive
                    ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 shadow-xs"
                    : "bg-slate-50/60 dark:bg-slate-850/40 border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-200 dark:bg-slate-750 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate font-title">
                    {tab.label}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {tab.id === "matrix" ? "5-Column Comparison" : tab.id === "editor" ? "LaTeX & Markdown" : tab.id === "citations" ? "BibTeX, APA, IEEE" : "Annotate & Read"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab View */}
      <div className="transition-opacity duration-200">
        {activeTab === "matrix" && (
          <LiteratureMatrixPage useToast={useToast} />
        )}
        {activeTab === "editor" && (
          <DocumentEditor />
        )}
        {activeTab === "citations" && (
          <CitationGenerator />
        )}
        {activeTab === "pdf" && (
          <PdfReader />
        )}
      </div>
    </div>
  );
};

export default ResearchHubPage;
