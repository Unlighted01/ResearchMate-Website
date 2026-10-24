// ============================================
// CONVERSATION SERVICE
// Persistent AI Chat Engine (IndexedDB + localStorage fallback)
// Anchored per item and multi-session AI Assistant threads
// ResearchMate Design System
// ============================================

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: number;
  model?: string;
  imageUrl?: string; // Optional attached screenshot or diagram data URL
}

export interface ConversationThread {
  id: string;
  title: string;
  itemId?: string; // Set when anchored to a specific research item/note
  itemTitle?: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  model?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  itemId?: string;
  itemTitle?: string;
  messageCount: number;
  updatedAt: number;
  preview: string;
}

const DB_NAME = "researchmate_chat_db";
const DB_VERSION = 1;
const STORE_NAME = "conversations";
const FALLBACK_LOCAL_KEY = "rm_chat_threads_fallback";

// In-memory fallback cache for SSR or environments without IndexedDB/localStorage
let memoryFallback: Record<string, ConversationThread> = {};

/**
 * Check if IndexedDB is supported and accessible
 */
function isIndexedDBAvailable(): boolean {
  if (typeof window === "undefined" || !window.indexedDB) return false;
  return true;
}

/**
 * Open or upgrade the IndexedDB database
 */
function openChatDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return reject(new Error("IndexedDB not available in current environment"));
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("itemId", "itemId", { unique: false });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Helper: Read fallback store from localStorage
 */
function getFallbackStore(): Record<string, ConversationThread> {
  if (typeof window === "undefined" || !window.localStorage) {
    return memoryFallback;
  }
  try {
    const raw = localStorage.getItem(FALLBACK_LOCAL_KEY);
    return raw ? JSON.parse(raw) : memoryFallback;
  } catch {
    return memoryFallback;
  }
}

/**
 * Helper: Save fallback store to localStorage
 */
function setFallbackStore(store: Record<string, ConversationThread>): void {
  memoryFallback = store;
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(FALLBACK_LOCAL_KEY, JSON.stringify(store));
    } catch (e) {
      console.warn("LocalStorage fallback write error:", e);
    }
  }
}

/**
 * Generates a clean, readable thread title from the initial user query or document title
 */
export function generateThreadTitle(firstQuery: string, docTitle?: string): string {
  if (!firstQuery && docTitle) return `Chat: ${docTitle}`;
  if (!firstQuery) return "New Conversation";

  // Clean markdown or formula symbols
  const cleaned = firstQuery
    .replace(/^(\?|\!|\#|\*)+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // If very short, return as-is
  if (cleaned.length <= 40) return cleaned;

  // Truncate at word boundary
  const words = cleaned.split(" ");
  let result = "";
  for (const word of words) {
    if ((result + " " + word).trim().length > 38) break;
    result = (result + " " + word).trim();
  }

  return (result || cleaned.substring(0, 38)) + "...";
}

/**
 * Save or update a conversation thread in IndexedDB (with fallback)
 */
export async function saveConversation(thread: ConversationThread): Promise<void> {
  const updatedThread = {
    ...thread,
    updatedAt: thread.updatedAt || Date.now(),
  };

  try {
    const db = await openChatDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(updatedThread);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback to localStorage / memory
    const store = getFallbackStore();
    store[updatedThread.id] = updatedThread;
    setFallbackStore(store);
  }
}

/**
 * Retrieve a specific conversation thread by ID
 */
export async function getConversation(id: string): Promise<ConversationThread | null> {
  try {
    const db = await openChatDB();
    return await new Promise<ConversationThread | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const store = getFallbackStore();
    return store[id] || null;
  }
}

/**
 * Retrieve conversation anchored to a specific research item
 */
export async function getItemConversation(itemId: string): Promise<ConversationThread | null> {
  const syntheticId = `item_chat_${itemId}`;
  const direct = await getConversation(syntheticId);
  if (direct) return direct;

  // Try looking up via index if available
  try {
    const db = await openChatDB();
    return await new Promise<ConversationThread | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("itemId");
      const req = index.get(itemId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    const store = getFallbackStore();
    return (
      Object.values(store).find((t) => t.itemId === itemId) ||
      store[syntheticId] ||
      null
    );
  }
}

/**
 * Save messages anchored to a specific item
 */
export async function saveItemConversation(
  itemId: string,
  messages: ChatMessage[],
  itemTitle?: string,
  model?: string,
): Promise<ConversationThread> {
  const id = `item_chat_${itemId}`;
  const existing = await getItemConversation(itemId);

  const firstUserMsg = messages.find((m) => m.role === "user");
  const title =
    existing?.title ||
    (firstUserMsg
      ? generateThreadTitle(firstUserMsg.text, itemTitle)
      : itemTitle
      ? `Chat: ${itemTitle}`
      : "Item Discussion");

  const thread: ConversationThread = {
    id,
    title,
    itemId,
    itemTitle: itemTitle || existing?.itemTitle,
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now(),
    messages,
    model: model || existing?.model || "gemini-flash",
  };

  await saveConversation(thread);
  return thread;
}

/**
 * Clear conversation for a specific item
 */
export async function clearItemConversation(itemId: string): Promise<void> {
  const id = `item_chat_${itemId}`;
  await deleteConversation(id);
}

/**
 * List all saved conversations (sorted newest first)
 */
export async function listConversations(): Promise<ConversationSummary[]> {
  try {
    const db = await openChatDB();
    const all = await new Promise<ConversationThread[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    return all
      .map((t) => {
        const lastMsg = t.messages[t.messages.length - 1];
        return {
          id: t.id,
          title: t.title,
          itemId: t.itemId,
          itemTitle: t.itemTitle,
          messageCount: t.messages.length,
          updatedAt: t.updatedAt,
          preview: lastMsg ? lastMsg.text.slice(0, 80) : "",
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    const store = getFallbackStore();
    return Object.values(store)
      .map((t) => {
        const lastMsg = t.messages[t.messages.length - 1];
        return {
          id: t.id,
          title: t.title,
          itemId: t.itemId,
          itemTitle: t.itemTitle,
          messageCount: t.messages.length,
          updatedAt: t.updatedAt,
          preview: lastMsg ? lastMsg.text.slice(0, 80) : "",
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

/**
 * Delete a specific conversation thread
 */
export async function deleteConversation(id: string): Promise<void> {
  try {
    const db = await openChatDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const store = getFallbackStore();
    delete store[id];
    setFallbackStore(store);
  }
}

/**
 * Test helper: resets storage
 */
export function _resetConversationStorage(): void {
  memoryFallback = {};
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem(FALLBACK_LOCAL_KEY);
  }
}

/**
 * Format relative time (e.g., "Just now", "5m ago", "Yesterday")
 */
export function formatConversationTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
