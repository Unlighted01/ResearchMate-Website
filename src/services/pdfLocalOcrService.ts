import { getLocalImage, getLocalOcrPage, getPdfOcrJob, savePdfOcrJob, saveLocalOcrPage, isModelReady, sha256, type LocalOcrPage } from "./localOcrStore";
import type { LocalOcrEngine, OcrLanguage } from "./localOcrEngine";
import { TesseractLocalOcrEngine } from "./tesseractLocalOcrEngine";
import { openPdfOcrRenderer, type PdfOcrRenderer } from "./pdfOcrRenderer";
import { withLocalOcrLock } from "./localOcrLock";
import type { ModelDownloadPrompt } from "./localOcrQueue";

export const PDF_OCR_ENGINE = "tesseract.js@7.0.0";
export const PDF_OCR_DPI = 144; // Explicit fixed baseline; not a calibrated accuracy threshold.
export interface PdfOcrJob {
  id: string;
  sourceHash: string;
  name: string;
  language: OcrLanguage;
  dpi: number;
  pageCount: number;
  completedPages: number[];
  status: "ready" | "running" | "paused" | "completed" | "error";
  currentPage?: number;
  error?: string;
  updatedAt: string;
}
export type PdfOcrProgress = { job: PdfOcrJob; phase: "opening" | "download" | "loading" | "rendering" | "recognizing" | "saved" | "paused" | "completed"; progress?: number };
export const pdfOcrJobId = (hash: string, language: OcrLanguage) => `pdf:${hash}:${PDF_OCR_ENGINE}:${language}:raster-v1:${PDF_OCR_DPI}`;
export const pdfOcrPageKey = (job: PdfOcrJob, page: number) => `${job.id}:${page}`;
const matchesPage = (page: LocalOcrPage | undefined, job: PdfOcrJob, number: number) => page &&
  page.sourceHash === job.sourceHash && page.pageNumber === number && page.rasterDpi === job.dpi &&
  page.engineVersion === PDF_OCR_ENGINE && page.language === job.language && page.route === "FAIR" && page.keyProvenance === "none";

export async function loadPdfOcrJob(hash: string, name: string, language: OcrLanguage): Promise<PdfOcrJob> {
  if (!/^[a-f0-9]{64}$/i.test(hash) || !["eng", "tgl", "eng+tgl"].includes(language)) throw new Error("Invalid local OCR source or language.");
  const id = pdfOcrJobId(hash, language);
  const stored = await getPdfOcrJob(id);
  if (stored) return stored;
  return { id, sourceHash: hash, name, language, dpi: PDF_OCR_DPI, pageCount: 0, completedPages: [], status: "ready", updatedAt: new Date().toISOString() };
}

export async function pdfOcrPages(job: PdfOcrJob): Promise<LocalOcrPage[]> {
  const result: LocalOcrPage[] = [];
  for (const pageNumber of job.completedPages) {
    const page = await getLocalOcrPage(pdfOcrPageKey(job, pageNumber));
    if (matchesPage(page, job, pageNumber)) result.push(page!);
  }
  return result.sort((a, b) => a.pageNumber - b.pageNumber);
}

async function timed<T>(operation: Promise<T>, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), 60_000); })]);
  } finally { clearTimeout(timer!); }
}

/** Persists each page before advancing. Closing a view pauses after the active page. */
export class PdfLocalOcrTask {
  private paused = false;
  constructor(private readonly dependencies: {
    engine: () => LocalOcrEngine;
    renderer: (blob: Blob) => Promise<PdfOcrRenderer>;
  } = { engine: () => new TesseractLocalOcrEngine(), renderer: openPdfOcrRenderer }) {}

  pause() { this.paused = true; }

  async run(initial: PdfOcrJob, options: {
    confirmDownload: (request: ModelDownloadPrompt) => Promise<boolean>;
    onProgress?: (event: PdfOcrProgress) => void;
  }): Promise<PdfOcrJob> {
    return withLocalOcrLock(async () => {
      this.paused = false;
      let job: PdfOcrJob = { ...initial, completedPages: [...initial.completedPages], error: undefined };
      let renderer: PdfOcrRenderer | undefined;
      let engine: LocalOcrEngine | undefined;
      const emit = (phase: PdfOcrProgress["phase"], progress?: number) => options.onProgress?.({ job: { ...job, completedPages: [...job.completedPages] }, phase, progress });
      const persist = async () => { job.updatedAt = new Date().toISOString(); await savePdfOcrJob(job); };
      try {
        if (job.id !== pdfOcrJobId(job.sourceHash, job.language) || job.dpi !== PDF_OCR_DPI) throw new Error("OCR job settings do not match its source cache.");
        const asset = await getLocalImage(job.sourceHash);
        if (!asset) throw new Error("The original PDF is missing from device storage. Import it again to resume.");
        if (await sha256(asset.blob) !== job.sourceHash) throw new Error("The stored PDF hash does not match this OCR job.");
        if (job.pageCount > 0) {
          const saved = await pdfOcrPages({ ...job, completedPages: Array.from({ length: job.pageCount }, (_, i) => i + 1) });
          job.completedPages = saved.map((page) => page.pageNumber);
          if (saved.length === job.pageCount) {
            job.completedPages = saved.map((page) => page.pageNumber); job.status = "completed";
            await persist(); emit("completed"); return job;
          }
        }
        if (!this.paused && !(await isModelReady(job.language, PDF_OCR_ENGINE))) {
          emit("download");
          const accepted = await options.confirmDownload({ language: job.language, version: PDF_OCR_ENGINE,
            estimatedMiB: job.language === "eng" ? 4.24 : job.language === "tgl" ? 4.57 : 7.37 });
          if (!accepted) this.paused = true;
        }
        if (this.paused) { job.status = "paused"; await persist(); emit("paused"); return job; }
        emit("opening"); renderer = await this.dependencies.renderer(asset.blob);
        job.pageCount = renderer.pageCount;
        job.completedPages = job.completedPages.filter((page) => page >= 1 && page <= job.pageCount);
        job.status = "running";
        await persist();
        for (let pageNumber = 1; pageNumber <= job.pageCount; pageNumber++) {
          if (this.paused) break;
          job.currentPage = pageNumber;
          const cached = await getLocalOcrPage(pdfOcrPageKey(job, pageNumber));
          if (!matchesPage(cached, job, pageNumber)) {
            if (!engine) {
              engine = this.dependencies.engine();
              if (engine.version !== PDF_OCR_ENGINE) throw new Error("Unexpected OCR engine version.");
              emit("loading");
              let initializing = true;
              await timed(engine.initialize(job.language, (progress) => emit(initializing ? "loading" : "recognizing", progress)), "Loading local OCR timed out. Check the model download and resume.");
              initializing = false;
            }
            if (this.paused) break;
            emit("rendering"); const image = await timed(renderer.render(pageNumber, job.dpi), `Rendering page ${pageNumber} timed out. Resume to retry.`);
            if (this.paused) break;
            emit("recognizing");
            const result = await timed(engine.recognize(image, "original"), `OCR page ${pageNumber} timed out. Saved pages are retained; resume to retry.`);
            await saveLocalOcrPage({ cacheKey: pdfOcrPageKey(job, pageNumber), sourceHash: job.sourceHash, pageNumber,
              text: result.text, words: result.words, confidence: result.confidence, engineVersion: PDF_OCR_ENGINE,
              language: job.language, preprocess: "original", rasterDpi: job.dpi,
              route: "FAIR", storageScope: "local", keyProvenance: "none", createdAt: new Date().toISOString() });
          }
          if (!job.completedPages.includes(pageNumber)) {
            job.completedPages.push(pageNumber); job.completedPages.sort((a, b) => a - b);
            await persist(); emit("saved");
          }
        }
        job.status = job.completedPages.length === job.pageCount ? "completed" : "paused";
        await persist(); emit(job.status === "completed" ? "completed" : "paused");
        return job;
      } catch (error) {
        job.status = "error"; job.error = error instanceof Error ? error.message : String(error);
        await persist(); throw error;
      } finally {
        try { await engine?.dispose(); } finally { await renderer?.dispose(); }
      }
    });
  }
}
