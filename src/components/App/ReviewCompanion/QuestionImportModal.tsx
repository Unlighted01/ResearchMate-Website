// ============================================
// QUESTION IMPORT MODAL - Academic Batch Importer
// Paste raw text (Word/Handouts) or upload CSV
// Live validation preview with warning badges
// ============================================

import React, { useState } from "react";
import { X, Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { Question } from "../../../services/examService";
import { parsePlainTextQuestions, parseCsvQuestions, ParseResult } from "../../../services/examParser";
import AcademicMathView from "../../shared/AcademicMathView";

interface QuestionImportModalProps {
  isOpen: boolean;
  onImport: (questions: Question[], mode: "append" | "replace") => void;
  onClose: () => void;
  defaultTopic?: string;
}

export const QuestionImportModal: React.FC<QuestionImportModalProps> = ({
  isOpen,
  onImport,
  onClose,
  defaultTopic = "General",
}) => {
  const [activeTab, setActiveTab] = useState<"paste" | "csv">("paste");
  const [pastedText, setPastedText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  if (!isOpen) return null;

  const handleTextChange = (text: string) => {
    setPastedText(text);
    if (!text.trim()) {
      setParseResult(null);
      return;
    }
    const res = parsePlainTextQuestions(text, defaultTopic);
    setParseResult(res);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;

      if (file.name.endsWith(".csv")) {
        setActiveTab("csv");
        const res = parseCsvQuestions(content, defaultTopic);
        setParseResult(res);
      } else {
        setActiveTab("paste");
        setPastedText(content);
        const res = parsePlainTextQuestions(content, defaultTopic);
        setParseResult(res);
      }
    };

    reader.readAsText(file);
  };

  const handleApplyImport = (mode: "append" | "replace") => {
    if (!parseResult || parseResult.validCount === 0) return;
    const validQuestions = parseResult.items
      .filter((i) => i.isValid)
      .map((i) => i.question);
    onImport(validQuestions, mode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-title flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-500" />
              Batch Question Importer
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Paste questions from past exams, handouts, or upload a CSV file with zero AI cost.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & File Upload Input */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("paste")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeTab === "paste"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              }`}
            >
              Paste Formatted Text
            </button>
            <button
              onClick={() => setActiveTab("csv")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeTab === "csv"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              }`}
            >
              CSV Sheet Upload
            </button>
          </div>

          <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center gap-1.5 shrink-0">
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
            <span>{fileName ? `File: ${fileName}` : "Upload .TXT or .CSV"}</span>
            <input
              type="file"
              accept=".txt,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Main Input Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === "paste" ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Paste questions below (Supports 1. / A) / Answer: B / Explanation):</span>
                <span className="font-mono text-[11px] text-slate-400">{pastedText.length} chars</span>
              </div>
              <textarea
                rows={6}
                value={pastedText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={`1. What is the derivative of $\\sin(x)$?
A) $\\cos(x)$
B) $-\\cos(x)$
C) $\\tan(x)$
D) $\\sec(x)$
Answer: A
Explanation: Standard calculus trigonometric differentiation rule.`}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
              <Upload className="w-6 h-6 mx-auto text-indigo-500 opacity-60" />
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                CSV Format Columns:
              </p>
              <code className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-400 block max-w-lg mx-auto">
                Question, Option A, Option B, Option C, Option D, Answer, Explanation, Topic
              </code>
              <p className="text-[11px] text-slate-400">
                Click &quot;Upload .TXT or .CSV&quot; above to select your file.
              </p>
            </div>
          )}

          {/* Parse Results Preview Table */}
          {parseResult && (
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Parsed Questions ({parseResult.totalParsed})
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {parseResult.validCount} Valid
                  </span>
                  {parseResult.warningCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {parseResult.warningCount} Warnings
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {parseResult.items.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                      item.isValid
                        ? "bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800"
                        : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        <span className="text-slate-400 font-mono mr-1.5">{idx + 1}.</span>
                        <AcademicMathView text={item.question.question} />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 shrink-0">
                        Ans: {String.fromCharCode(65 + item.question.correctIndex)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400 pl-4 border-l-2 border-indigo-500/20">
                      {item.question.options.map((opt, oIdx) => (
                        <div key={oIdx} className="truncate">
                          <span className="font-bold text-slate-500 mr-1">{String.fromCharCode(65 + oIdx)}.</span>
                          <AcademicMathView text={opt} />
                        </div>
                      ))}
                    </div>

                    {item.warnings.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-600 dark:text-amber-400 pt-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{item.warnings.join(" ")}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!parseResult || parseResult.validCount === 0}
              onClick={() => handleApplyImport("append")}
              className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
            >
              Append to Exam (+{parseResult?.validCount || 0})
            </button>
            <button
              type="button"
              disabled={!parseResult || parseResult.validCount === 0}
              onClick={() => handleApplyImport("replace")}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Replace Exam ({parseResult?.validCount || 0})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionImportModal;
