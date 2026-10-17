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
  return process.env.GEMINI_API_KEY;
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
      return res.status(500).json({ error: "Server misconfiguration: No Gemini API keys configured." });
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
          console.warn("Batch embedding failed, falling back to sequential:", batchErr);
          for (const item of batch) {
            const single = await callSingleEmbeddingAPI(item, keyToUse);
            allEmbeddings.push(single);
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

    const embedding = await callSingleEmbeddingAPI(singleText, keyToUse);

    return res.status(200).json({
      ok: true,
      embedding,
    });
  } catch (error) {
    console.error("Embedding API Error:", error);
    return res.status(500).json({ error: (error as Error).message || "Embedding generation failed." });
  }
}
