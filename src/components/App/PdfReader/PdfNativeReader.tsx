import React, { useState, useEffect, useRef, useCallback } from "react";
// @ts-ignore
import "pdfjs-dist/web/pdf_viewer.css";
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore
import * as pdfjsViewer from "pdfjs-dist/web/pdf_viewer.mjs";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  FileText,
  Upload,
  ZoomIn,
  ZoomOut,
  Download,
  AlertCircle,
  X,
  Highlighter,
  PenTool,
  Loader2,
  MousePointer2
} from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;

function extractFilenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop() || "document";
    return last.endsWith(".pdf") ? last : `${last}.pdf`;
  } catch {
    return "document.pdf";
  }
}

const PdfNativeReader: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [documentTitle, setDocumentTitle] = useState<string>("");
  const [scale, setScale] = useState(1.2);
  const [editorMode, setEditorMode] = useState<number>(0); // 0 = None, 13 = Ink, 15 = Highlight

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const eventBusRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const urlParam = searchParams.get("url");

  // Init PDFViewer
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Assign global to satisfy legacy module bindings internally used by pdf_viewer
    (globalThis as any).pdfjsLib = pdfjsLib;

    const eventBus = new pdfjsViewer.EventBus();
    eventBusRef.current = eventBus;

    const pdfViewer = new pdfjsViewer.PDFViewer({
      container: containerRef.current,
      eventBus,
      textLayerMode: 2, // Enable text selection
      annotationEditorMode: 0, // initially off
    });
    
    viewerRef.current = pdfViewer;

    eventBus.on("pagesinit", () => {
      pdfViewer.currentScaleValue = "auto";
    });

    eventBus.on("scalechanged", (evt: any) => {
      setScale(evt.scale);
    });

    return () => {
      if (pdfDoc) pdfDoc.destroy();
    };
  }, []);

  const loadPdfFromSource = useCallback(async (source: { url?: string; data?: ArrayBuffer; title: string }) => {
    setLoadState("loading");
    setError(null);
    try {
      if (pdfDoc) {
        await pdfDoc.destroy();
      }
      
      const loadingTask = source.url
        ? pdfjsLib.getDocument({ url: source.url, withCredentials: false })
        : pdfjsLib.getDocument({ data: source.data });

      const doc = await loadingTask.promise;
      
      if (viewerRef.current) {
        viewerRef.current.setDocument(doc);
      }
      
      setPdfDoc(doc);
      setDocumentTitle(source.title);
      setLoadState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse PDF");
      setLoadState("error");
    }
  }, [pdfDoc]);

  // Handle URL Loads
  useEffect(() => {
    if (urlParam && loadState === "idle") {
      loadPdfFromSource({ url: urlParam, title: extractFilenameFromUrl(urlParam) });
    }
  }, [urlParam, loadState, loadPdfFromSource]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSearchParams({}, { replace: true });
    const arrayBuffer = await file.arrayBuffer();
    loadPdfFromSource({ data: arrayBuffer, title: file.name });
    e.target.value = "";
  };

  const setMode = (mode: number) => {
    if (viewerRef.current) {
      // PDF.js v4+ setter expects an object with a 'mode' property
      viewerRef.current.annotationEditorMode = { mode };
      setEditorMode(mode);
    }
  };

  const handleDownload = async () => {
    if (!pdfDoc) return;
    try {
      // Natively save the document with the embedded annotations
      const data = await pdfDoc.saveDocument();
      const blob = new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `edited_${documentTitle || "document.pdf"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Save error:", e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PDF Editor</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
            {documentTitle || "Upload or edit an interactive PDF"}
          </p>
        </div>
        <FileText className="w-8 h-8 text-[#007AFF] opacity-50 block" />
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="application/pdf"
        className="hidden"
      />

      {loadState === "idle" && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 theme-surface rounded-2xl border border-gray-200/60 dark:border-white/10">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#007AFF] text-white rounded-full shadow-lg"
          >
            <Upload className="w-4 h-4" /> Upload PDF
          </button>
        </div>
      )}

      {loadState === "loading" && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#007AFF] animate-spin" />
        </div>
      )}

      {/* 
        CRITICAL FIX: The container MUST be in the DOM continuously so `useEffect` 
        can initialize the PDFViewer into it. We hide it when not ready. 
      */}
      <div className={loadState === "ready" ? "block" : "hidden"}>
        <div className="theme-surface rounded-2xl border border-gray-200/60 dark:border-white/10 p-3 flex items-center gap-2 flex-wrap sticky top-0 z-10 backdrop-blur-md mb-4">
          
          {/* Editor Modes */}
          <div className="flex bg-gray-100 dark:bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setMode(0)}
              className={`p-2 rounded-md flex items-center gap-1 transition-all ${
                editorMode === 0 ? "bg-white dark:bg-white/10 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              title="Select Tool"
            >
              <MousePointer2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMode(15)} // Highlight mode
              className={`p-2 rounded-md flex items-center gap-1 transition-all ${
                editorMode === 15 ? "bg-white dark:bg-white/10 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              title="Highlight Tool"
            >
              <Highlighter className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMode(13)} // Ink mode
              className={`p-2 rounded-md flex items-center gap-1 transition-all ${
                editorMode === 13 ? "bg-white dark:bg-white/10 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              title="Draw Tool"
            >
              <PenTool className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => viewerRef.current && (viewerRef.current.currentScale -= 0.2)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500 min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => viewerRef.current && (viewerRef.current.currentScale += 0.2)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF]/20 text-xs font-medium rounded-lg transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Download Edited PDF
          </button>
          <button
            onClick={() => { setLoadState("idle"); setPdfDoc(null); }}
            className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div 
          ref={containerRef} 
          className="absolute inset-x-0 bottom-0 top-[180px] overflow-auto bg-gray-100 dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10"
        >
          <div className="pdfViewer" />
        </div>
      </div>
    </div>
  );
};

export default PdfNativeReader;
