// ============================================
// DOCUMENT STUDIO - Master Workstation
// Unified Split-View PDF Reader, Markdown Notes Editor,
// and In-Context Citation Engine
// ============================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FileText,
  Upload,
  BookOpen,
  Quote,
  Sparkles,
  Columns,
  FolderOpen,
  ChevronDown,
  Layers,
  ArrowLeft,
  X,
  ExternalLink,
  Zap,
  Loader2,
} from "lucide-react";
import { StorageItem, getAllItems, updateItem, addItem } from "../../../services/storageService";
import { Question, generateUUID } from "../../../services/examService";
import { extractAllPagesWithLayout } from "../../../services/pdfService";
import {
  parseTwoPassQuestionsAndAnswers,
  ParsedQaItem,
} from "../../../services/pdfQuestionImporter";
import { importQuestionsToBank } from "../../../services/questionImportService";
import { generateExtractiveSummary } from "../../../services/extractiveSummaryService";
import {
  CitationMetadata,
  extractDoi,
  extractYear,
  formatInTextCitation,
  parseAuthors,
} from "../../../services/citationService";
import { generateChatResponse } from "../../../services/geminiService";
import { PdfViewerCanvas } from "./PdfViewerCanvas";
import { StudioNoteEditor } from "./StudioNoteEditor";
import { CitationDrawer } from "./CitationDrawer";
import {
  FloatingSelectionToolbar,
  SelectionCoordinates,
  HighlightColor,
} from "./FloatingSelectionToolbar";

interface DocumentStudioProps {
  useToast: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
  };
}

type LayoutMode = "split" | "pdf_focus" | "notes_focus" | "full_pdf" | "full_notes";
type RightTab = "notes" | "citations" | "ai_explainer";

export const DocumentStudio: React.FC<DocumentStudioProps> = ({ useToast }) => {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Layout & Tabs
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("split");
  const [activeRightTab, setActiveRightTab] = useState<RightTab>("notes");

  // Document State
  const [items, setItems] = useState<StorageItem[]>([]);
  const [activeItem, setActiveItem] = useState<StorageItem | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [documentTitle, setDocumentTitle] = useState("Untitled Reviewer");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Notes & Citations State
  const [noteContent, setNoteContent] = useState<string>("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [citations, setCitations] = useState<CitationMetadata[]>([]);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [isExtractingQuestions, setIsExtractingQuestions] = useState(false);

  // Floating Selection Coordinates
  const [selectionCoords, setSelectionCoords] = useState<SelectionCoordinates | null>(null);

  // Modals
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Library Items
  useEffect(() => {
    const loadItems = async () => {
      try {
        const all = await getAllItems();
        setItems(all);

        // Check ?id= query param
        const idParam = searchParams.get("id");
        if (idParam) {
          const match = all.find((item) => item.id === idParam);
          if (match) {
            selectItem(match);
            return;
          }
        }

        // Check ?url= query param
        const urlParam = searchParams.get("url");
        if (urlParam) {
          setPdfUrl(urlParam);
          const fname = urlParam.split("/").pop() || "Document.pdf";
          setDocumentTitle(fname);
          return;
        }

        // Default to first PDF if available
        const firstPdf = all.find((i) => i.sourceUrl?.endsWith(".pdf") || i.sourceTitle?.endsWith(".pdf"));
        if (firstPdf) {
          selectItem(firstPdf);
        }
      } catch (err) {
        console.error("Failed to load documents:", err);
      }
    };
    loadItems();
  }, [searchParams]);

  // Select Item from Library
  const selectItem = (item: StorageItem) => {
    setActiveItem(item);
    setDocumentTitle(item.title || item.sourceTitle || "Document");
    setNoteContent(item.note || `# Notes: ${item.title || item.sourceTitle}\n\n`);

    if (item.sourceUrl) {
      setPdfUrl(item.sourceUrl);
      setFileData(null);
    }

    // Initialize citation for this document if not present
    const docDoi = extractDoi(item.text) || undefined;
    const docYear = extractYear(item.text) || undefined;
    const initialCit: CitationMetadata = {
      id: `cit-${item.id}`,
      title: item.title || item.sourceTitle || "Untitled Reviewer",
      authors: parseAuthors(item.sourceTitle || "Anonymous"),
      year: docYear || new Date(item.createdAt).getFullYear(),
      doi: docDoi,
      url: item.sourceUrl,
      sourceTitle: "Exam Review Material",
    };

    setCitations((prev) => {
      const exists = prev.some((c) => c.title === initialCit.title);
      return exists ? prev : [initialCit, ...prev];
    });

    setShowDocumentPicker(false);
  };

  // Upload Local File
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      setFileData(buffer);
      setPdfUrl(null);
      setDocumentTitle(file.name);
      setNoteContent(`# Notes: ${file.name}\n\n`);

      // Add default citation
      const newCit: CitationMetadata = {
        id: `cit-${Date.now()}`,
        title: file.name.replace(/\.pdf$/i, ""),
        authors: [{ lastName: "Reviewer Author" }],
        year: new Date().getFullYear(),
        sourceTitle: "Primary Review Material",
      };
      setCitations((prev) => [newCit, ...prev]);

      showToast(`Loaded "${file.name}" into Document Studio!`, "success");
    } catch (err) {
      showToast("Failed to read file", "error");
    }
  };

  // Save Note to Active Item or Library
  const handleSaveNote = async () => {
    setIsSavingNote(true);
    try {
      if (activeItem) {
        await updateItem(activeItem.id, { note: noteContent });
      } else {
        const newItem = await addItem({
          sourceTitle: documentTitle,
          text: noteContent,
          note: noteContent,
          deviceSource: "web",
          tags: ["studio_note"],
        });
        setActiveItem(newItem);
      }
      showToast("Notes saved to library!", "success");
    } catch {
      showToast("Failed to save notes", "error");
    } finally {
      setIsSavingNote(false);
    }
  };

  // Actions from FloatingSelectionToolbar
  const handleCiteSelection = (text: string, pageNum: number) => {
    const currentDoc = citations[0] || {
      title: documentTitle,
      authors: [{ lastName: "Reviewer" }],
      year: new Date().getFullYear(),
    };

    const newCitation: CitationMetadata = {
      ...currentDoc,
      id: `cit-${Date.now()}`,
      pages: String(pageNum),
    };

    setCitations((prev) => [newCitation, ...prev]);
    setActiveRightTab("citations");
    showToast(`Citation added for page ${pageNum}!`, "success");
  };

  const handleClipToNotes = (text: string, pageNum: number) => {
    const quoteBlock = `\n\n> "${text}"\n> — *${documentTitle}*, p. ${pageNum}\n\n`;
    setNoteContent((prev) => `${prev.trimEnd()}${quoteBlock}`);
    setActiveRightTab("notes");
    showToast(`Clipped quote to notes (p. ${pageNum})!`, "success");
  };

  const handleHighlight = (text: string, pageNum: number, color: HighlightColor) => {
    showToast(`Highlighted passage on page ${pageNum} in ${color}!`, "info");
  };

  const handleExplainAi = async (text: string, pageNum: number) => {
    setActiveRightTab("ai_explainer");
    setIsExplaining(true);
    setAiExplanation(null);

    try {
      const prompt = `You are a precision exam tutor. Explain this exact passage in 2 clear, high-yield bullet points for an examinee:
"${text}"`;
      const res = await generateChatResponse(prompt, text);
      const textOutput = typeof res === "string" ? res : res.response;
      setAiExplanation(textOutput);
    } catch {
      setAiExplanation("Unable to generate AI explanation. Check your network connection.");
    } finally {
      setIsExplaining(false);
    }
  };

  const handleInsertInText = (inTextCitation: string, referenceText: string) => {
    setNoteContent((prev) => `${prev} ${inTextCitation}`);
    setActiveRightTab("notes");
    showToast(`Inserted ${inTextCitation} into notes!`, "success");
  };

  // 1-Click Deterministic Question Extractor ($0 cost, 100% offline)
  const handleExtractQuestionsFromPdf = async () => {
    if (!fileData && !activeItem?.text) {
      showToast("Please open a reviewer PDF or document first.", "info");
      return;
    }

    setIsExtractingQuestions(true);
    try {
      let parsedItems: ParsedQaItem[] = [];

      if (fileData) {
        const extraction = await extractAllPagesWithLayout(fileData);
        parsedItems = parseTwoPassQuestionsAndAnswers(extraction.pages);
      } else if (activeItem?.text) {
        parsedItems = parseTwoPassQuestionsAndAnswers(activeItem.text);
      }

      if (parsedItems.length === 0) {
        showToast("No structured Q&A pattern detected in this document.", "info");
        return;
      }

      const { importedCount, totalBankCount, needsReviewCount } = await importQuestionsToBank({
        rawQuestions: parsedItems,
        subject: documentTitle || "Reviewer Book",
        sourceFile: documentTitle || "Reviewer Book.pdf",
        origin: "pdf_import",
      });

      const reviewNote = needsReviewCount > 0 ? ` (${needsReviewCount} need review)` : "";
      showToast(
        `Added ${importedCount} questions under subject "${documentTitle || "Reviewer Book"}" to Question Bank${reviewNote}! (Total: ${totalBankCount})`,
        "success"
      );
    } catch (err: any) {
      console.error("PDF extraction error:", err);
      showToast(`Extraction failed: ${err.message}`, "error");
    } finally {
      setIsExtractingQuestions(false);
    }
  };

  // Layout Width Calculation
  const getPaneWidths = () => {
    switch (layoutMode) {
      case "full_pdf":
        return { left: "w-full", right: "hidden" };
      case "full_notes":
        return { left: "hidden", right: "w-full" };
      case "pdf_focus":
        return { left: "w-full lg:w-2/3", right: "w-full lg:w-1/3" };
      case "notes_focus":
        return { left: "w-full lg:w-1/3", right: "w-full lg:w-2/3" };
      case "split":
      default:
        return { left: "w-full lg:w-1/2", right: "w-full lg:w-1/2" };
    }
  };

  const paneWidths = getPaneWidths();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 dark:bg-[#0c0d12] overflow-hidden">
      {/* Top Studio Control Bar */}
      <div className="h-12 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#14151c] px-4 flex items-center justify-between gap-3 shrink-0 z-20">
        {/* Document Selector & Title */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <BookOpen className="w-3.5 h-3.5" />
          </div>

          <button
            onClick={() => setShowDocumentPicker(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 text-left min-w-0 max-w-xs transition-colors"
          >
            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {documentTitle}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>
        </div>

        {/* Center: Layout Toggles */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400">
          <button
            onClick={() => setLayoutMode("split")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              layoutMode === "split"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold"
                : "hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Split 50/50"
          >
            Split 50/50
          </button>
          <button
            onClick={() => setLayoutMode("pdf_focus")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              layoutMode === "pdf_focus"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold"
                : "hover:text-slate-900 dark:hover:text-white"
            }`}
            title="PDF Focus (70/30)"
          >
            PDF Focus
          </button>
          <button
            onClick={() => setLayoutMode("notes_focus")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              layoutMode === "notes_focus"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold"
                : "hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Notes Focus (30/70)"
          >
            Notes Focus
          </button>
        </div>

        {/* Right Sidecar Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-xs font-medium text-slate-600 dark:text-slate-400">
            <button
              onClick={() => setActiveRightTab("notes")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                activeRightTab === "notes"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Notes</span>
            </button>

            <button
              onClick={() => setActiveRightTab("citations")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                activeRightTab === "citations"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Quote className="w-3.5 h-3.5 text-indigo-500" />
              <span>Citations</span>
              {citations.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] flex items-center justify-center font-mono font-bold">
                  {citations.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveRightTab("ai_explainer")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                activeRightTab === "ai_explainer"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>AI Tutor</span>
            </button>
          </div>

          <button
            onClick={handleExtractQuestionsFromPdf}
            disabled={isExtractingQuestions}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Extract questions and answer keys from this reviewer into your Question Bank ($0 AI cost)"
          >
            {isExtractingQuestions ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 fill-white" />
            )}
            <span className="hidden sm:inline">Extract Practice Test</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Pane Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Pane: PDF Viewer */}
        <div className={`${paneWidths.left} h-full border-r border-slate-200/80 dark:border-slate-800/80 relative overflow-hidden transition-all duration-200`}>
          <PdfViewerCanvas
            initialUrl={pdfUrl}
            fileData={fileData}
            fileName={documentTitle}
            onSelectionChange={setSelectionCoords}
            onPageChange={(curr, total) => {
              setCurrentPage(curr);
              setTotalPages(total);
            }}
            onOpenUploadDialog={() => fileInputRef.current?.click()}
          />
        </div>

        {/* Right Pane: Notes / Citations / AI Sidecar */}
        <div className={`${paneWidths.right} h-full overflow-hidden flex flex-col transition-all duration-200 bg-white dark:bg-[#111218]`}>
          {activeRightTab === "notes" && (
            <StudioNoteEditor
              noteContent={noteContent}
              onChange={setNoteContent}
              onSave={handleSaveNote}
              isSaving={isSavingNote}
              documentTitle={documentTitle}
              onOpenCitations={() => setActiveRightTab("citations")}
            />
          )}

          {activeRightTab === "citations" && (
            <CitationDrawer
              isOpen={true}
              onClose={() => setActiveRightTab("notes")}
              citations={citations}
              onAddCitation={(cit) => setCitations((prev) => [cit, ...prev])}
              onRemoveCitation={(id) => setCitations((prev) => prev.filter((c) => c.id !== id))}
              onInsertIntoNotes={handleInsertInText}
              activeDocumentTitle={documentTitle}
            />
          )}

          {activeRightTab === "ai_explainer" && (
            <div className="flex flex-col h-full p-5 space-y-4 overflow-y-auto">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Passage AI Breakdown
                </h3>
              </div>

              {isExplaining ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Thinking & extracting key takeaways...
                </div>
              ) : aiExplanation ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                    {aiExplanation}
                  </div>

                  <button
                    onClick={() => {
                      setNoteContent((prev) => `${prev}\n\n### AI Breakdown:\n${aiExplanation}\n`);
                      setActiveRightTab("notes");
                      showToast("Appended breakdown to notes!", "success");
                    }}
                    className="w-full py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Append to Notes
                  </button>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
                  <p>Highlight text on the PDF and click <span className="font-semibold text-indigo-500">Explain</span> to see an instant high-yield exam breakdown.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Selection Toolbar on PDF */}
      <FloatingSelectionToolbar
        coords={selectionCoords}
        onCite={handleCiteSelection}
        onClipToNotes={handleClipToNotes}
        onHighlight={handleHighlight}
        onExplainAi={handleExplainAi}
        onClose={() => setSelectionCoords(null)}
      />

      {/* Document Picker Modal */}
      {showDocumentPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#181922] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Select Document from Library
              </h4>
              <button
                onClick={() => setShowDocumentPicker(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {items.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-400">
                  No materials found in library. Upload a PDF to start!
                </p>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selectItem(item)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">
                        {item.title || item.sourceTitle}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                ))
              )}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setShowDocumentPicker(false);
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload New File</span>
              </button>
              <button
                onClick={() => setShowDocumentPicker(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};

export default DocumentStudio;
