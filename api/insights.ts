// ============================================
// INSIGHTS - Unified Academic Text Analysis Engine
// Supports: Key Insights, Academic Tag Generation, & Source Identification
// Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, deductCredit, refundCredit, setCorsHeaders } from "./_utils/auth.js";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";

// Fallback 1: OpenRouter
const OPENROUTER_MODEL = "x-ai/grok-2-1212";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

// Fallback 2: Groq
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// ============================================
// PROMPTS
// ============================================

const INSIGHTS_PROMPT = `You are ResearchMate, an expert academic analysis engine.

Extract exactly 5 key insights from the following text. Each insight must be:

1. **Specific** — Include concrete details (numbers, names, findings) from the text. Never be vague.
2. **Categorized** — Prefix each insight with one of these labels in bold:
   - **Finding**: A concrete result or conclusion from the text
   - **Method**: A notable approach, technique, or methodology used
   - **Implication**: A consequence, application, or significance of the findings
   - **Gap**: A limitation, unanswered question, or area for future work
   - **Connection**: A relationship between ideas, or how this relates to broader knowledge
3. **Evidence-backed** — Each insight must be directly supported by the source text. Do not hallucinate.

Output format: Return exactly 5 bullet points (using -), each 1-2 sentences. Start each with the bold category label.

Text to analyze:
`;

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

const IDENTIFY_PROMPT = `You are a source identification expert. Analyze the following text (OCR output from a physical document) and identify what book, academic paper, journal article, movie, or other source it is from.

IMPORTANT RULES:
- Look for the TITLE of the source, not the abstract or body content. For research papers, the title is usually the first prominent line before "Abstract:".
- Do NOT use the abstract text as the title.
- For well-known literary works (e.g. Harry Potter opening paragraph), identify the book title and author directly.
- The searchQuery should be "Title Author" format for best results (e.g. "Harry Potter Philosopher's Stone J.K. Rowling").

Return ONLY a JSON object with this structure (no markdown, no explanation):
{
  "title": "exact title of the source",
  "authors": ["Author Name"],
  "year": "publication year or null",
  "type": "book|journal|article|conference|movie|tv|thesis|unknown",
  "publisher": "publisher name or null",
  "isbn": "ISBN if identifiable or null",
  "doi": "DOI if identifiable or null",
  "confidence": 0-100,
  "reasoning": "brief one-line explanation",
  "searchQuery": "Title AuthorLastName (best search query to find this)"
}

If you cannot identify with confidence below 30, still return your best guess with that confidence.`;

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
// AI RUNNERS WITH 3-LAYER FALLBACK
// ============================================
async function runWithFallbacks(
  prompt: string,
  text: string,
  apiKey: string,
  temperature: number = 0.5,
  maxTokens: number = 1024
): Promise<string> {
  const fullPrompt = `${prompt}\n${text}`;
  const errors: string[] = [];

  // Primary: Gemini
  try {
    const url = `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (content) return content;
    } else {
      const err = await response.json().catch(() => ({}));
      errors.push(`Gemini error (${response.status}): ${err.error?.message || response.statusText}`);
    }
  } catch (err: any) {
    errors.push(`Gemini error: ${err.message}`);
  }

  // Fallback 1: OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const response = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://researchmate.vercel.app",
          "X-Title": "ResearchMate",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [{ role: "user", content: fullPrompt }],
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      } else {
        const err = await response.json().catch(() => ({}));
        errors.push(`OpenRouter error (${response.status}): ${err.error?.message || response.statusText}`);
      }
    } catch (err: any) {
      errors.push(`OpenRouter error: ${err.message}`);
    }
  }

  // Fallback 2: Groq
  if (process.env.GROQ_API_KEY) {
    try {
      const response = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: fullPrompt }],
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      } else {
        const err = await response.json().catch(() => ({}));
        errors.push(`Groq error (${response.status}): ${err.error?.message || response.statusText}`);
      }
    } catch (err: any) {
      errors.push(`Groq error: ${err.message}`);
    }
  }

  throw new Error(`All AI providers failed: ${errors.join(" | ")}`);
}

function parseTags(responseText: string): string[] {
  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {}

  const quoted = responseText.match(/["']([^"']+)["']/g);
  if (quoted) {
    return quoted.map((s) => s.replace(/["']/g, "")).slice(0, 5);
  }

  return [];
}

// ============================================
// MAIN UNIFIED HANDLER
// ============================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed. Use POST." });

  let creditDeducted = false;
  let deductedUserId: string | null = null;

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
    const { text, mode, action } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text is required" });
    }

    const keyToUse = customKey || getRandomGeminiKey();
    if (!keyToUse) {
      return res.status(500).json({ error: "Server misconfiguration: No API keys." });
    }

    const selectedMode = mode || action || "insights";

    // ----------------------------------------------------
    // CASE A: TAGS GENERATION
    // ----------------------------------------------------
    if (selectedMode === "tags") {
      const rawResponse = await runWithFallbacks(TAG_PROMPT, text, keyToUse, 0.3, 100);
      const tags = parseTags(rawResponse);

      let creditsRemaining: number | string = "Unlimited";
      if (isFreeTier && userId) {
        creditsRemaining = await deductCredit(userId);
        creditDeducted = true;
        deductedUserId = userId;
      }

      return res.status(200).json({
        tags,
        credits_remaining: creditsRemaining,
      });
    }

    // ----------------------------------------------------
    // CASE B: SOURCE IDENTIFICATION
    // ----------------------------------------------------
    if (selectedMode === "identify") {
      const rawResponse = await runWithFallbacks(
        IDENTIFY_PROMPT,
        `\n\nTEXT TO ANALYZE:\n${text.slice(0, 3000)}`,
        keyToUse,
        0.1,
        1024
      );

      const cleaned = rawResponse.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
      let jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      let parsedResult: any = null;

      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        const partial = cleaned.match(/\{[\s\S]*/);
        if (partial) {
          try {
            parsedResult = JSON.parse(partial[0] + "}");
          } catch {}
        }
      }

      if (!parsedResult) {
        throw new Error("Unable to parse source identification response.");
      }

      if (isFreeTier && userId) {
        await deductCredit(userId);
        creditDeducted = true;
        deductedUserId = userId;
      }

      return res.status(200).json(parsedResult);
    }

    // ----------------------------------------------------
    // CASE C: KEY INSIGHTS EXTRACTION (Default)
    // ----------------------------------------------------
    const insights = await runWithFallbacks(INSIGHTS_PROMPT, text, keyToUse, 0.5, 1024);

    let creditsRemaining: number | string = "Unlimited";
    if (isFreeTier && userId) {
      creditsRemaining = await deductCredit(userId);
      creditDeducted = true;
      deductedUserId = userId;
    }

    return res.status(200).json({
      insights,
      credits_remaining: creditsRemaining,
    });
  } catch (error: any) {
    console.error("Unified Insights API Error:", error);
    if (creditDeducted && deductedUserId) await refundCredit(deductedUserId);
    return res.status(500).json({ error: error?.message || "An internal error occurred." });
  }
}
