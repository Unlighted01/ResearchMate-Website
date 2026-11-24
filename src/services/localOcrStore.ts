import type { SourceCrop } from "./keyProvenance";

const DB_NAME = "researchmate_local_ocr_b1";
const DB_VERSION = 4;
const ASSETS = "assets";
const PAGES = "pages";
const MODELS = "models";
const QUEUE = "queue";
const PDF_JOBS = "pdfJobs";
const QUESTION_IMPORTS = "questionImports";

export interface LocalImageAsset {
  hash: string;
  name: string;
  mime: string;
  size: number;
  blob: Blob;
  createdAt: string;
  storageScope: "local";
}

export interface OcrWord {
  text: string;
  box: SourceCrop;
  confidence: number;
}

export interface LocalOcrPage {
  rasterDpi?: number;
  keyProvenance?: "none";
  cacheKey: string;
  sourceHash: string;
  pageNumber: number;
  text: string;
  words: OcrWord[];
  confidence: number;
  engineVersion: string;
  language: "eng" | "tgl" | "eng+tgl";
  preprocess: "original" | "upscale2x";
  route: "FAIR";
  createdAt: string;
  storageScope: "local";
}

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB is required for durable local OCR storage."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS, { keyPath: "hash" });
      if (!db.objectStoreNames.contains(PAGES)) db.createObjectStore(PAGES, { keyPath: "cacheKey" });
      if (!db.objectStoreNames.contains(MODELS)) db.createObjectStore(MODELS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(QUEUE)) db.createObjectStore(QUEUE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(PDF_JOBS)) db.createObjectStore(PDF_JOBS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(QUESTION_IMPORTS)) db.createObjectStore(QUESTION_IMPORTS, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open local OCR storage."));
    request.onblocked = () => reject(new Error("Local OCR storage upgrade is blocked by another tab."));
  });
}

async function getRecord<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDb();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const request = db.transaction(storeName, "readonly").objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

async function putRecord(storeName: string, value: unknown): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put(value);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function sha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function saveLocalImage(blob: Blob, name: string): Promise<LocalImageAsset> {
  const hash = await sha256(blob);
  const existing = await getLocalImage(hash);
  if (existing) return existing;
  const asset: LocalImageAsset = {
    hash,
    name,
    mime: blob.type || "application/octet-stream",
    size: blob.size,
    blob,
    createdAt: new Date().toISOString(),
    storageScope: "local",
  };
  await putRecord(ASSETS, asset);
  return asset;
}

export function getLocalImage(hash: string): Promise<LocalImageAsset | undefined> {
  return getRecord<LocalImageAsset>(ASSETS, hash);
}

export function getLocalOcrPage(cacheKey: string): Promise<LocalOcrPage | undefined> {
  return getRecord<LocalOcrPage>(PAGES, cacheKey);
}

export async function saveLocalOcrPage(page: LocalOcrPage): Promise<void> {
  if (page.route !== "FAIR" || page.storageScope !== "local") throw new Error("Uncalibrated OCR pages must remain local FAIR review material.");
  await putRecord(PAGES, page);
}

export function getPdfOcrJob(id: string): Promise<import("./pdfLocalOcrService").PdfOcrJob | undefined> {
  return getRecord(PDF_JOBS, id);
}

export function savePdfOcrJob(job: import("./pdfLocalOcrService").PdfOcrJob): Promise<void> {
  return putRecord(PDF_JOBS, job);
}

export function getQuestionPdfImport(): Promise<import("./questionPdfImportService").QuestionPdfImport | undefined> {
  return getRecord(QUESTION_IMPORTS, "latest");
}

export function saveQuestionPdfImport(job: import("./questionPdfImportService").QuestionPdfImport): Promise<void> {
  return putRecord(QUESTION_IMPORTS, job);
}

export async function isModelReady(language: string, version: string): Promise<boolean> {
  if (version !== "tesseract.js@7.0.0") return false;
  // Tesseract 7's browser adapter uses idb-keyval's default store. Count keys,
  // rather than loading multi-megabyte model values onto the main thread.
  return new Promise((resolve) => {
    const request = indexedDB.open("keyval-store");
    request.onupgradeneeded = () => request.transaction?.abort();
    request.onerror = () => resolve(false);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("keyval")) { db.close(); resolve(false); return; }
      const transaction = db.transaction("keyval", "readonly");
      let present = 0;
      const languages = language.split("+");
      for (const lang of languages) {
        const count = transaction.objectStore("keyval").count(`researchmate-ocr-7.0.0/${lang}.traineddata`);
        count.onsuccess = () => { present += count.result; };
      }
      transaction.oncomplete = () => { db.close(); resolve(present === languages.length); };
      transaction.onabort = transaction.onerror = () => { db.close(); resolve(false); };
    };
  });
}

export async function markModelReady(language: string, version: string): Promise<void> {
  await putRecord(MODELS, { id: `${version}:${language}`, readyAt: new Date().toISOString() });
}

export async function saveOcrQueueJobs(jobs: import("./localOcrQueue").LocalOcrJob[], id: string): Promise<void> {
  if (jobs.length) { await putRecord(QUEUE, { id, jobs }); return; }
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(QUEUE, "readwrite"); tx.objectStore(QUEUE).delete(id);
      tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}

export async function loadOcrQueueState(): Promise<{ id: string; jobs: import("./localOcrQueue").LocalOcrJob[] } | undefined> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(QUEUE, "readonly").objectStore(QUEUE).getAll();
      request.onsuccess = () => resolve(request.result.find((state) => state.jobs?.length));
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

/** B1 has no upload action. The preview exposes exactly what a later sync flow must review. */
export async function getLocalSyncPreview(hash: string): Promise<{
  sourceHash: string;
  name: string;
  bytes: number;
  storageScope: "local";
  syncAvailable: false;
}> {
  const asset = await getLocalImage(hash);
  if (!asset) throw new Error("Local image not found.");
  return { sourceHash: hash, name: asset.name, bytes: asset.size, storageScope: "local", syncAvailable: false };
}
