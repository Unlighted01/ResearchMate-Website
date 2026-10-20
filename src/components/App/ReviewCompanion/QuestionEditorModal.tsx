// ============================================
// QUESTION EDITOR MODAL - Academic Question Builder
// Create or Edit Single Multiple-Choice Questions
// Live KaTeX Math Preview + Option designation
// ============================================

import React, { useState, useEffect } from "react";
import { X, Check, Eye, Code, HelpCircle, Sparkles } from "lucide-react";
import { Question, generateUUID } from "../../../services/examService";
import AcademicMathView from "../../shared/AcademicMathView";

interface QuestionEditorModalProps {
  isOpen: boolean;
  questionToEdit?: Question | null;
  onSave: (question: Question) => void;
  onClose: () => void;
  defaultTopic?: string;
}

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  isOpen,
  questionToEdit,
  onSave,
  onClose,
  defaultTopic = "General",
}) => {
  const [statement, setStatement] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [explanation, setExplanation] = useState("");
  const [topicTag, setTopicTag] = useState(defaultTopic);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (questionToEdit) {
      setStatement(questionToEdit.question || "");
      const opts = [...questionToEdit.options];
      while (opts.length < 4) opts.push("");
      setOptions(opts.slice(0, 4));
      setCorrectIndex(questionToEdit.correctIndex ?? 0);
      setExplanation(questionToEdit.explanation || "");
      setTopicTag(questionToEdit.topicTag || defaultTopic);
    } else {
      setStatement("");
      setOptions(["", "", "", ""]);
      setCorrectIndex(0);
      setExplanation("");
      setTopicTag(defaultTopic);
    }
    setPreviewMode(false);
    setErrorMsg(null);
  }, [questionToEdit, isOpen, defaultTopic]);

  if (!isOpen) return null;

  const handleOptionChange = (idx: number, val: string) => {
    setOptions((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleSave = () => {
    if (!statement.trim()) {
      setErrorMsg("Question statement cannot be empty.");
      return;
    }

    const filledOptions = options.map((o) => o.trim());
    if (filledOptions.filter(Boolean).length < 2) {
      setErrorMsg("Please provide at least 2 multiple-choice options.");
      return;
    }

    if (!filledOptions[correctIndex]) {
      setErrorMsg("The selected correct answer cannot be empty.");
      return;
    }

    // Ensure 4 choices exist (pad if needed)
    while (filledOptions.length < 4) {
      filledOptions.push(`[Option ${String.fromCharCode(65 + filledOptions.length)}]`);
    }

    const finalQuestion: Question = {
      id: questionToEdit?.id || generateUUID(),
      question: statement.trim(),
      options: filledOptions.slice(0, 4),
      correctIndex,
      explanation: explanation.trim() || "Identified based on study materials and syllabus review.",
      topicTag: topicTag.trim() || defaultTopic,
    };

    onSave(finalQuestion);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-title flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              {questionToEdit ? "Edit Exam Question" : "Create Custom Question"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Supports standard LaTeX math ($...$) for equations, fractions, and units.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                previewMode
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              }`}
            >
              {previewMode ? <Code className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{previewMode ? "Editor View" : "KaTeX Preview"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        {previewMode ? (
          /* Live KaTeX Preview */
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold">
                {topicTag || "Topic"}
              </span>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                <AcademicMathView text={statement || "*[Empty Question Prompt]*"} />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              {options.map((opt, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    idx === correctIndex
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-medium"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{String.fromCharCode(65 + idx)}.</span>
                    <AcademicMathView text={opt || `*[Option ${String.fromCharCode(65 + idx)}]*`} />
                  </div>
                  {idx === correctIndex && (
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                      Correct Key
                    </span>
                  )}
                </div>
              ))}
            </div>

            {explanation && (
              <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/40 text-xs space-y-1">
                <span className="font-bold text-indigo-700 dark:text-indigo-300">Explanation:</span>
                <div className="text-slate-700 dark:text-slate-300">
                  <AcademicMathView text={explanation} />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Editor Input Form */
          <div className="space-y-4">
            {/* Question Statement */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Question Statement / Problem
              </label>
              <textarea
                rows={3}
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="Type the question prompt (e.g. 'Evaluate $\int_0^1 x^2 dx$ or 'Identify the governing theorem...')..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
              />
            </div>

            {/* 4 Multiple Choice Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Options (Select radio for correct answer)
                </label>
                <span className="text-[11px] font-mono text-slate-400">4 Choices</span>
              </div>

              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 w-12 shrink-0">
                      <input
                        type="radio"
                        name="correctAnswerChoice"
                        checked={correctIndex === idx}
                        onChange={() => setCorrectIndex(idx)}
                        className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>{String.fromCharCode(65 + idx)}.</span>
                    </label>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + idx)} text or LaTeX formula...`}
                      className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation & Topic */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pedagogical Explanation / Solution
                </label>
                <input
                  type="text"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Why is this answer correct? (Step-by-step derivation or rule)..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Topic / Syllabus Tag
                </label>
                <input
                  type="text"
                  value={topicTag}
                  onChange={(e) => setTopicTag(e.target.value)}
                  placeholder="e.g. Calculus, Physics..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{questionToEdit ? "Update Question" : "Save Question"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionEditorModal;
