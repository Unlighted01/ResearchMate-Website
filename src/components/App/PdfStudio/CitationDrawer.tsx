// ============================================
// CITATION DRAWER & BIBLIOGRAPHY MANAGER
// In-context reference manager with 1-click style formatting
// and direct insertion into Studio notes
// ============================================

import React, { useState } from "react";
import {
  Quote,
  Copy,
  Check,
  Download,
  Plus,
  Trash2,
  ExternalLink,
  BookMarked,
  X,
  FileCode,
  FileText,
} from "lucide-react";
import {
  CitationMetadata,
  CitationStyle,
  formatCitation,
  formatInTextCitation,
  formatBibTeX,
  parseAuthors,
} from "../../../services/citationService";

interface CitationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  citations: CitationMetadata[];
  onAddCitation: (citation: CitationMetadata) => void;
  onRemoveCitation: (id: string) => void;
  onInsertIntoNotes?: (inTextCitation: string, referenceText: string) => void;
  activeDocumentTitle?: string;
}

export const CitationDrawer: React.FC<CitationDrawerProps> = ({
  isOpen,
  onClose,
  citations,
  onAddCitation,
  onRemoveCitation,
  onInsertIntoNotes,
  activeDocumentTitle,
}) => {
  const [style, setStyle] = useState<CitationStyle>("apa7");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedInTextId, setCopiedInTextId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Manual Form State
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthors, setManualAuthors] = useState("");
  const [manualYear, setManualYear] = useState("");
  const [manualSource, setManualSource] = useState("");
  const [manualDoi, setManualDoi] = useState("");
  const [manualUrl, setManualUrl] = useState("");

  if (!isOpen) return null;

  const handleCopyReference = async (c: CitationMetadata, idx: number) => {
    const formatted = formatCitation(c, style, idx + 1);
    await navigator.clipboard.writeText(formatted);
    setCopiedId(c.id || String(idx));
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCopyInText = async (c: CitationMetadata, idx: number) => {
    const inText = formatInTextCitation(c, style, c.pages ? c.pages.split("-")[0] : undefined);
    await navigator.clipboard.writeText(inText);
    setCopiedInTextId(c.id || String(idx));
    setTimeout(() => setCopiedInTextId(null), 1500);
  };

  const handleBulkExport = (format: "txt" | "bib") => {
    if (citations.length === 0) return;

    let content = "";
    let filename = `bibliography_${style}.txt`;

    if (format === "bib") {
      content = citations.map((c) => formatBibTeX(c)).join("\n\n");
      filename = `bibliography.bib`;
    } else {
      content = citations
        .map((c, i) => `${formatCitation(c, style, i + 1)}`)
        .join("\n\n");
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    const newCitation: CitationMetadata = {
      id: `cit-${Date.now()}`,
      title: manualTitle.trim(),
      authors: parseAuthors(manualAuthors),
      year: manualYear ? parseInt(manualYear, 10) : undefined,
      sourceTitle: manualSource.trim() || undefined,
      doi: manualDoi.trim() || undefined,
      url: manualUrl.trim() || undefined,
    };

    onAddCitation(newCitation);
    setManualTitle("");
    setManualAuthors("");
    setManualYear("");
    setManualSource("");
    setManualDoi("");
    setManualUrl("");
    setShowAddModal(false);
  };

  const styleOptions: Array<{ id: CitationStyle; label: string; desc: string }> = [
    { id: "apa7", label: "APA 7th", desc: "Psychology & Social Sciences" },
    { id: "mla9", label: "MLA 9th", desc: "Humanities & Literature" },
    { id: "chicago", label: "Chicago 17th", desc: "History & Arts" },
    { id: "ieee", label: "IEEE", desc: "Engineering & Computer Science" },
    { id: "harvard", label: "Harvard", desc: "Business & General Sciences" },
    { id: "bibtex", label: "BibTeX", desc: "LaTeX / Technical Overleaf" },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#111218] border-l border-slate-200/80 dark:border-slate-800/80">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#14151c]/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Quote className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Citation & Bibliography
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {citations.length} cited source{citations.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAddModal(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Add Manual Source"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Style Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {styleOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setStyle(opt.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
                style === opt.id
                  ? "bg-indigo-600 text-white shadow-xs font-semibold"
                  : "bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 hover:border-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Citations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {citations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <BookMarked className="w-10 h-10 stroke-[1.5] text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              No citations added yet
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] leading-relaxed">
              Highlight any text in the PDF reader and click <span className="font-semibold text-indigo-500">Cite</span> to generate instant references.
            </p>
          </div>
        ) : (
          citations.map((c, idx) => {
            const isCopied = copiedId === (c.id || String(idx));
            const isCopiedInText = copiedInTextId === (c.id || String(idx));
            const formattedRef = formatCitation(c, style, idx + 1);
            const formattedInText = formatInTextCitation(c, style, c.pages ? c.pages.split("-")[0] : undefined);

            return (
              <div
                key={c.id || idx}
                className="group p-3.5 rounded-xl bg-white dark:bg-[#14151c] border border-slate-200/80 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 shadow-xs transition-all space-y-2.5"
              >
                {/* Header tag */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                    [{idx + 1}] {c.year ? c.year : "n.d."}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onInsertIntoNotes && (
                      <button
                        onClick={() => onInsertIntoNotes(formattedInText, formattedRef)}
                        className="px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 rounded hover:bg-emerald-100 transition-colors"
                        title="Insert (Author, Year) into active Studio note"
                      >
                        Insert Note
                      </button>
                    )}
                    <button
                      onClick={() => onRemoveCitation(c.id || String(idx))}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Remove from session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Formatted Reference Output */}
                <div className="text-xs text-slate-800 dark:text-slate-200 font-sans leading-relaxed break-words">
                  {style === "bibtex" ? (
                    <pre className="p-2 rounded bg-slate-50 dark:bg-slate-900/80 font-mono text-[10px] overflow-x-auto text-slate-700 dark:text-slate-300">
                      {formattedRef}
                    </pre>
                  ) : (
                    formattedRef
                  )}
                </div>

                {/* Quick Copy Buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyInText(c, idx)}
                      className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-mono transition-colors"
                      title="Copy in-text citation like (Santos, 2024)"
                    >
                      {isCopiedInText ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>In-Text: {formattedInText}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleCopyReference(c, idx)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 font-medium transition-colors"
                  >
                    {isCopied ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>Copy Full</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bulk Export Footer */}
      {citations.length > 0 && (
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#14151c] flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-slate-500">Export All:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkExport("txt")}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>.TXT</span>
            </button>
            <button
              onClick={() => handleBulkExport("bib")}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-500" />
              <span>BibTeX</span>
            </button>
          </div>
        </div>
      )}

      {/* Manual Add Citation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#181922] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Add Citation Manually
              </h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                  Document / Article Title *
                </label>
                <input
                  type="text"
                  required
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Civil Service General Information Reviewer"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                  Authors (separated by semicolon or 'and')
                </label>
                <input
                  type="text"
                  value={manualAuthors}
                  onChange={(e) => setManualAuthors(e.target.value)}
                  placeholder="e.g. Santos, Maria; Reyes, Jose"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                    Year
                  </label>
                  <input
                    type="number"
                    value={manualYear}
                    onChange={(e) => setManualYear(e.target.value)}
                    placeholder="2024"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                    Journal / Publisher
                  </label>
                  <input
                    type="text"
                    value={manualSource}
                    onChange={(e) => setManualSource(e.target.value)}
                    placeholder="e.g. CSC Commission"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                  DOI or URL (optional)
                </label>
                <input
                  type="text"
                  value={manualDoi || manualUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith("10.") || val.includes("doi.org")) {
                      setManualDoi(val);
                    } else {
                      setManualUrl(val);
                    }
                  }}
                  placeholder="https://doi.org/... or https://..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
                >
                  Add Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
