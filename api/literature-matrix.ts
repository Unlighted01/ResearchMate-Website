import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, deductCredit, refundCredit, setCorsHeaders } from "./_utils/auth.js";

// ============================================
// CONFIGURATION
// ============================================

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

const OPENROUTER_MODEL = "google/gemini-2.5-flash";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export interface MatrixRow {
  id: string;
  title: string;
  authorsYear: string;
  methodology: string;
  dataset: string;
  keyFindings: string;
  limitations: string;
}

export interface MatrixResponse {
  matrix: MatrixRow[];
  crossPaperGaps: string[];
  synthesisDraft: string;
}

const MATRIX_SYSTEM_PROMPT = `You are ResearchMate's Academic Literature Review Matrix Engine.
Analyze the provided collection of research papers and extract a rigorous comparative literature review matrix and synthesized Related Work narrative.

CRITICAL REQUIREMENTS:
1. Extract exactly these dimensions for each paper:
   - title: Paper title or source header
   - authorsYear: Identified author(s) and publication year (e.g., "Vaswani et al., 2017" or "Smith (2023)")
   - methodology: Core theoretical framework, algorithm, empirical model, or qualitative methodology (1-2 precise sentences)
   - dataset: Benchmarks, dataset names, empirical corpus, or sample size (e.g., "ImageNet-1k, 1.2M images" or "N=450 surveyed students")
   - keyFindings: Concrete results, performance metrics, effect sizes, or discoveries (with numbers if present)
   - limitations: Stated constraints, unaddressed edge cases, computational bounds, or unverified assumptions

2. Identify "crossPaperGaps": 3-4 bullet-point synthesis gaps that appear across multiple papers or remain unresolved.

3. Generate "synthesisDraft": A 3-4 paragraph publication-grade "Related Work & Literature Review" section ready for an academic manuscript.
   - Paragraph 1: Foundations and dominant methodological paradigms across the papers.
   - Paragraph 2: Methodological divergence and comparative empirical performance. Use in-text citations like [Author, Year].
   - Paragraph 3: Unresolved tensions, benchmark limitations, and motivation for subsequent research.

OUTPUT FORMAT: Return STRICT VALID JSON matching this schema with NO markdown fences:
{
  "matrix": [
    {
      "id": "string",
      "title": "string",
      "authorsYear": "string",
      "methodology": "string",
      "dataset": "string",
      "keyFindings": "string",
      "limitations": "string"
    }
  ],
  "crossPaperGaps": ["gap 1", "gap 2", "gap 3"],
  "synthesisDraft": "full prose with in-text citations"
}`;

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

function parseJsonSafely(raw: string): MatrixResponse {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/```\s*$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "");
  }
  return JSON.parse(cleaned);
}

// Provider 1: Gemini
async function callGemini(papersPayload: string, apiKey: string): Promise<MatrixResponse> {
  const url = `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: MATRIX_SYSTEM_PROMPT },
            { text: `\n\nPAPERS TO ANALYZE:\n${papersPayload}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseJsonSafely(text);
}

// Provider 2: OpenRouter fallback
async function callOpenRouter(papersPayload: string, apiKey: string): Promise<MatrixResponse> {
  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: MATRIX_SYSTEM_PROMPT },
        { role: "user", content: `PAPERS TO ANALYZE:\n${papersPayload}` },
      ],
      temperature: 0.2,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenRouter error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  return parseJsonSafely(text);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let creditDeducted = false;
  let deductedUserId: string | null = null;

  try {
    const { papers } = req.body;

    if (!Array.isArray(papers) || papers.length === 0) {
      return res.status(400).json({ error: "Please provide an array of at least 1 paper to analyze." });
    }

    // Authenticate request
    const authResult = await authenticateUser(req);
    if (authResult.error) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error,
        code: authResult.statusCode === 403 ? "NO_CREDITS" : "AUTH_ERROR",
      });
    }

    // Format papers payload with length truncation per item to prevent token exhaustion
    const formattedPapers = papers.map((p, idx) => {
      const excerpt = (p.text || p.aiSummary || "").slice(0, 4000);
      return `--- PAPER ${idx + 1} (ID: ${p.id}) ---
TITLE: ${p.title || p.sourceTitle || "Untitled"}
CITATION: ${p.citation || "Unknown"}
CONTENT EXCERPT:
${excerpt}
`;
    }).join("\n\n");

    let result: MatrixResponse | null = null;
    let providerUsed = "gemini";

    // Try Gemini
    const geminiKey = getRandomGeminiKey();
    if (geminiKey) {
      try {
        result = await callGemini(formattedPapers, geminiKey);
      } catch (err) {
        console.warn("Gemini literature matrix failed, trying OpenRouter...", err);
      }
    }

    // Fallback: OpenRouter
    if (!result && process.env.OPENROUTER_API_KEY) {
      try {
        result = await callOpenRouter(formattedPapers, process.env.OPENROUTER_API_KEY);
        providerUsed = "openrouter";
      } catch (err) {
        console.error("OpenRouter literature matrix failed:", err);
      }
    }

    if (!result) {
      return res.status(502).json({
        error: "Literature matrix generation temporarily unavailable across AI providers. Please try again.",
      });
    }

    // Deduct credit
    if (authResult.isFreeTier && authResult.user?.id) {
      await deductCredit(authResult.user.id);
      creditDeducted = true;
      deductedUserId = authResult.user.id;
    }

    return res.status(200).json({
      success: true,
      provider: providerUsed,
      ...result,
    });
  } catch (error) {
    console.error("Matrix handler exception:", error);
    if (creditDeducted && deductedUserId) {
      await refundCredit(deductedUserId);
    }
    return res.status(500).json({
      error: (error as Error).message || "An unexpected error occurred generating the literature matrix.",
    });
  }
}
