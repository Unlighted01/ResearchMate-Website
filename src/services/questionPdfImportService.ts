import { extractAllPagesWithLayout } from "./pdfService";
import { parseTwoPassQuestionsAndAnswers, type ParsedQaItem } from "./pdfQuestionImporter";
import { parsePlainTextQuestions, type ParseResult } from "./examParser";
import { getLocalImage, saveLocalImage, getQuestionPdfImport, saveQuestionPdfImport } from "./localOcrStore";
import { addLocalItem, getItemById, updateItem } from "./storageService";

export interface QuestionPdfImport {
  id: "latest";
  name: string;
  sourceHash?: string;
  materialId?: string;
  status: "saving" | "reading" | "parsing" | "ready" | "error" | "interrupted";
  current: number;
  total: number;
  parsed: ParsedQaItem[];
  fallback?: ParseResult;
  pendingOcrPages: number[];
  error?: string;
}
let snapshot: QuestionPdfImport | undefined;
let running: Promise<void> | undefined;
let restoring: Promise<void> | undefined;
const listeners = new Set<() => void>();
export const getQuestionPdfImportSnapshot = () => snapshot;
export function subscribeQuestionPdfImport(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function publish(job: QuestionPdfImport) {
  snapshot = job;
  listeners.forEach(listener => listener());
}
export function restoreQuestionPdfImport(): Promise<void> {
  if (snapshot) return Promise.resolve();
  if (restoring) return restoring;
  restoring = getQuestionPdfImport().then(stored => {
    if (!snapshot && stored) publish({ ...stored, status: ["saving", "reading", "parsing"].includes(stored.status) ? "interrupted" : stored.status });
  }).finally(() => { restoring = undefined; });
  return restoring;
}

async function extract(job: QuestionPdfImport, file: File) {
  const result = await extractAllPagesWithLayout(file, (current, total) => {
    publish({ ...job, status: "reading", current, total });
  }, { ocrSparsePages: false, maxOcrPages: 0 });
  // Missing or empty pages are sent to explicit local OCR, never the legacy AI path.
  const readablePages = new Set(result.pages.filter(page => page.text.trim()).map(page => page.pageNumber));
  const pendingOcrPages = Array.from({length:result.pageCount}, (_, i) => i + 1)
    .filter(number => !readablePages.has(number));
  publish({ ...job, status: "parsing", current: result.pageCount, total: result.pageCount });
  await new Promise(resolve => setTimeout(resolve, 0));
  const parsed = result.fullText.trim() ? parseTwoPassQuestionsAndAnswers(result.pages) : [];
  const ready: QuestionPdfImport = { ...job, status: "ready", current: result.pageCount, total: result.pageCount, parsed, pendingOcrPages,
    fallback: !parsed.length && result.fullText.trim() ? parsePlainTextQuestions(result.fullText, job.name) : undefined };
  const material = job.materialId ? await getItemById(job.materialId) : undefined;
  if (material) await updateItem(material.id, { text: result.fullText,
    tags: [...new Set([...material.tags.filter(tag => tag !== "question-import-pending"), ...(pendingOcrPages.length ? ["ocr-required", "needs-review"] : [])])] });
  await saveQuestionPdfImport(ready);
  publish(ready);
}

/** Owns the work independently of the modal. Original and final preview survive reload. */
export function startQuestionPdfImport(file?: File): Promise<void> {
  if (running) {
    if (file && file.name !== snapshot?.name) return Promise.reject(new Error("Another PDF is still being imported. Let it finish before choosing a different PDF."));
    return running;
  }
  const previous = snapshot;
  const job: QuestionPdfImport = file
    ? { id: "latest", name: file.name, status: "saving", current: 0, total: 0, parsed: [], pendingOcrPages: [] }
    : { ...previous!, status: "reading", error: undefined };
  if (!file && !job.sourceHash) return Promise.reject(new Error("Select a PDF to import."));
  publish(job);
  running = (async () => {
    try {
      if (file) {
        const asset = await saveLocalImage(file, file.name);
        job.sourceHash = asset.hash;
        job.materialId = addLocalItem({sourceTitle:file.name.replace(/\.pdf$/i,""),text:"",localPdfHash:asset.hash,
          storageScope:"local",deviceSource:"web",tags:["pdf","imported-source","question-import-pending"]}).id;
      } else {
        const asset = await getLocalImage(job.sourceHash!);
        if (!asset) throw new Error("Original PDF is missing. Select the file again.");
        file = new File([asset.blob], asset.name, {type:"application/pdf"});
      }
      job.status = "reading";
      await saveQuestionPdfImport(job);
      publish({ ...job });
      await extract(job, file!);
    } catch (error) {
      const failed = { ...job, status: "error" as const, error: error instanceof Error ? error.message : String(error) };
      publish(failed);
      if (job.sourceHash) await saveQuestionPdfImport(failed).catch(() => {});
    }
  })().finally(() => { running = undefined; });
  return running;
}
