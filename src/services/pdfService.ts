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

/**
 * Robustly extract full text, formulas, cover snapshot, and an AI study summary from a PDF file.
 */
export async function extractPdfContent(file: File): Promise<ExtractedPdfResult> {
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
          await firstPage.render({ canvasContext: ctx, viewport }).promise;
          coverImageUrl = canvas.toDataURL("image/jpeg", 0.85);
        }
      } catch (coverErr) {
        console.warn("Could not generate PDF cover thumbnail:", coverErr);
      }
    }

    const maxPages = Math.min(pageCount, 40); // extract up to first 40 pages
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ")
          .trim();

        if (pageText) {
          fullText += `[Page ${pageNum}]\n${pageText}\n\n`;
        }
      } catch (pageErr) {
        console.warn(`Error reading page ${pageNum}:`, pageErr);
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
        await page.render({ canvasContext: ctx, viewport }).promise;
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
