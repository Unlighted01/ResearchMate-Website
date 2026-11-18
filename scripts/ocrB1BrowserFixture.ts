import { LocalOcrQueue } from "../src/services/localOcrQueue";
import { saveLocalImage, getLocalImage, getLocalOcrPage, isModelReady } from "../src/services/localOcrStore";
import { OCR_B1_ENABLED } from "../src/services/ocrB1Config";

const version = "tesseract.js@7.0.0";
async function makeImage(index: number) {
  const canvas = document.createElement("canvas"); canvas.width = 800; canvas.height = 220;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "white"; ctx.fillRect(0, 0, 800, 220);
  ctx.fillStyle = "black"; ctx.font = "32px Arial";
  ctx.fillText(`Question ${index}. What is 2 plus 2?`, 20, 60);
  ctx.fillText("A. Three   B. Four   C. Five   D. Six", 20, 120);
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!)));
  const asset = await saveLocalImage(blob, `synthetic-${index}.png`);
  return { sourceHash: asset.hash, pageNumber: 1, language: "eng" as const, preprocess: "original" as const };
}
const jobs = () => JSON.parse(localStorage.getItem("acceptance-jobs") || "[]");
async function repeat() {
  const queue = new LocalOcrQueue(); jobs().forEach((job: any) => queue.enqueue(job));
  let cached = 0; let recognized = 0;
  await queue.run({ confirmDownload: async () => { throw new Error("Unexpected download prompt"); }, onProgress: (event) => {
    if (event.phase === "cached") cached++;
    if (event.phase === "recognizing") recognized++;
  } });
  return { cached, recognized };
}
(window as any).ocrAcceptance = {
  async installWorker() {
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
    // Populate the production shell cache after the worker takes control.
    await fetch("/");
    for (const script of document.querySelectorAll("script[src]")) await fetch((script as HTMLScriptElement).src);
  },
  async firstRun() {
    if (!OCR_B1_ENABLED) throw new Error("Acceptance build must enable B1 explicitly");
    const samples: string[] = await (await fetch("/fixtures.json")).json();
    const entries = [];
    for (let i = 1; i <= 20; i++) {
      if (samples.length) {
        const blob = await (await fetch(`/fixtures/${i - 1}`)).blob();
        const asset = await saveLocalImage(blob, samples[i - 1]);
        entries.push({ sourceHash: asset.hash, pageNumber: 1, language: "eng" as const, preprocess: "original" as const });
      } else entries.push(await makeImage(i));
    }
    localStorage.setItem("acceptance-jobs", JSON.stringify(entries));
    const queue = new LocalOcrQueue(); entries.forEach((job) => queue.enqueue(job));
    let prompts = 0; let maxDelayMs = 0; let previous = performance.now();
    let pageStart = 0; const pageTimesMs: number[] = []; const started = performance.now();
    const timer = setInterval(() => { const now = performance.now(); maxDelayMs = Math.max(maxDelayMs, now - previous - 50); previous = now; }, 50);
    try {
      const result = await queue.run({ confirmDownload: async () => { prompts++; return true; }, onProgress: (event) => {
        if (event.phase === "recognizing") pageStart = performance.now();
        if (event.phase === "completed") pageTimesMs.push(Math.round(performance.now() - pageStart));
        if (event.phase === "completed" && event.completed === 5) queue.cancel();
      } });
      return { ...result, prompts, maxDelayMs: Math.round(maxDelayMs), elapsedMs: Math.round(performance.now() - started), pageTimesMs };
    } finally { clearInterval(timer); }
  },
  async resume() {
    const queue = await LocalOcrQueue.restore();
    let maxDelayMs = 0; let previous = performance.now(); let pageStart = 0;
    const started = performance.now(); const pageTimesMs: number[] = [];
    const timer = setInterval(() => { const now = performance.now(); maxDelayMs = Math.max(maxDelayMs, now - previous - 50); previous = now; }, 50);
    let result;
    try {
      result = await queue.run({ confirmDownload: async () => { throw new Error("Model should already be cached"); }, onProgress: (event) => {
        if (event.phase === "recognizing") pageStart = performance.now();
        if (event.phase === "completed") pageTimesMs.push(Math.round(performance.now() - pageStart));
      } });
    } finally { clearInterval(timer); }
    let normalizedWords = 0;
    for (const job of jobs()) {
      if (!(await getLocalImage(job.sourceHash))) throw new Error("Image lost on reload");
      const page = await getLocalOcrPage(`${job.sourceHash}:1:${version}:eng:original`);
      if (!page || page.route !== "FAIR") throw new Error("Page missing or incorrectly routed");
      for (const word of page.words) {
        const b = word.box;
        if (b.x < 0 || b.y < 0 || b.width <= 0 || b.height <= 0 || b.x + b.width > 1 || b.y + b.height > 1) throw new Error("Invalid word box");
        normalizedWords++;
      }
    }
    return { ...result, normalizedWords, maxDelayMs: Math.round(maxDelayMs), elapsedMs: Math.round(performance.now() - started), pageTimesMs };
  },
  async interleaved() {
    const queue = new LocalOcrQueue(); queue.enqueue(jobs()[0]);
    return queue.run({ confirmDownload: async () => { throw new Error("Unexpected download"); } });
  },
  repeat,
  async offline() {
    const cached = await repeat();
    const queue = new LocalOcrQueue(); queue.enqueue(await makeImage(21));
    const result = await queue.run({ confirmDownload: async () => { throw new Error("Offline model is missing"); } });
    return { ...cached, freshCompleted: result.completed };
  },
  async eviction() {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("keyval-store");
      request.onsuccess = () => {
        const db = request.result; const tx = db.transaction("keyval", "readwrite");
        tx.objectStore("keyval").delete("researchmate-ocr-7.0.0/eng.traineddata");
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error);
      };
    });
    const ready = await isModelReady("eng", version);
    const queue = new LocalOcrQueue(); queue.enqueue(await makeImage(22)); let prompts = 0;
    const result = await queue.run({ confirmDownload: async () => { prompts++; return false; } });
    return { ready, prompts, completed: result.completed };
  },
};
