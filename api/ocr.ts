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
  // Try Claude first
  const claudeKey = process.env.OCR_API_KEY;
  const geminiKey = getRandomGeminiKey();

  if (!claudeKey && !geminiKey) {
    return {
      success: false,
      text: "",
      error: "No API keys configured (OCR_API_KEY or GEMINI_API_KEY)",
    };
  }

  // Extract base64 and mime type
  const match = imageBase64.match(/^data:(image\/\w+);base64,/);
  const mimeType = match ? match[1] : "image/jpeg";
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

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
                  text: `Extract ALL text from this image. This is handwritten or printed text that needs to be digitized.

Instructions:
- Extract every word and character you can see
- Preserve the original layout and line breaks where possible
- If there are multiple columns or sections, process them left to right, top to bottom
- Include any numbers, dates, or special characters
- If text is unclear, make your best guess and include it
- Do NOT add any commentary or descriptions - just output the extracted text

Output only the extracted text, nothing else.`,
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
        console.error(
          "Claude OCR failed:",
          errorData.error?.message || `HTTP ${response.status}`,
        );
      }
    } catch (error) {
      console.error("Claude OCR error:", error);
    }
    console.log("⚠️ Claude failed, falling back to Gemini Vision...");
  }

  // Fallback to Gemini
  if (!geminiKey) {
    return {
      success: false,
      text: "",
      error: "Claude failed and GEMINI_API_KEY not configured for fallback",
    };
  }

  try {
    console.log("🔍 Processing image with Gemini Vision...");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Extract ALL text from this image. This is handwritten or printed text that needs to be digitized.

Instructions:
- Extract every word and character you can see
- Preserve the original layout and line breaks where possible
- If there are multiple columns or sections, process them left to right, top to bottom
- Include any numbers, dates, or special characters
- If text is unclear, make your best guess and include it
- Do NOT add any commentary or descriptions - just output the extracted text

Output only the extracted text, nothing else.`,
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || `HTTP ${response.status}`;
      console.error("Gemini Vision failed:", errorMsg);
      return {
        success: false,
        text: "",
        error: `Gemini Vision: ${errorMsg}`,
      };
    }

    const data = await response.json();
    const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!extractedText.trim()) {
      return {
        success: false,
        text: "",
        error: "No text could be extracted from the image",
      };
    }

    console.log("✅ Gemini OCR completed successfully");
    return { success: true, text: extractedText.trim() };
  } catch (error) {
    console.error("Gemini OCR error:", error);
    return {
      success: false,
      text: "",
      error: (error as Error).message,
    };
  }
}

// ============================================
// OPTIONAL: GENERATE SUMMARY OF EXTRACTED TEXT
// ============================================

async function generateSummary(text: string): Promise<string | null> {
  const claudeKey = process.env.OCR_API_KEY;
  const geminiKey = getRandomGeminiKey();

  if (!claudeKey && !geminiKey) return null;
  if (!text || text.length < 50) return null;

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
    console.log("⚠️ Claude summary failed, falling back to Gemini...");
  }

  if (!geminiKey) return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
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

    if (!response.ok) return null;

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
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
