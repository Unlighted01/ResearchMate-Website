import type { SourceCrop } from "./keyProvenance";

const DB_NAME = "researchmate_local_ocr_b1";
const DB_VERSION = 1;
const ASSETS = "assets";
const PAGES = "pages";
const MODELS = "models";

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

export async function isModelReady(language: string, version: string): Promise<boolean> {
  return Boolean(await getRecord(MODELS, `${version}:${language}`));
}

export async function markModelReady(language: string, version: string): Promise<void> {
  await putRecord(MODELS, { id: `${version}:${language}`, readyAt: new Date().toISOString() });
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
