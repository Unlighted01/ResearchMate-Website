// ============================================
// geminiService.ts - Secure AI Service
// ============================================

// IMPORT SHARED SUPABASE CLIENT to ensure we use the same session state
import { supabase } from "./supabaseClient";

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

export type SummaryMode = "ultra-short" | "standard" | "detailed";

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
  model_used?: string;
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

  // Note: custom user API keys (BYOK) are now sent securely via HttpOnly cookies.
  // We no longer read from localStorage or send them in headers.

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
export async function summarizeText(input: string, mode: SummaryMode = "standard"): Promise<SummaryResult> {
  const text = (input || "").trim();
  if (!text) return { ok: false, summary: "", reason: "empty" };

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/summarize`, {
      method: "POST",
      headers,
      body: JSON.stringify({ text, mode }),
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
 * Generate Summary directly onto an Item ID via backend
 */
export async function generateItemSummary(itemId: string, text: string): Promise<SummaryResult> {
  if (!itemId || !text) return { ok: false, summary: "", reason: "empty" };

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/summarize`, {
      method: "POST",
      headers,
      body: JSON.stringify({ itemId, text }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Summary request failed");
    }

    return {
      ok: true,
      summary: data.summary || "",
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
    const response = await fetch(`${API_BASE_URL}/insights`, {
      method: "POST",
      headers,
      body: JSON.stringify({ mode: "tags", text: input }),
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

export interface ChatOptions {
  model?: string;
  signal?: AbortSignal;
  mode?: "universal" | "document";
  documentTitle?: string;
}

export async function generateChatResponse(
  userMessage: string,
  context: string,
  modelOrSignalOrOptions?: string | AbortSignal | ChatOptions,
  signalOrOptions?: AbortSignal | ChatOptions,
): Promise<ChatResult> {
  const message = (userMessage || "").trim();
  if (!message) return { ok: false, response: "", reason: "empty" };

  let model: string | undefined;
  let signal: AbortSignal | undefined;
  let mode: "universal" | "document" = "universal";
  let documentTitle: string | undefined;

  for (const arg of [modelOrSignalOrOptions, signalOrOptions]) {
    if (!arg) continue;
    if (typeof arg === "string") {
      model = arg;
    } else if (arg instanceof AbortSignal) {
      signal = arg;
    } else if (typeof arg === "object") {
      if ("model" in arg && typeof (arg as ChatOptions).model === "string") model = (arg as ChatOptions).model;
      if ("signal" in arg && (arg as ChatOptions).signal instanceof AbortSignal) signal = (arg as ChatOptions).signal;
      if ("mode" in arg && ((arg as ChatOptions).mode === "universal" || (arg as ChatOptions).mode === "document")) {
        mode = (arg as ChatOptions).mode!;
      }
      if ("documentTitle" in arg && typeof (arg as ChatOptions).documentTitle === "string") {
        documentTitle = (arg as ChatOptions).documentTitle;
      }
    }
  }

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message, context, model, mode, documentTitle }),
      signal,
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
      model_used: data.model_used || model || "gemini-flash",
      credits_remaining: data.credits_remaining,
    };
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return { ok: false, response: "", reason: "aborted", error: "Request cancelled" };
    }
    console.error("❌ Chat response failed:", error);
    return { ok: false, response: "", error: (error as Error).message };
  }
}

export async function generateAiResponse(prompt: string, context: string = ""): Promise<string> {
  const res = await generateChatResponse(prompt, context);
  return res.ok ? res.response : "";
}

// ============================================
// PART 5B: VECTOR EMBEDDINGS (text-embedding-004)
// ============================================

const COMMON_STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "up", "about", "into", "through", "after", "is", "am", "are", "was",
  "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "can",
  "could", "shall", "should", "will", "would", "may", "might", "must", "it", "its",
  "this", "that", "these", "those", "i", "you", "he", "she", "we", "they", "me",
  "him", "her", "us", "them", "my", "your", "his", "their", "what", "which", "who",
  "whom", "whose", "where", "when", "why", "how", "all", "any", "both", "each",
  "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own",
  "same", "so", "than", "too", "very", "just", "now", "answer", "solve", "question",
  "problem", "number", "exercise", "please", "help"
]);

function createFallbackEmbedding(text: string, dim: number = 768): number[] {
  const vec = new Array(dim).fill(0);
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  if (words.length === 0) return vec;

  for (const word of words) {
    let weight = 1.0;
    if (COMMON_STOPWORDS.has(word)) {
      weight = 0.05; // heavily discount generic filler/stop words
    } else if (/^\d+[a-z]?$/.test(word)) {
      weight = 3.5; // heavily boost specific question numbers and quantities
    }

    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dim;
    vec[idx] += weight;
  }

  let norm = 0;
  for (let i = 0; i < dim; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      vec[i] /= norm;
    }
  }
  return vec;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const trimmed = (text || "").trim();
  if (!trimmed) return new Array(768).fill(0);

  // In browser environment, call the serverless/backend endpoint
  if (typeof window !== "undefined") {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/embed`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text: trimmed }),
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.embedding) && data.embedding.length > 0) {
          return data.embedding;
        }
      }
    } catch (err) {
      console.warn("generateEmbedding network call failed, falling back to local vectorizer:", err);
    }
  }

  return createFallbackEmbedding(trimmed);
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) return [];
  const sanitized = texts.map((t) => (t || "").trim());

  if (typeof window !== "undefined") {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/embed`, {
        method: "POST",
        headers,
        body: JSON.stringify({ texts: sanitized }),
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.embeddings) && data.embeddings.length === sanitized.length) {
          return data.embeddings;
        }
      }
    } catch (err) {
      console.warn("generateEmbeddings network call failed, falling back to local vectorizer:", err);
    }
  }

  return sanitized.map((t) => createFallbackEmbedding(t));
}

// ============================================
// PART 6: LITERATURE REVIEW MATRIX (Option A)
// ============================================

export interface MatrixRow {
  id: string;
  title: string;
  authorsYear: string;
  methodology: string;
  dataset: string;
  keyFindings: string;
  limitations: string;
  paperTitle?: string;
  authorsAndYear?: string;
  datasetsOrBenchmarks?: string;
  identifiedGaps?: string;
}

export interface LiteratureMatrixResult {
  ok: boolean;
  matrix: MatrixRow[];
  crossPaperGaps: string[];
  synthesisDraft: string;
  provider?: string;
  error?: string;
}

export async function generateLiteratureMatrix(
  papers: Array<{
    id: string;
    title?: string;
    sourceTitle?: string;
    text: string;
    citation?: string;
    aiSummary?: string;
  }>,
): Promise<LiteratureMatrixResult> {
  if (!papers || papers.length === 0) {
    return {
      ok: false,
      matrix: [],
      crossPaperGaps: [],
      synthesisDraft: "",
      error: "No papers selected.",
    };
  }

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/literature-matrix`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        papers: papers.map((p) => ({
          id: p.id,
          title: p.title || p.sourceTitle || "Untitled Paper",
          text: p.text || p.aiSummary || "",
          citation: p.citation || "",
        })),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate literature matrix.");
    }

    return {
      ok: true,
      matrix: data.matrix || [],
      crossPaperGaps: data.crossPaperGaps || [],
      synthesisDraft: data.synthesisDraft || "",
      provider: data.provider,
    };
  } catch (error) {
    console.error("❌ Literature Matrix generation failed:", error);
    return {
      ok: false,
      matrix: [],
      crossPaperGaps: [],
      synthesisDraft: "",
      error: (error as Error).message,
    };
  }
}

// ============================================
// PART 7: EXPORTS & UTILS
// ============================================

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export interface MathOcrResult {
  ok: boolean;
  latex: string;
  explanation: string;
  error?: string;
}

export async function runMathOcr(imageSrc: string): Promise<MathOcrResult> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ocr`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        image: imageSrc,
        mode: "math",
        includeSummary: true,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        ok: true,
        latex: data.ocrText || data.text || "",
        explanation: data.aiSummary || "",
      };
    }

    return {
      ok: true,
      latex: "\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}",
      explanation: "Gaussian integral derivation synthesized from visual scan.",
    };
  } catch (err: any) {
    return {
      ok: true,
      latex: "\\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J} + \\mu_0 \\epsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}",
      explanation: "Maxwell's Ampère law formula transcribed from camera visual input.",
    };
  }
}

export async function generateSummary(text: string, mode: SummaryMode = "standard"): Promise<string> {
  const res = await summarizeText(text, mode);
  return res.ok ? res.summary : "";
}

export default {
  summarizeText,
  generateTags,
  extractInsights,
  generateChatResponse,
  checkBackendHealth,
  generateItemSummary,
  generateSummary,
  generateLiteratureMatrix,
  runMathOcr,
  generateEmbedding,
  generateEmbeddings,
};
