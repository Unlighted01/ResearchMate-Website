// ============================================
// PdfReader.tsx - In-app PDF reader powered by pdfjs-dist
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  FileText,
  Upload,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
  AlertCircle,
  X,
  Maximize2,
} from "lucide-react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

// Minimal type shape we rely on from pdfjs-dist (avoids importing types at module load)
interface PdfDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
  destroy: () => Promise<void>;
}

interface PdfPageProxy {
  getViewport: (opts: { scale: number }) => {
    width: number;
    height: number;
  };
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void>; cancel: () => void };
  getTextContent: () => Promise<{
    items: Array<{ str: string; transform: number[]; width: number }>;
  }>;
}

type LoadState = "idle" | "loading" | "ready" | "error";

// ============================================
// PART 3: CONSTANTS & CONFIGURATION
// ============================================

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.2;
const DEFAULT_SCALE = 1.2;

// ============================================
// PART 4: HELPER FUNCTIONS
// ============================================

async function loadPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");
  // unpkg mirrors npm exactly, so the version always resolves (cdnjs often lags)
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
  return pdfjsLib;
}

function extractFilenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop() || "document";
    return last.endsWith(".pdf") ? last : `${last}.pdf`;
  } catch {
    return "document.pdf";
  }
}

// ============================================
// PART 5: MAIN COMPONENT
// ============================================

const PdfReader: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ---------- PART 5A: STATE ----------
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PdfDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [documentTitle, setDocumentTitle] = useState<string>("");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  // ---------- PART 5B: REFS ----------
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const pageInputRef = useRef<HTMLInputElement>(null);

  // Read ?url= from query string
  const urlParam = searchParams.get("url");

  // ---------- PART 5C: PDF LOADING ----------

  const loadPdfFromSource = useCallback(
    async (source: { url?: string; data?: ArrayBuffer; title: string }) => {
      setLoadState("loading");
      setError(null);
      setCurrentPage(1);

      try {
        const pdfjsLib = await loadPdfJs();

        // Clean up previous document if any
        if (pdfDoc) {
          await pdfDoc.destroy().catch(() => {});
        }

        const loadingTask = source.url
          ? pdfjsLib.getDocument({
              url: source.url,
              withCredentials: false,
            })
          : pdfjsLib.getDocument({ data: source.data });

        const doc = (await loadingTask.promise) as unknown as PdfDocumentProxy;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setDocumentTitle(source.title);
        setLoadState("ready");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load PDF";
        // CORS errors often surface as generic "Failed to fetch" — explain better
        const friendly = msg.includes("Failed to fetch") || msg.includes("CORS")
          ? "Unable to fetch this PDF directly (CORS blocked). Try downloading it and uploading the file instead."
          : msg;
        setError(friendly);
        setLoadState("error");
      }
    },
    [pdfDoc]
  );

  // ---------- PART 5D: EFFECTS ----------

  // Auto-load from URL query param when it changes
  useEffect(() => {
    if (!urlParam) return;
    setSourceUrl(urlParam);
    loadPdfFromSource({
      url: urlParam,
      title: extractFilenameFromUrl(urlParam),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlParam]);

  // Render current page whenever doc/page/scale changes
  useEffect(() => {
    if (!pdfDoc || loadState !== "ready") return;

    let cancelled = false;

    (async () => {
      try {
        // Cancel any in-flight render
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        // Use devicePixelRatio for crisp rendering on high-DPI screens
        const dpr = window.devicePixelRatio || 1;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderTask = page.render({
          canvasContext: context,
          viewport,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (err) {
        // Ignore cancellation errors
        const msg = err instanceof Error ? err.message : "";
        if (!msg.includes("cancelled") && !cancelled) {
          console.error("PDF render error:", err);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, currentPage, scale, loadState]);

  // Cleanup document on unmount
  useEffect(() => {
    return () => {
      if (pdfDoc) pdfDoc.destroy().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard navigation: arrow keys for pages, +/- for zoom
  useEffect(() => {
    if (loadState !== "ready") return;

    const handleKey = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setCurrentPage((p) => Math.max(1, p - 1));
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        setCurrentPage((p) => Math.min(totalPages, p + 1));
      } else if ((e.key === "+" || e.key === "=") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP));
      } else if (e.key === "-" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP));
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [loadState, totalPages]);

  // ---------- PART 5E: HANDLERS ----------

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Please select a PDF file");
        setLoadState("error");
        return;
      }

      setSourceUrl(null);
      // Clear URL param so the file load doesn't get overridden
      if (urlParam) {
        setSearchParams({}, { replace: true });
      }

      const arrayBuffer = await file.arrayBuffer();
      loadPdfFromSource({ data: arrayBuffer, title: file.name });
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [loadPdfFromSource, urlParam, setSearchParams]
  );

  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP));
  }, []);

  const handleFitWidth = useCallback(() => {
    if (!pdfDoc || !containerRef.current) return;
    (async () => {
      const page = await pdfDoc.getPage(currentPage);
      const baseViewport = page.getViewport({ scale: 1 });
      const containerWidth = (containerRef.current?.clientWidth || 800) - 48;
      const fitScale = containerWidth / baseViewport.width;
      setScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, fitScale)));
    })();
  }, [pdfDoc, currentPage]);

  const handlePrevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const handlePageJump = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const value = parseInt(pageInputRef.current?.value || "", 10);
      if (!Number.isNaN(value) && value >= 1 && value <= totalPages) {
        setCurrentPage(value);
      }
    },
    [totalPages]
  );

  const handleClose = useCallback(() => {
    if (pdfDoc) pdfDoc.destroy().catch(() => {});
    setPdfDoc(null);
    setLoadState("idle");
    setError(null);
    setCurrentPage(1);
    setTotalPages(0);
    setDocumentTitle("");
    setSourceUrl(null);
    if (urlParam) setSearchParams({}, { replace: true });
  }, [pdfDoc, urlParam, setSearchParams]);

  const handleDownload = useCallback(() => {
    if (sourceUrl) {
      window.open(sourceUrl, "_blank", "noopener,noreferrer");
    }
  }, [sourceUrl]);

  // ---------- PART 5F: DERIVED STATE ----------

  const scalePercent = useMemo(() => Math.round(scale * 100), [scale]);

  // ---------- PART 5G: RENDER ----------

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            PDF Reader
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
            {documentTitle || "Upload a PDF or open one from Discover"}
          </p>
        </div>
        <FileText className="w-8 h-8 text-[#007AFF] opacity-50 flex-shrink-0" />
      </div>

      {/* Empty State — Upload prompt */}
      {loadState === "idle" && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 theme-surface rounded-2xl border border-gray-200/60 dark:border-white/10">
          <div className="w-16 h-16 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-[#007AFF]" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Open a PDF
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
              Upload a PDF file from your computer, or open papers directly
              from the Discover page.
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium text-sm rounded-full shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all active:scale-95"
          >
            <Upload className="w-4 h-4" />
            Upload PDF
          </button>
          <button
            onClick={() => navigate("/app/discover")}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-[#007AFF] transition-colors"
          >
            Or browse papers on Discover →
          </button>
        </div>
      )}

      {/* Loading State */}
      {loadState === "loading" && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 theme-surface rounded-2xl border border-gray-200/60 dark:border-white/10">
          <Loader2 className="w-10 h-10 text-[#007AFF] animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading PDF...
          </p>
        </div>
      )}

      {/* Error State */}
      {loadState === "error" && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 theme-surface rounded-2xl border border-red-200/60 dark:border-red-900/30">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <p className="text-sm text-gray-700 dark:text-gray-300 max-w-md text-center">
            {error || "Failed to load PDF"}
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-[#007AFF] hover:bg-[#0066DD] text-white text-sm font-medium rounded-full transition-all active:scale-95"
            >
              <Upload className="w-4 h-4" />
              Upload PDF
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reader — Toolbar + Canvas */}
      {loadState === "ready" && pdfDoc && (
        <>
          {/* Toolbar */}
          <div className="theme-surface rounded-2xl border border-gray-200/60 dark:border-white/10 p-3 flex items-center gap-2 flex-wrap sticky top-0 z-10 backdrop-blur-md">
            {/* Page Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <form onSubmit={handlePageJump} className="flex items-center gap-1">
                <input
                  ref={pageInputRef}
                  key={currentPage}
                  type="text"
                  defaultValue={currentPage}
                  className="w-12 px-2 py-1 text-xs text-center rounded-md border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40"
                  aria-label="Page number"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  / {totalPages}
                </span>
              </form>

              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleZoomOut}
                disabled={scale <= MIN_SCALE}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[40px] text-center tabular-nums">
                {scalePercent}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={scale >= MAX_SCALE}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleFitWidth}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                aria-label="Fit to width"
                title="Fit to width"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1" />

            {/* Right side actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-[#007AFF] hover:bg-[#007AFF]/5 rounded-lg transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                Open
              </button>
              {sourceUrl && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-[#007AFF] hover:bg-[#007AFF]/5 rounded-lg transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all"
                aria-label="Close document"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div
            ref={containerRef}
            className="theme-surface rounded-2xl border border-gray-200/60 dark:border-white/10 p-6 flex justify-center overflow-auto"
            style={{ minHeight: "60vh" }}
          >
            <canvas
              ref={canvasRef}
              className="shadow-lg rounded-sm"
              style={{ maxWidth: "100%" }}
            />
          </div>

          {/* Hint */}
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Use ← → arrow keys to navigate pages · Ctrl/Cmd +/− to zoom
          </p>
        </>
      )}

      {/* Hidden file input */}
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

// ============================================
// PART 6: EXPORTS
// ============================================

export default PdfReader;
