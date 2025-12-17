// ============================================
// geminiService.ts - AI Service (Netlify Functions Version)
// ============================================

// ============================================
// PART 1: CONFIGURATION
// ============================================

/**
 * API Configuration
 * Uses Netlify Functions in production, localhost in development
 */
const getApiBaseUrl = (): string => {
  // Check if we're on Netlify (production)
  const isNetlify =
    window.location.hostname.includes("netlify.app") ||
    window.location.hostname === "researchmate-web.netlify.app";

  if (isNetlify) {
    return "/api";
  }

  // Local development
  return "http://localhost:3001/api";
};

const API_BASE_URL = getApiBaseUrl();

export const CONFIG = {
  USE_REAL_API: true,
  API_BASE_URL: API_BASE_URL,
  DEMO_MODE_MESSAGE: "(demo summary · using mock data)",
};

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

export interface SummaryResult {
  ok: boolean;
  summary: string;
  reason?: string;
  error?: string;
}

export interface TagsResult {
  ok: boolean;
  tags: string[];
  reason?: string;
  error?: string;
}

export interface InsightsResult {
  ok: boolean;
  insights: string;
  reason?: string;
  error?: string;
}

export interface ChatResult {
  ok: boolean;
  response: string;
  reason?: string;
  error?: string;
}

export interface APIStatusResult {
  configured: boolean;
  message: string;
}

// ============================================
// PART 3: API KEY MANAGEMENT (DEPRECATED - DO NOT USE)
// ============================================
// NOTE: These functions are deprecated and should not be used.
// API keys should NEVER be stored client-side for security reasons.
// All AI operations now go through secure Netlify Functions.

/**
 * @deprecated DO NOT USE - API keys should never be stored client-side
 * This function is kept for backwards compatibility only
 */
export function setApiKey(key: string): void {
  console.warn('⚠️ SECURITY WARNING: setApiKey is deprecated. API keys should never be stored client-side!');
  // Intentionally do nothing - this prevents accidental API key storage
}

/**
 * @deprecated DO NOT USE - API keys should never be stored client-side
 */
export function getApiKey(): string {
  console.warn('⚠️ SECURITY WARNING: getApiKey is deprecated. Use secure backend endpoints instead.');
  return "";
}

// ============================================
// PART 4: CORE AI FUNCTIONS
// ============================================

/**
 * Main summarization function
 */
export async function summarizeText(input: string): Promise<SummaryResult> {
  const text = (input || "").trim();

  if (!text) {
    return { ok: false, summary: "", reason: "empty" };
  }

  if (!CONFIG.USE_REAL_API) {
    return generateDemoSummary(text);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed: ${response.status}`);
    }

    const data = await response.json();
    return { ok: true, summary: data.summary || "" };
  } catch (error) {
    console.error("❌ AI summarization failed:", error);

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        ok: false,
        summary: "",
        reason: "network_error",
        error: "Cannot connect to AI service. Please try again later.",
      };
    }

    return {
      ok: false,
      summary: "",
      reason: "network_error",
      error: (error as Error).message,
    };
  }
}

/**
 * Generate tags for research content
 */
export async function generateTags(text: string): Promise<TagsResult> {
  const input = (text || "").trim();

  if (!input) {
    return { ok: false, tags: [], reason: "empty" };
  }

  if (!CONFIG.USE_REAL_API) {
    const words = input.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const uniqueWords = [...new Set(words)].slice(0, 5);
    return { ok: true, tags: uniqueWords };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/generate-tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed: ${response.status}`);
    }

    const data = await response.json();
    return { ok: true, tags: data.tags || [] };
  } catch (error) {
    console.error("❌ Tag generation failed:", error);
    return {
      ok: false,
      tags: [],
      reason: "network_error",
      error: (error as Error).message,
    };
  }
}

/**
 * Extract insights from research text
 */
export async function extractInsights(text: string): Promise<InsightsResult> {
  const input = (text || "").trim();

  if (!input) {
    return { ok: false, insights: "", reason: "empty" };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed: ${response.status}`);
    }

    const data = await response.json();
    return { ok: true, insights: data.insights || "" };
  } catch (error) {
    console.error("❌ Insight extraction failed:", error);
    return {
      ok: false,
      insights: "",
      reason: "network_error",
      error: (error as Error).message,
    };
  }
}

// ============================================
// PART 5: CHAT FUNCTIONALITY
// ============================================

/**
 * Generate chat response for AI Assistant
 */
export async function generateChatResponse(
  userMessage: string,
  context: string
): Promise<ChatResult> {
  const message = (userMessage || "").trim();

  if (!message) {
    return { ok: false, response: "", reason: "empty" };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed: ${response.status}`);
    }

    const data = await response.json();
    return { ok: true, response: data.response || "" };
  } catch (error) {
    console.error("❌ Chat response failed:", error);

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        ok: false,
        response: "Cannot connect to AI service. Please try again later.",
        reason: "network_error",
      };
    }

    return {
      ok: false,
      response: "",
      reason: "network_error",
      error: (error as Error).message,
    };
  }
}

// ============================================
// PART 6: DEMO MODE (FALLBACK)
// ============================================

function generateDemoSummary(text: string): SummaryResult {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .slice(0, 3)
    .join(" ");
  const words = text.split(/\s+/).filter(Boolean).length;
  const summary = sentences || text.slice(0, 280);

  return {
    ok: true,
    summary: `${summary}\n\n— ${CONFIG.DEMO_MODE_MESSAGE} · ${words} words in original`,
  };
}

// ============================================
// PART 7: UTILITY FUNCTIONS
// ============================================

/**
 * Check if backend/functions are available
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check API status
 */
export function checkAPIStatus(): APIStatusResult {
  if (!CONFIG.USE_REAL_API) {
    return {
      configured: false,
      message: "AI features are in demo mode.",
    };
  }

  return {
    configured: true,
    message: "AI features are active.",
  };
}

/**
 * Test API connection
 */
export async function testAPIConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const backendHealthy = await checkBackendHealth();
    if (!backendHealthy) {
      return {
        success: false,
        message: "AI service is not available. Please try again later.",
      };
    }

    const testText = "This is a test message to verify API connectivity.";
    const result = await summarizeText(testText);

    if (result.ok) {
      return { success: true, message: "API connection successful! ✅" };
    } else {
      return {
        success: false,
        message: result.error || result.reason || "Unknown error",
      };
    }
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ============================================
// PART 8: CACHING (LRU with TTL)
// ============================================

const summaryCache = new Map<
  string,
  { summary: string; timestamp: number; lastAccessed: number }
>();
const MAX_CACHE_SIZE = 50;
const CACHE_TTL = 3600000; // 1 hour

// Clean expired entries periodically
let cleanupInterval: NodeJS.Timeout | null = null;
if (typeof window !== "undefined") {
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];

    summaryCache.forEach((value, key) => {
      if (now - value.timestamp > CACHE_TTL) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => summaryCache.delete(key));
  }, 600000); // Clean every 10 minutes
}

export function getCachedSummary(text: string): string | null {
  const hash = hashText(text);
  const cached = summaryCache.get(hash);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // Update last accessed time for LRU
    cached.lastAccessed = Date.now();
    summaryCache.set(hash, cached);
    return cached.summary;
  }

  // Remove expired entry
  if (cached) {
    summaryCache.delete(hash);
  }

  return null;
}

export function cacheSummary(text: string, summary: string): void {
  const hash = hashText(text);
  const now = Date.now();

  // First, try to remove expired entries
  if (summaryCache.size >= MAX_CACHE_SIZE) {
    const keysToDelete: string[] = [];

    summaryCache.forEach((value, key) => {
      if (now - value.timestamp > CACHE_TTL) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => summaryCache.delete(key));
  }

  // If still at capacity, use LRU eviction (remove least recently accessed)
  if (summaryCache.size >= MAX_CACHE_SIZE) {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    summaryCache.forEach((value, key) => {
      if (value.lastAccessed < oldestAccess) {
        oldestAccess = value.lastAccessed;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      summaryCache.delete(oldestKey);
    }
  }

  summaryCache.set(hash, {
    summary,
    timestamp: now,
    lastAccessed: now,
  });
}

function hashText(text: string): string {
  // Limit text length for hashing to prevent extremely long input
  const maxLength = 10000;
  const textToHash = text.length > maxLength ? text.substring(0, maxLength) : text;

  let hash = 0;
  for (let i = 0; i < textToHash.length; i++) {
    const char = textToHash.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// Cleanup interval on module unload (for hot reload in dev)
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (cleanupInterval) clearInterval(cleanupInterval);
  });
}

// ============================================
// PART 9: EXPORTS
// ============================================

// Compatibility with existing imports
export async function generateSummary(text: string): Promise<string> {
  const result = await summarizeText(text);
  return result.ok ? result.summary : "";
}

export default {
  summarizeText,
  generateTags,
  extractInsights,
  generateChatResponse,
  generateSummary,
  setApiKey,
  getApiKey,
  checkAPIStatus,
  testAPIConnection,
  checkBackendHealth,
  getCachedSummary,
  cacheSummary,
};
