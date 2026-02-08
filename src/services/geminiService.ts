// ============================================
// geminiService.ts - Secure AI Service
// ============================================

import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client for Auth (Session Retrieval)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// PART 1: CONFIGURATION
// ============================================

// Monorepo Setup: Function runs on same domain (Vercel)
// Locally, use 'vercel dev' to proxy /api
const API_BASE_URL = "/api";

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
  credits_remaining?: number | string;
}

export interface TagsResult {
  ok: boolean;
  tags: string[];
  reason?: string;
  error?: string;
  credits_remaining?: number | string;
}

export interface InsightsResult {
  ok: boolean;
  insights: string;
  reason?: string;
  error?: string;
  credits_remaining?: number | string;
}

export interface ChatResult {
  ok: boolean;
  response: string;
  reason?: string;
  error?: string;
  credits_remaining?: number | string;
}

// ============================================
// PART 3: AUTH HELPER
// ============================================

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // 1. Check for Custom User Key (BYOK)
  const customKey = localStorage.getItem("custom_gemini_key");
  if (customKey) {
    headers["x-custom-api-key"] = customKey;
    // We still send the token if available, just in case backend wants identity
  }

  // 2. Get Supabase Session Token
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

// ============================================
// PART 4: CORE AI FUNCTIONS
// ============================================

/**
 * Main summarization function
 */
export async function summarizeText(input: string): Promise<SummaryResult> {
  const text = (input || "").trim();
  if (!text) return { ok: false, summary: "", reason: "empty" };

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/summarize`, {
      method: "POST",
      headers,
      body: JSON.stringify({ text }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 403 && data.code === "NO_CREDITS") {
        return {
          ok: false,
          summary: "",
          reason: "no_credits",
          error: "You have used all your free AI credits.",
        };
      }
      throw new Error(data.error || "Request failed");
    }

    return {
      ok: true,
      summary: data.summary || "",
      credits_remaining: data.credits_remaining,
    };
  } catch (error) {
    console.error("❌ AI summarization failed:", error);
    return { ok: false, summary: "", error: (error as Error).message };
  }
}

/**
 * Generate tags
 */
export async function generateTags(text: string): Promise<TagsResult> {
  const input = (text || "").trim();
  if (!input) return { ok: false, tags: [], reason: "empty" };

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/generate-tags`, {
      method: "POST",
      headers,
      body: JSON.stringify({ text: input }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 403 && data.code === "NO_CREDITS") {
        return {
          ok: false,
          tags: [],
          reason: "no_credits",
          error: "Out of credits",
        };
      }
      throw new Error(data.error || "Request failed");
    }

    return {
      ok: true,
      tags: data.tags || [],
      credits_remaining: data.credits_remaining,
    };
  } catch (error) {
    console.error("❌ Tag generation failed:", error);
    return { ok: false, tags: [], error: (error as Error).message };
  }
}

/**
 * Extract insights
 */
export async function extractInsights(text: string): Promise<InsightsResult> {
  const input = (text || "").trim();
  if (!input) return { ok: false, insights: "", reason: "empty" };

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/insights`, {
      method: "POST",
      headers,
      body: JSON.stringify({ text: input }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 403 && data.code === "NO_CREDITS") {
        return {
          ok: false,
          insights: "",
          reason: "no_credits",
          error: "Out of credits",
        };
      }
      throw new Error(data.error || "Request failed");
    }

    return {
      ok: true,
      insights: data.insights || "",
      credits_remaining: data.credits_remaining,
    };
  } catch (error) {
    console.error("❌ Insight extraction failed:", error);
    return { ok: false, insights: "", error: (error as Error).message };
  }
}

// ============================================
// PART 5: CHAT FUNCTIONALITY
// ============================================

export async function generateChatResponse(
  userMessage: string,
  context: string,
): Promise<ChatResult> {
  const message = (userMessage || "").trim();
  if (!message) return { ok: false, response: "", reason: "empty" };

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message, context }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 403 && data.code === "NO_CREDITS") {
        return {
          ok: false,
          response: "",
          reason: "no_credits",
          error: "Out of credits",
        };
      }
      throw new Error(data.error || "Request failed");
    }

    return {
      ok: true,
      response: data.response || "",
      credits_remaining: data.credits_remaining,
    };
  } catch (error) {
    console.error("❌ Chat response failed:", error);
    return { ok: false, response: "", error: (error as Error).message };
  }
}

// ============================================
// PART 6: EXPORTS & UTILS
// ============================================

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

// For backwards compatibility
export async function generateSummary(text: string): Promise<string> {
  const res = await summarizeText(text);
  return res.ok ? res.summary : "";
}

export default {
  summarizeText,
  generateTags,
  extractInsights,
  generateChatResponse,
  checkBackendHealth,
  generateSummary, // exported for compatibility
};
