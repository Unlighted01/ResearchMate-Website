import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, checkRateLimit, setCorsHeaders } from "./_utils/auth.js";

// ============================================
// CONFIGURATION
// ============================================

const EMBEDDING_MODEL = "text-embedding-004";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

function getRandomGeminiKey(): string | undefined {
  const multipleKeys = process.env.GEMINI_API_KEYS;
  if (multipleKeys) {
    const keys = multipleKeys
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (keys.length > 0) {
      return keys[Math.floor(Math.random() * keys.length)];
    }
  }
  return process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
}

// Fallback normalized vector generator (768-dim) in case of API outages or missing keys
function generateFallbackVector(text: string, dim = 768): number[] {
  const vec = new Array(dim).fill(0);
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  if (words.length === 0) return vec;

  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dim;
    vec[idx] += 1;
  }

  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) vec[i] /= norm;
  }
  return vec;
}

// ============================================
// EMBEDDING API CALLS
// ============================================

async function callSingleEmbeddingAPI(text: string, apiKey: string): Promise<number[]> {
  const url = `${GEMINI_ENDPOINT}/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: {
        parts: [{ text }],
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Embedding API HTTP ${response.status}`);
  }

  const data = await response.json();
  const values = data.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("No embedding values returned by Gemini API");
  }
  return values;
}

async function callBatchEmbeddingAPI(texts: string[], apiKey: string): Promise<number[][]> {
  const url = `${GEMINI_ENDPOINT}/${EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: texts.map((t) => ({
        model: `models/${EMBEDDING_MODEL}`,
        content: {
          parts: [{ text: t }],
        },
      })),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Batch Embedding API HTTP ${response.status}`);
  }

  const data = await response.json();
  const embeddings = data.embeddings;
  if (!Array.isArray(embeddings) || embeddings.length === 0) {
    throw new Error("No embeddings array returned by Gemini API");
  }
  return embeddings.map((e: any) => e.values || []);
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { text, texts } = req.body || {};

    if (!text && (!texts || !Array.isArray(texts) || texts.length === 0)) {
      return res.status(400).json({ error: "Missing 'text' (string) or 'texts' (string[]) in request body." });
    }

    // Authenticate user (supports BYOK and authenticated sessions)
    const authResult = await authenticateUser(req);
    const userId = authResult.user?.id;

    if (userId && !checkRateLimit(userId)) {
      return res.status(429).json({ error: "Rate limit exceeded. Please wait a moment." });
    }

    // Determine API Key: User BYOK custom key takes priority, else server pooled key
    const keyToUse = authResult.customKey || getRandomGeminiKey();
    if (!keyToUse) {
      console.warn("No Gemini API key available on server, returning normalized fallback vector embeddings.");
      if (Array.isArray(texts) && texts.length > 0) {
        return res.status(200).json({
          ok: true,
          embeddings: texts.map((t) => generateFallbackVector(String(t || ""))),
          fallback: true,
        });
      }
      return res.status(200).json({
        ok: true,
        embedding: generateFallbackVector(String(text || "")),
        fallback: true,
      });
    }

    // Batch embedding request
    if (Array.isArray(texts) && texts.length > 0) {
      // Clean texts and chunk to batches of 50 to avoid API limits
      const sanitized = texts.map((t) => String(t || "").trim()).filter(Boolean);
      if (sanitized.length === 0) {
        return res.status(200).json({ ok: true, embeddings: [] });
      }

      const allEmbeddings: number[][] = [];
      const batchSize = 50;

      for (let i = 0; i < sanitized.length; i += batchSize) {
        const batch = sanitized.slice(i, i + batchSize);
        try {
          const batchEmbs = await callBatchEmbeddingAPI(batch, keyToUse);
          allEmbeddings.push(...batchEmbs);
        } catch (batchErr) {
          // If batch fails, attempt sequential fallback for resilience
          console.warn("Batch embedding failed, falling back to sequential/fallback:", batchErr);
          for (const item of batch) {
            try {
              const single = await callSingleEmbeddingAPI(item, keyToUse);
              allEmbeddings.push(single);
            } catch {
              allEmbeddings.push(generateFallbackVector(item));
            }
          }
        }
      }

      return res.status(200).json({
        ok: true,
        embeddings: allEmbeddings,
      });
    }

    // Single text embedding request
    const singleText = String(text || "").trim();
    if (!singleText) {
      return res.status(400).json({ error: "Text string cannot be empty." });
    }

    try {
      const embedding = await callSingleEmbeddingAPI(singleText, keyToUse);
      return res.status(200).json({
        ok: true,
        embedding,
      });
    } catch (singleErr) {
      console.warn("Single embedding API call failed, using fallback vector:", singleErr);
      return res.status(200).json({
        ok: true,
        embedding: generateFallbackVector(singleText),
        fallback: true,
      });
    }
  } catch (error) {
    console.error("Embedding API Error, returning fallback embeddings:", error);
    const { text, texts } = req.body || {};
    if (Array.isArray(texts) && texts.length > 0) {
      return res.status(200).json({
        ok: true,
        embeddings: texts.map((t) => generateFallbackVector(String(t || ""))),
        fallback: true,
      });
    }
    return res.status(200).json({
      ok: true,
      embedding: generateFallbackVector(String(text || "")),
      fallback: true,
    });
  }
}
