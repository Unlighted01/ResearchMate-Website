// ============================================
// LiteratureMatrixPage.tsx - Flagship Option A Workstation
// Multi-Paper Comparative Synthesis Matrix
// ============================================

import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Table2,
  Sparkles,
  ArrowRight,
  Download,
  Copy,
  Check,
  FileEdit,
  Upload,
  BookOpen,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { getAllItems, StorageItem } from "../../../services/storageService";
import { generateLiteratureMatrix, MatrixRow } from "../../../services/geminiService";

interface LiteratureMatrixPageProps {
  useToast?: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
  };
}

const LiteratureMatrixPage: React.FC<LiteratureMatrixPageProps> = ({ useToast }) => {
  const { showToast } = useToast ? useToast() : { showToast: () => {} };
  const navigate = useNavigate();

  const [items, setItems] = useState<StorageItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const [matrixData, setMatrixData] = useState<MatrixRow[]>([]);
  const [crossPaperGaps, setCrossPaperGaps] = useState<string[]>([]);
  const [synthesisDraft, setSynthesisDraft] = useState<string>("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load items on mount
  useEffect(() => {
    const load = async () => {
      setLoadingItems(true);
      try {
        const loaded = await getAllItems();
        setItems(loaded);
        // Pre-select first 3 items by default if none selected
        if (loaded.length >= 2) {
          setSelectedIds(new Set(loaded.slice(0, 3).map((i) => i.id)));
        }
      } catch (err) {
        showToast("Failed to load library items", "error");
      } finally {
        setLoadingItems(false);
      }
    };
    load();
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.sourceTitle?.toLowerCase().includes(q) ||
        item.text?.toLowerCase().includes(q) ||
        item.tags?.some((t) => t.toLowerCase().includes(q)),
    );
  }, [items, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredItems.map((i) => i.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleSynthesize = async () => {
    const selectedList = items.filter((i) => selectedIds.has(i.id));
    if (selectedList.length < 2) {
      showToast("Please select at least 2 papers to compare methodologies.", "info");
      return;
    }

    setIsSynthesizing(true);
    try {
      const res = await generateLiteratureMatrix(selectedList);
      if (!res.ok) {
        throw new Error(res.error || "Failed to generate synthesis matrix.");
      }
      setMatrixData(res.matrix);
      setCrossPaperGaps(res.crossPaperGaps);
      setSynthesisDraft(res.synthesisDraft);
      showToast("Literature matrix synthesized successfully!", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Synthesis failed", "error");
    } finally {
      setIsSynthesizing(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast("Copied to clipboard!", "success");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const exportCSV = () => {
    if (matrixData.length === 0) return;
    const headers = [
      "Paper Title",
      "Authors / Year",
      "Methodology",
      "Datasets & Benchmarks",
      "Key Findings",
      "Identified Gaps",
    ];
    const rows = matrixData.map((r) => [
      `"${r.paperTitle.replace(/"/g, '""')}"`,
      `"${r.authorsAndYear.replace(/"/g, '""')}"`,
      `"${r.methodology.replace(/"/g, '""')}"`,
      `"${r.datasetsOrBenchmarks.replace(/"/g, '""')}"`,
      `"${r.keyFindings.replace(/"/g, '""')}"`,
      `"${r.identifiedGaps.replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "literature_review_matrix.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV matrix downloaded!", "success");
  };

  const exportLaTeXTable = () => {
    if (matrixData.length === 0) return;
    const latex = `\\begin{table*}[t]
\\centering
\\small
\\caption{Comparative Literature Review Matrix}
\\label{tab:lit_matrix}
\\begin{tabular}{p{2.5cm} p{2cm} p{3cm} p{3cm} p{3.5cm} p{3cm}}
\\hline
\\textbf{Paper} & \\textbf{Year} & \\textbf{Methodology} & \\textbf{Benchmarks} & \\textbf{Key Findings} & \\textbf{Gaps} \\\\
\\hline
${matrixData
  .map(
    (r) =>
      `${r.paperTitle.slice(0, 30)} & ${r.authorsAndYear} & ${r.methodology.slice(0, 50)} & ${r.datasetsOrBenchmarks.slice(0, 40)} & ${r.keyFindings.slice(0, 50)} & ${r.identifiedGaps.slice(0, 40)} \\\\`,
  )
  .join("\n")}
\\hline
\\end{tabular}
\\end{table*}`;
    copyToClipboard(latex, "latex");
  };

  const handleSendToEditor = () => {
    if (!synthesisDraft) return;
    localStorage.setItem("rm_matrix_to_editor", synthesisDraft);
    navigate("/app/editor");
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-mono text-xs uppercase tracking-wider mb-2">
            <Table2 className="w-4 h-4" />
            <span>Academic Synthesis Engine // Option A</span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight"
            style={{ fontFamily: "var(--font-title, 'Fraunces', Georgia, serif)" }}
          >
            Literature Review Matrix
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-[70ch] leading-relaxed">
            Synthesize methodologies, benchmark datasets, empirical findings, and cross-paper research gaps across your library into a publication-ready comparative matrix.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSynthesize}
            disabled={isSynthesizing || selectedIds.size < 2}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSynthesizing ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Synthesizing Matrix...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-400 dark:text-indigo-600" />
                <span>Generate Matrix ({selectedIds.size} Papers)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Top Split: Paper Selection Drawer */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-title">
              Select Papers to Compare
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
              {selectedIds.size} / {items.length} selected
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-48"
            />
            <button
              onClick={selectedIds.size === filteredItems.length ? deselectAll : selectAll}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors whitespace-nowrap"
            >
              {selectedIds.size === filteredItems.length ? "Deselect All" : "Select All"}
            </button>
          </div>
        </div>

        {loadingItems ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading library papers...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No papers found. Ingest papers in PDF Reader or import items first.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
            {filteredItems.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800 text-slate-900 dark:text-slate-100"
                      : "bg-slate-50/50 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  <div className="mt-0.5 text-indigo-600 dark:text-indigo-400 shrink-0">
                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{item.sourceTitle || "Untitled Paper"}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {item.ocrText?.slice(0, 60) || item.text?.slice(0, 60) || "No preview"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Synthesis Output Area */}
      {matrixData.length > 0 && (
        <div className="space-y-6">
          {/* Actions & Export Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Comparative synthesis ready ({matrixData.length} records)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={exportLaTeXTable}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedKey === "latex" ? "Copied!" : "LaTeX Table"}</span>
              </button>

              {synthesisDraft && (
                <button
                  onClick={handleSendToEditor}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-xs"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Send to Manuscript Editor</span>
                </button>
              )}
            </div>
          </div>

          {/* Matrix Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    <th className="py-3 px-4 font-semibold w-48">Paper & Citation</th>
                    <th className="py-3 px-4 font-semibold w-44">Methodology</th>
                    <th className="py-3 px-4 font-semibold w-44">Benchmarks & Datasets</th>
                    <th className="py-3 px-4 font-semibold">Key Empirical Findings</th>
                    <th className="py-3 px-4 font-semibold w-48 text-rose-600 dark:text-rose-400">
                      Identified Gaps
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 leading-relaxed font-sans text-slate-700 dark:text-slate-300">
                  {matrixData.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors align-top"
                    >
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 font-title text-sm">
                          {row.paperTitle}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {row.authorsAndYear}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-indigo-700 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/10">
                        {row.methodology}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {row.datasetsOrBenchmarks}
                      </td>
                      <td className="py-3.5 px-4">
                        {row.keyFindings}
                      </td>
                      <td className="py-3.5 px-4 text-rose-700 dark:text-rose-300/90 bg-rose-50/20 dark:bg-rose-950/10 text-[11px]">
                        {row.identifiedGaps}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cross-Paper Research Gaps & Related Work Draft Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gaps Synthesis */}
            {crossPaperGaps.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-title font-semibold text-base mb-3">
                  <AlertCircle className="w-5 h-5" />
                  <h3>Cross-Paper Research Gaps</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4 font-sans">
                  Systemic voids and conflicting conclusions detected across the selected literature:
                </p>
                <div className="space-y-2.5">
                  {crossPaperGaps.map((gap, gIdx) => (
                    <div
                      key={gIdx}
                      className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/40 dark:border-rose-900/40 text-xs text-rose-900 dark:text-rose-200 leading-relaxed font-sans"
                    >
                      <span className="font-mono text-rose-500 font-semibold mt-0.5">#{gIdx + 1}</span>
                      <span>{gap}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Synthesis Draft */}
            {synthesisDraft && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-title font-semibold text-base">
                      <FileEdit className="w-5 h-5" />
                      <h3>Synthesized Related Work Draft</h3>
                    </div>
                    <button
                      onClick={() => copyToClipboard(synthesisDraft, "draft")}
                      className="text-xs inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedKey === "draft" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans border border-slate-200/60 dark:border-slate-800/60 max-h-72 overflow-y-auto whitespace-pre-wrap">
                    {synthesisDraft}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={handleSendToEditor}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
                  >
                    <span>Insert into Manuscript Editor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty Initial Prompt */}
      {matrixData.length === 0 && !isSynthesizing && (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-200/50 dark:border-indigo-800/50">
            <Table2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-title font-semibold text-slate-900 dark:text-slate-100 mb-2">
            No Matrix Generated Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed font-sans">
            Select 2 or more research papers from the selector above and click "Generate Matrix". The AI will read the methodologies, benchmarks, and findings across all papers to populate your synthesis table.
          </p>
          <button
            onClick={handleSynthesize}
            disabled={selectedIds.size < 2}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all shadow-xs disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Literature Matrix ({selectedIds.size} Papers)</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default LiteratureMatrixPage;
