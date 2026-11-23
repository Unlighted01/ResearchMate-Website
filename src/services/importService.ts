// ============================================
// importService.ts - Shared import & OCR logic
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import { supabase } from "./supabaseClient";
import { addItem, addLocalItem, updateItem, StorageItem } from "./storageService";
import { queuePdfTextExtraction } from "./pdfTextQueue";
import { imageMimeFromSignature } from "./materialFileType";
import { runOcr } from "./ocrService";
import { OCR_B1_ENABLED } from "./ocrB1Config";
import { getLocalOcrPage, saveLocalImage } from "./localOcrStore";
import { LocalOcrQueue, ocrCacheKey, type LocalOcrProgress, type ModelDownloadPrompt } from "./localOcrQueue";
import type { OcrLanguage } from "./localOcrEngine";
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
 * Import a single image locally. The flagged B1 path may then run local OCR.
 */
export async function importImageFile(file: File, options: {
  tags?: string[];
  deviceSource?: StorageItem["deviceSource"];
  language?: OcrLanguage;
  confirmModelDownload?: (request: ModelDownloadPrompt) => Promise<boolean>;
  onOcrProgress?: (event: LocalOcrProgress) => void;
} = {}): Promise<StorageItem> {
  const asset = await saveLocalImage(file, file.name);
  const item = addLocalItem({
    sourceTitle: file.name.replace(/\.[^/.]+$/, "") || "Visual Note",
    text: "Image awaiting OCR review",
    localAssetHash: asset.hash,
    storageScope: "local",
    deviceSource: options.deviceSource || "smart_pen",
    tags: [...new Set([...(options.tags || []), "image", "imported-source", "needs-review"])],
  });

  if (!OCR_B1_ENABLED) return item;
  const job = { sourceHash: asset.hash, pageNumber: 1, language: options.language || "eng", preprocess: "original" as const };
  const queue = new LocalOcrQueue();
  queue.enqueue(job);
  await queue.run({
    confirmDownload: options.confirmModelDownload || (async (request) =>
      typeof window !== "undefined" && window.confirm(
        `Download ${request.language} local OCR files (about ${request.estimatedMiB.toFixed(1)} MiB)?`,
      )),
    onProgress: options.onOcrProgress,
  });
  const page = await getLocalOcrPage(ocrCacheKey(job, "tesseract.js@7.0.0"));
  if (page?.text.trim()) {
    const updates = {
      text: page.text.trim(),
      ocrText: page.text.trim(),
      ocrConfidence: page.confidence,
      tags: [...new Set([...item.tags, "ocr"])],
    };
    await updateItem(item.id, updates);
    return { ...item, ...updates };
  }
  return item;
}

/**
 * Save a PDF locally before queuing text-only extraction.
 */
export async function importPdfFile(
  file: File,
  userId?: string,
  onProgress?: (page: number, total: number, message?: string) => void,
): Promise<StorageItem> {
  const asset = await saveLocalImage(file, file.name);
  const item = addLocalItem({
    sourceTitle: file.name.replace(/\.pdf$/i, ""),
    text: "",
    localPdfHash: asset.hash,
    storageScope: "local",
    deviceSource: "web",
    tags: ["pdf", "imported-source", "pdf-text-pending", `pdf-sha256:${asset.hash}`],
  });
  // The durable original is usable immediately; text-only extraction runs separately.
  void queuePdfTextExtraction(item.id);
  onProgress?.(0, 0, "PDF saved locally. Text extraction queued; OCR remains opt-in.");
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
