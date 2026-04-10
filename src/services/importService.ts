// ============================================
// importService.ts - Shared import & OCR logic
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import { supabase } from "./supabaseClient";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

export interface OcrResult {
  ocrText: string;
  ocrConfidence?: number;
  aiSummary?: string;
  ocrProvider?: string;
}

// ============================================
// PART 3: OCR SERVICE
// ============================================

/**
 * Run OCR on a base64 data URL image via the /api/ocr endpoint.
 */
export async function runOcr(
  imageDataUrl: string,
  includeSummary: boolean = false,
): Promise<OcrResult> {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const response = await fetch("/api/ocr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ image: imageDataUrl, includeSummary }),
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error || "Failed to extract text from image");
  }

  return response.json();
}

// ============================================
// PART 4: FILE IMPORT FUNCTIONS
// ============================================

/**
 * Read a File as a base64 data URL.
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Import a single image file: run OCR and insert to DB.
 */
export async function importImageFile(file: File): Promise<void> {
  const base64DataUrl = await readFileAsDataUrl(file);
  const data = await runOcr(base64DataUrl, false);

  if (!data.ocrText?.trim()) {
    throw new Error("No readable text found in image.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("items").insert({
    user_id: user?.id,
    text: data.ocrText.trim(),
    source_title: file.name,
    device_source: "smart_pen",
    ocr_confidence: data.ocrConfidence ?? null,
  });
  if (error) throw error;
}

/**
 * Import a PDF file: extract text via pdfjs-dist and insert to DB.
 */
export async function importPdfFile(
  file: File,
  userId?: string,
): Promise<void> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText +=
      textContent.items.map((item: any) => item.str).join(" ") + "\n\n";
  }

  const cleanText = fullText.trim();
  if (!cleanText) throw new Error("No readable text found in PDF.");

  const uid = userId || (await supabase.auth.getUser()).data.user?.id;
  const { error } = await supabase.from("items").insert({
    user_id: uid,
    text: cleanText,
    source_title: file.name.replace(/\.pdf$/i, ""),
    device_source: "web",
  });
  if (error) throw error;
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
