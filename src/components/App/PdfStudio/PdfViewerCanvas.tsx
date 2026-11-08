// ============================================
// PDF VIEWER CANVAS
// Virtualized, high-performance PDF renderer with
// text selection tracking, zoom controls, and highlight overlays
// ============================================

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
// @ts-ignore
import "pdfjs-dist/web/pdf_viewer.css";
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Upload,
  Maximize2,
  FileText,
} from "lucide-react";
import { SelectionCoordinates } from "./FloatingSelectionToolbar";

interface PdfDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
  destroy: () => Promise<void>;
}

interface PdfPageProxy {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void>; cancel: () => void };
  getTextContent: () => Promise<{
    items: Array<{ str: string; transform: number[]; width: number }>;
  }>;
}

type LoadState = "idle" | "loading" | "ready" | "error";

const MIN_SCALE = 0.6;
const MAX_SCALE = 2.6;
const SCALE_STEP = 0.2;
const DEFAULT_SCALE = 1.15;

async function loadPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");
  const { default: pdfWorker } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  }
  return pdfjsLib;
}

interface PdfViewerCanvasProps {
  initialUrl?: string | null;
  fileData?: ArrayBuffer | null;
  fileName?: string;
  onSelectionChange?: (coords: SelectionCoordinates | null) => void;
  onPageChange?: (currentPage: number, totalPages: number) => void;
  onOpenUploadDialog?: () => void;
}

export const PdfViewerCanvas: React.FC<PdfViewerCanvasProps> = ({
  initialUrl,
  fileData,
  fileName,
  onSelectionChange,
  onPageChange,
  onOpenUploadDialog,
}) => {
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PdfDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [basePageSizes, setBasePageSizes] = useState<
    Array<{ width: number; height: number }>
  >([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const renderedPagesRef = useRef<Set<number>>(new Set());
  const renderTasksRef = useRef<Map<number, { cancel: () => void }>>(new Map());
  const pdfjsLibRef = useRef<any>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Load PDF Source
  const loadDocument = useCallback(
    async (source: { url?: string; data?: ArrayBuffer }) => {
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

        if (pdfDoc) {
          await pdfDoc.destroy().catch(() => {});
        }

        const loadingTask = source.url
          ? pdfjsLib.getDocument({ url: source.url, withCredentials: false })
          : pdfjsLib.getDocument({ data: source.data });

        const doc = (await loadingTask.promise) as unknown as PdfDocumentProxy;

        const sizes: Array<{ width: number; height: number }> = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          sizes.push({ width: vp.width, height: vp.height });
        }

        setBasePageSizes(sizes);
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setLoadState("ready");
        onPageChange?.(1, doc.numPages);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load PDF";
        setError(msg);
        setLoadState("error");
      }
    },
    [pdfDoc, onPageChange]
  );

  useEffect(() => {
    if (fileData) {
      loadDocument({ data: fileData });
    } else if (initialUrl) {
      loadDocument({ url: initialUrl });
    }
  }, [fileData, initialUrl]);

  // Render Page
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

        if (!pageRefs.current.get(pageNum)) return;

        let canvas = wrapper.querySelector("canvas") as HTMLCanvasElement | null;
        if (!canvas) {
          canvas = document.createElement("canvas");
          canvas.className = "block";
          wrapper.appendChild(canvas);
        }

        let textLayerDiv = wrapper.querySelector(".textLayer") as HTMLDivElement | null;
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

        const prev = renderTasksRef.current.get(pageNum);
        if (prev) prev.cancel();

        const renderTask = page.render({ canvasContext: context, viewport });
        renderTasksRef.current.set(pageNum, renderTask);

        await renderTask.promise;
        renderTasksRef.current.delete(pageNum);

        textLayerDiv.innerHTML = "";
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;

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
            textLayerDiv.innerHTML = "";
          }
        }
      } catch (err) {
        renderedPagesRef.current.delete(pageNum);
      }
    },
    [pdfDoc, scale]
  );

  // Intersection observer for lazy rendering
  useEffect(() => {
    if (loadState !== "ready" || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute("data-page") || "0", 10);
            if (pageNum > 0) {
              renderPage(pageNum);
              setCurrentPage(pageNum);
              onPageChange?.(pageNum, totalPages);
            }
          }
        });
      },
      { root: containerRef.current, rootMargin: "300px 0px", threshold: 0.05 }
    );

    observerRef.current = observer;
    pageRefs.current.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [loadState, renderPage, basePageSizes, totalPages, onPageChange]);

  // Scale change
  useEffect(() => {
    if (loadState !== "ready") return;
    renderTasksRef.current.forEach((t) => t.cancel());
    renderTasksRef.current.clear();
    renderedPagesRef.current.clear();
    const observer = observerRef.current;
    if (observer) {
      pageRefs.current.forEach((el) => {
        observer.unobserve(el);
        observer.observe(el);
      });
    }
  }, [scale, loadState]);

  // Selection Handler
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      onSelectionChange?.(null);
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      onSelectionChange?.(null);
      return;
    }

    // Determine page from anchorNode parent
    let node: Node | null = selection.anchorNode;
    let pageNum = currentPage;
    while (node && node !== containerRef.current) {
      if (node instanceof HTMLElement && node.hasAttribute("data-page")) {
        pageNum = parseInt(node.getAttribute("data-page") || String(currentPage), 10);
        break;
      }
      node = node.parentNode;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    onSelectionChange?.({
      top: rect.top,
      left: rect.left + rect.width / 2 - 120,
      text,
      pageNumber: pageNum,
    });
  };

  const handleZoomIn = () => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
  const handleZoomOut = () => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
  const handleResetZoom = () => setScale(DEFAULT_SCALE);

  const scrollToPage = (pageNum: number) => {
    const target = pageRefs.current.get(pageNum);
    if (target && containerRef.current) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100/80 dark:bg-[#0c0d12] select-text">
      {/* Canvas Top Bar */}
      <div className="px-3 py-2 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#14151c]/80 backdrop-blur-sm flex items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
            {fileName || "PDF Reviewer"}
          </span>
        </div>

        {/* Navigation & Zoom controls */}
        {loadState === "ready" && (
          <div className="flex items-center gap-1.5">
            {/* Page Navigator */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-lg text-xs font-mono">
              <button
                onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="p-1 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-inherit"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-slate-800 dark:text-slate-200 font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => scrollToPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-inherit"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-1 py-0.5 rounded-lg text-xs font-mono">
              <button
                onClick={handleZoomOut}
                disabled={scale <= MIN_SCALE}
                className="p-1 hover:text-indigo-600 disabled:opacity-30"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-1 text-[11px] font-medium hover:text-indigo-600"
                title="Reset Zoom"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={scale >= MAX_SCALE}
                className="p-1 hover:text-indigo-600 disabled:opacity-30"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Canvas Viewport */}
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="flex-1 overflow-auto p-4 flex flex-col items-center gap-4 relative"
      >
        {loadState === "loading" && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span>Loading PDF pages...</span>
          </div>
        )}

        {loadState === "error" && (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-sm text-xs">
            <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
            <p className="font-semibold text-slate-900 dark:text-white">Unable to render PDF</p>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{error}</p>
            {onOpenUploadDialog && (
              <button
                onClick={onOpenUploadDialog}
                className="mt-3 px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700"
              >
                Open another file
              </button>
            )}
          </div>
        )}

        {loadState === "idle" && (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs text-slate-400">
            <FileText className="w-10 h-10 stroke-[1.5] text-slate-300 dark:text-slate-700 mb-2" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No document open</p>
            <p className="mt-1 text-slate-400">Select a material from your library or upload a PDF.</p>
            {onOpenUploadDialog && (
              <button
                onClick={onOpenUploadDialog}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload PDF</span>
              </button>
            )}
          </div>
        )}

        {loadState === "ready" &&
          basePageSizes.map((size, idx) => {
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
                className="pdf-page relative shadow-md rounded-xs bg-white"
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
  );
};
