// TO BE REMOVED WHEN SMART PEN HARDWARE IS ACTUALLY CREATED AND FUNCTIONALLY RUNNING.
// ============================================
// OCR - Gemini Vision Text Extraction
// Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";

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
                    text: `Extract ALL text from this image. This is a complex document with tables, forms, or handwritten notes.

CRITICAL INSTRUCTIONS:
- You MUST extract every single piece of text, from the top left corner all the way to the bottom right.
- DO NOT STOP EARLY. If there is a table, extract every cell, row by row.
- If there are checkboxes, indicate their state (e.g., [x] or [ ]).
- Preserve the layout, structure, and line breaks as accurately as possible.
- If text is dense or handwriting is messy, make your best absolute guess.
- DO NOT output any conversational text like "Here is the extracted text:". Just the raw text.

PROCESS THE ENTIRE IMAGE. Do not leave anything out.`,
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
                    text: `Extract ALL text from this image. This is a complex document with tables, forms, or handwritten notes.

CRITICAL INSTRUCTIONS:
- You MUST extract every single piece of text, from the top left corner all the way to the bottom right.
- DO NOT STOP EARLY. If there is a table, extract every cell, row by row.
- If there are checkboxes, indicate their state (e.g., [x] or [ ]).
- Preserve the layout, structure, and line breaks as accurately as possible.
- If text is dense or handwriting is messy, make your best absolute guess.
- DO NOT output any conversational text like "Here is the extracted text:". Just the raw text.

PROCESS THE ENTIRE IMAGE. Do not leave anything out.`,
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
              maxOutputTokens: 4096,
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
                  text: `Extract ALL text from this image. This is a complex document with tables, forms, or handwritten notes.

CRITICAL INSTRUCTIONS:
- You MUST extract every single piece of text, from the top left corner all the way to the bottom right.
- DO NOT STOP EARLY. If there is a table, extract every cell, row by row.
- If there are checkboxes, indicate their state (e.g., [x] or [ ]).
- Preserve the layout, structure, and line breaks as accurately as possible.
- If text is dense or handwriting is messy, make your best absolute guess.
- DO NOT output any conversational text like "Here is the extracted text:". Just the raw text.

PROCESS THE ENTIRE IMAGE. Do not leave anything out.`,
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
                content: `Summarize the following handwritten note in 1-2 concise sentences. Focus on the main topic and key points:\n\n${text}`,
              },
            ],
            temperature: 0.3,
            max_tokens: 150,
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
                    text: `Summarize the following handwritten note in 1-2 concise sentences. Focus on the main topic and key points:\n\n${text}`,
                  },
                ],
              },
            ],
            generationConfig: { temperature: 0.3, maxOutputTokens: 150 },
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
          max_tokens: 150,
          temperature: 0.3,
          messages: [
            {
              role: "user",
              content: `Summarize the following handwritten note in 1-2 concise sentences. Focus on the main topic and key points:\n\n${text}`,
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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

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

    return res.status(200).json({
      success: true,
      ocrText: ocrResult.text,
      aiSummary: summary,
    });
  } catch (error) {
    console.error("OCR handler error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
