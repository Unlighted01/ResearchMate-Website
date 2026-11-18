import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalOcrQueue, type LocalOcrJob } from "../src/services/localOcrQueue";
import type { LocalOcrEngine, OcrLanguage } from "../src/services/localOcrEngine";

const pages = new Map<string, unknown>();
let modelReady = false;
vi.mock("../src/services/localOcrStore", () => ({
  saveOcrQueueJobs: vi.fn(async () => {}),
  loadOcrQueueState: vi.fn(async () => undefined),
  getLocalImage: vi.fn(async () => ({ blob: new Blob(["image"], { type: "image/png" }) })),
  getLocalOcrPage: vi.fn(async (key: string) => pages.get(key)),
  saveLocalOcrPage: vi.fn(async (page: { cacheKey: string }) => { pages.set(page.cacheKey, page); }),
  isModelReady: vi.fn(async () => modelReady),
  markModelReady: vi.fn(async () => { modelReady = true; }),
}));

const job = (pageNumber: number): LocalOcrJob => ({
  sourceHash: "a".repeat(64), pageNumber, language: "eng", preprocess: "original",
});

describe("local OCR queue", () => {
  beforeEach(() => { pages.clear(); modelReady = false; });
  it("does not initialize after cancellation while the download prompt is open", async () => {
    const initialize = vi.fn();
    const queue = new LocalOcrQueue(() => ({ version: "test", initialize, recognize: vi.fn(), dispose: async () => {} }));
    queue.enqueue(job(1));
    await queue.run({ confirmDownload: async () => { queue.cancel(); return true; } });
    expect(initialize).not.toHaveBeenCalled();
  });

  it("runs locally, caches by source and params, and resumes after cancel", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    let recognized = 0;
    let promptCount = 0;
    const engineFactory = (): LocalOcrEngine => ({
      version: "test-engine@1",
      initialize: async (_language: OcrLanguage) => {},
      recognize: async () => { recognized++; return { text: "A", words: [], confidence: 90 }; },
      dispose: async () => {},
    });
    const queue = new LocalOcrQueue(engineFactory);
    queue.enqueue(job(1));
    queue.enqueue(job(2));
    const first = await queue.run({
      confirmDownload: async () => { promptCount++; return true; },
      onProgress: (event) => { if (event.phase === "completed" && event.completed === 1) queue.cancel(); },
    });
    expect(first).toEqual({ completed: 1, total: 2, cancelled: true });
    const resumed = await queue.run({ confirmDownload: async () => { promptCount++; return true; } });
    expect(resumed).toEqual({ completed: 2, total: 2, cancelled: false });
    const repeat = new LocalOcrQueue(engineFactory);
    repeat.enqueue(job(1));
    repeat.enqueue(job(2));
    expect(await repeat.run({ confirmDownload: async () => { promptCount++; return true; } }))
      .toEqual({ completed: 2, total: 2, cancelled: false });
    expect(recognized).toBe(2);
    expect(promptCount).toBe(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
