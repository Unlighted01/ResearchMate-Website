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

      if (options?.onProgress && pageNum % 5 === 0) {
        options.onProgress(pageNum, maxPages, `Reading document pages: ${pageNum}/${maxPages}`);
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    // 3. Multi-Page Scanned PDF OCR Fallback:
    // If the PDF contains sparse/scanned pages, run Math Vision OCR across those pages!
    // Supports up to maxOcrPages (default 25 pages)
    const maxOcrPages = options?.maxOcrPages ?? 25;
    const pagesToOcr = sparsePageNumbers.slice(0, maxOcrPages);

    if (pagesToOcr.length > 0 && typeof document !== "undefined") {
      console.log(`🔍 Detected ${pagesToOcr.length} scanned/sparse pages. Executing Vision OCR...`);
      for (let i = 0; i < pagesToOcr.length; i++) {
        const pageNum = pagesToOcr[i];
        if (options?.onProgress) {
          options.onProgress(
            pageNum,
            maxPages,
            `Running Math Vision OCR on scanned page ${pageNum} (${i + 1}/${pagesToOcr.length})...`
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
            const ocr = await runMathOcr(dataUrl);

            const ocrContent = [ocr.latex, ocr.explanation].filter(Boolean).join("\n\n").trim();
            if (ocrContent) {
              const targetSlot = pagesData.find((p) => p.pageNum === pageNum);
              if (targetSlot) {
                targetSlot.text = ocrContent;
                targetSlot.isScanned = false; // Successfully transcribed
              }
              hasVisualMath = true;
            }
          }
        } catch (ocrErr) {
          console.warn(`Vision OCR fallback failed for page ${pageNum}:`, ocrErr);
        }

        // Brief yield to prevent UI freeze between OCR API calls
        await new Promise((r) => setTimeout(r, 50));
      }
    }
  } catch (pdfErr) {
    console.error("PDF parse error:", pdfErr);
  }

  // 4. Assemble the complete document corpus
  const validPages = pagesData.filter((p) => p.text.trim().length > 0);
  let fullText = validPages
    .map((p) => `[Page ${p.pageNum}]\n${p.text}`)
    .join("\n\n");

  const cleanText = fullText.trim() || `PDF Document: ${file.name} (${pageCount} pages). Ready for review.`;

  // 5. Representative Long-Document Summary Synthesis:
  // Instead of naively cutting off at character 5000 (which only covers pages 1-2),
  // sample beginning, middle, and concluding sections if document is long.
  function createRepresentativeSnippet(text: string, maxLen = 6000): string {
    if (text.length <= maxLen) return text;
    const partLen = Math.floor(maxLen / 3);
    const beginning = text.slice(0, partLen);
    const midStart = Math.floor(text.length / 2) - Math.floor(partLen / 2);
    const middle = text.slice(midStart, midStart + partLen);
    const end = text.slice(-partLen);
    return `${beginning}\n\n[... Continuing through core chapters ...]\n\n${middle}\n\n[... Concluding sections ...]\n\n${end}`;
  }

  let summary = "";
  try {
    const summaryExcerpt = createRepresentativeSnippet(cleanText, 6000);
    summary = await generateSummary(summaryExcerpt);
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
