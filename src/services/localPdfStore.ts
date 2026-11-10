const DB_NAME = "ResearchMatePDFDB";
const STORE_NAME = "pdfStore";
const DB_VERSION = 1;

export interface StoredPdf {
  id: string; // "current" or "playground_pending"
  title: string;
  data: ArrayBuffer;
  timestamp: number;
}

export interface PlaygroundPendingRecord {
  id: "playground_pending";
  fileName: string;
  fileType: string;
  data: ArrayBuffer;
  timestamp: number;
  totalQuestionsParsed: number;
  allParsedQuestions: any[];
}

const memoryStore = new Map<string, any>();

function isIndexedDBAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return reject(new Error("IndexedDB not available in current environment"));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePdfLocally(title: string, data: ArrayBuffer): Promise<void> {
  if (!isIndexedDBAvailable()) {
    memoryStore.set("current", { id: "current", title, data, timestamp: Date.now() });
    return;
  }

  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      
      const record: StoredPdf = {
        id: "current",
        title,
        data,
        timestamp: Date.now(),
      };

      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    memoryStore.set("current", { id: "current", title, data, timestamp: Date.now() });
  }
}

export async function getLocalPdf(): Promise<StoredPdf | null> {
  if (!isIndexedDBAvailable()) {
    return memoryStore.get("current") || null;
  }

  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get("current");

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return memoryStore.get("current") || null;
  }
}

export async function clearLocalPdf(): Promise<void> {
  memoryStore.delete("current");
  if (!isIndexedDBAvailable()) return;

  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete("current");

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Ignore error
  }
}

/**
 * Temporary In-Memory / IndexedDB Playground PDF Storage
 * Holds guest-uploaded PDF files on the client so that when the user
 * registers or logs in, the document is automatically ingested into their dashboard.
 */
export async function savePlaygroundPendingPdf(
  file: File,
  allParsedQuestions: any[] = []
): Promise<void> {
  const buffer = await file.arrayBuffer();
  const record: PlaygroundPendingRecord = {
    id: "playground_pending",
    fileName: file.name,
    fileType: file.type || "application/pdf",
    data: buffer,
    timestamp: Date.now(),
    totalQuestionsParsed: allParsedQuestions.length,
    allParsedQuestions,
  };

  if (!isIndexedDBAvailable()) {
    memoryStore.set("playground_pending", record);
  } else {
    try {
      const db = await initDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      memoryStore.set("playground_pending", record);
    }
  }

  try {
    localStorage.setItem(
      "rm_pending_playground_pdf_meta",
      JSON.stringify({
        fileName: file.name,
        totalQuestions: allParsedQuestions.length,
        timestamp: Date.now(),
      })
    );
  } catch (_) {}
}

export async function getPlaygroundPendingPdf(): Promise<{
  file: File;
  totalQuestionsParsed: number;
  allParsedQuestions: any[];
} | null> {
  let record: PlaygroundPendingRecord | null = null;

  if (isIndexedDBAvailable()) {
    try {
      const db = await initDB();
      record = await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const req = store.get("playground_pending");
        req.onsuccess = () => resolve(requestResult(req));
        req.onerror = () => reject(req.error);
      });
    } catch {
      record = memoryStore.get("playground_pending") || null;
    }
  } else {
    record = memoryStore.get("playground_pending") || null;
  }

  if (!record || !record.data) return null;

  const file = new File([record.data], record.fileName, {
    type: record.fileType || "application/pdf",
  });

  return {
    file,
    totalQuestionsParsed: record.totalQuestionsParsed || 0,
    allParsedQuestions: record.allParsedQuestions || [],
  };
}

function requestResult(req: IDBRequest): any {
  return req.result || null;
}

export async function clearPlaygroundPendingPdf(): Promise<void> {
  memoryStore.delete("playground_pending");

  if (isIndexedDBAvailable()) {
    try {
      const db = await initDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const req = store.delete("playground_pending");
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (_) {}
  }

  try {
    localStorage.removeItem("rm_pending_playground_pdf_meta");
    sessionStorage.removeItem("rm_pending_playground_exam");
  } catch (_) {}
}
