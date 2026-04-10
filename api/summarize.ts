import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { authenticateUser, deductCredit, refundCredit } from "./_utils/auth.js";

// ============================================
// CONFIGURATION
// ============================================

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";

// Fallback 1: OpenRouter (Grok)
const OPENROUTER_MODEL = "x-ai/grok-2-1212";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

// Fallback 2: Groq (Llama 3.3)
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_INSTRUCTION = `
You are ResearchMate, an expert academic summarization engine.

Summarize the following text with precision and depth. The word count of the original text and the desired summary mode will be provided.

STEP 1 — Content Classification (internal, do not output):
Identify the content type to adapt your approach:
- Research paper / thesis → Extract: research question, methodology, sample/data, key findings, statistical significance, limitations, implications
- Academic article / review → Extract: central thesis, supporting arguments, evidence quality, counter-arguments, conclusions
- News / journalism → Extract: who, what, when, where, why, source credibility
- Book excerpt / literary → Extract: themes, narrative arc, authorial intent, key passages
- Notes / informal → Organize, clarify, and extract actionable insights

STEP 2 — Deep Analysis (internal, do not output):
- Chain-of-Thought: Trace the logical flow from premise → evidence → conclusion
- Identify the single most important finding or argument
- Note any methodological strengths or limitations mentioned
- Check: Are there specific numbers, statistics, or data points that must be preserved?
- Self-check: Does every claim in your summary directly map to the source text? Remove anything that does not.

STEP 3 — Output Rules:

You will receive a TARGET SUMMARY LENGTH range. Follow it precisely.

Structure:
- For ULTRA-SHORT mode: Write a single tight paragraph. No headers, no bullets. Just the essential point.
- For STANDARD mode: Use clear paragraphs. Bullet points for multiple distinct findings only.
- For DETAILED mode: Use markdown headers (##) matching the source structure. For research papers: organize as Overview → Methodology → Key Findings → Implications. Preserve critical data: percentages, p-values, sample sizes, named frameworks.

Tone & Style:
- Write in authoritative academic prose
- NEVER start with filler like "This paper discusses" or "The author argues that". Lead with the substance.
- NEVER include labels like [Research/Academic] or meta-commentary about the summary itself
- NEVER introduce information not present in the source text (zero hallucination tolerance)
- Do NOT truncate early. Complete the full proportional summary within the target range.
`.trim();

// ============================================
// SUMMARY MODE CONFIGURATION
// ============================================
type SummaryMode = "ultra-short" | "standard" | "detailed";

function getSummaryRange(mode: SummaryMode, wordCount: number): { min: number; max: number; label: string } {
  switch (mode) {
    case "ultra-short":
      return {
        min: Math.round(wordCount * 0.05),
        max: Math.round(wordCount * 0.10),
        label: "Ultra-Short (5–10% — headlines, quick notes, AI previews)",
      };
    case "detailed":
      return {
        min: Math.round(wordCount * 0.30),
        max: Math.round(wordCount * 0.40),
        label: "Detailed (30–40% — full context, examples, and steps preserved)",
      };
    case "standard":
    default:
      return {
        min: Math.round(wordCount * 0.15),
        max: Math.round(wordCount * 0.25),
        label: "Standard (15–25% — core ideas, most research summaries)",
      };
  }
}

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
  mode: SummaryMode = "standard",
  options: any = {},
) {
  const url = `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  // Count words and compute target range based on mode
  const wordCount = prompt.trim().split(/\s+/).length;
  const range = getSummaryRange(mode, wordCount);
  const fullPrompt = `${SYSTEM_INSTRUCTION}\n\nORIGINAL WORD COUNT: ${wordCount} words\nSUMMARY MODE: ${range.label}\nTARGET SUMMARY LENGTH: ${range.min}–${range.max} words\n\nTEXT TO SUMMARIZE:\n${prompt}`;

  const requestBody = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      temperature: options.temperature || 0.3,
      maxOutputTokens: options.maxTokens || 8192,
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
async function callOpenRouterAPI(prompt: string, mode: SummaryMode = "standard", options: any = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter API Key not configured.");
  }

  const wordCount = prompt.trim().split(/\s+/).length;
  const range = getSummaryRange(mode, wordCount);
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
        { role: "user", content: `ORIGINAL WORD COUNT: ${wordCount} words\nSUMMARY MODE: ${range.label}\nTARGET SUMMARY LENGTH: ${range.min}–${range.max} words\n\nTEXT TO SUMMARIZE:\n${prompt}` },
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
async function callGroqAPI(prompt: string, mode: SummaryMode = "standard", options: any = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Groq API Key not configured.");
  }

  const wordCount = prompt.trim().split(/\s+/).length;
  const range = getSummaryRange(mode, wordCount);
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
        { role: "user", content: `ORIGINAL WORD COUNT: ${wordCount} words\nSUMMARY MODE: ${range.label}\nTARGET SUMMARY LENGTH: ${range.min}–${range.max} words\n\nTEXT TO SUMMARIZE:\n${prompt}` },
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
// ITEM SUMMARY PROMPT (short 2-4 sentence summaries, used when itemId is provided)
// ============================================

const ITEM_SUMMARY_PROMPT = `Summarize the following document content in 2-4 concise, information-dense sentences.

Rules:
- Lead with the core finding, thesis, or main point — not filler like "This document discusses".
- Preserve critical specifics: names, numbers, key terms, conclusions.
- If it is academic/research content, mention the methodology and key result.
- If it is handwritten notes, extract and organize the key actionable points.
- NEVER hallucinate or add information not present in the text.

Text to summarize:
`;

// ============================================
// ITEM SUMMARY FALLBACK CHAIN (OpenRouter -> Gemini -> Claude)
// ============================================

async function callItemSummaryChain(text: string): Promise<string | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const claudeKey = process.env.OCR_API_KEY;
  const geminiKey = getRandomGeminiKey();

  // Fallback 1: OpenRouter
  if (openRouterKey) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: `${ITEM_SUMMARY_PROMPT}${text}` }],
          temperature: 0.3,
          max_tokens: 300,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const summary = data.choices?.[0]?.message?.content || null;
        if (summary) return summary;
      }
    } catch (e) {
      console.error("OpenRouter item summary error:", e);
    }
  }

  // Fallback 2: Gemini
  if (geminiKey) {
    try {
      const response = await fetch(
        `${GEMINI_ENDPOINT}/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${ITEM_SUMMARY_PROMPT}${text}` }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        if (summary) return summary;
      }
    } catch (e) {
      console.error("Gemini item summary error:", e);
    }
  }

  // Fallback 3: Claude
  if (claudeKey) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": claudeKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 300,
          temperature: 0.3,
          messages: [{ role: "user", content: `${ITEM_SUMMARY_PROMPT}${text}` }],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const summary = data.content?.[0]?.text || null;
        if (summary) return summary;
      }
    } catch (e) {
      console.error("Claude item summary error:", e);
    }
  }

  return null;
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

    const { user, isFreeTier } = authResult;
    const userId = user?.id;

    // 2. Parse request — itemId presence determines the mode
    const { text, mode, itemId } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    // ============================================
    // MODE A: Item Summary (short, writes to DB)
    // Triggered when itemId is provided
    // ============================================
    if (itemId) {
      const summary = await callItemSummaryChain(text);

      if (!summary) {
        return res.status(500).json({ error: "All AI providers failed to generate summary." });
      }

      // Write summary directly to DB using service role key
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase
          .from("items")
          .update({ ai_summary: summary })
          .eq("id", itemId)
          .eq("user_id", userId);
      } else {
        console.error("Supabase env vars not found for item summary DB write");
      }

      // Charge credit if on free tier
      if (isFreeTier && userId) {
        await deductCredit(userId);
        creditDeducted = true;
        deductedUserId = userId;
      }

      return res.status(200).json({ success: true, summary });
    }

    // ============================================
    // MODE B: Full Summarization (configurable length)
    // Default mode when no itemId
    // ============================================
    const validModes: SummaryMode[] = ["ultra-short", "standard", "detailed"];
    const summaryMode: SummaryMode = validModes.includes(mode) ? mode : "standard";

    const keyToUse = authResult.customKey || getRandomGeminiKey();
    if (!keyToUse)
      return res
        .status(500)
        .json({ error: "Server misconfiguration: No API keys." });

    let summary = "";
    const errors: string[] = [];

    try {
      summary = await callGeminiAPI(text, keyToUse, summaryMode);
    } catch (geminiError) {
      const geminiMsg = `Gemini Failed: ${(geminiError as Error).message}`;
      console.warn(geminiMsg);
      errors.push(geminiMsg);

      // Fallback 1: OpenRouter
      if (process.env.OPENROUTER_API_KEY) {
        try {
          summary = await callOpenRouterAPI(text, summaryMode);
        } catch (orError) {
          const orMsg = `OpenRouter Failed: ${(orError as Error).message}`;
          console.warn(orMsg);
          errors.push(orMsg);

          // Fallback 2: Groq
          if (process.env.GROQ_API_KEY) {
            try {
              summary = await callGroqAPI(text, summaryMode);
            } catch (groqError) {
              const groqMsg = `Groq Failed: ${(groqError as Error).message}`;
              console.error(groqMsg);
              errors.push(groqMsg);
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
          summary = await callGroqAPI(text, summaryMode);
        } catch (groqError) {
          const groqMsg = `Groq Failed: ${(groqError as Error).message}`;
          errors.push(groqMsg);
          throw new Error(`Gemini/Groq failed. Logs: ${errors.join(" | ")}`);
        }
      } else {
        throw new Error(
          `Gemini failed and no fallbacks configured. Log: ${geminiMsg}`,
        );
      }
    }

    // Deduct credit
    let creditsRemaining: number | string = "Unlimited";
    if (isFreeTier && userId) {
      creditsRemaining = await deductCredit(userId);
      creditDeducted = true;
      deductedUserId = userId;
    }

    return res.status(200).json({
      summary: summary,
      credits_remaining: creditsRemaining,
    });
  } catch (error) {
    console.error("Summarize API Error:", error);
    if (creditDeducted && deductedUserId) await refundCredit(deductedUserId);
    return res.status(500).json({ error: (error as Error).message });
  }
}
