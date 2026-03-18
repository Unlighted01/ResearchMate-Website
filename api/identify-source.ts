import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, deductCredit, refundCredit } from "./_utils/auth.js";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

const PROMPT = `You are a source identification expert. Analyze the following text (OCR output from a physical document) and identify what book, academic paper, journal article, movie, or other source it is from.

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
  "reasoning": "brief explanation of how you identified this",
  "searchQuery": "the best search query to find this source (title + author is usually best)"
}

If you cannot identify the source with reasonable confidence (below 30), still return your best guess but set confidence accordingly.`;

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
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in response");
  return JSON.parse(jsonMatch[0]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = await authenticateUser(req);
  if (!auth.user) return res.status(auth.statusCode || 401).json({ error: auth.error });

  const { text } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ error: "Text is required" });

  const apiKey = auth.customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "AI not configured" });

  try {
    if (auth.isFreeTier) await deductCredit(auth.user.id);

    const result = await identifyWithGemini(text, apiKey);
    return res.status(200).json(result);
  } catch (err: any) {
    if (auth.isFreeTier) await refundCredit(auth.user.id);
    return res.status(500).json({ error: err.message });
  }
}
