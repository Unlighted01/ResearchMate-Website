import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, deductCredit } from "./_utils/auth.js";

// ============================================
// CONFIGURATION
// ============================================

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";

const TAG_PROMPT = `Analyze this research text and generate 3-5 relevant tags/keywords. Return ONLY a JSON array of strings, nothing else. Example: ["machine learning", "healthcare", "AI"]\n\nText: `;

// ============================================
// KEY ROTATION HELPER
// ============================================
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
// GEMINI API CALLER
// ============================================
async function callGeminiAPI(text: string, apiKey: string, options: any = {}) {
  const url = `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  // Prepend System Instruction
  const fullPrompt = `${TAG_PROMPT}\n${text}`;

  const requestBody = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      temperature: options.temperature || 0.3,
      maxOutputTokens: options.maxTokens || 100,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Gemini API error: ${response.status}`,
    );
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

function parseTags(responseText: string): string[] {
  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {}

  // Fallback: extract quoted words
  const quoted = responseText.match(/["']([^"']+)["']/g);
  if (quoted) {
    return quoted.map((s) => s.replace(/["']/g, "")).slice(0, 5);
  }

  return [];
}

// ============================================
// MAIN HANDLER
// ============================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-custom-api-key",
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    // 1. Authenticate
    const authResult = await authenticateUser(req);

    if (authResult.error) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error,
        code: authResult.statusCode === 403 ? "NO_CREDITS" : undefined,
      });
    }

    const { user, isFreeTier, customKey } = authResult;
    const userId = user?.id;

    // 2. Prepare Request
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    const keyToUse = customKey || getRandomGeminiKey();
    if (!keyToUse)
      return res
        .status(500)
        .json({ error: "Server misconfiguration: No API keys." });

    // 3. Call AI
    const rawResponse = await callGeminiAPI(text, keyToUse);
    const tags = parseTags(rawResponse);

    // 4. Deduct Credit
    let creditsRemaining: number | string = "Unlimited";
    if (isFreeTier && userId) {
      creditsRemaining = await deductCredit(userId);
    }

    return res.status(200).json({
      tags: tags,
      credits_remaining: creditsRemaining,
    });
  } catch (error) {
    console.error("Generate Tags API Error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
