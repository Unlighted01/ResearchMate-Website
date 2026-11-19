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
const metrics: { pageTimesMs: number[]; maxDelayMs: number } = { pageTimesMs: [], maxDelayMs: 0 };
async function getJob() { return loadPdfOcrJob(hash, "MSA acceptance.pdf", "eng"); }
async function mount() {
  if (!hash) {
    const blob = await (await fetch("/input.pdf")).blob();
    const item = await importPdfFile(new File([blob], "MSA acceptance.pdf", { type: "application/pdf" }));
    hash = item.localPdfHash!; localStorage.setItem("pdf-workflow-hash", hash);
  }
  createRoot(document.getElementById("root")!).render(<PdfLocalOcrPanel sourceHash={hash} name="MSA acceptance.pdf" />);
  await waitFor(() => button("Start local OCR") || button("Resume local OCR"));
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
    const timer = setInterval(() => { const now = performance.now(); metrics.maxDelayMs = Math.max(metrics.maxDelayMs, now - previous - 50); previous = now; }, 50);
    const pausedAtStart = (await getJob()).completedPages.length;
    try {
      (button("Start local OCR") || button("Resume local OCR"))!.click();
      await waitFor(async () => {
        const consent = button("Download and start"); if (consent) consent.click();
        const current = await getJob();
        if (current.status === "error") throw new Error(current.error);
        if (current.completedPages.length >= target) {
          button("Pause OCR")?.click(); return true;
        }
        return false;
      });
      const paused = await waitFor(async () => { const job = await getJob(); return job.status === "paused" && job; });
      await waitFor(() => button("Resume local OCR"));
      const pages = await pdfOcrPages(paused);
      if (pages.some((page) => page.route !== "FAIR" || page.keyProvenance !== "none")) throw new Error("OCR key safety invariant failed");
      return { saved: paused.completedPages.length, total: paused.pageCount, elapsedMs: Math.round(performance.now() - start), newlyProcessed: paused.completedPages.length - pausedAtStart, maxDelayMs: Math.round(metrics.maxDelayMs), gradable: getGradableQuestions(pdfOcrDrafts(hash)).length };
    } finally { clearInterval(timer); }
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
