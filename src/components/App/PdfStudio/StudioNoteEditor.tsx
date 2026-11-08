// ============================================
// STUDIO NOTE EDITOR
// Modern markdown & LaTeX study notes editor side-by-side with PDF
// Anti-slop: clean typography, distraction-free writing, 1-click citation badges
// ============================================

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Save,
  Download,
  Eye,
  Edit3,
  Columns,
  Quote,
  Bold,
  Italic,
  Heading,
  List,
  Sparkles,
  Check,
  Calculator,
} from "lucide-react";
import { LatexRenderer } from "../../shared/LatexRenderer";

interface StudioNoteEditorProps {
  noteContent: string;
  onChange: (val: string) => void;
  onSave?: () => void;
  isSaving?: boolean;
  documentTitle?: string;
  onOpenCitations?: () => void;
}

type ViewMode = "edit" | "preview" | "split";

export const StudioNoteEditor: React.FC<StudioNoteEditorProps> = ({
  noteContent,
  onChange,
  onSave,
  isSaving = false,
  documentTitle = "Untitled Study Note",
  onOpenCitations,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [copiedExport, setCopiedExport] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keyboard shortcut Ctrl/Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave]);

  const insertSnippet = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = noteContent.substring(start, end);
    const replacement = `${prefix}${selected || "text"}${suffix}`;

    const newContent =
      noteContent.substring(0, start) + replacement + noteContent.substring(end);
    onChange(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selected ? selected.length : 4)
      );
    }, 10);
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([noteContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${documentTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}_notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111218]">
      {/* Editor Toolbar */}
      <div className="px-3 py-2 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-[#14151c]/60">
        {/* Formatting Shortcuts */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => insertSnippet("**", "**")}
            className="p-1.5 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Bold (**text**)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet("*", "*")}
            className="p-1.5 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Italic (*text*)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet("### ")}
            className="p-1.5 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Heading (### Section)"
          >
            <Heading className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet("- ")}
            className="p-1.5 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Bullet list"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet("> ")}
            className="p-1.5 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Quote (> excerpt)"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet("$", "$")}
            className="p-1.5 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono transition-colors"
            title="LaTeX Math ($x^2 + y^2 = r^2$)"
          >
            <Calculator className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View Mode & Actions */}
        <div className="flex items-center gap-1.5">
          {/* View Toggles */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <button
              onClick={() => setViewMode("edit")}
              className={`p-1 rounded-md text-xs transition-colors ${
                viewMode === "edit"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-medium"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Editor only"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`p-1 rounded-md text-xs transition-colors ${
                viewMode === "split"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-medium"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Split edit & preview"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={`p-1 rounded-md text-xs transition-colors ${
                viewMode === "preview"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-medium"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Rendered preview"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export button */}
          <button
            onClick={handleExportMarkdown}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Export notes as Markdown"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.MD</span>
          </button>

          {/* Save status */}
          {onSave && (
            <button
              onClick={onSave}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                isSaving
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-300 dark:border-emerald-800"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs"
              }`}
            >
              {isSaving ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? "Saved" : "Save"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Textarea Editor */}
        {(viewMode === "edit" || viewMode === "split") && (
          <div className={`flex-1 h-full p-4 overflow-y-auto ${viewMode === "split" ? "border-r border-slate-200/80 dark:border-slate-800/80" : ""}`}>
            <textarea
              ref={textareaRef}
              value={noteContent}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Start drafting notes, formulas ($\int x dx$), and key takeaways...

Tip: Highlight any text in the PDF on the left and click 'Clip' to insert quotes automatically!"
              className="w-full h-full resize-none font-mono text-xs sm:text-sm text-slate-800 dark:text-slate-200 bg-transparent focus:outline-none leading-relaxed placeholder:text-slate-400"
            />
          </div>
        )}

        {/* Live Preview */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className="flex-1 h-full p-5 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/20">
            {noteContent.trim() ? (
              <div className="prose prose-slate dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-3 font-sans">
                {noteContent.split("\n\n").map((block, bIdx) => {
                  const trimmed = block.trim();
                  if (trimmed.startsWith("### ")) {
                    return (
                      <h3 key={bIdx} className="text-sm font-bold text-slate-900 dark:text-white pt-2 border-b border-slate-200/60 dark:border-slate-800 pb-1">
                        <LatexRenderer content={trimmed.slice(4)} />
                      </h3>
                    );
                  }
                  if (trimmed.startsWith("## ")) {
                    return (
                      <h2 key={bIdx} className="text-base font-bold text-slate-900 dark:text-white pt-3 border-b border-slate-200 dark:border-slate-800 pb-1">
                        <LatexRenderer content={trimmed.slice(3)} />
                      </h2>
                    );
                  }
                  if (trimmed.startsWith("# ")) {
                    return (
                      <h1 key={bIdx} className="text-lg font-bold text-slate-900 dark:text-white pb-1">
                        <LatexRenderer content={trimmed.slice(2)} />
                      </h1>
                    );
                  }
                  if (trimmed.startsWith("> ")) {
                    return (
                      <blockquote key={bIdx} className="p-3 my-2 border-l-3 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-r-xl text-slate-700 dark:text-slate-300 italic text-xs leading-relaxed">
                        <LatexRenderer content={trimmed.slice(2)} />
                      </blockquote>
                    );
                  }
                  if (trimmed.startsWith("- ")) {
                    const items = trimmed.split("\n").filter((l) => l.trim().startsWith("- "));
                    return (
                      <ul key={bIdx} className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300">
                        {items.map((it, iIdx) => (
                          <li key={iIdx}>
                            <LatexRenderer content={it.replace(/^-\s*/, "")} />
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  return (
                    <p key={bIdx} className="text-slate-800 dark:text-slate-200 leading-relaxed">
                      <LatexRenderer content={block} />
                    </p>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-slate-400 text-xs">
                Rendered preview with KaTeX math will appear here.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
