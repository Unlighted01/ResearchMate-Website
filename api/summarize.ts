import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, deductCredit } from "./_utils/auth.js";

// ============================================
// CONFIGURATION
// ============================================

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";

// Fallback 1: OpenRouter (Grok)
const OPENROUTER_MODEL = "x-ai/grok-2-1212";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

// Fallback 2: Groq (Llama 3.3)
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_INSTRUCTION = `
You are ResearchMate, an intelligent academic assistant.

Summarize the following text intelligently. The word count of the original text will be provided to you.

Instructions:
1. First determine what kind of content it is.
2. If it is:
   - An article → Provide overview + key points
   - Research/academic → Provide thesis + findings + implications
   - Poem/literary → Summarize theme, tone, and message
   - List/notes → Organize and condense clearly
   - Random/informal → Extract core meaning

Length Rules:
- Target summary length = 25% to 30% of the original word count provided.
- NEVER produce a summary shorter than 25% or longer than 35% of the original word count.
- Example: If original is 5000 words → your summary must be 1250–1500 words.
- Example: If original is 500 words → your summary must be 125–175 words.
- Do NOT truncate early. Write a full, proportionally-sized summary.

Advanced Reasoning (Internal Monologue):
- Perform a "Chain-of-Thought" analysis: identifying the core argument, supporting evidence, and tone.
- Conduct a "Self-evaluation pass": Check if the summary is too shallow or misses key nuance. Refine if needed.
- Check for hallucinations: Ensure all points are supported by the text.

Output Structure:
- Structured summary using paragraphs and bullet points where appropriate
- Preserve section structure from the original text when relevant
- Do NOT include any label or heading like [Research/Academic] or [Article] — output only the summary itself
`.trim();

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
async function callGeminiAPI(
  prompt: string,
  apiKey: string,
  options: any = {},
) {
  const url = `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  // Count words and inject into prompt so the AI can compute the target length
  const wordCount = prompt.trim().split(/\s+/).length;
  const fullPrompt = `${SYSTEM_INSTRUCTION}\n\nORIGINAL WORD COUNT: ${wordCount} words\nTARGET SUMMARY LENGTH: ${Math.round(wordCount * 0.25)}–${Math.round(wordCount * 0.30)} words\n\nTEXT TO SUMMARIZE:\n${prompt}`;

  const requestBody = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      temperature: options.temperature || 0.3,
      maxOutputTokens: options.maxTokens || 4096,
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
async function callOpenRouterAPI(prompt: string, options: any = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter API Key not configured.");
  }

  const wordCount = prompt.trim().split(/\s+/).length;
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
        { role: "user", content: `ORIGINAL WORD COUNT: ${wordCount} words\nTARGET SUMMARY LENGTH: ${Math.round(wordCount * 0.25)}–${Math.round(wordCount * 0.30)} words\n\nTEXT TO SUMMARIZE:\n${prompt}` },
      ],
      temperature: options.temperature || 0.3,
      max_tokens: options.maxTokens || 4096,
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

  const wordCount = prompt.trim().split(/\s+/).length;
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
        { role: "user", content: `ORIGINAL WORD COUNT: ${wordCount} words\nTARGET SUMMARY LENGTH: ${Math.round(wordCount * 0.25)}–${Math.round(wordCount * 0.30)} words\n\nTEXT TO SUMMARIZE:\n${prompt}` },
      ],
      temperature: options.temperature || 0.3,
      max_tokens: options.maxTokens || 4096,
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

    // 3. Call AI (With 3-Layer Fallback)
    let summary = "";
    const errors: string[] = [];

    try {
      summary = await callGeminiAPI(text, keyToUse);
    } catch (geminiError) {
      const msg = `Gemini Failed: ${(geminiError as Error).message}`;
      console.warn(msg);
      errors.push(msg);

      // Fallback 1: OpenRouter
      if (process.env.OPENROUTER_API_KEY) {
        try {
          summary = await callOpenRouterAPI(text);
        } catch (orError) {
          const msg = `OpenRouter Failed: ${(orError as Error).message}`;
          console.warn(msg);
          errors.push(msg);

          // Fallback 2: Groq
          if (process.env.GROQ_API_KEY) {
            try {
              summary = await callGroqAPI(text);
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
        // Try Groq if OpenRouter missing
        try {
          summary = await callGroqAPI(text);
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

    // 4. Deduct Credit
    let creditsRemaining: number | string = "Unlimited";
    if (isFreeTier && userId) {
      creditsRemaining = await deductCredit(userId);
    }

    return res.status(200).json({
      summary: summary,
      credits_remaining: creditsRemaining,
    });
  } catch (error) {
    console.error("Summarize API Error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
