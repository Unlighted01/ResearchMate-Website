import { getLocalImage, getLocalOcrPage, isModelReady, markModelReady, saveLocalOcrPage, saveOcrQueueJobs, loadOcrQueueJobs, type LocalOcrPage } from "./localOcrStore";
import { OCR_UNCALIBRATED_ROUTE } from "./ocrB1Config";
import type { LocalOcrEngine, OcrLanguage, OcrPreprocess } from "./localOcrEngine";
import { TesseractLocalOcrEngine } from "./tesseractLocalOcrEngine";

export interface LocalOcrJob {
  sourceHash: string;
  pageNumber: number;
  language: OcrLanguage;
  preprocess: OcrPreprocess;
}

export interface LocalOcrProgress {
  completed: number;
  total: number;
  phase: "waiting_for_download" | "loading_model" | "recognizing" | "completed" | "cached" | "cancelled";
  job: LocalOcrJob;
  progress?: number;
}

export interface ModelDownloadPrompt {
  language: OcrLanguage;
  estimatedMiB: number;
  version: string;
}

const MODEL_DOWNLOAD_MIB: Record<OcrLanguage, number> = {
  eng: 4.24,
  tgl: 4.57,
  "eng+tgl": 7.37,
};

export function ocrCacheKey(job: LocalOcrJob, engineVersion: string): string {
  return `${job.sourceHash}:${job.pageNumber}:${engineVersion}:${job.language}:${job.preprocess}`;
}

/** One OCR worker, one page at a time. Cancellation takes effect after the current page. */
export class LocalOcrQueue {
  private static active = false;
  static async restore(): Promise<LocalOcrQueue> {
    const queue = new LocalOcrQueue();
    for (const job of await loadOcrQueueJobs()) queue.enqueue(job);
    return queue;
  }
  private readonly jobs: LocalOcrJob[] = [];
  private completed = new Set<string>();
  private running = false;
  private cancelRequested = false;

  constructor(private readonly engineFactory: () => LocalOcrEngine = () => new TesseractLocalOcrEngine()) {}

  enqueue(job: LocalOcrJob): void {
    if (this.running) throw new Error("Wait for the running queue before adding images.");
    if (!Number.isInteger(job.pageNumber) || job.pageNumber < 1) throw new Error("Page number must be positive.");
    const id = JSON.stringify(job);
    if (!this.jobs.some((existing) => JSON.stringify(existing) === id)) this.jobs.push(job);
  }

  cancel(): void {
    this.cancelRequested = true;
  }

  async run(options: {
    confirmDownload: (request: ModelDownloadPrompt) => Promise<boolean>;
    onProgress?: (event: LocalOcrProgress) => void;
  }): Promise<{ completed: number; total: number; cancelled: boolean }> {
    if (this.running || LocalOcrQueue.active) throw new Error("OCR queue is already running.");
    this.running = true;
    LocalOcrQueue.active = true;
    this.cancelRequested = false;
    let engine = this.engineFactory();
    let activeLanguage: OcrLanguage | null = null;
    const emit = (job: LocalOcrJob, phase: LocalOcrProgress["phase"], progress?: number) =>
      options.onProgress?.({ completed: this.completed.size, total: this.jobs.length, phase, job, progress });

    try {
      await saveOcrQueueJobs(this.jobs);
      for (const job of this.jobs) {
        if (this.cancelRequested) break;
        const asset = await getLocalImage(job.sourceHash);
        if (!asset) throw new Error(`Local image ${job.sourceHash} is missing.`);
        const cacheKey = ocrCacheKey(job, engine.version);
        const cached = await getLocalOcrPage(cacheKey);
        if (cached) {
          this.completed.add(cacheKey);
          emit(job, "cached");
          continue;
        }
        if (activeLanguage !== job.language) {
          if (activeLanguage) {
            await engine.dispose();
            engine = this.engineFactory();
          }
          activeLanguage = null;
          if (!(await isModelReady(job.language, engine.version))) {
            emit(job, "waiting_for_download");
            const accepted = await options.confirmDownload({
              language: job.language,
              estimatedMiB: MODEL_DOWNLOAD_MIB[job.language],
              version: engine.version,
            });
            if (!accepted || this.cancelRequested) {
              this.cancelRequested = true;
              break;
            }
          }
          emit(job, "loading_model");
          await engine.initialize(job.language, (progress) => emit(job, "loading_model", progress));
          await markModelReady(job.language, engine.version);
          activeLanguage = job.language;
        }
        if (this.cancelRequested) break;
        emit(job, "recognizing");
        const result = await engine.recognize(asset.blob, job.preprocess);
        const page: LocalOcrPage = {
          cacheKey,
          sourceHash: job.sourceHash,
          pageNumber: job.pageNumber,
          text: result.text,
          words: result.words,
          confidence: result.confidence,
          engineVersion: engine.version,
          language: job.language,
          preprocess: job.preprocess,
          route: OCR_UNCALIBRATED_ROUTE,
          createdAt: new Date().toISOString(),
          storageScope: "local",
        };
        await saveLocalOcrPage(page);
        this.completed.add(cacheKey);
        emit(job, "completed");
      }
      await saveOcrQueueJobs(this.jobs.filter((job) => !this.completed.has(ocrCacheKey(job, engine.version))));
      if (this.cancelRequested && this.jobs.length > 0) emit(this.jobs.find((job) => !this.completed.has(ocrCacheKey(job, engine.version))) || this.jobs.at(-1)!, "cancelled");
      return { completed: this.completed.size, total: this.jobs.length, cancelled: this.cancelRequested };
    } finally {
      try { await engine.dispose(); } finally { this.running = false; LocalOcrQueue.active = false; }
    }
  }
}
