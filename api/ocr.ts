// TO BE REMOVED WHEN SMART PEN HARDWARE IS ACTUALLY CREATED AND FUNCTIONALLY RUNNING.
// ============================================
// OCR - Gemini Vision Text Extraction
// Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, deductCredit } from "./_utils/auth.js";

// ============================================
// API KEY ROTATION HELPER
// ============================================

function getRandomGeminiKey(): string | undefined {
  // Try multiple keys first (comma-separated)
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
  // Fallback to single key
  return process.env.GEMINI_API_KEY;
}

// ============================================
// GEMINI VISION OCR
// ============================================

async function extractTextFromImage(
  imageBase64: string,
): Promise<{ success: boolean; text: string; error?: string }> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const claudeKey = process.env.OCR_API_KEY;
  const geminiKey = getRandomGeminiKey();

  if (!openRouterKey && !claudeKey && !geminiKey) {
    return {
      success: false,
      text: "",
      error: "No API keys configured for OCR",
    };
  }

  // Extract base64 and mime type
  const match = imageBase64.match(/^data:(image\/\w+);base64,/);
  const mimeType = match ? match[1] : "image/jpeg";
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  let openRouterErrorMsg = "Skipped (No Key)";
  let geminiErrorMsg = "Skipped (No Key)";
  let claudeErrorMsg = "Skipped (No Key)";

  // ==========================================
  // 1. PRIMARY: OpenRouter (Gemini EXP Free)
  // ==========================================
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
                  {
                    type: "text",
                    text: `Extract ALL relevant text from this image and format it using beautifully structured Markdown.

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

PROCESS THE ENTIRE IMAGE. Do not stop early or leave anything out.`,
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${base64Data}`,
                    },
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
          return { success: true, text: extractedText.trim() };
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        openRouterErrorMsg =
          errorData.error?.message || `HTTP ${response.status}`;
        console.error("OpenRouter OCR failed:", openRouterErrorMsg);
      }
    } catch (error) {
      openRouterErrorMsg = (error as Error).message;
      console.error("OpenRouter OCR error:", openRouterErrorMsg);
    }
    console.log("⚠️ OpenRouter failed, falling back to Gemini Vision API...");
  }

  // ==========================================
  // 2. SECONDARY: Gemini API (-exp suffix)
  // ==========================================
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
                  {
                    text: `Extract ALL relevant text from this image and format it using beautifully structured Markdown.

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

PROCESS THE ENTIRE IMAGE. Do not stop early or leave anything out.`,
                  },
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
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192,
            },
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const extractedText =
          data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (extractedText.trim()) {
          console.log("✅ Gemini OCR completed successfully");
          return { success: true, text: extractedText.trim() };
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

  // ==========================================
  // 3. TERTIARY: Claude
  // ==========================================
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
                  source: {
                    type: "base64",
                    media_type: mimeType,
                    data: base64Data,
                  },
                },
                {
                  type: "text",
                  text: `Extract ALL relevant text from this image and format it using beautifully structured Markdown.

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

PROCESS THE ENTIRE IMAGE. Do not stop early or leave anything out.`,
                },
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
          return { success: true, text: extractedText.trim() };
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

  // IF ALL FALLBACKS FAIL, RETURN THE CHAINED ERROR
  console.log("❌ All OCR endpoints failed in the fallback chain.");
  return {
    success: false,
    text: "",
    error: `OpenRouter: [${openRouterErrorMsg}] | Gemini: [${geminiErrorMsg}] | Claude: [${claudeErrorMsg}]`,
  };
}

// ============================================
// OPTIONAL: GENERATE SUMMARY OF EXTRACTED TEXT
// ============================================

const OCR_SUMMARY_PROMPT = `Summarize the following scanned content in 2-4 concise, information-dense sentences.

Rules:
- Auto-detect content type: if it appears to be from a research paper, extract the key finding and methodology. If handwritten notes, organize the key actionable points. If a form or document, describe its purpose and key data.
- Lead with the core point — not filler like "This document contains" or "The scanned text shows".
- Preserve critical specifics: names, numbers, dates, key terms.
- NEVER hallucinate or add information not in the text.

Content:
`;

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
            messages: [
              {
                role: "user",
                content: `${OCR_SUMMARY_PROMPT}${text}`,
              },
            ],
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

  // 2. SECONDARY: Gemini (-exp)
  if (geminiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${OCR_SUMMARY_PROMPT}${text}`,
                  },
                ],
              },
            ],
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
          messages: [
            {
              role: "user",
              content: `${OCR_SUMMARY_PROMPT}${text}`,
            },
          ],
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
// MAIN HANDLER
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
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

    // 1. Authenticate Request
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

    // Calculate heuristic confidence based on extracted text quality
    const wordCount = ocrResult.text.split(/\s+/).filter(Boolean).length;
    const ocrConfidence = Math.min(0.98, 0.65 + Math.min(0.33, wordCount / 300));

    return res.status(200).json({
      success: true,
      ocrText: ocrResult.text,
      ocrConfidence: Math.round(ocrConfidence * 100),
      aiSummary: summary,
    });
  } catch (error) {
    console.error("OCR handler error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
