import { supabase } from "./supabaseClient";

export interface OcrResult {
  ocrText: string;
  ocrConfidence?: number;
  aiSummary?: string;
  ocrProvider?: string;
}

/** Extracts source text from a rendered page or photographed note. */
export async function runOcr(
  imageDataUrl: string,
  includeSummary: boolean = false,
  mode: "standard" | "math" = "standard",
): Promise<OcrResult> {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const response = await fetch("/api/ocr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ image: imageDataUrl, includeSummary, mode }),
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error || "Failed to extract text from image");
  }

  return response.json();
}
