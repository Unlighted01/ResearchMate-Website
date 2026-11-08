// ============================================
// QUESTION BANK INDEXEDDB STORAGE
// High-capacity offline browser storage for user question library.
// Bypasses the 5MB browser localStorage limit for large PDF review books.
// Gracefully falls back when IndexedDB is unavailable (SSR / Node test environments).
// ============================================

import type { StoredQuestion, ImportBatch } from "./questionBankService";

const DB_NAME = "researchmate_bank_db";
const DB_VERSION = 1;
const STORE_QUESTIONS = "questions";
const STORE_BATCHES = "batches";

function isIndexedDbSupported(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      typeof window.indexedDB !== "undefined" &&
      window.indexedDB !== null
    );
  } catch {
    return false;
  }
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

export function getDb(): Promise<IDBDatabase | null> {
  if (!isIndexedDbSupported()) {
    return Promise.resolve(null);
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Questions store
        if (!db.objectStoreNames.contains(STORE_QUESTIONS)) {
          const qStore = db.createObjectStore(STORE_QUESTIONS, { keyPath: "id" });
          qStore.createIndex("importBatchId", "importBatchId", { unique: false });
          qStore.createIndex("subject", "subject", { unique: false });
          qStore.createIndex("topic", "topic", { unique: false });
          qStore.createIndex("reviewStatus", "reviewStatus", { unique: false });
        }

        // Batches store
        if (!db.objectStoreNames.contains(STORE_BATCHES)) {
          db.createObjectStore(STORE_BATCHES, { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (err) => {
        console.warn("IndexedDB open failed, falling back to memory/localStorage:", err);
        resolve(null);
      };

      request.onblocked = () => {
        console.warn("IndexedDB open blocked");
        resolve(null);
      };
    } catch (err) {
      console.warn("IndexedDB initialization error:", err);
      resolve(null);
    }
  });

  return dbPromise;
}

/**
 * Loads all questions from IndexedDB.
 */
export async function getAllQuestionsFromDb(): Promise<StoredQuestion[]> {
  const db = await getDb();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_QUESTIONS, "readonly");
      const store = tx.objectStore(STORE_QUESTIONS);
      const req = store.getAll();

      req.onsuccess = () => resolve((req.result as StoredQuestion[]) || []);
      req.onerror = () => resolve([]);
    } catch (err) {
      console.warn("Failed to fetch questions from IndexedDB:", err);
      resolve([]);
    }
  });
}

/**
 * Replaces or bulk puts questions into IndexedDB.
 */
export async function saveQuestionsToDb(questions: StoredQuestion[]): Promise<void> {
  const db = await getDb();
  if (!db) return;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_QUESTIONS, "readwrite");
      const store = tx.objectStore(STORE_QUESTIONS);

      // Clear existing and rewrite current snapshot for absolute consistency
      store.clear();
      for (const q of questions) {
        store.put(q);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      console.warn("Failed to save questions to IndexedDB:", err);
      resolve();
    }
  });
}

/**
 * Deletes all questions belonging to a specific batch ID.
 */
export async function deleteQuestionsByBatchFromDb(batchId: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_QUESTIONS, "readwrite");
      const store = tx.objectStore(STORE_QUESTIONS);
      const index = store.index("importBatchId");
      const req = index.getAllKeys(batchId);

      req.onsuccess = () => {
        const keys = req.result;
        for (const key of keys) {
          store.delete(key);
        }
        tx.oncomplete = () => resolve(keys.length);
      };
      req.onerror = () => resolve(0);
    } catch (err) {
      console.warn("Failed to delete batch questions from IndexedDB:", err);
      resolve(0);
    }
  });
}

/**
 * Loads all import batches.
 */
export async function getAllBatchesFromDb(): Promise<ImportBatch[]> {
  const db = await getDb();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_BATCHES, "readonly");
      const store = tx.objectStore(STORE_BATCHES);
      const req = store.getAll();

      req.onsuccess = () => {
        const batches = (req.result as ImportBatch[]) || [];
        batches.sort((a, b) => b.timestamp - a.timestamp);
        resolve(batches);
      };
      req.onerror = () => resolve([]);
    } catch (err) {
      console.warn("Failed to fetch batches from IndexedDB:", err);
      resolve([]);
    }
  });
}

/**
 * Saves or updates an import batch.
 */
export async function saveBatchToDb(batch: ImportBatch): Promise<void> {
  const db = await getDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_BATCHES, "readwrite");
      const store = tx.objectStore(STORE_BATCHES);
      store.put(batch);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (err) {
      console.warn("Failed to save batch to IndexedDB:", err);
      resolve();
    }
  });
}

/**
 * Deletes a batch record.
 */
export async function deleteBatchFromDb(batchId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_BATCHES, "readwrite");
      const store = tx.objectStore(STORE_BATCHES);
      store.delete(batchId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (err) {
      console.warn("Failed to delete batch from IndexedDB:", err);
      resolve();
    }
  });
}

/**
 * Clears the entire database (questions and batches).
 */
export async function clearAllDb(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_QUESTIONS, STORE_BATCHES], "readwrite");
      tx.objectStore(STORE_QUESTIONS).clear();
      tx.objectStore(STORE_BATCHES).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
