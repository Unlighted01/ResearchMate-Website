// ============================================
// REVIEW COMPANION PAGE - Master Study & Exam Suite
// Aesthetic: Matches Landing Page Console (Fraunces + Inter + Geist Mono)
// Compiles Materials Ingestion, Camera Math OCR, Mock Exams, Flashcards & Scholar Search
// ============================================

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BrainCircuit,
  Upload,
  Award,
  BookOpen,
  Globe,
  Sparkles,
  FileText,
  Camera,
  Trash2,
  Calendar,
  Layers,
} from "lucide-react";
import { getAllItems, deleteItem, StorageItem } from "../../../services/storageService";

import ReviewMaterialsUploader from "./ReviewMaterialsUploader";
import MockExamEngine from "./MockExamEngine";
import FlashcardsDeck from "./FlashcardsDeck";
import TopicScholarSearch from "./TopicScholarSearch";

interface ReviewCompanionProps {
  useToast: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
  };
}

type TabType = "materials" | "exams" | "flashcards" | "search";

export const ReviewCompanionPage: React.FC<ReviewCompanionProps> = ({ useToast }) => {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabType) || "materials";
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [materials, setMaterials] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMaterials = async () => {
    try {
      const all = await getAllItems();
      setMaterials(all);
    } catch (err) {
      console.error("Failed to load materials:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabType;
    if (tabParam && ["materials", "exams", "flashcards", "search"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteItem(id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      showToast("Review material removed", "info");
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; tag: string }[] = [
    {
      id: "materials",
      label: "Materials & OCR Ingest",
      icon: Upload,
      tag: "PDF, Word, Live Math OCR",
    },
    {
      id: "exams",
      label: "Mock Exams & Stats",
      icon: Award,
      tag: "Automated Practice & Diagnostics",
    },
    {
      id: "flashcards",
      label: "Active Recall",
      icon: BookOpen,
      tag: "Self-Testing Concept Decks",
    },
    {
      id: "search",
      label: "Literature Search",
      icon: Globe,
      tag: "Scholar, ArXiv & Wolfram",
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
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-title tracking-tight">
                Study & Review Companion
              </h1>
              <p className="text-xs text-slate-500 font-mono">
                Ingest Notes • Camera Math OCR • AI Mock Exams • Active Recall
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

        {/* Sub-header Context Bar */}
        <div className="px-6 py-2.5 bg-slate-50/30 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span>Active Module:</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">
              {tabs.find((t) => t.id === activeTab)?.label}
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <span className="hidden sm:inline text-slate-500">
              {tabs.find((t) => t.id === activeTab)?.tag}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">
              Grounding Corpus: <strong className="text-slate-800 dark:text-slate-200 font-medium">{materials.length} material(s)</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Tab 1: Materials & Ingest */}
      {activeTab === "materials" && (
        <div className="space-y-6">
          <ReviewMaterialsUploader
            onMaterialUploaded={loadMaterials}
            showToast={showToast}
          />

          {/* Uploaded Materials Shelf */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-title flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-500" />
                  Ingested Grounding Corpus ({materials.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
                  These materials are indexed and fed into mock exam generation, flashcard synthesis, and AI answering.
                </p>
              </div>

              <div className="text-[11px] font-mono text-slate-400">
                PDFs, Word docs & STEM derivations
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs font-mono text-slate-400">
                Indexing study materials...
              </div>
            ) : materials.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <FileText className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
                <p className="text-xs font-sans text-slate-500">
                  No materials uploaded yet. Ingest lecture PDFs, Word notes, or camera math formulas using the console above.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {materials.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between shadow-2xs group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-750">
                          {item.tags?.includes("pdf")
                            ? "PDF Document"
                            : item.tags?.includes("word-doc")
                            ? "Word Document"
                            : item.deviceSource === "mobile_scanner" || item.tags?.includes("camera-capture")
                            ? "Camera OCR"
                            : item.tags?.includes("image-scan")
                            ? "Visual Note"
                            : "Study Note"}
                        </span>
                        <button
                          onClick={(e) => handleDeleteItem(item.id, e)}
                          className="text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded transition-colors"
                          title="Remove material"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-title truncate">
                        {item.sourceTitle || "Untitled Document"}
                      </h4>

                      <p className="text-xs text-slate-600 dark:text-slate-400 font-sans line-clamp-3 leading-relaxed mt-1.5">
                        {item.aiSummary || item.text || "No summary available"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                      <span>{new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      <span>{item.ocrText ? "LaTeX Derivation" : `${(item.text || "").length.toLocaleString()} chars`}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Mock Exams */}
      {activeTab === "exams" && (
        <MockExamEngine
          items={materials}
          showToast={showToast}
        />
      )}

      {/* Tab 3: Flashcards */}
      {activeTab === "flashcards" && (
        <FlashcardsDeck
          items={materials}
          showToast={showToast}
        />
      )}

      {/* Tab 4: Topic & Scholar Search */}
      {activeTab === "search" && (
        <TopicScholarSearch />
      )}
    </div>
  );
};

export default ReviewCompanionPage;
