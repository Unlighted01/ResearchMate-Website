// ============================================
// REVIEW COMPANION PAGE - Master Study & Exam Suite
// Compiles Materials Ingestion, Mock Exams, Flashcards & Scholar Search
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
      showToast("Material removed", "info");
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; tag: string }[] = [
    {
      id: "materials",
      label: "Materials & Camera Ingest",
      icon: Upload,
      tag: "PDF, Word, Math OCR",
    },
    {
      id: "exams",
      label: "Mock Exams & Stats",
      icon: Award,
      tag: "Practice Tests & Grading",
    },
    {
      id: "flashcards",
      label: "Active Recall Flashcards",
      icon: BookOpen,
      tag: "Self-Testing Decks",
    },
    {
      id: "search",
      label: "Literature & Topic Search",
      icon: Globe,
      tag: "Scholar & ArXiv",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white font-title tracking-tight">
                Study & Review Companion
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                NotebookLM Model
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
              Personal AI tutor: Ingest PDFs, Word notes, and camera math formulas, take AI mock exams, and test retention with flashcards.
            </p>
          </div>

          <div className="text-xs font-mono text-slate-400">
            Active: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{tabs.find((t) => t.id === activeTab)?.label}</span>
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
                    ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 shadow-xs"
                    : "bg-slate-50/60 dark:bg-slate-850/40 border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 dark:bg-slate-750 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate font-title">
                    {tab.label}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-mono">
                    {tab.tag}
                  </div>
                </div>
              </button>
            );
          })}
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-title">
                Review Materials & Notes ({materials.length})
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Grounding source for mock exams & AI tutor
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs font-mono text-slate-400">
                Loading study materials...
              </div>
            ) : materials.length === 0 ? (
              <div className="py-10 text-center text-slate-400 space-y-2">
                <FileText className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs">No materials uploaded yet. Use the upload boxes above to add PDFs, Word docs, or camera equations.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {materials.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {item.deviceSource || "upload"}
                        </span>
                        <button
                          onClick={(e) => handleDeleteItem(item.id, e)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded"
                          title="Delete material"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-title truncate">
                        {item.sourceTitle || "Untitled Note"}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans line-clamp-2 mt-1">
                        {item.aiSummary || item.text || "No preview"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2.5 mt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      <span>{item.ocrText ? "Math Formula" : `${(item.text || "").length} chars`}</span>
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
