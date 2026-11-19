import React from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import { PdfLocalOcrPanel } from "../src/components/App/Dashboard/PdfLocalOcrPanel";
import { importPdfFile } from "../src/services/importService";
import { loadPdfOcrJob, pdfOcrPages } from "../src/services/pdfLocalOcrService";
import { getGradableQuestions } from "../src/services/examQuestionPolicy";
import { pdfOcrDrafts } from "../src/services/pdfOcrReviewService";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor<T>(check: () => T | Promise<T>, timeoutMs = 120_000): Promise<NonNullable<T>> {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) { const value = await check(); if (value) return value as NonNullable<T>; await delay(30); }
  throw new Error("Browser workflow condition timed out.");
}
const button = (text: string) => [...document.querySelectorAll("button")].find((element) => element.textContent === text);
let hash = localStorage.getItem("pdf-workflow-hash") || "";
const recognitionTimes: Array<{ page: number; ms: number; ok: boolean }> = [];
let phaseStartCount = 0;
const originalPost = Worker.prototype.postMessage;
const trackedWorkers = new WeakSet<Worker>();
const starts = new Map<string, { time: number; page: number }>();
// Benchmark-only instrumentation of Tesseract's pinned worker protocol. This
// measures recognition request -> response, separately from PDF rasterization.
(Worker.prototype as any).postMessage = function (...args: any[]) {
  const packet = args[0];
  if (packet?.action === "recognize") {
    starts.set(packet.jobId, { time: performance.now(), page: phaseStartCount + recognitionTimes.length + 1 });
    if (!trackedWorkers.has(this)) {
      trackedWorkers.add(this);
      this.addEventListener("message", (event: MessageEvent) => {
        const response = event.data;
        const start = starts.get(response.jobId);
        if (response.action === "recognize" && start && ["resolve", "reject"].includes(response.status)) {
          recognitionTimes.push({ page: start.page, ms: Math.round(performance.now() - start.time), ok: response.status === "resolve" });
          starts.delete(response.jobId);
        }
      });
    }
  }
  return originalPost.apply(this, args as any);
};
async function getJob() { return loadPdfOcrJob(hash, "MSA acceptance.pdf", "eng"); }
async function mount() {
  if (!hash) {
    const blob = await (await fetch("/input.pdf")).blob();
    const item = await importPdfFile(new File([blob], "MSA acceptance.pdf", { type: "application/pdf" }));
    hash = item.localPdfHash!; localStorage.setItem("pdf-workflow-hash", hash);
  }
  createRoot(document.getElementById("root")!).render(<PdfLocalOcrPanel sourceHash={hash} name="MSA acceptance.pdf" />);
  await waitFor(() => button("Start local OCR") || button("Resume local OCR") || button("Local OCR complete"));
}
(window as any).pdfWorkflow = {
  async mount() {
    await mount();
    await navigator.serviceWorker.register("/sw.js"); await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
    await fetch("/");
    for (const asset of [...document.querySelectorAll("script[src],link[rel=stylesheet]")]) await fetch((asset as HTMLScriptElement).src || (asset as HTMLLinkElement).href);
    return { hash, completed: (await getJob()).completedPages.length };
  },
  async runUntil(target: number) {
    const start = performance.now(); let previous = start;
    let maxDelayMs = 0;
    const timer = setInterval(() => { const now = performance.now(); maxDelayMs = Math.max(maxDelayMs, now - previous - 50); previous = now; }, 50);
    const pausedAtStart = (await getJob()).completedPages.length;
    phaseStartCount = pausedAtStart; recognitionTimes.length = 0;
    let lastReported = pausedAtStart;
    try {
      (button("Start local OCR") || button("Resume local OCR"))!.click();
      await waitFor(async () => {
        const consent = button("Download and start"); if (consent) consent.click();
        const current = await getJob();
        if (current.status === "error") throw new Error(current.error);
        if (current.completedPages.length >= lastReported + 10) {
          lastReported = current.completedPages.length;
          console.info("PDF_OCR_PROGRESS", JSON.stringify({ saved: lastReported, total: current.pageCount, elapsedMs: Math.round(performance.now() - start) }));
        }
        if (current.completedPages.length >= target) {
          if (target < current.pageCount) button("Pause OCR")?.click();
          return true;
        }
        return false;
      }, 600_000);
      const paused = await waitFor(async () => { const job = await getJob(); return (job.status === "paused" || job.status === "completed") && job; });
      await waitFor(() => paused.status === "completed" ? button("Local OCR complete") : button("Resume local OCR"));
      const pages = await pdfOcrPages(paused);
      if (pages.some((page) => page.route !== "FAIR" || page.keyProvenance !== "none")) throw new Error("OCR key safety invariant failed");
      return { saved: paused.completedPages.length, total: paused.pageCount, status: paused.status, elapsedMs: Math.round(performance.now() - start), newlyProcessed: paused.completedPages.length - pausedAtStart, maxDelayMs: Math.round(maxDelayMs), recognitionTimes: [...recognitionTimes], gradable: getGradableQuestions(pdfOcrDrafts(hash)).length };
    } finally { clearInterval(timer); }
  },
  async verifyCompletion() {
    const job = await getJob(); const pages = await pdfOcrPages(job);
    if (job.status !== "completed" || pages.length !== job.pageCount) throw new Error("OCR completion is not durable");
    if (pages.some((page, index) => page.pageNumber !== index + 1)) throw new Error("Missing or duplicate page results");
    let words = 0;
    for (const page of pages) for (const word of page.words) {
      words++; const b = word.box;
      if (b.x < 0 || b.y < 0 || b.width <= 0 || b.height <= 0 || b.x + b.width > 1 || b.y + b.height > 1) throw new Error("Invalid normalized word box");
    }
    return { pages: pages.length, words, textChars: pages.reduce((sum, page) => sum + page.text.length, 0),
      blankPages: pages.filter((page) => !page.text.trim()).map((page) => page.pageNumber),
      pageConfidences: pages.map((page) => ({ page: page.pageNumber, confidence: page.confidence, words: page.words.length })),
      allFair: pages.every((page) => page.route === "FAIR" && page.keyProvenance === "none" && page.storageScope === "local"),
      completedButtonDisabled: button("Local OCR complete")?.disabled === true,
    };
  },
  async inspect() {
    const input = document.querySelector<HTMLInputElement>('[aria-label="PDF page to review"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "1");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    button("Review page")!.click();
    await waitFor(() => document.querySelector('img[alt="Original PDF page 1"]'));
    return { originalVisible: true, rawOcrVisible: Boolean(document.querySelector("pre")?.textContent?.trim()) };
  },
  job: getJob,
};
