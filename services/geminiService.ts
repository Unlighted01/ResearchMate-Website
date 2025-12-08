// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

// No external imports needed - using native fetch

// ============================================
// PART 2: CONFIGURATION & CONSTANTS
// ============================================

/**
 * Backend Proxy Configuration
 * All AI requests go through our secure backend instead of directly to Gemini
 * This keeps API keys safe on the server
 */
const BACKEND_URL: string =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export const CONFIG = {
  USE_REAL_API: true,
  BACKEND_URL: BACKEND_URL,
  DEMO_MODE_MESSAGE: "(demo summary · using mock data)",
};

// ============================================
// PART 3: TYPE DEFINITIONS
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
// PART 4: API KEY MANAGEMENT (Legacy Support)
// ============================================

/**
 * Store user's custom API key (optional)
 * Note: With backend proxy, this is no longer needed for security
 * Kept for backwards compatibility
 */
export function setApiKey(key: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("researchmate_ai_key", key || "");
  }
}

/**
 * Get API key from localStorage
 * Note: With backend proxy, this is only used if you want users to use their own keys
 */
export function getApiKey(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("researchmate_ai_key") || "";
  }
  return "";
}

// ============================================
// PART 5: CORE AI FUNCTIONS
// ============================================

/**
 * Main summarization function - generates concise summary of research text
 * @param input - The text to summarize
 * @returns Promise<SummaryResult>
 */
export async function summarizeText(input: string): Promise<SummaryResult> {
  const text = (input || "").trim();

  // Validation
  if (!text) {
    return { ok: false, summary: "", reason: "empty" };
  }

  // Demo mode fallback (when API is disabled)
  if (!CONFIG.USE_REAL_API) {
    return generateDemoSummary(text);
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/summarize`, {
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

    // Check if backend is not running
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        ok: false,
        summary: "",
        reason: "backend_offline",
        error:
          "Backend server not running. Start it with: cd researchmate-backend && npm run dev",
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
 * Generate intelligent tags for research content
 * @param text - The text to analyze
 * @returns Promise<TagsResult>
 */
export async function generateTags(text: string): Promise<TagsResult> {
  const input = (text || "").trim();

  if (!input) {
    return { ok: false, tags: [], reason: "empty" };
  }

  if (!CONFIG.USE_REAL_API) {
    // Demo mode: extract simple keywords
    const words = input.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const uniqueWords = [...new Set(words)].slice(0, 5);
    return { ok: true, tags: uniqueWords };
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/generate-tags`, {
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
 * Extract key concepts and insights from research text
 * @param text - The text to analyze
 * @returns Promise<InsightsResult>
 */
export async function extractInsights(text: string): Promise<InsightsResult> {
  const input = (text || "").trim();

  if (!input) {
    return { ok: false, insights: "", reason: "empty" };
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/insights`, {
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
// PART 6: CHAT FUNCTIONALITY
// ============================================

/**
 * Generate chat response based on user query and context
 * This is specific to the website's AI Assistant feature
 * @param userMessage - User's message
 * @param context - Research context to inform the response
 * @returns Promise<ChatResult>
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
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
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

    // User-friendly error for backend offline
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        ok: false,
        response:
          "Cannot connect to AI service. Please make sure the backend server is running.",
        reason: "backend_offline",
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
// PART 7: DEMO MODE (FALLBACK)
// ============================================

/**
 * Generate mock summary when API is disabled (for testing/development)
 * @private
 */
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
// PART 8: UTILITY FUNCTIONS
// ============================================

/**
 * Check if backend is available
 * @returns Promise<boolean>
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check if API is properly configured
 * @returns APIStatusResult
 */
export function checkAPIStatus(): APIStatusResult {
  if (!CONFIG.USE_REAL_API) {
    return {
      configured: false,
      message: "AI features are in demo mode. Enable USE_REAL_API to activate.",
    };
  }

  return {
    configured: true,
    message: "AI features are active (using backend proxy).",
  };
}

/**
 * Test API connection with a simple request
 * @returns Promise<{ success: boolean; message: string }>
 */
export async function testAPIConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // First check if backend is running
    const backendHealthy = await checkBackendHealth();
    if (!backendHealthy) {
      return {
        success: false,
        message:
          "Backend server not running. Start it with: cd researchmate-backend && npm run dev",
      };
    }

    // Test actual summarization
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
// PART 9: CACHING
// ============================================

/**
 * Cache for recent summaries to avoid duplicate API calls
 * @private
 */
const summaryCache = new Map<string, { summary: string; timestamp: number }>();
const MAX_CACHE_SIZE = 50;
const CACHE_TTL = 3600000; // 1 hour

/**
 * Get cached summary if available and not expired
 */
export function getCachedSummary(text: string): string | null {
  const hash = hashText(text);
  const cached = summaryCache.get(hash);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.summary;
  }

  return null;
}

/**
 * Store summary in cache
 */
export function cacheSummary(text: string, summary: string): void {
  const hash = hashText(text);

  // Limit cache size
  if (summaryCache.size >= MAX_CACHE_SIZE) {
    const firstKey = summaryCache.keys().next().value;
    if (firstKey) summaryCache.delete(firstKey);
  }

  summaryCache.set(hash, {
    summary,
    timestamp: Date.now(),
  });
}

/**
 * Simple hash function for cache keys
 * @private
 */
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// ============================================
// PART 10: EXPORTS
// ============================================

// For compatibility with existing App.tsx imports
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
