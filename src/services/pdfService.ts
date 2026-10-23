// ============================================
// PDF SERVICE - High-Reliability Local PDF Text & Math Extraction
// Uses same-origin bundled worker with canvas OCR fallback for scanned books
// ============================================

import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { runMathOcr, generateSummary } from "./geminiService";

// Configure same-origin bundled worker (bypasses unpkg CORS and Brave Shield blocks)
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export interface ExtractedPdfResult {
  text: string;
  summary: string;
  pageCount: number;
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
}

export interface FullPdfExtractionResult {
  pageCount: number;
  pages: PdfPageWithLayout[];
  fullText: string;
}

/**
 * Extracts all pages of a PDF along with text-item 2D layout coordinates.
 * Essential for the No-AI question importer (stacked fractions, multi-column analysis).
 */
export async function extractAllPagesWithLayout(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<FullPdfExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const pages: PdfPageWithLayout[] = [];
  let fullText = "";

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items: PdfLayoutItem[] = [];

      let pageRawText = "";
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

        pageRawText += (item.str || "") + (item.hasEOL ? "\n" : " ");
      }

      const cleanPageText = pageRawText.trim();
      pages.push({
        pageNumber: pageNum,
        text: cleanPageText,
        items,
      });

      if (cleanPageText) {
        fullText += `[Page ${pageNum}]\n${cleanPageText}\n\n`;
      }
    } catch (pageErr) {
      console.warn(`Error extracting layout for page ${pageNum}:`, pageErr);
    }

    if (onProgress && pageNum % 5 === 0) {
      onProgress(pageNum, pageCount);
      // Yield to event loop to keep UI responsive
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  if (onProgress) {
    onProgress(pageCount, pageCount);
  }

  return {
    pageCount,
    pages,
    fullText: fullText.trim(),
  };
}

/**
 * Robustly extract full text, formulas, cover snapshot, and an AI study summary from a PDF file.
 */
export async function extractPdfContent(
  file: File,
  options?: { maxPages?: number; onProgress?: (page: number, total: number) => void }
): Promise<ExtractedPdfResult> {
  const arrayBuffer = await file.arrayBuffer();
  let fullText = "";
  let pageCount = 0;
  let hasVisualMath = false;
  let coverImageUrl: string | undefined;

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

    // Default to extracting the entire document (or user specified limit)
    const maxPages = options?.maxPages ? Math.min(pageCount, options.maxPages) : pageCount;
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        let pageText = "";
        for (const item of textContent.items as any[]) {
          if (!item.str && !item.hasEOL) continue;
          pageText += (item.str || "") + (item.hasEOL ? "\n" : " ");
        }
        pageText = pageText.trim();

        if (pageText) {
          fullText += `[Page ${pageNum}]\n${pageText}\n\n`;
        }
      } catch (pageErr) {
        console.warn(`Error reading page ${pageNum}:`, pageErr);
      }

      if (options?.onProgress && pageNum % 10 === 0) {
        options.onProgress(pageNum, maxPages);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  } catch (pdfErr) {
    console.error("PDF parse error:", pdfErr);
  }

  // If text extraction yielded very little text (e.g. scanned math book / image pages),
  // render the first page to a canvas and run Math Vision OCR!
  if (fullText.trim().length < 50 && pageCount > 0) {
    try {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport } as any).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const ocr = await runMathOcr(dataUrl);
        if (ocr.latex || ocr.explanation) {
          fullText = `${ocr.latex}\n\n${ocr.explanation}`;
          hasVisualMath = true;
        }
      }
    } catch (ocrErr) {
      console.warn("Visual OCR fallback failed:", ocrErr);
    }
  }

  const cleanText = fullText.trim() || `PDF Document: ${file.name} (${pageCount} pages). Ready for review.`;

  // Generate executive summary via Gemini
  let summary = "";
  try {
    summary = await generateSummary(cleanText.slice(0, 5000));
  } catch {
    summary = `Synthesized review index for ${file.name} (${pageCount} pages)`;
  }

  return {
    text: cleanText,
    summary,
    pageCount,
    hasVisualMath,
    coverImageUrl,
  };
}
