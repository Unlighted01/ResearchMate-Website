import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadPdfOcrJob, PdfLocalOcrTask, PDF_OCR_ENGINE } from "../src/services/pdfLocalOcrService";
import type { LocalOcrPage } from "../src/services/localOcrStore";

const state = vi.hoisted(() => ({ pages: new Map<string, LocalOcrPage>(), jobs: new Map<string, any>(), model: false, corrupt: false, missing: false, full: false }));
vi.mock("../src/services/localOcrStore", () => ({
  getLocalImage: async () => state.missing ? undefined : ({ blob: new Blob(["PDF"]) }),
  sha256: async () => (state.corrupt ? "b" : "a").repeat(64),
  getLocalOcrPage: async (key: string) => state.pages.get(key),
  saveLocalOcrPage: async (page: LocalOcrPage) => { if (state.full) throw new Error("Device storage full"); state.pages.set(page.cacheKey, structuredClone(page)); },
  getPdfOcrJob: async (id: string) => state.jobs.get(id),
  savePdfOcrJob: async (job: any) => { state.jobs.set(job.id, structuredClone(job)); },
  isModelReady: async () => state.model,
}));

function task() {
  const recognize = vi.fn(async () => ({ text: "Question 1. Answer: B", words: [], confidence: 90 }));
  const render = vi.fn(async () => new Blob(["page"]));
  const initialize = vi.fn(async () => { state.model = true; });
  const engineDispose = vi.fn(async () => {});
  const rendererDispose = vi.fn(async () => {});
  const instance = new PdfLocalOcrTask({
    engine: () => ({ version: PDF_OCR_ENGINE, initialize, recognize, dispose: engineDispose }),
    renderer: async () => ({ pageCount: 3, render, dispose: rendererDispose }),
  });
  return { instance, recognize, render, initialize, engineDispose, rendererDispose };
}
const job = () => loadPdfOcrJob("a".repeat(64), "scan.pdf", "eng");
beforeEach(() => { state.pages.clear(); state.jobs.clear(); state.model = false; state.corrupt = false; state.missing = false; state.full = false; });
afterEach(() => vi.useRealTimers());
describe("opt-in PDF local OCR", () => {
  it("bounds recognition at two workers and drains the batch before pausing", async () => {
    state.model = true;
    let active = 0, peak = 0, created = 0;
    const dispose = vi.fn(async () => { expect(active).toBe(0); });
    const instance = new PdfLocalOcrTask({
      engine: () => { created++; return { version: PDF_OCR_ENGINE, initialize: async () => {}, dispose,
        recognize: async () => { active++; peak = Math.max(peak, active); await new Promise(resolve => setTimeout(resolve, 10)); active--; return {text:"source",words:[],confidence:90}; } }; },
      renderer: async () => ({pageCount:3,render:async()=>new Blob(["page"]),dispose:async()=>{}}),
    });
    const paused = await instance.run(await job(), { concurrency:2,confirmDownload:async()=>true,
      onProgress:({phase})=>{if(phase==="saved") instance.pause();} });
    expect(created).toBe(2); expect(peak).toBe(2); expect(dispose).toHaveBeenCalledTimes(2);
    expect(paused.completedPages).toEqual([1,2]); expect(paused.status).toBe("paused");
    const resumed=task();
    await resumed.instance.run(await job(),{concurrency:1,confirmDownload:async()=>true});
    expect(resumed.recognize).toHaveBeenCalledTimes(1);
  });
  it("preserves a successful peer page when the other worker fails", async () => {
    let slot=0;
    const instance=new PdfLocalOcrTask({engine:()=>{const own=slot++;return {version:PDF_OCR_ENGINE,initialize:async()=>{},dispose:async()=>{},recognize:async()=>{if(own===0) throw new Error("page failure");return {text:"saved peer",words:[],confidence:90};}};},renderer:async()=>({pageCount:2,render:async()=>new Blob(["page"]),dispose:async()=>{}})});
    await expect(instance.run(await job(),{concurrency:2,confirmDownload:async()=>true})).rejects.toThrow("page failure");
    expect((await job()).completedPages).toEqual([2]);
    expect([...state.pages.values()][0].keyProvenance).toBe("none");
  });
  it("does not start more pages when paused during parallel recognition", async () => {
    let started = 0;
    let release!: () => void;
    const barrier = new Promise<void>(resolve => { release = resolve; });
    const recognize = vi.fn(async () => {
      if (++started === 2) { instance.pause(); release(); }
      await barrier;
      return {text:"unconfirmed key B",words:[],confidence:99};
    });
    const instance = new PdfLocalOcrTask({
      engine: () => ({version:PDF_OCR_ENGINE,initialize:async()=>{},recognize,dispose:async()=>{}}),
      renderer: async () => ({pageCount:4,render:async()=>new Blob(["page"]),dispose:async()=>{}}),
    });
    const result = await instance.run(await job(), {concurrency:2,confirmDownload:async()=>true});
    expect(result.status).toBe("paused");
    expect(result.completedPages).toEqual([1,2]);
    expect(recognize).toHaveBeenCalledTimes(2);
    expect([...state.pages.values()].every(page => page.keyProvenance === "none" && page.route === "FAIR")).toBe(true);
  });
  it("disposes both workers and the renderer even when one worker cleanup fails", async () => {
    let created = 0;
    const disposed: number[] = [];
    const rendererDispose = vi.fn(async () => {});
    const instance = new PdfLocalOcrTask({
      engine: () => {
        const slot = created++;
        return {version:PDF_OCR_ENGINE,initialize:async()=>{},
          recognize:async()=>({text:"source",words:[],confidence:90}),
          dispose:async()=>{disposed.push(slot);if(slot===0) throw new Error("cleanup failed");}};
      },
      renderer: async () => ({pageCount:2,render:async()=>new Blob(["page"]),dispose:rendererDispose}),
    });
    await expect(instance.run(await job(), {concurrency:2,confirmDownload:async()=>true})).rejects.toThrow("cleanup failed");
    expect(disposed).toEqual([0,1]);
    expect(rendererDispose).toHaveBeenCalledTimes(1);
  });
  it("restores paused progress, skips saved pages, and never calls AI", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const first = task();
    const paused = await first.instance.run(await job(), {
      confirmDownload: async () => true,
      onProgress: ({ phase, job }) => { if (phase === "saved" && job.completedPages.length === 1) first.instance.pause(); },
    });
    expect(paused.status).toBe("paused"); expect(paused.completedPages).toEqual([1]);
    const resumed = task();
    const complete = await resumed.instance.run(await job(), { confirmDownload: async () => { throw new Error("Unexpected download"); } });
    expect(complete.completedPages).toEqual([1, 2, 3]); expect(complete.status).toBe("completed");
    expect(resumed.recognize).toHaveBeenCalledTimes(2); expect(resumed.render).toHaveBeenCalledTimes(2);
    state.model = false;
    const cached = task();
    await cached.instance.run(await job(), { confirmDownload: async () => { throw new Error("Cached pages must not download"); } });
    expect(cached.recognize).not.toHaveBeenCalled(); expect(cached.render).not.toHaveBeenCalled();
    expect([...state.pages.values()].every((page) => page.keyProvenance === "none" && page.route === "FAIR" && page.storageScope === "local")).toBe(true);
    expect(fetch).not.toHaveBeenCalled(); fetch.mockRestore();
  });
  it("does not render or recognize when model consent is declined", async () => {
    const run = task(); const result = await run.instance.run(await job(), { confirmDownload: async () => false });
    expect(result.status).toBe("paused"); expect(run.render).not.toHaveBeenCalled(); expect(run.initialize).not.toHaveBeenCalled();
  });
  it("rejects changed PDF contents before model download", async () => {
    state.corrupt = true; const confirmDownload = vi.fn();
    await expect(task().instance.run(await job(), { confirmDownload })).rejects.toThrow(/hash/);
    expect(confirmDownload).not.toHaveBeenCalled();
  });
  it("leaves saved pages available after a page failure and retries only the failed page", async () => {
    const run = task(); run.recognize.mockResolvedValueOnce({ text: "Saved page one", words: [], confidence: 90 }).mockRejectedValueOnce(new Error("OCR failed"));
    await expect(run.instance.run(await job(), { confirmDownload: async () => true })).rejects.toThrow(/OCR failed/);
    expect((await job()).status).toBe("error"); expect((await job()).completedPages).toEqual([1]); expect(run.engineDispose).toHaveBeenCalled(); expect(run.rendererDispose).toHaveBeenCalled();
    const retried = task(); const done = await retried.instance.run(await job(), { confirmDownload: async () => true });
    expect(done.completedPages).toEqual([1, 2, 3]);
    expect(retried.recognize).toHaveBeenCalledTimes(2);
  });
  it("does not advance progress when a page cannot be saved", async () => {
    state.full = true;
    await expect(task().instance.run(await job(), { confirmDownload: async () => true })).rejects.toThrow(/storage full/);
    expect((await job()).completedPages).toEqual([]);
    expect((await job()).status).toBe("error");
  });
  it("reports a missing original without losing cached text", async () => {
    state.missing = true;
    await expect(task().instance.run(await job(), { confirmDownload: async () => true })).rejects.toThrow(/missing/);
  });
  it("stops a stalled OCR page and retains a resumable error state", async () => {
    vi.useFakeTimers(); state.model = true;
    const run = task(); run.recognize.mockImplementation(() => new Promise(() => {}));
    const assertion = expect(run.instance.run(await job(), { confirmDownload: async () => true })).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(61_000); await assertion;
    expect((await job()).status).toBe("error");
    expect((await job()).completedPages).toEqual([]);
    expect(run.engineDispose).toHaveBeenCalledTimes(1);
  });
});
