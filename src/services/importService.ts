// ============================================
// importService.ts - Shared import & OCR logic
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import { supabase } from "./supabaseClient";
import { addItem, StorageItem } from "./storageService";
import { extractPdfContent } from "./pdfService";
import { imageMimeFromSignature } from "./materialFileType";
import { runOcr } from "./ocrService";
export { runOcr } from "./ocrService";
export type { OcrResult } from "./ocrService";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

// ============================================
// PART 4: FILE IMPORT FUNCTIONS
// ============================================

/**
 * Read a File as a base64 data URL.
 */
export async function readFileAsDataUrl(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const mime = file.type || imageMimeFromSignature(bytes) || "application/octet-stream";
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file.type ? file : new Blob([file], { type: mime }));
  });
}

/**
 * Import a single image file: run OCR and insert to DB/IndexedDB.
 */
export async function importImageFile(file: File): Promise<void> {
  const base64DataUrl = await readFileAsDataUrl(file);
  const data = await runOcr(base64DataUrl, false);

  if (!data.ocrText?.trim()) {
    throw new Error("No readable text found in image.");
  }

  await addItem({
    sourceTitle: file.name.replace(/\.[^/.]+$/, "") || "Visual Note",
    text: data.ocrText.trim(),
    ocrText: data.ocrText.trim(),
    aiSummary: data.aiSummary || null,
    imageUrl: base64DataUrl,
    deviceSource: "smart_pen",
    ocrConfidence: data.ocrConfidence ?? null,
    tags: ["image", "ocr", "imported-source"],
  });
}

/**
 * Import a PDF file: extract text via pdfService and insert to DB/storage.
 */
export async function importPdfFile(
  file: File,
  userId?: string,
  onProgress?: (page: number, total: number, message?: string) => void,
): Promise<StorageItem> {
  const extracted = await extractPdfContent(file, { onProgress });
  if (!extracted.text.trim()) {
    throw new Error("No readable source text was found. Run OCR or review the scanned pages before generating study material.");
  }

  const item = await addItem({
    sourceTitle: file.name.replace(/\.pdf$/i, ""),
    text: extracted.text,
    aiSummary: extracted.summary,
    imageUrl: extracted.coverImageUrl,
    deviceSource: "web",
    tags: [
      "pdf",
      "imported-source",
      ...(extracted.sourceFingerprint ? [`pdf-sha256:${extracted.sourceFingerprint}`] : []),
      ...(extracted.blankOcrPages.length > 0 ? [`pdf-blank-pages:${extracted.blankOcrPages.join(",")}`] : []),
      ...(extracted.pendingOcrPages.length > 0 || extracted.processedPageCount < extracted.pageCount ? ["partial-ocr"] : []),
    ],
  });

  return item;
}

/**
 * Import a JSON file containing an array of items and insert each to DB.
 * Returns the number of successfully imported items.
 */
export async function importJsonFile(
  file: File,
  userId?: string,
): Promise<number> {
  const text = await file.text();
  const items = JSON.parse(text);
  if (!Array.isArray(items)) throw new Error("Invalid JSON format.");

  const uid = userId || (await supabase.auth.getUser()).data.user?.id;
  let successCount = 0;

  for (const item of items) {
    const { error } = await supabase.from("items").insert({
      user_id: uid,
      text: item.text,
      source_url: item.source_url,
      source_title: item.source_title,
      tags: item.tags,
      ai_summary: item.ai_summary,
      device_source: "web",
    });
    if (!error) successCount++;
  }

  return successCount;
}
