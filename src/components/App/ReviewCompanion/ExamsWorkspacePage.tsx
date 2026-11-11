// ============================================
// EXAMS WORKSPACE PAGE - Dedicated Mock Exam Simulator & Test Bank
// First-Class Workstation: Seeded Shuffling, Timer Pacing, and Diagnostics
// ============================================

import React, { useState, useEffect } from "react";
import { Award, Sparkles, Layers } from "lucide-react";
import { getAllItems, StorageItem } from "../../../services/storageService";
import MockExamEngine from "./MockExamEngine";

interface ExamsWorkspacePageProps {
  useToast: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
  };
}

export const ExamsWorkspacePage: React.FC<ExamsWorkspacePageProps> = ({ useToast }) => {
  const { showToast } = useToast();
  const [materials, setMaterials] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const all = await getAllItems();
        setMaterials(all);
      } catch (err) {
        console.error("Failed to load grounding materials:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Workspace Header Context */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-title tracking-tight flex items-center gap-2">
                Mock Exam Simulator
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold uppercase tracking-wider">
                  Board Grade
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Deterministic Seeded Shuffling • Anti-Leak Enemy Filtering • OMR Sheet Planning
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Grounding Corpus: <strong className="text-slate-900 dark:text-slate-100">{materials.length} material(s)</strong></span>
          </div>
        </div>
      </div>

      {/* Main Mock Exam Simulator */}
      <MockExamEngine
        items={materials}
        showToast={showToast}
      />
    </div>
  );
};

export default ExamsWorkspacePage;
