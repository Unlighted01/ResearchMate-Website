import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, deductCredit } from "./_utils/auth.js";

// ============================================
// CONFIGURATION
// ============================================

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";

// Fallback 1: OpenRouter (Grok)
const OPENROUTER_MODEL = "x-ai/grok-2-1212"; // User requested
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

// Fallback 2: Groq (Llama 3.3 70B)
// Old "llama3-70b-8192" is deprecated. Using new stable model.
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_INSTRUCTION = `
You are ResearchMate, an academic assistant. 
Your goal is to help users analyze research papers, citations, and academic text.

STRICT GUARDRAILS:
1. ONLY answer questions related to research, science, academic writing, or the text provided.
2. If the user asks about general topics (e.g., "tell me a joke", "who won the game", "write a poem"), politely REFUSE.
   Response: "I am ResearchMate, designed only for academic and research assistance. I cannot help with off-topic queries."
3. Keep answers professional, concise, and objective.
4. Do not hallucinatie citations. If you don't know, say so.
5. If the user asks for citations, a bibliography, or references for their research, DO NOT generate them.
   Instead, output EXACTLY this string: "ACTION_REDIRECT_CITATIONS"
   (The frontend will detect this and redirect the user to the Citations tab).
`.trim();

// ============================================
// KEY ROTATION HELPER (GEMINI)
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
  return process.env.GEMINI_API_KEY; // Fallback
}

// ============================================
// AI PROVIDER 1: GEMINI (Primary)
// ============================================
async function callGeminiAPI(
  prompt: string,
  apiKey: string,
  options: any = {},
) {
  const url = `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const fullPrompt = `${SYSTEM_INSTRUCTION}\n\nUSER REQUEST:\n${prompt}`;

  const requestBody = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      temperature: options.temperature || 0.7,
      maxOutputTokens: options.maxTokens || 1024,
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
      `Gemini Error (${response.status}): ${
        errorData.error?.message || response.statusText
      }`,
    );
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

// ============================================
// AI PROVIDER 2: OPENROUTER (Fallback 1)
// ============================================
async function callOpenRouterAPI(prompt: string, options: any = {}) {
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
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: prompt },
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1024,
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
async function callGroqAPI(prompt: string, options: any = {}) {
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
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: prompt },
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1024,
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

// ============================================
// MAIN HANDLER
// ============================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
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
    // 1. Authenticate & Check Credits
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
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const keyToUse = customKey || getRandomGeminiKey();
    if (!keyToUse)
      return res
        .status(500)
        .json({ error: "Server misconfiguration: No API keys." });

    const prompt = `Use this context to answer the user.\n\nCONTEXT:\n${context || "No context."}\n\nMessage: ${message}`;
    let responseText = "";

    // 3. Call AI (With 3-Layer Fallback)
    const errors: string[] = [];

    try {
      // Attempt 1: Gemini
      responseText = await callGeminiAPI(prompt, keyToUse);
    } catch (geminiError) {
      const msg = `Gemini Failed: ${(geminiError as Error).message}`;
      console.warn(msg);
      errors.push(msg);

      // Attempt 2: OpenRouter (Fallback 1)
      if (process.env.OPENROUTER_API_KEY) {
        console.log("🔄 Switching to Fallback 1: OpenRouter (Grok)...");
        try {
          responseText = await callOpenRouterAPI(prompt);
        } catch (openRouterError) {
          const msg = `OpenRouter Failed: ${(openRouterError as Error).message}`;
          console.warn(msg);
          errors.push(msg);

          // Attempt 3: Groq (Fallback 2)
          if (process.env.GROQ_API_KEY) {
            console.log("🔄 Switching to Fallback 2: Groq (Llama 3)...");
            try {
              responseText = await callGroqAPI(prompt);
            } catch (groqError) {
              const msg = `Groq Failed: ${(groqError as Error).message}`;
              console.error(msg);
              errors.push(msg);
              // All failed
              throw new Error(
                `All providers failed. Logs: ${errors.join(" | ")}`,
              );
            }
          } else {
            const msg = "Groq Skipped: No GROQ_API_KEY found.";
            errors.push(msg);
            throw new Error(
              `Gemini/OpenRouter failed. Logs: ${errors.join(" | ")}`,
            );
          }
        }
      } else if (process.env.GROQ_API_KEY) {
        // OpenRouter Key missing, but Groq exists, try Groq directly
        console.log(
          "🔄 OpenRouter Key missing. Switching to Fallback 2: Groq...",
        );
        try {
          responseText = await callGroqAPI(prompt);
        } catch (groqError) {
          const msg = `Groq Failed: ${(groqError as Error).message}`;
          errors.push(msg);
          throw new Error(`Gemini/Groq failed. Logs: ${errors.join(" | ")}`);
        }
      } else {
        const msg =
          "Fallbacks Skipped: No OPENROUTER_API_KEY or GROQ_API_KEY found.";
        errors.push(msg);
        throw new Error(msg);
      }
    }

    // 4. Deduct Credit (Only if success)
    let creditsRemaining: number | string = "Unlimited";
    if (isFreeTier && userId) {
      creditsRemaining = await deductCredit(userId);
    }

    return res.status(200).json({
      response: responseText,
      credits_remaining: creditsRemaining,
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
