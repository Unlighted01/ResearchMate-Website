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
// @ts-ignore
import "pdfjs-dist/web/pdf_viewer.css";
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
  // Base (scale=1) dimensions per page — computed once at doc load
  const [basePageSizes, setBasePageSizes] = useState<
    Array<{ width: number; height: number }>
  >([]);

  // ---------- PART 5B: REFS ----------
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageInputRef = useRef<HTMLInputElement>(null);
  // One wrapper div per page — populated via callback ref
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  // Track which pages have been rendered at the current scale
  const renderedPagesRef = useRef<Set<number>>(new Set());
  // Active pdfjs render tasks keyed by page number, so we can cancel
  const renderTasksRef = useRef<Map<number, { cancel: () => void }>>(new Map());
  // Loaded pdfjs module (lazy import, reused)
  const pdfjsLibRef = useRef<any>(null);
  // Observer for lazy page rendering
  const observerRef = useRef<IntersectionObserver | null>(null);
  // Flag to suppress scroll-driven currentPage updates during programmatic scroll
  const programmaticScrollRef = useRef(false);

  // Read ?url= from query string
  const urlParam = searchParams.get("url");

  // ---------- PART 5C: PDF LOADING ----------

  const loadPdfFromSource = useCallback(
    async (source: { url?: string; data?: ArrayBuffer; title: string }) => {
      setLoadState("loading");
      setError(null);
      setCurrentPage(1);
      setBasePageSizes([]);
      pageRefs.current.clear();
      renderedPagesRef.current.clear();
      renderTasksRef.current.forEach((t) => t.cancel());
      renderTasksRef.current.clear();

      try {
        const pdfjsLib = await loadPdfJs();
        pdfjsLibRef.current = pdfjsLib;

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

        // Precompute base (scale=1) viewport sizes so we can layout placeholders
        // and scroll without rendering every page upfront.
        const sizes: Array<{ width: number; height: number }> = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          sizes.push({ width: vp.width, height: vp.height });
        }

        setBasePageSizes(sizes);
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

  // ---------- Render a single page into its wrapper ----------
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc) return;
      if (renderedPagesRef.current.has(pageNum)) return;
      const wrapper = pageRefs.current.get(pageNum);
      if (!wrapper) return;
      const pdfjsLib = pdfjsLibRef.current;
      if (!pdfjsLib) return;

      renderedPagesRef.current.add(pageNum);

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        // Guard: component may have unmounted / scale may have changed mid-await
        if (!pageRefs.current.get(pageNum)) return;

        let canvas = wrapper.querySelector(
          "canvas",
        ) as HTMLCanvasElement | null;
        if (!canvas) {
          canvas = document.createElement("canvas");
          canvas.className = "block";
          wrapper.appendChild(canvas);
        }
        let textLayerDiv = wrapper.querySelector(
          ".textLayer",
        ) as HTMLDivElement | null;
        if (!textLayerDiv) {
          textLayerDiv = document.createElement("div");
          textLayerDiv.className = "textLayer";
          wrapper.appendChild(textLayerDiv);
        }

        const context = canvas.getContext("2d");
        if (!context) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Cancel any existing render task for this page
        const prev = renderTasksRef.current.get(pageNum);
        if (prev) prev.cancel();

        const renderTask = page.render({
          canvasContext: context,
          viewport,
        });
        renderTasksRef.current.set(pageNum, renderTask);

        await renderTask.promise;
        renderTasksRef.current.delete(pageNum);

        // --- Text layer ---
        textLayerDiv.innerHTML = "";
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;

        // CRITICAL: pdfjs v5 TextLayer's setLayerDimensions() uses
        // calc(var(--total-scale-factor) * ...) to size its spans.
        // Without these CSS vars, every span has zero width and
        // nothing is selectable.
        wrapper.style.setProperty("--scale-factor", String(scale));
        wrapper.style.setProperty("--text-scale-factor", String(scale));
        wrapper.style.setProperty("--user-unit", "1");
        wrapper.style.setProperty("--total-scale-factor", String(scale));
        wrapper.style.setProperty("--scale-round-x", "1px");
        wrapper.style.setProperty("--scale-round-y", "1px");
        textLayerDiv.style.setProperty("--scale-factor", String(scale));
        textLayerDiv.style.setProperty("--text-scale-factor", String(scale));
        textLayerDiv.style.setProperty("--user-unit", "1");
        textLayerDiv.style.setProperty("--total-scale-factor", String(scale));

        const TextLayerCtor = (pdfjsLib as any).TextLayer;
        if (TextLayerCtor) {
          try {
            const textContentSource =
              typeof (page as any).streamTextContent === "function"
                ? (page as any).streamTextContent({
                    includeMarkedContent: true,
                    disableNormalization: true,
                  })
                : await page.getTextContent();
            const textLayer = new TextLayerCtor({
              textContentSource,
              container: textLayerDiv,
              viewport,
            });
            await textLayer.render();
          } catch {
            // Fall through to manual rendering below
            textLayerDiv.innerHTML = "";
          }
        }

        // Manual fallback: if no selectable spans were produced, build them ourselves
        if (textLayerDiv.querySelectorAll("span").length === 0) {
          textLayerDiv.innerHTML = "";
          const textContent = await page.getTextContent();
          const Util = (pdfjsLib as any).Util;
          textContent.items.forEach((item: any) => {
            if (!item.str) return;
            const tx = Util.transform(
              (viewport as any).transform,
              item.transform,
            );
            const fontHeight = Math.hypot(tx[2], tx[3]);
            if (fontHeight === 0) return;
            const span = document.createElement("span");
            span.textContent = item.str;
            span.style.position = "absolute";
            span.style.left = `${tx[4]}px`;
            span.style.top = `${tx[5] - fontHeight}px`;
            span.style.fontSize = `${fontHeight}px`;
            span.style.fontFamily = "sans-serif";
            span.style.transformOrigin = "0% 0%";
            textLayerDiv!.appendChild(span);
            const rect = span.getBoundingClientRect();
            const expectedWidth = item.width * scale;
            if (rect.width > 0 && expectedWidth > 0) {
              span.style.transform = `scaleX(${expectedWidth / rect.width})`;
            }
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (!msg.toLowerCase().includes("cancel")) {
          console.error(`PDF render error (page ${pageNum}):`, err);
          renderedPagesRef.current.delete(pageNum);
        }
      }
    },
    [pdfDoc, scale],
  );

  // ---------- Intersection observer: render pages as they enter the viewport ----------
  useEffect(() => {
    if (loadState !== "ready" || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(
              entry.target.getAttribute("data-page") || "0",
              10,
            );
            if (pageNum > 0) renderPage(pageNum);
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: "400px 0px",
        threshold: 0.01,
      },
    );

    observerRef.current = observer;
    pageRefs.current.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [loadState, renderPage, basePageSizes]);

  // ---------- Scale change: clear all renders so observer re-renders visible pages ----------
  useEffect(() => {
    if (loadState !== "ready") return;
    // Cancel in-flight renders
    renderTasksRef.current.forEach((t) => t.cancel());
    renderTasksRef.current.clear();
    renderedPagesRef.current.clear();
    // Kick the observer so currently-visible pages re-render
    const observer = observerRef.current;
    if (observer) {
      pageRefs.current.forEach((el) => {
        observer.unobserve(el);
        observer.observe(el);
      });
    }
  }, [scale, loadState]);

  // ---------- Scroll tracking: update currentPage based on which page is most visible ----------
  useEffect(() => {
    const container = containerRef.current;
    if (!container || loadState !== "ready") return;

    let ticking = false;
    const handleScroll = () => {
      if (programmaticScrollRef.current) return;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const rect = container.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        let closest = 1;
        let closestDist = Infinity;
        pageRefs.current.forEach((el, num) => {
          const r = el.getBoundingClientRect();
          const pageCenter = r.top + r.height / 2;
          const dist = Math.abs(pageCenter - centerY);
          if (dist < closestDist) {
            closestDist = dist;
            closest = num;
          }
        });
        setCurrentPage((prev) => (prev === closest ? prev : closest));
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [loadState]);

  // ---------- Scroll a specific page into view ----------
  const scrollToPage = useCallback((pageNum: number) => {
    const el = pageRefs.current.get(pageNum);
    const container = containerRef.current;
    if (!el || !container) return;
    programmaticScrollRef.current = true;
    setCurrentPage(pageNum);
    // Use offsetTop relative to the scroll container for reliable positioning
    const top = el.offsetTop - 16;
    container.scrollTo({ top, behavior: "smooth" });
    // Release the scroll-tracking suppression after the smooth scroll settles
    window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 600);
  }, []);

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
        scrollToPage(Math.max(1, currentPage - 1));
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        scrollToPage(Math.min(totalPages, currentPage + 1));
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
    if (!containerRef.current || basePageSizes.length === 0) return;
    // Use the first page's base width as the reference
    const baseWidth = basePageSizes[0].width;
    const containerWidth = containerRef.current.clientWidth - 48;
    const fitScale = containerWidth / baseWidth;
    setScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, fitScale)));
  }, [basePageSizes]);

  const handlePrevPage = useCallback(() => {
    scrollToPage(Math.max(1, currentPage - 1));
  }, [currentPage, scrollToPage]);

  const handleNextPage = useCallback(() => {
    scrollToPage(Math.min(totalPages, currentPage + 1));
  }, [currentPage, totalPages, scrollToPage]);

  const handlePageJump = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const value = parseInt(pageInputRef.current?.value || "", 10);
      if (!Number.isNaN(value) && value >= 1 && value <= totalPages) {
        scrollToPage(value);
      }
    },
    [totalPages, scrollToPage],
  );

  const handleClose = useCallback(() => {
    renderTasksRef.current.forEach((t) => t.cancel());
    renderTasksRef.current.clear();
    renderedPagesRef.current.clear();
    pageRefs.current.clear();
    if (pdfDoc) pdfDoc.destroy().catch(() => {});
    setPdfDoc(null);
    setLoadState("idle");
    setError(null);
    setCurrentPage(1);
    setTotalPages(0);
    setDocumentTitle("");
    setSourceUrl(null);
    setBasePageSizes([]);
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

          {/* Scroll container — all pages stacked vertically, lazily rendered.
              relative + z-20 + isolation:isolate forces a fresh stacking context
              so background bubble/orb layers can't intercept clicks on the PDF. */}
          <div
            ref={containerRef}
            className="pdf-viewport theme-surface rounded-2xl border border-gray-200/60 dark:border-white/10 p-6 overflow-auto relative z-20"
            style={{
              height: "calc(100vh - 220px)",
              minHeight: "60vh",
              isolation: "isolate",
            }}
          >
            <div className="flex flex-col items-center gap-4">
              {basePageSizes.map((size, idx) => {
                const pageNum = idx + 1;
                return (
                  <div
                    key={pageNum}
                    data-page={pageNum}
                    ref={(el) => {
                      if (el) {
                        pageRefs.current.set(pageNum, el);
                        observerRef.current?.observe(el);
                      } else {
                        pageRefs.current.delete(pageNum);
                      }
                    }}
                    className="pdf-page relative shadow-lg rounded-sm bg-white"
                    style={{
                      width: `${size.width * scale}px`,
                      height: `${size.height * scale}px`,
                      flexShrink: 0,
                    }}
                  />
                );
              })}
            </div>
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
