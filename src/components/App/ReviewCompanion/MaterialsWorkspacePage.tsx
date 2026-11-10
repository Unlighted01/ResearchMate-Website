// ============================================
// MATERIALS WORKSPACE PAGE - Dedicated Ingestion & Grounding Corpus
// First-Class Workstation: PDF, Word, Smart Pen, and Camera Math OCR
// ============================================

import React, { useState, useEffect } from "react";
import { Upload, Layers, Trash2, FileText } from "lucide-react";
import { getAllItems, deleteItem, StorageItem } from "../../../services/storageService";
import ReviewMaterialsUploader from "./ReviewMaterialsUploader";

interface MaterialsWorkspacePageProps {
  useToast: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
  };
}

export const MaterialsWorkspacePage: React.FC<MaterialsWorkspacePageProps> = ({ useToast }) => {
  const { showToast } = useToast();
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Workspace Header Context */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-title tracking-tight flex items-center gap-2">
                Materials & OCR Ingest
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 font-bold uppercase tracking-wider">
                  Corpus Hub
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Ingest Lecture PDFs • Word Notes • Camera Math OCR • Smart Pen Captures
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Total Ingested: <strong className="text-slate-900 dark:text-slate-100">{materials.length} material(s)</strong></span>
          </div>
        </div>
      </div>

      {/* Main Uploader Form */}
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
              These materials feed into mock exam generation, flashcard synthesis, and AI answering.
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
              No materials uploaded yet. Ingest lecture PDFs, Word notes, or camera math formulas using the dropzone above.
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
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
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
  );
};

export default MaterialsWorkspacePage;
