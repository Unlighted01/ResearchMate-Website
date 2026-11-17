// ============================================
// PDF SERVICE - High-Reliability Local PDF Text & Math Extraction
// Uses same-origin bundled worker with canvas OCR fallback for scanned books
// ============================================

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { generateSummary } from "./geminiService";
import { runOcr } from "./ocrService";
import { createRepresentativeSnippet } from "./ragService";

export { createRepresentativeSnippet };

// Configure same-origin bundled worker (bypasses unpkg CORS and Brave Shield blocks)
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export interface ExtractedPdfResult {
  text: string;
  summary: string;
  pageCount: number;
  processedPageCount: number;
  pendingOcrPages: number[];
  hasVisualMath: boolean;
  coverImageUrl?: string;
}

export interface PdfLayoutItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName?: string;
  hasEOL?: boolean;
}

export interface PdfPageWithLayout {
  pageNumber: number;
  text: string;
  items: PdfLayoutItem[];
  extractionMethod?: "text_layer" | "ocr" | "unreadable";
  ocrConfidence?: number;
  extractionError?: string;
}

export interface FullPdfExtractionResult {
  pageCount: number;
  pages: PdfPageWithLayout[];
  fullText: string;
  ocrPages?: number[];
  pendingOcrPages?: number[];
  unreadablePages?: number[];
}

export function assemblePdfSourceText(pages: PdfPageWithLayout[]): string {
  return pages.filter((page) => page.text.trim()).map((page) =>
    `[Page ${page.pageNumber}]\n${page.text.trim()}`
  ).join("\n\n");
}

export function planOcrPages(pages: PdfPageWithLayout[], maxOcrPages: number = 15): {
  selected: number[];
  pending: number[];
} {
  const substantiveTextPages = pages.filter((page) => page.text.trim().length >= 40).length;
  const scannedDocument = substantiveTextPages === 0 || (pages.length >= 3 && substantiveTextPages / pages.length < 0.2);
  if (!scannedDocument) return { selected: [], pending: [] };
  const sparse = pages.filter((page) => page.text.trim().length < 40).map((page) => page.pageNumber);
  const limit = Math.max(0, maxOcrPages);
  return { selected: sparse.slice(0, limit), pending: sparse.slice(limit) };
}

export async function hydrateOcrPages(
  pages: PdfPageWithLayout[],
  pageNumbers: number[],
  readPage: (pageNumber: number) => Promise<{ text: string; confidence?: number }>,
  onPage?: (pageNumber: number) => void,
): Promise<void> {
  for (const pageNumber of pageNumbers) {
    const target = pages.find((page) => page.pageNumber === pageNumber);
    if (!target) continue;
    try {
      const result = await readPage(pageNumber);
      if (!result.text?.trim()) throw new Error("OCR returned no readable text");
      target.text = result.text.trim();
      target.extractionMethod = "ocr";
      target.ocrConfidence = result.confidence;
    } catch (error: any) {
      target.extractionMethod = "unreadable";
      target.extractionError = error?.message || String(error);
    }
    onPage?.(pageNumber);
  }
}

/**
 * Extracts all pages of a PDF along with text-item 2D layout coordinates.
 * Essential for the No-AI question importer (stacked fractions, multi-column analysis).
 */
export async function extractAllPagesWithLayout(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  onProgress?: (current: number, total: number) => void,
  options?: { ocrSparsePages?: boolean; maxOcrPages?: number }
): Promise<FullPdfExtractionResult> {
  const arrayBuffer =
    fileOrBuffer instanceof ArrayBuffer
      ? fileOrBuffer
      : fileOrBuffer instanceof Uint8Array
      ? fileOrBuffer.buffer
      : await fileOrBuffer.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const pages: PdfPageWithLayout[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const pageHeight = viewport.height || 792;
      const textContent = await page.getTextContent();
      const items: PdfLayoutItem[] = [];

      for (const item of textContent.items as any[]) {
        if (!item.str && !item.hasEOL) continue;
        const transform = item.transform || [1, 0, 0, 1, 0, 0];
        const x = transform[4] ?? 0;
        const y = transform[5] ?? 0;
        const width = item.width ?? 0;
        const height = item.height || Math.abs(transform[3]) || 12;

        items.push({
          str: item.str || "",
          x,
          y,
          width,
          height,
          fontName: item.fontName,
          hasEOL: item.hasEOL,
        });
      }

      // Check if top-of-page banner/header items were emitted late in the content stream.
      // In many published books (e.g. LearningExpress), the top chapter banner is emitted at the end of the stream after the body.
      let pageRawText = "";
      const bannerKeywordIndices = items
        .map((it, idx) => ({ it, idx }))
        .filter(
          ({ it }) =>
            it.str.length < 35 &&
            !/[,\.;]$/.test(it.str.trim()) &&
            !it.str.includes("::") &&
            !it.str.includes("______") &&
            !it.str.includes("?") &&
            !/^\d{1,4}[\.\)]/.test(it.str.trim()) &&
            !/^[a-eA-E][\.\)]/.test(it.str.trim()) &&
            /\b(?:Practice|Review|Chapter|Section|Unit|Lesson|Set)\b/i.test(it.str) &&
            it.y > 450
        );

      const hasLateEmittedBanner = bannerKeywordIndices.some(({ it, idx }) =>
        items.slice(0, idx).some((prev) => prev.str.trim().length > 0 && prev.y < it.y - 30)
      );

      if (hasLateEmittedBanner && bannerKeywordIndices.length > 0) {
        const bannerThreshold = Math.min(...bannerKeywordIndices.map(({ it }) => it.y)) - 5;
        const bannerItems = items.filter(
          (it) =>
            it.y >= bannerThreshold &&
            !it.str.includes("::") &&
            !it.str.includes("______") &&
            !it.str.includes("?") &&
            !/^\d{1,4}[\.\)]/.test(it.str.trim()) &&
            !/^[a-eA-E][\.\)]/.test(it.str.trim())
        );
        const bodyItems = items.filter((it) => !bannerItems.includes(it));
        const bodyTextItems = bodyItems.filter((it) => it.str.trim().length > 0);
        if (bannerItems.length > 0 && bodyTextItems.length > 0) {
          const minBannerY = Math.min(...bannerItems.map((it) => it.y));
          const maxBodyY = Math.max(...bodyTextItems.map((it) => it.y));

          if (minBannerY - maxBodyY > 15) {
            const bannerSorted = [...bannerItems].sort((a, b) => {
              const yDiff = b.y - a.y;
              if (Math.abs(yDiff) > 4) return yDiff;
              return a.x - b.x;
            });

            let bannerText = "";
            let lastY: number | null = null;
            for (const item of bannerSorted) {
              if (lastY !== null && Math.abs(item.y - lastY) > 4) {
                bannerText += "\n";
              } else if (bannerText.length > 0 && !bannerText.endsWith("\n") && !bannerText.endsWith(" ")) {
                bannerText += " ";
              }
              bannerText += item.str;
              lastY = item.y;
            }

            let bodyText = "";
            for (const item of bodyItems) {
              bodyText += (item.str || "") + (item.hasEOL ? "\n" : " ");
            }

            pageRawText = `${bannerText.trim()}\n${bodyText.trim()}`.trim();
          }
        }
      }

      if (!pageRawText) {
        for (const item of items) {
          pageRawText += (item.str || "") + (item.hasEOL ? "\n" : " ");
        }
      }

      const cleanPageText = pageRawText.trim();
      pages.push({
        pageNumber: pageNum,
        text: cleanPageText,
        items,
        extractionMethod: cleanPageText ? "text_layer" : "unreadable",
      });

    } catch (pageErr) {
      console.warn(`Error extracting layout for page ${pageNum}:`, pageErr);
    }

    if (onProgress) {
      onProgress(pageNum, pageCount);
      // Yield to event loop to keep UI responsive
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  const ocrPlan = options?.ocrSparsePages ? planOcrPages(pages, options.maxOcrPages) : { selected: [], pending: [] };
  if (ocrPlan.selected.length > 0 && typeof document !== "undefined") {
    await hydrateOcrPages(pages, ocrPlan.selected, async (pageNumber) => {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: Math.min(2, Math.max(1, 1200 / page.getViewport({ scale: 1 }).width)) });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas rendering is unavailable");
        await page.render({ canvasContext: context, viewport, canvas } as any).promise;
        const result = await runOcr(canvas.toDataURL("image/jpeg", 0.85), false);
        return { text: result.ocrText, confidence: result.ocrConfidence };
    }, (pageNumber) => onProgress?.(pageNumber, pageCount));
  }

  if (onProgress) {
    onProgress(pageCount, pageCount);
  }

  return {
    pageCount,
    pages,
    fullText: assemblePdfSourceText(pages),
    ocrPages: pages.filter((page) => page.extractionMethod === "ocr").map((page) => page.pageNumber),
    pendingOcrPages: typeof document === "undefined" ? [...ocrPlan.selected, ...ocrPlan.pending] : ocrPlan.pending,
    unreadablePages: pages.filter((page) => page.extractionMethod === "unreadable" && page.extractionError).map((page) => page.pageNumber),
  };
}

/**
 * Robustly extract full text, formulas, cover snapshot, and an AI study summary from a PDF file.
 * Supports multi-page scanned document OCR with canvas rendering and representative long-document summaries.
 */
export async function extractPdfContent(
  file: File,
  options?: {
    maxPages?: number;
    maxOcrPages?: number;
    onProgress?: (page: number, total: number, message?: string) => void;
  }
): Promise<ExtractedPdfResult> {
  const arrayBuffer = await file.arrayBuffer();
  let pageCount = 0;
  let hasVisualMath = false;
  let coverImageUrl: string | undefined;
  let processedPageCount = 0;
  let isScannedDocument = false;
  const pagesData: { pageNum: number; text: string; isScanned?: boolean }[] = [];
  const sparsePageNumbers: number[] = [];

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
    });
    const pdf = await loadingTask.promise;
    pageCount = pdf.numPages;

    // 1. Generate crisp Page 1 Cover Snapshot (rendered to client canvas)
    if (pageCount > 0 && typeof document !== "undefined") {
      try {
        const firstPage = await pdf.getPage(1);
        const unscaledViewport = firstPage.getViewport({ scale: 1.0 });
        const targetWidth = 520;
        const scale = Math.min(Math.max(targetWidth / unscaledViewport.width, 0.75), 1.8);
        const viewport = firstPage.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          await firstPage.render({ canvasContext: ctx, viewport } as any).promise;
          coverImageUrl = canvas.toDataURL("image/jpeg", 0.85);
        }
      } catch (coverErr) {
        console.warn("Could not generate PDF cover thumbnail:", coverErr);
      }
    }

    // 2. Extract text layer from all pages
    const maxPages = options?.maxPages ? Math.min(pageCount, options.maxPages) : pageCount;
    processedPageCount = maxPages;
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      let pageText = "";
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        for (const item of textContent.items as any[]) {
          if (!item.str && !item.hasEOL) continue;
          pageText += (item.str || "") + (item.hasEOL ? "\n" : " ");
        }
        pageText = pageText.trim();
      } catch (pageErr) {
        console.warn(`Error reading page ${pageNum}:`, pageErr);
      }

      // Detect pages with negligible text (scanned page, handwriting, diagram, formula sheet)
      const isSparse = pageText.length < 40;
      if (isSparse) {
        sparsePageNumbers.push(pageNum);
      }

      pagesData.push({
        pageNum,
        text: pageText,
        isScanned: isSparse,
      });

      if (options?.onProgress) {
        options.onProgress(pageNum, maxPages, `Reading document pages: ${pageNum}/${maxPages}`);
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    // 3. Multi-Page Scanned PDF OCR Fallback:
    // Only execute Math Vision OCR if the document is genuinely scanned or image-based
    // (i.e. zero or negligible extracted text across the document, e.g. < 20% of pages have selectable text).
    // Never run OCR on standard digital textbooks where sparse pages are simply blanks/section dividers.
    const textPageCount = pagesData.filter((p) => p.text.length >= 40).length;
    isScannedDocument =
      textPageCount === 0 || (maxPages >= 3 && textPageCount / maxPages < 0.2);

    const maxOcrPages = options?.maxOcrPages ?? 15;
    const pagesToOcr = isScannedDocument ? sparsePageNumbers.slice(0, maxOcrPages) : [];

    if (pagesToOcr.length > 0 && typeof document !== "undefined") {
      console.log(`🔍 Detected genuinely scanned document (${pagesToOcr.length} sparse pages). Executing Vision OCR...`);
      let consecutiveOcrFailures = 0;

      for (let i = 0; i < pagesToOcr.length; i++) {
        // Circuit breaker: if 2 consecutive OCR calls fail or rate limited, break early
        if (consecutiveOcrFailures >= 2) {
          console.warn("Stopping Vision OCR fallback early due to consecutive upstream failures.");
          break;
        }

        const pageNum = pagesToOcr[i];
        if (options?.onProgress) {
          options.onProgress(
            pageNum,
            maxPages,
            `Reading scanned page ${pageNum} with OCR (${i + 1}/${pagesToOcr.length})...`
          );
        }

        try {
          const page = await pdf.getPage(pageNum);
          const unscaledViewport = page.getViewport({ scale: 1.0 });
          // Scale to 1200px width for high OCR clarity
          const targetOcrWidth = 1200;
          const scale = Math.min(Math.max(targetOcrWidth / unscaledViewport.width, 1.0), 2.0);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport } as any).promise;
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            const ocr = await runOcr(dataUrl, false);
            const ocrContent = ocr.ocrText?.trim() || "";
            if (ocrContent) {
              const targetSlot = pagesData.find((p) => p.pageNum === pageNum);
              if (targetSlot) {
                targetSlot.text = ocrContent;
                targetSlot.isScanned = false; // Successfully transcribed
              }
              hasVisualMath = hasVisualMath || /\\(?:frac|sqrt|sum|int)\b|[=^×÷]/.test(ocrContent);
              consecutiveOcrFailures = 0;
            } else {
              consecutiveOcrFailures++;
            }
          }
        } catch (ocrErr: any) {
          consecutiveOcrFailures++;
          console.warn(`Vision OCR fallback bypassed for page ${pageNum}:`, ocrErr?.message || ocrErr);
          if (String(ocrErr?.message).includes("429")) {
            break;
          }
        }

        // 300ms yield between OCR API calls to prevent API rate-limiting
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  } catch (pdfErr) {
    console.error("PDF parse error:", pdfErr);
  }

  // 4. Assemble the complete document corpus
  const validPages = pagesData.filter((p) => p.text.trim().length > 0);
  const pendingOcrPages = isScannedDocument
    ? pagesData.filter((page) => page.isScanned).map((page) => page.pageNum)
    : [];
  const fullText = validPages
    .map((p) => `[Page ${p.pageNum}]\n${p.text}`)
    .join("\n\n");

  const cleanText = fullText.trim();

  // 5. Representative Long-Document Summary Synthesis:
  // Instead of naively cutting off at character 5000 (which only covers pages 1-2),
  // sample beginning, middle, and concluding sections if document is long.
  let summary = "";
  try {
    if (options?.onProgress) {
      options.onProgress(pageCount, pageCount, `Synthesizing study summary...`);
      await new Promise((r) => setTimeout(r, 0));
    }
    if (cleanText) {
      const summaryExcerpt = createRepresentativeSnippet(cleanText, 6000);
      summary = await generateSummary(summaryExcerpt);
    }
  } catch {
    summary = "";
  }

  if (options?.onProgress) {
    options.onProgress(pageCount, pageCount, `Extraction complete`);
  }

  return {
    text: cleanText,
    summary,
    pageCount,
    processedPageCount,
    pendingOcrPages,
    hasVisualMath,
    coverImageUrl,
  };
}
