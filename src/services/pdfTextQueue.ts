import { extractPdfContent } from "./pdfService";
import { getLocalImage } from "./localOcrStore";
import { getItemById, updateItem } from "./storageService";

export type PdfTextProgress = { status: "queued" | "reading" | "complete" | "error"; page: number; total: number; error?: string };
const progress = new Map<string, PdfTextProgress>();
const running = new Map<string, Promise<void>>();
const listeners = new Set<(id: string) => void>();
let tail: Promise<void> = Promise.resolve();
export const getPdfTextProgress = (id: string) => progress.get(id);
export function subscribePdfTextProgress(listener: (id: string) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function emit(id: string, value: PdfTextProgress) {
  progress.set(id, value); listeners.forEach(listener => listener(id));
}

/** Serial text-only queue. Durable pending tags allow a retry after closing the app. */
export function queuePdfTextExtraction(id: string): Promise<void> {
  const existing = running.get(id);
  if (existing) return existing;
  emit(id, { status: "queued", page: 0, total: 0 });
  const task = tail.then(async () => {
    try {
      const item = await getItemById(id);
      if (!item?.localPdfHash || !item.tags.includes("pdf-text-pending")) return;
      const asset = await getLocalImage(item.localPdfHash);
      if (!asset) throw new Error("Original PDF is missing from this device. Import it again.");
      const result = await extractPdfContent(new File([asset.blob], asset.name, { type: "application/pdf" }), {
        maxOcrPages: 0, generateSummary: false, renderCover: false,
        onProgress: (page, total) => emit(id, { status: "reading", page, total }),
      });
      // Do not overwrite user edits to tags or resurrect a deleted item.
      const current = await getItemById(id);
      if (!current) return;
      const tags = current.tags.filter(tag => !["pdf-text-pending", "pdf-text-error"].includes(tag));
      if (result.pendingOcrPages.length) tags.push("partial-ocr", "ocr-required", "needs-review");
      await updateItem(id, { text: result.text, tags: [...new Set(tags)] });
      emit(id, { status: "complete", page: result.processedPageCount, total: result.pageCount });
    } catch (error) {
      emit(id, { status: "error", page: progress.get(id)?.page || 0, total: progress.get(id)?.total || 0,
        error: error instanceof Error ? error.message : String(error) });
    }
  }).finally(() => running.delete(id));
  running.set(id, task); tail = task;
  return task;
}
