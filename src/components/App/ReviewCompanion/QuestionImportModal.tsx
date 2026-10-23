// ============================================
// QUESTION IMPORT MODAL - Academic Workstation Importer
// Zero-cost native Q&A extraction from PDF review books, formatted text, or CSV.
// High-craft, anti-slop interface with chapter filters, math rendering, and instant verification.
// ============================================

import React, { useState, useMemo, useRef } from "react";
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  BookOpen,
  Search,
  FileSpreadsheet,
  Check,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { Question, Flashcard, saveFlashcardDeck } from "../../../services/examService";
import { parsePlainTextQuestions, parseCsvQuestions, ParseResult } from "../../../services/examParser";
import { extractAllPagesWithLayout } from "../../../services/pdfService";
import {
  parseTwoPassQuestionsAndAnswers,
  toFlashcards,
  ParsedQaItem,
} from "../../../services/pdfQuestionImporter";
import AcademicMathView from "../../shared/AcademicMathView";

interface QuestionImportModalProps {
  isOpen: boolean;
  onImport: (questions: Question[], mode: "append" | "replace") => void;
  onClose: () => void;
  defaultTopic?: string;
  onFlashcardsCreated?: (count: number) => void;
}

export const QuestionImportModal: React.FC<QuestionImportModalProps> = ({
  isOpen,
  onImport,
  onClose,
  defaultTopic = "General",
  onFlashcardsCreated,
}) => {
  const [activeTab, setActiveTab] = useState<"pdf" | "paste" | "csv">("pdf");
  const [pastedText, setPastedText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [parsedQaList, setParsedQaList] = useState<ParsedQaItem[]>([]);
  const [isSavingFlashcards, setIsSavingFlashcards] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract unique chapters for filtering
  const chapters = useMemo(() => {
    const set = new Set<string>();
    if (parsedQaList.length > 0) {
      parsedQaList.forEach((q) => {
        if (q.chapter) set.add(q.chapter);
      });
    } else if (parseResult) {
      parseResult.items.forEach((item) => {
        if (item.question.topicTag) set.add(item.question.topicTag);
      });
    }
    return Array.from(set);
  }, [parsedQaList, parseResult]);

  // Filtered items based on active chapter pill and search query
  const filteredItems = useMemo(() => {
    if (!parseResult) return [];
    return parseResult.items.filter((item, idx) => {
      // Filter by chapter
      if (selectedChapter !== "ALL") {
        const itemChapter = item.question.topicTag;
        if (itemChapter !== selectedChapter) return false;
      }
      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numMatch = q.startsWith("#") ? q.slice(1) : q;
        const isNum = !isNaN(Number(numMatch)) && Number(numMatch) === idx + 1;
        const textMatch =
          item.question.question.toLowerCase().includes(q) ||
          item.question.options.some((opt) => opt.toLowerCase().includes(q)) ||
          (item.question.explanation && item.question.explanation.toLowerCase().includes(q));
        if (!isNum && !textMatch) return false;
      }
      return true;
    });
  }, [parseResult, selectedChapter, searchQuery]);

  if (!isOpen) return null;

  const handleReset = () => {
    setFileName(null);
    setParseResult(null);
    setParsedQaList([]);
    setPastedText("");
    setSelectedChapter("ALL");
    setSearchQuery("");
  };

  const handleTextChange = (text: string) => {
    setPastedText(text);
    if (!text.trim()) {
      setParseResult(null);
      setParsedQaList([]);
      return;
    }
    const res = parsePlainTextQuestions(text, defaultTopic);
    setParseResult(res);
  };

  const handlePdfFile = async (file: File) => {
    setFileName(file.name);
    setActiveTab("pdf");
    setIsExtractingPdf(true);
    setPdfProgress({ current: 0, total: 1 });
    setSelectedChapter("ALL");
    setSearchQuery("");

    try {
      const layoutResult = await extractAllPagesWithLayout(file, (curr, tot) => {
        setPdfProgress({ current: curr, total: tot });
      });

      const parsed = parseTwoPassQuestionsAndAnswers(layoutResult.pages);
      setParsedQaList(parsed);

      if (parsed.length > 0) {
        setParseResult({
          items: parsed.map((item) => ({
            question: {
              id: item.id,
              question: item.stem,
              options: item.options,
              correctIndex: item.correctIndex,
              explanation: item.explanation,
              topicTag: item.chapter || defaultTopic,
            },
            isValid: item.options.length >= 2,
            warnings: item.hasIncompleteAnswer ? ["Answer key not explicitly indexed in section"] : [],
          })),
          totalParsed: parsed.length,
          validCount: parsed.length,
          warningCount: parsed.filter((p) => p.hasIncompleteAnswer).length,
        });
      } else {
        // Fallback: parse plain text if two-pass format not detected
        const plainRes = parsePlainTextQuestions(layoutResult.fullText, defaultTopic);
        setParseResult(plainRes);
      }
    } catch (err) {
      console.error("PDF question extraction failed:", err);
    } finally {
      setIsExtractingPdf(false);
      setPdfProgress(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".pdf")) {
      handlePdfFile(file);
      return;
    }

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".pdf")) {
      handlePdfFile(file);
    } else {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        if (!content) return;
        if (file.name.endsWith(".csv")) {
          setActiveTab("csv");
          setParseResult(parseCsvQuestions(content, defaultTopic));
        } else {
          setActiveTab("paste");
          setPastedText(content);
          setParseResult(parsePlainTextQuestions(content, defaultTopic));
        }
      };
      reader.readAsText(file);
    }
  };

  const handleApplyImport = (mode: "append" | "replace") => {
    if (!parseResult || parseResult.validCount === 0) return;
    const validQuestions = parseResult.items
      .filter((i) => i.isValid)
      .map((i) => i.question);
    onImport(validQuestions, mode);
    onClose();
  };

  const handleExportFlashcards = async () => {
    if (!parseResult || parseResult.validCount === 0) return;
    setIsSavingFlashcards(true);

    try {
      const cards: Flashcard[] = parsedQaList.length > 0
        ? toFlashcards(parsedQaList)
        : parseResult.items.filter((i) => i.isValid).map((i) => {
            const q = i.question;
            const letter = String.fromCharCode(65 + q.correctIndex);
            return {
              id: q.id,
              front: q.question,
              back: `**Correct Answer:** Option ${letter}: ${q.options[q.correctIndex] || ""}\n\n**Explanation:**\n${q.explanation}`,
              category: q.topicTag || defaultTopic,
            };
          });

      const deckTitle = fileName ? `${fileName.replace(/\.[^/.]+$/, "")} Study Deck` : `${defaultTopic} Study Deck`;
      await saveFlashcardDeck({
        title: deckTitle,
        cards,
      });

      if (onFlashcardsCreated) onFlashcardsCreated(cards.length);
      onClose();
    } catch (err) {
      console.error("Failed to export as flashcards:", err);
    } finally {
      setIsSavingFlashcards(false);
    }
  };

  const hasLoadedQuestions = Boolean(parseResult && parseResult.totalParsed > 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-5xl w-full h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center border border-slate-200/80 dark:border-slate-700/80">
              <BookOpen className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-title tracking-tight flex items-center gap-2">
                Document Question Importer
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-semibold">
                  Client Engine • $0 AI Cost
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Extract questions and correlated chapter answer keys from PDF books, past exams, or spreadsheets.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Ingest Bar / Status Banner */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/30 shrink-0">
          {hasLoadedQuestions ? (
            /* Compact Document Status Bar (Replaces bulky dropzone when questions are active!) */
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-xs truncate">
                    {fileName || "Loaded Questions"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    {parseResult?.validCount} Questions
                  </span>

                  {chapters.length > 1 && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {chapters.length} Chapters
                    </span>
                  )}

                  {parseResult && parseResult.warningCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {parseResult.warningCount} Missing Keys
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Change File</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Clear and reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Source Switcher Tabs when no data is loaded yet */
            <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar pb-1">
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setActiveTab("pdf")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeTab === "pdf"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF Review Book</span>
                </button>
                <button
                  onClick={() => setActiveTab("paste")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeTab === "paste"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Formatted Text</span>
                </button>
                <button
                  onClick={() => setActiveTab("csv")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeTab === "csv"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>CSV Spreadsheet</span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                Supports continuous numbering & multi-chapter books
              </span>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.csv"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Content Body Area */}
        <div className="flex-1 min-h-0 flex flex-col p-6 overflow-hidden">
          {/* Active Extraction Progress Bar */}
          {isExtractingPdf && (
            <div className="my-auto py-12 px-6 max-w-md mx-auto text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900/60 shadow-xs">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white font-title">
                  Parsing Document & Correlating Keys...
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Extracting vector text, stacked fractions into LaTeX, and matching chapter answer keys.
                </p>
              </div>
              {pdfProgress && (
                <div className="space-y-2 pt-2">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(5, Math.round((pdfProgress.current / pdfProgress.total) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Page {pdfProgress.current} of {pdfProgress.total}</span>
                    <span>{Math.round((pdfProgress.current / pdfProgress.total) * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State / Ingest Area (Shown only when no questions loaded yet and not extracting) */}
          {!hasLoadedQuestions && !isExtractingPdf && (
            <div className="flex-1 flex flex-col justify-center">
              {activeTab === "pdf" && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${
                    isDragging
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[0.99]"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Drag and drop your practice exam or review book PDF
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      Supports full multi-chapter books (e.g. <em>501 Math Word Problems</em>, SAT/GRE subject tests, past papers). Fractions are automatically converted to clean KaTeX math.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="mt-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Browse PDF File</span>
                  </button>
                </div>
              )}

              {activeTab === "paste" && (
                <div className="h-full flex flex-col space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Paste numbered exam text below:</span>
                    <span className="font-mono text-[11px] text-slate-400">{pastedText.length} characters</span>
                  </div>
                  <textarea
                    rows={12}
                    value={pastedText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder={`1. Find the derivative of $\\sin(x)$.
a. $\\cos(x)$
b. $-\\cos(x)$
c. $\\tan(x)$
d. $\\sec(x)$

Answers and Explanations
1. a. The standard trigonometric differentiation rule yields $\\cos(x)$.`}
                    className="flex-1 w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
                  />
                </div>
              )}

              {activeTab === "csv" && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all bg-slate-50/50 dark:bg-slate-950/30 flex flex-col items-center justify-center space-y-3"
                >
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Upload CSV Practice Questions
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      Columns expected: Question, Option A, Option B, Option C, Option D, Answer, Explanation, Topic
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-xs font-semibold shadow-xs"
                  >
                    Select CSV File
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Active Question Preview Station */}
          {hasLoadedQuestions && !isExtractingPdf && (
            <div className="flex-1 min-h-0 flex flex-col space-y-3">
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
                {/* Chapter Pills Carousel / Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none flex-1">
                  <button
                    type="button"
                    onClick={() => setSelectedChapter("ALL")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedChapter === "ALL"
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    All Questions ({parseResult?.totalParsed})
                  </button>

                  {chapters.map((ch) => {
                    const countInChapter = parseResult?.items.filter(
                      (i) => i.question.topicTag === ch
                    ).length || 0;
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setSelectedChapter(ch)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                          selectedChapter === ch
                            ? "bg-indigo-600 text-white font-semibold"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {ch} ({countInChapter})
                      </button>
                    );
                  })}
                </div>

                {/* Question Search / Jump */}
                <div className="relative w-full sm:w-60 shrink-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search text or #number..."
                    className="w-full pl-8 pr-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-mono"
                    >
                      CLEAR
                    </button>
                  )}
                </div>
              </div>

              {/* Questions Stream List */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 space-y-3">
                {filteredItems.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <p className="text-xs text-slate-400 font-mono">No questions match the current filter.</p>
                    <button
                      onClick={() => {
                        setSelectedChapter("ALL");
                        setSearchQuery("");
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold underline"
                    >
                      Reset filters
                    </button>
                  </div>
                ) : (
                  filteredItems.map((item, idx) => {
                    const originalIdx = parseResult?.items.indexOf(item) ?? idx;
                    const q = item.question;
                    const correctChar = String.fromCharCode(65 + q.correctIndex);

                    return (
                      <div
                        key={q.id || idx}
                        className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                      >
                        {/* Question Card Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              #{originalIdx + 1}
                            </span>
                            {q.topicTag && (
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                {q.topicTag}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-500" />
                              Key: {correctChar}
                            </span>
                          </div>
                        </div>

                        {/* Question Stem (Math Formatted) */}
                        <div className="text-xs text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
                          <AcademicMathView content={q.question} />
                        </div>

                        {/* Options Grid (2 Columns) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt, oIdx) => {
                            const isCorrect = oIdx === q.correctIndex;
                            const optionChar = String.fromCharCode(65 + oIdx);

                            return (
                              <div
                                key={oIdx}
                                className={`px-3 py-2 rounded-lg text-xs flex items-start gap-2 border transition-colors ${
                                  isCorrect
                                    ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 font-medium"
                                    : "bg-slate-50/50 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <span
                                  className={`font-mono text-[11px] font-bold shrink-0 mt-0.5 ${
                                    isCorrect
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-slate-400 dark:text-slate-500"
                                  }`}
                                >
                                  {optionChar}.
                                </span>
                                <div className="flex-1 break-words">
                                  <AcademicMathView content={opt} />
                                </div>
                                {isCorrect && (
                                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Step-by-Step Explanation Callout */}
                        {q.explanation && (
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed space-y-1">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1">
                              Explanation:
                            </span>
                            <AcademicMathView content={q.explanation} />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Docked Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            {hasLoadedQuestions ? (
              <span>
                Ready to import <strong className="text-slate-800 dark:text-slate-200">{parseResult?.validCount} questions</strong> across {chapters.length || 1} chapter{chapters.length > 1 ? "s" : ""}.
              </span>
            ) : (
              <span>Select or drop a file to inspect questions before importing.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {/* Flashcard Export */}
            <button
              type="button"
              disabled={!hasLoadedQuestions || isSavingFlashcards}
              onClick={handleExportFlashcards}
              className="px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
              title="Create an active recall flashcard deck from these questions"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span>{isSavingFlashcards ? "Exporting..." : "Save as Flashcard Deck"}</span>
            </button>

            {/* Append Option */}
            <button
              type="button"
              disabled={!hasLoadedQuestions}
              onClick={() => handleApplyImport("append")}
              className="px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
            >
              Append (+{parseResult?.validCount || 0})
            </button>

            {/* Replace / Create New Exam Option */}
            <button
              type="button"
              disabled={!hasLoadedQuestions}
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
