import type { Worker as TesseractWorker } from "tesseract.js";
import type { OcrEngineResult, OcrLanguage, OcrPreprocess, LocalOcrEngine } from "./localOcrEngine";
import type { OcrWord } from "./localOcrStore";

const ASSET_ROOT = "/ocr/7.0.0";

function parseWords(tsv: string, width: number, height: number): OcrWord[] {
  const rows = tsv.split(/\r?\n/).slice(1);
  const words: OcrWord[] = [];
  for (const row of rows) {
    const cells = row.split("\t");
    if (cells.length < 12 || cells[0] !== "5") continue;
    const text = cells.slice(11).join("\t").trim();
    const [left, top, wordWidth, wordHeight, confidence] = [cells[6], cells[7], cells[8], cells[9], cells[10]].map(Number);
    if (!text || ![left, top, wordWidth, wordHeight, confidence].every(Number.isFinite)) continue;
    const x = Math.max(0, Math.min(1, left / width));
    const y = Math.max(0, Math.min(1, top / height));
    const boxWidth = Math.max(0, Math.min(1 - x, wordWidth / width));
    const boxHeight = Math.max(0, Math.min(1 - y, wordHeight / height));
    if (boxWidth <= 0 || boxHeight <= 0) continue;
    words.push({ text, box: { x, y, width: boxWidth, height: boxHeight }, confidence });
  }
  return words;
}

async function prepareImage(blob: Blob, preprocess: OcrPreprocess): Promise<{ image: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  try {
    if (preprocess === "original") return { image: blob, width: bitmap.width, height: bitmap.height };
    const width = bitmap.width * 2;
    const height = bitmap.height * 2;
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare OCR image.");
    context.drawImage(bitmap, 0, 0, width, height);
    return { image: await canvas.convertToBlob({ type: "image/png" }), width, height };
  } finally {
    bitmap.close();
  }
}

export class TesseractLocalOcrEngine implements LocalOcrEngine {
  readonly version = "tesseract.js@7.0.0";
  private worker: TesseractWorker | null = null;

  async initialize(language: OcrLanguage, onProgress?: (progress: number) => void): Promise<void> {
    if (this.worker) throw new Error("OCR worker is already running.");
    const { createWorker, OEM } = await import("tesseract.js");
    this.worker = await createWorker(language, OEM.LSTM_ONLY, {
      workerPath: `${ASSET_ROOT}/worker.min.js`,
      corePath: `${ASSET_ROOT}/core`,
      langPath: `${ASSET_ROOT}/lang`,
      workerBlobURL: false,
      gzip: true,
      cacheMethod: "write",
      cachePath: "researchmate-ocr-7.0.0",
      logger: (message) => onProgress?.(message.progress || 0),
    });
  }

  async recognize(blob: Blob, preprocess: OcrPreprocess): Promise<OcrEngineResult> {
    if (!this.worker) throw new Error("OCR worker is not initialized.");
    const prepared = await prepareImage(blob, preprocess);
    const { data } = await this.worker.recognize(prepared.image, {}, { text: true, tsv: true });
    return {
      text: data.text || "",
      words: parseWords(data.tsv || "", prepared.width, prepared.height),
      confidence: Number.isFinite(data.confidence) ? data.confidence : 0,
    };
  }

  async dispose(): Promise<void> {
    const worker = this.worker;
    this.worker = null;
    if (worker) await worker.terminate();
  }
}
