// ============================================
// OCR - Gemini Vision Text Extraction
// Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, deductCredit } from "./_utils/auth.js";

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================
// (all imports above)

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

type OcrResult = {
  success: boolean;
  text: string;
  provider?: string;
  error?: string;
};

// ============================================
// PART 3: CONSTANTS & CONFIGURATION
// ============================================

// Shared prompt used across all three OCR providers
const OCR_EXTRACTION_PROMPT = `Extract ALL relevant text from this image and format it using beautifully structured Markdown.

CRITICAL INSTRUCTIONS:
- Extract all core content but IGNORE these irrelevant page artifacts entirely:
  * Standalone page numbers — any line containing only a number (e.g. "47", "Page 3 of 10")
  * Repeating running headers or footers (journal name, author names, URL repeated at top/bottom)
  * Watermarks, scan noise, or background artifacts
- For ACADEMIC PAPERS:
  * Detect and label these sections using standard Markdown headers: Abstract, Introduction, Literature Review, Methodology, Results, Discussion, Conclusion, References, Acknowledgements
  * Preserve section numbers as part of the header (e.g. ## 2.1 Related Work)
  * Multi-column layouts: read the LEFT column completely first, then the RIGHT column
  * Figure/table captions (e.g. "Figure 1:", "Table 2."): italicize them — *Figure 1: caption text*
  * Footnote markers in body text: render as [1], [2] etc.
  * Footnote text at page bottom: render at end of section as > [1] footnote content
- Use Markdown headers (#, ##, ###) to match the visual hierarchy of titles and sections
- Bold (**text**) any key terms, form field labels, or emphasized text
- Checkboxes: indicate state as [x] checked or [ ] unchecked
- Tables: format as Markdown tables with | separators, header row, and separator row (|---|---|)
- Lists: use - for bullet points, 1. 2. 3. for numbered lists
- Clean up excessive blank spacing from scan artifacts — output cleanly and cohesively
- If handwriting is messy or text is dense, make your best absolute guess
- DO NOT output any conversational text. Just the raw formatted Markdown.

PROCESS THE ENTIRE IMAGE. Do not stop early or leave anything out.`;

const OCR_SUMMARY_PROMPT = `Summarize the following scanned content in 2-4 concise, information-dense sentences.

Rules:
- Auto-detect content type: if it appears to be from a research paper, extract the key finding and methodology. If handwritten notes, organize the key actionable points. If a form or document, describe its purpose and key data.
- Lead with the core point — not filler like "This document contains" or "The scanned text shows".
- Preserve critical specifics: names, numbers, dates, key terms.
- NEVER hallucinate or add information not in the text.

Content:
`;

// ============================================
// PART 4: HELPER FUNCTIONS
// ============================================

function getRandomGeminiKey(): string | undefined {
  const multipleKeys = process.env.GEMINI_API_KEYS;
  if (multipleKeys) {
    const keys = multipleKeys
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (keys.length > 0) {
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      console.log(
        `🔑 Using Gemini key ${keys.indexOf(randomKey) + 1} of ${keys.length}`,
      );
      return randomKey;
    }
  }
  return process.env.GEMINI_API_KEY;
}

function calculateOcrConfidence(text: string, provider: string): number {
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Provider base scores reflect typical accuracy
  const providerBase: Record<string, number> = {
    openrouter: 0.82,
    gemini: 0.80,
    claude: 0.78,
  };
  const base = providerBase[provider] ?? 0.70;

  // Word count bonus: more content = higher confidence (up to +0.15 at 200+ words)
  const lengthBonus = Math.min(0.15, wordCount / 1500);

  // Noise penalty: high ratio of non-standard characters suggests garbled OCR
  const noiseRatio =
    (text.match(/[^\w\s.,;:!?'"()\-–—]/g) || []).length /
    Math.max(1, text.length);
  const noisePenalty = Math.min(0.15, noiseRatio * 5);

  return Math.min(0.98, Math.max(0.50, base + lengthBonus - noisePenalty));
}

// ============================================
// PART 5: OCR PROVIDERS
// ============================================

// ---------- PART 5A: TEXT EXTRACTION ----------

async function extractTextFromImage(imageBase64: string): Promise<OcrResult> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const claudeKey = process.env.OCR_API_KEY;
  const geminiKey = getRandomGeminiKey();

  if (!openRouterKey && !claudeKey && !geminiKey) {
    return { success: false, text: "", error: "No API keys configured for OCR" };
  }

  const match = imageBase64.match(/^data:(image\/\w+);base64,/);
  const mimeType = match ? match[1] : "image/jpeg";
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  let openRouterErrorMsg = "Skipped (No Key)";
  let geminiErrorMsg = "Skipped (No Key)";
  let claudeErrorMsg = "Skipped (No Key)";

  // 1. PRIMARY: OpenRouter (Gemini 2.0 Flash)
  if (openRouterKey) {
    try {
      console.log("🔍 Processing image with OpenRouter...");
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-001",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: OCR_EXTRACTION_PROMPT },
                  {
                    type: "image_url",
                    image_url: { url: `data:${mimeType};base64,${base64Data}` },
                  },
                ],
              },
            ],
            temperature: 0.1,
            max_tokens: 8192,
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const extractedText = data.choices?.[0]?.message?.content || "";
        if (extractedText.trim()) {
          console.log("✅ OpenRouter OCR completed successfully");
          return { success: true, text: extractedText.trim(), provider: "openrouter" };
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        openRouterErrorMsg = errorData.error?.message || `HTTP ${response.status}`;
        console.error("OpenRouter OCR failed:", openRouterErrorMsg);
      }
    } catch (error) {
      openRouterErrorMsg = (error as Error).message;
      console.error("OpenRouter OCR error:", openRouterErrorMsg);
    }
    console.log("⚠️ OpenRouter failed, falling back to Gemini Vision API...");
  }

  // 2. SECONDARY: Gemini API
  if (geminiKey) {
    try {
      console.log("🔍 Processing image with Gemini Vision...");
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: OCR_EXTRACTION_PROMPT },
                  {
                    inlineData: {
                      mimeType:
                        mimeType === "image/webp" ||
                        mimeType === "image/png" ||
                        mimeType === "image/jpeg"
                          ? mimeType
                          : "image/jpeg",
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (extractedText.trim()) {
          console.log("✅ Gemini OCR completed successfully");
          return { success: true, text: extractedText.trim(), provider: "gemini" };
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        geminiErrorMsg = errorData.error?.message || `HTTP ${response.status}`;
        console.error("Gemini Vision failed:", geminiErrorMsg);
      }
    } catch (error) {
      geminiErrorMsg = (error as Error).message;
      console.error("Gemini OCR error:", geminiErrorMsg);
    }
    console.log("⚠️ Gemini API failed, falling back to Claude...");
  }

  // 3. TERTIARY: Claude
  if (claudeKey) {
    try {
      console.log("🔍 Processing image with Claude AI Server...");
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": claudeKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          temperature: 0.1,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: mimeType, data: base64Data },
                },
                { type: "text", text: OCR_EXTRACTION_PROMPT },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const extractedText = data.content?.[0]?.text || "";
        if (extractedText.trim()) {
          console.log("✅ Claude OCR completed successfully");
          return { success: true, text: extractedText.trim(), provider: "claude" };
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        claudeErrorMsg = errorData.error?.message || `HTTP ${response.status}`;
        console.error("Claude OCR failed:", claudeErrorMsg);
      }
    } catch (error) {
      claudeErrorMsg = (error as Error).message;
      console.error("Claude OCR error:", claudeErrorMsg);
    }
  }

  console.log("❌ All OCR endpoints failed in the fallback chain.");
  return {
    success: false,
    text: "",
    error: `OpenRouter: [${openRouterErrorMsg}] | Gemini: [${geminiErrorMsg}] | Claude: [${claudeErrorMsg}]`,
  };
}

// ---------- PART 5B: SUMMARY GENERATION ----------

async function generateSummary(text: string): Promise<string | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const claudeKey = process.env.OCR_API_KEY;
  const geminiKey = getRandomGeminiKey();

  if (!openRouterKey && !claudeKey && !geminiKey) return null;
  if (!text || text.length < 50) return null;

  // 1. PRIMARY: OpenRouter
  if (openRouterKey) {
    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-001",
            messages: [{ role: "user", content: `${OCR_SUMMARY_PROMPT}${text}` }],
            temperature: 0.3,
            max_tokens: 300,
          }),
        },
      );
      if (response.ok) {
        const data = await response.json();
        const summary = data.choices?.[0]?.message?.content || null;
        if (summary) return summary;
      }
    } catch (e) {
      console.error("OpenRouter Summary error:", e);
    }
  }

  // 2. SECONDARY: Gemini
  if (geminiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${OCR_SUMMARY_PROMPT}${text}` }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
          }),
        },
      );
      if (response.ok) {
        const data = await response.json();
        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        if (summary) return summary;
      }
    } catch (e) {
      console.error("Gemini Summary error:", e);
    }
  }

  // 3. TERTIARY: Claude
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
          messages: [{ role: "user", content: `${OCR_SUMMARY_PROMPT}${text}` }],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const summary = data.content?.[0]?.text || null;
        if (summary) return summary;
      }
    } catch (e) {
      console.error("Claude Summary error:", e);
    }
  }

  return null;
}

// ============================================
// PART 6: MAIN HANDLER
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image, includeSummary = true } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Image data is required" });
    }

    // Validate image format: must be a base64 data URI
    if (typeof image !== "string" || !image.startsWith("data:image/")) {
      return res.status(400).json({ error: "Invalid image format. Expected base64 data URI." });
    }

    // Validate image size: base64 string represents ~75% of actual bytes
    const estimatedBytes = (image.length * 3) / 4;
    const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
    if (estimatedBytes > MAX_IMAGE_BYTES) {
      return res.status(413).json({ error: "Image too large. Maximum size is 10MB." });
    }

    // Service-to-service bypass for Smart Pen (no user session, no credit deduction)
    const serviceKey = req.headers["x-smart-pen-key"];
    if (serviceKey && serviceKey === process.env.SMART_PEN_SERVICE_KEY) {
      const ocrResult = await extractTextFromImage(image);
      if (!ocrResult.success) {
        return res.status(422).json({ success: false, error: ocrResult.error });
      }
      const confidence = calculateOcrConfidence(ocrResult.text, ocrResult.provider ?? "");
      return res.status(200).json({
        success: true,
        ocrText: ocrResult.text,
        ocrConfidence: Math.round(confidence * 100),
        ocrProvider: ocrResult.provider,
        aiSummary: null,
      });
    }

    // Authenticate request
    const authResult = await authenticateUser(req);
    if (authResult.error) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error,
        code: authResult.statusCode === 403 ? "NO_CREDITS" : "AUTH_ERROR",
      });
    }

    // Extract text from image
    const ocrResult = await extractTextFromImage(image);

    if (!ocrResult.success) {
      console.error("OCR failed:", ocrResult.error);
      return res.status(422).json({
        error: ocrResult.error || "Failed to extract text from image",
      });
    }

    // Optionally generate summary
    let summary = null;
    if (includeSummary) {
      summary = await generateSummary(ocrResult.text);
    }

    // Charge credit if on free tier
    if (authResult.isFreeTier && authResult.user?.id) {
      await deductCredit(authResult.user.id);
    }

    // Calculate confidence using provider + text quality
    const ocrConfidence = calculateOcrConfidence(ocrResult.text, ocrResult.provider ?? "");

    console.log(
      `📊 OCR metrics — provider: ${ocrResult.provider}, words: ${ocrResult.text.split(/\s+/).filter(Boolean).length}, confidence: ${Math.round(ocrConfidence * 100)}%`,
    );

    return res.status(200).json({
      success: true,
      ocrText: ocrResult.text,
      ocrConfidence: Math.round(ocrConfidence * 100),
      ocrProvider: ocrResult.provider,
      aiSummary: summary,
    });
  } catch (error) {
    console.error("OCR handler error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
