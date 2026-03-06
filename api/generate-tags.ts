import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, deductCredit } from "./_utils/auth.js";

// ============================================
// CONFIGURATION
// ============================================

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";

// Fallback 1: OpenRouter
const OPENROUTER_MODEL = "x-ai/grok-2-1212";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

// Fallback 2: Groq
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const TAG_PROMPT = `Analyze this research text and generate 3-5 relevant academic tags/keywords.

Rules:
- Tags should be specific academic terms, not generic words like "research" or "study"
- Include the primary field/discipline (e.g., "machine learning", "cognitive psychology")
- Include key methodologies or frameworks mentioned (e.g., "meta-analysis", "CNN")
- Include the domain of application (e.g., "healthcare", "autonomous driving")
- Use lowercase, 1-3 words per tag
- Return ONLY a JSON array of strings, nothing else

Example: ["deep reinforcement learning", "robotics", "sim-to-real transfer"]

Text: `;

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
// AI PROVIDER 1: GEMINI (Primary)
// ============================================
async function callGeminiAPI(text: string, apiKey: string) {
  const url = `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const fullPrompt = `${TAG_PROMPT}\n${text}`;

  const requestBody = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 100,
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

// ============================================
// AI PROVIDER 2: OPENROUTER (Fallback 1)
// ============================================
async function callOpenRouterAPI(text: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter API Key not configured.");
  }

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://researchmate.vercel.app",
      "X-Title": "ResearchMate",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "user", content: `${TAG_PROMPT}\n${text}` },
      ],
      temperature: 0.3,
      max_tokens: 100,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenRouter Error (${response.status}): ${
        errorData.error?.message || response.statusText
      }`,
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// ============================================
// AI PROVIDER 3: GROQ (Fallback 2)
// ============================================
async function callGroqAPI(text: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Groq API Key not configured.");
  }

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "user", content: `${TAG_PROMPT}\n${text}` },
      ],
      temperature: 0.3,
      max_tokens: 100,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Groq Error (${response.status}): ${
        errorData.error?.message || response.statusText
      }`,
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
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
    "Content-Type, Authorization",
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

    // 3. Call AI (With 3-Layer Fallback)
    let rawResponse = "";
    const errors: string[] = [];

    try {
      rawResponse = await callGeminiAPI(text, keyToUse);
    } catch (geminiError) {
      const msg = `Gemini Failed: ${(geminiError as Error).message}`;
      console.warn(msg);
      errors.push(msg);

      if (process.env.OPENROUTER_API_KEY) {
        try {
          rawResponse = await callOpenRouterAPI(text);
        } catch (orError) {
          const msg = `OpenRouter Failed: ${(orError as Error).message}`;
          console.warn(msg);
          errors.push(msg);

          if (process.env.GROQ_API_KEY) {
            try {
              rawResponse = await callGroqAPI(text);
            } catch (groqError) {
              const msg = `Groq Failed: ${(groqError as Error).message}`;
              console.error(msg);
              errors.push(msg);
              throw new Error(
                `All providers failed. Logs: ${errors.join(" | ")}`,
              );
            }
          } else {
            throw new Error(
              `Gemini/OpenRouter failed. Logs: ${errors.join(" | ")}`,
            );
          }
        }
      } else if (process.env.GROQ_API_KEY) {
        try {
          rawResponse = await callGroqAPI(text);
        } catch (groqError) {
          const msg = `Groq Failed: ${(groqError as Error).message}`;
          errors.push(msg);
          throw new Error(`Gemini/Groq failed. Logs: ${errors.join(" | ")}`);
        }
      } else {
        throw new Error(
          `Gemini failed and no fallbacks configured. Log: ${msg}`,
        );
      }
    }

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
