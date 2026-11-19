import { extractPdfContent } from "../src/services/pdfService";
import { importPdfFile } from "../src/services/importService";
import { getLocalImage } from "../src/services/localOcrStore";
import { OCR_B1_ENABLED } from "../src/services/ocrB1Config";

(window as any).pdfAcceptance = async () => {
  if (OCR_B1_ENABLED) throw new Error("Default OCR must be disabled.");
  const input = await (await fetch("/input.pdf")).blob();
  const file = new File([input], "acceptance.pdf", { type: "application/pdf" });
  const progress: number[] = [];
  let maxDelayMs = 0; let prior = performance.now();
  const timer = setInterval(() => { const now = performance.now(); maxDelayMs = Math.max(maxDelayMs, now - prior - 50); prior = now; }, 50);
  const start = performance.now();
  try {
    const extracted = await extractPdfContent(file, { onProgress: (current) => { progress.push(current); } });
    const extractionMs = Math.round(performance.now() - start);
    let retainedSource = false;
    if (!extracted.text && extracted.pendingOcrPages.length) {
      const item = await importPdfFile(file);
      retainedSource = item.storageScope === "local" && item.tags.includes("ocr-required") &&
        Boolean(await getLocalImage(item.localPdfHash!));
      if (!retainedSource) throw new Error("Scanned source was not retained locally.");
    }
    return { pages: extracted.pageCount, processedPages: extracted.processedPageCount,
      textChars: extracted.text.length, pendingOcrPages: extracted.pendingOcrPages.length,
      extractionMs, totalMs: Math.round(performance.now() - start), maxDelayMs: Math.round(maxDelayMs),
      progressEvents: progress.length, retainedSource, summaryChars: extracted.summary.length };
  } finally { clearInterval(timer); }
};
