import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Table as TableIcon,
  Sparkles,
  Download,
  FileSpreadsheet,
  FileText,
  Code2,
  Copy,
  Check,
  ArrowRight,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { MatrixRow } from "../../../services/geminiService";
import { useNavigate } from "react-router-dom";

interface LiteratureMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  matrix: MatrixRow[];
  crossPaperGaps: string[];
  synthesisDraft: string;
  isLoading?: boolean;
}

export const LiteratureMatrixModal: React.FC<LiteratureMatrixModalProps> = ({
  isOpen,
  onClose,
  matrix,
  crossPaperGaps,
  synthesisDraft,
  isLoading = false,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"matrix" | "gaps" | "draft">("matrix");
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [copiedLatex, setCopiedLatex] = useState(false);

  if (!isOpen) return null;

  // ── Export Matrix to CSV ──────────────────────────────────────────
  const exportToCSV = () => {
    if (!matrix.length) return;
    const headers = ["Paper Title", "Authors & Year", "Methodology", "Dataset / Domain", "Key Findings", "Limitations & Gaps"];
    const rows = matrix.map((row) => [
      `"${(row.title || "").replace(/"/g, '""')}"`,
      `"${(row.authorsYear || "").replace(/"/g, '""')}"`,
      `"${(row.methodology || "").replace(/"/g, '""')}"`,
      `"${(row.dataset || "").replace(/"/g, '""')}"`,
      `"${(row.keyFindings || "").replace(/"/g, '""')}"`,
      `"${(row.limitations || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `literature_matrix_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Export Matrix to LaTeX Table ──────────────────────────────────
  const exportToLatexTable = async () => {
    if (!matrix.length) return;
    const latex = `\\begin{table*}[t]
\\centering
\\small
\\caption{Comparative Literature Review Matrix}
\\label{tab:lit-matrix}
\\begin{tabular}{p{3.5cm} p{3cm} p{2.5cm} p{3.5cm} p{3cm}}
\\hline
\\textbf{Paper / Reference} & \\textbf{Methodology} & \\textbf{Dataset / Domain} & \\textbf{Key Findings} & \\textbf{Limitations \\& Gaps} \\\\
\\hline
${matrix
  .map(
    (r) =>
      `${(r.title || "").replace(/[&%$#_{}]/g, "\\$&")} (${(r.authorsYear || "n.d.").replace(/[&%$#_{}]/g, "\\$&")}) & ` +
      `${(r.methodology || "").replace(/[&%$#_{}]/g, "\\$&")} & ` +
      `${(r.dataset || "").replace(/[&%$#_{}]/g, "\\$&")} & ` +
      `${(r.keyFindings || "").replace(/[&%$#_{}]/g, "\\$&")} & ` +
      `${(r.limitations || "").replace(/[&%$#_{}]/g, "\\$&")} \\\\`
  )
  .join("\n\\hline\n")}
\\hline
\\end{tabular}
\\end{table*}`;

    await navigator.clipboard.writeText(latex);
    setCopiedLatex(true);
    setTimeout(() => setCopiedLatex(false), 2000);
  };

  // ── Bridge: Send to TipTap Editor ─────────────────────────────────
  const handleLoadIntoEditor = () => {
    sessionStorage.setItem(
      "rm_matrix_to_editor",
      JSON.stringify({
        title: "Literature Review & Comparative Synthesis",
        draft: synthesisDraft,
      })
    );
    onClose();
    navigate("/app/editor");
  };

  const handleCopyDraft = async () => {
    if (!synthesisDraft) return;
    await navigator.clipboard.writeText(synthesisDraft);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-7xl h-[92vh] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200/40 dark:border-indigo-800/40">
                <TableIcon className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    className="text-lg font-bold text-slate-900 dark:text-slate-100"
                    style={{ fontFamily: "var(--font-title, 'Fraunces', serif)" }}
                  >
                    Automated Literature Review Matrix
                  </h2>
                  <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100/60 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium">
                    Option A
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {matrix.length} {matrix.length === 1 ? "paper" : "papers"} analyzed across methodologies, datasets, findings, and research gaps.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Bridge to Editor */}
              {synthesisDraft && (
                <button
                  type="button"
                  onClick={handleLoadIntoEditor}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Draft Related Work in Editor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Subheader / Tabs & Export Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 border-b border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
            {/* View Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab("matrix")}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeTab === "matrix"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Comparative Matrix ({matrix.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("gaps")}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeTab === "gaps"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Cross-Paper Gaps ({crossPaperGaps.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("draft")}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeTab === "draft"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Manuscript Draft
              </button>
            </div>

            {/* Quick Export Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportToCSV}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md transition-colors"
                title="Export as CSV spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={exportToLatexTable}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md transition-colors"
                title="Copy LaTeX table code"
              >
                {copiedLatex ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Code2 className="w-3.5 h-3.5 text-indigo-500" />}
                <span>{copiedLatex ? "LaTeX Copied" : "Copy LaTeX Table"}</span>
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-950/20">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm font-medium">Synthesizing comparative literature matrix...</p>
                <p className="text-xs text-slate-400 font-mono">Comparing theoretical approaches, benchmark datasets, and open gaps</p>
              </div>
            ) : matrix.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
                <AlertCircle className="w-10 h-10 opacity-40" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No matrix generated yet.</p>
                <p className="text-xs">Select 2 or more research items on your dashboard to compare.</p>
              </div>
            ) : activeTab === "matrix" ? (
              /* TAB 1: COMPARATIVE MATRIX TABLE */
              <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold font-mono uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 w-[220px]">Paper / Reference</th>
                      <th className="py-3 px-4 w-[200px]">Methodology</th>
                      <th className="py-3 px-4 w-[160px]">Dataset / Domain</th>
                      <th className="py-3 px-4 w-[240px]">Key Findings & Metrics</th>
                      <th className="py-3 px-4 w-[220px]">Limitations & Gaps</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                    {matrix.map((row, idx) => (
                      <tr
                        key={row.id || idx}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors align-top"
                      >
                        {/* Title & Author */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                            {row.title}
                          </p>
                          <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                            {row.authorsYear || "Author n.d."}
                          </p>
                        </td>

                        {/* Methodology */}
                        <td className="py-3.5 px-4 leading-relaxed">
                          {row.methodology || "—"}
                        </td>

                        {/* Dataset */}
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                            {row.dataset || "Unspecified"}
                          </span>
                        </td>

                        {/* Key Findings */}
                        <td className="py-3.5 px-4 leading-relaxed font-sans">
                          {row.keyFindings || "—"}
                        </td>

                        {/* Limitations */}
                        <td className="py-3.5 px-4 leading-relaxed text-amber-900/90 dark:text-amber-200/80">
                          {row.limitations || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : activeTab === "gaps" ? (
              /* TAB 2: CROSS-PAPER GAPS */
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-900 dark:text-amber-200">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Cross-Paper Synthesis & Research Gaps</span>
                  </h3>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1">
                    Unresolved tensions, methodological limits, and opportunities identified across the analyzed corpus:
                  </p>
                </div>

                <div className="grid gap-3">
                  {crossPaperGaps.map((gap, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3 shadow-xs"
                    >
                      <span className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                        {gap}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* TAB 3: SYNTHESIZED MANUSCRIPT DRAFT */
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <h3
                      className="text-base font-bold text-slate-900 dark:text-slate-100"
                      style={{ fontFamily: "var(--font-title, 'Fraunces', serif)" }}
                    >
                      Related Work & Literature Review Section
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Synthesized academic narrative formatted with in-text citation markers.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyDraft}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      {copiedDraft ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedDraft ? "Copied" : "Copy Draft"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadIntoEditor}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Open in TipTap Editor</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-xs">
                  {synthesisDraft ? (
                    synthesisDraft.split("\n\n").map((para, i) => (
                      <p key={i} className="text-sm text-slate-800 dark:text-slate-250 leading-relaxed font-sans">
                        {para}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No draft generated.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-6 py-3 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between text-xs text-slate-500">
            <span className="font-mono">
              ResearchMate Academic Engine • Pivot Options A & B
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Close Matrix
              </button>
              {synthesisDraft && (
                <button
                  type="button"
                  onClick={handleLoadIntoEditor}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-xs transition-colors"
                >
                  Load into TipTap Editor
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default LiteratureMatrixModal;
