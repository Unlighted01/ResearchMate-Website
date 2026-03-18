import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, deductCredit, refundCredit } from "./_utils/auth.js";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

const PROMPT = `You are a source identification expert. Analyze the following text (OCR output from a physical document) and identify what book, academic paper, journal article, movie, or other source it is from.

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

async function identifyWithGemini(text: string, apiKey: string): Promise<any> {
  const res = await fetch(
    `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${PROMPT}\n\nTEXT TO ANALYZE:\n${text.slice(0, 3000)}` }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error("Gemini HTTP error:", res.status, errText.slice(0, 300));
    throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 100)}`);
  }

  const data = await res.json();

  // Log any safety/block issues
  if (data.promptFeedback?.blockReason) {
    console.error("Gemini blocked:", data.promptFeedback.blockReason);
    throw new Error(`Gemini blocked: ${data.promptFeedback.blockReason}`);
  }

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  console.log("Gemini raw response:", raw.slice(0, 200));

  // Strip markdown code fences if present
  const cleaned = raw.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("No JSON found in Gemini response:", raw.slice(0, 300));
    throw new Error("No JSON in response");
  }
  return JSON.parse(jsonMatch[0]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = await authenticateUser(req);
  if (!auth.user) return res.status(auth.statusCode || 401).json({ error: auth.error });

  const { text } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ error: "Text is required" });

  // Match the key rotation pattern used by other endpoints
  const multipleKeys = process.env.GEMINI_API_KEYS;
  let apiKey: string | undefined = auth.customKey;
  if (!apiKey) {
    if (multipleKeys) {
      const keys = multipleKeys.split(",").map((k) => k.trim()).filter(Boolean);
      apiKey = keys[Math.floor(Math.random() * keys.length)];
    } else {
      apiKey = process.env.GEMINI_API_KEY;
    }
  }
  if (!apiKey) return res.status(503).json({ error: "AI not configured" });

  try {
    if (auth.isFreeTier) await deductCredit(auth.user.id);

    const result = await identifyWithGemini(text, apiKey);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("identify-source failed:", err?.message || err);
    if (auth.isFreeTier) await refundCredit(auth.user.id);
    return res.status(500).json({ error: err.message });
  }
}
