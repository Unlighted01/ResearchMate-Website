// ============================================
// RESEARCH & THESIS HUB - Precision Academic Workstation
// Aesthetic: Matches Landing Page Console (Fraunces + Inter + Geist Mono)
// ============================================

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Table2,
  FileEdit,
  FileText,
  Quote,
  BookOpen,
  Sparkles,
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

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; tag: string }[] = [
    {
      id: "matrix",
      label: "Literature Matrix",
      icon: Table2,
      tag: "5-Column Comparative Synthesis",
    },
    {
      id: "editor",
      label: "Manuscript Editor",
      icon: FileEdit,
      tag: "LaTeX & Cited Prose",
    },
    {
      id: "citations",
      label: "Citations & BibTeX",
      icon: Quote,
      tag: "APA, IEEE, MLA & BibTeX",
    },
    {
      id: "pdf",
      label: "PDF Reader & Ingest",
      icon: BookOpen,
      tag: "Paper Annotation",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Precision Academic Console Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Console Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-900/60">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-title tracking-tight">
                Document & Writing Studio
              </h1>
              <p className="text-xs text-slate-500 font-mono">
                Manuscript Editor • Citations • PDF Reader • Comparative Matrix
              </p>
            </div>
          </div>

          {/* Linear-style Segmented Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium border border-slate-200/80 dark:border-slate-700 overflow-x-auto scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-2xs font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-header context indicator */}
        <div className="px-6 py-2.5 bg-slate-50/30 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Active Mode: <strong className="text-slate-700 dark:text-slate-200 font-medium">{tabs.find((t) => t.id === activeTab)?.label}</strong></span>
          <span className="hidden sm:inline text-[11px] text-slate-500">{tabs.find((t) => t.id === activeTab)?.tag}</span>
        </div>
      </div>

      {/* Active Workstation Body */}
      <div className="transition-opacity duration-150">
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
