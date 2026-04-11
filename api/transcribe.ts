// ============================================
// TRANSCRIBE.TS - Audio/Video Transcription (Phase 5)
// ============================================
// Accepts either:
//   (a) { audioBase64, mimeType, fileName? }   — inline audio/video (<=18 MB)
//   (b) { youtubeUrl }                         — YouTube URL (Gemini handles natively)
//
// Returns: { transcript, summary, tags, durationHint, provider }
//
// Primary:  Gemini 2.5 Flash (native audio + video input, supports YouTube URIs)
// Fallback: Groq `whisper-large-v3` (inline audio only, no YouTube)
//
// Credits: 3 per successful transcription.

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, deductCredit, refundCredit } from "./_utils/auth.js";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface TranscribeRequestBody {
  audioBase64?: string;
  mimeType?: string;
  fileName?: string;
  youtubeUrl?: string;
}

interface GeminiTranscribeResult {
  transcript: string;
  summary: string;
  tags: string[];
}

// ============================================
// PART 3: CONSTANTS & CONFIGURATION
// ============================================

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const GROQ_WHISPER_MODEL = "whisper-large-v3";
const GROQ_WHISPER_ENDPOINT =
  "https://api.groq.com/openai/v1/audio/transcriptions";

const TRANSCRIBE_CREDITS = 3;

const MAX_INLINE_BYTES = 18 * 1024 * 1024; // ~18 MB inline cap (Gemini limit is 20 MB)
const ALLOWED_MIME_PREFIXES = ["audio/", "video/"];

const YOUTUBE_URL_PATTERN =
  /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[A-Za-z0-9_-]{6,}/i;

const TRANSCRIBE_PROMPT = `
You are ResearchMate's transcription engine. The user has provided an audio or video recording.

TASK:
1. Transcribe the spoken content VERBATIM. Preserve speaker's exact words.
2. If multiple speakers are detectable, label them "Speaker 1:", "Speaker 2:", etc.
3. Break transcript into readable paragraphs at natural pause / topic boundaries.
4. Write a concise 2–4 sentence summary of the content.
5. Extract 3–6 topical tags (lowercase, single or hyphenated words).

OUTPUT FORMAT (strict JSON, no markdown fences):
{
  "transcript": "<full verbatim transcript with paragraph breaks>",
  "summary": "<2-4 sentence summary>",
  "tags": ["tag1", "tag2", "tag3"]
}

RULES:
- NEVER fabricate content not heard in the audio.
- NEVER add commentary or preamble.
- If the audio is silent/unintelligible, return transcript "[unintelligible]" and summary explaining it.
- Return ONLY the JSON object.
`.trim();

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
      return keys[Math.floor(Math.random() * keys.length)];
    }
  }
  return process.env.GEMINI_API_KEY;
}

/**
 * Decode a base64 data URI or raw base64 string to { bytes, mime }.
 * Returns null if the input is not valid base64.
 */
function decodeBase64(audioBase64: string, fallbackMime?: string) {
  let raw = audioBase64;
  let mime = fallbackMime;

  // Strip data URI prefix if present
  const dataUriMatch = /^data:([^;]+);base64,(.*)$/i.exec(audioBase64);
  if (dataUriMatch) {
    mime = dataUriMatch[1];
    raw = dataUriMatch[2];
  }

  // Estimate decoded byte length from base64 string length
  const padding = (raw.match(/=+$/) || [""])[0].length;
  const estimatedBytes = Math.floor((raw.length * 3) / 4) - padding;

  return { raw, mime, estimatedBytes };
}

/**
 * Extract a strict JSON object from a model's text response.
 * Tolerates accidental markdown fences.
 */
function parseJsonFromModel(text: string): GeminiTranscribeResult | null {
  if (!text) return null;

  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }

  // Find the first { and last } to grab the JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) return null;

  const jsonStr = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    const parsed = JSON.parse(jsonStr);
    if (
      typeof parsed.transcript === "string" &&
      typeof parsed.summary === "string" &&
      Array.isArray(parsed.tags)
    ) {
      return {
        transcript: parsed.transcript,
        summary: parsed.summary,
        tags: parsed.tags.filter((t: unknown) => typeof t === "string"),
      };
    }
  } catch {
    return null;
  }
  return null;
}

// ============================================
// PART 5: AI PROVIDERS
// ============================================

// -------- PART 5A: Gemini (inline audio/video) --------
async function callGeminiInline(
  apiKey: string,
  base64Data: string,
  mimeType: string,
): Promise<GeminiTranscribeResult> {
  const body = {
    contents: [
      {
        parts: [
          { text: TRANSCRIBE_PROMPT },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Gemini Inline Error (${response.status}): ${
        errorData.error?.message || response.statusText
      }`,
    );
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  const parsed = parseJsonFromModel(text);
  if (!parsed) {
    throw new Error("Gemini returned unparsable transcription response");
  }
  return parsed;
}

// -------- PART 5B: Gemini (YouTube URL via fileData) --------
async function callGeminiYoutube(
  apiKey: string,
  youtubeUrl: string,
): Promise<GeminiTranscribeResult> {
  const body = {
    contents: [
      {
        parts: [
          { text: TRANSCRIBE_PROMPT },
          {
            fileData: {
              mimeType: "video/mp4",
              fileUri: youtubeUrl,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Gemini YouTube Error (${response.status}): ${
        errorData.error?.message || response.statusText
      }`,
    );
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  const parsed = parseJsonFromModel(text);
  if (!parsed) {
    throw new Error("Gemini returned unparsable transcription response");
  }
  return parsed;
}

// -------- PART 5C: Groq Whisper (fallback, inline audio only) --------
async function callGroqWhisper(
  base64Data: string,
  mimeType: string,
  fileName: string,
): Promise<GeminiTranscribeResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Groq API Key not configured");
  }

  // Groq Whisper only supports audio/* — reject video mimes here
  if (!mimeType.startsWith("audio/")) {
    throw new Error(
      "Groq Whisper fallback only supports audio; cannot process video",
    );
  }

  const buffer = Buffer.from(base64Data, "base64");
  const blob = new Blob([buffer], { type: mimeType });

  const form = new FormData();
  form.append("file", blob, fileName || "audio");
  form.append("model", GROQ_WHISPER_MODEL);
  form.append("response_format", "verbose_json");
  form.append("temperature", "0.0");

  const response = await fetch(GROQ_WHISPER_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Groq Whisper Error (${response.status}): ${
        errorData.error?.message || response.statusText
      }`,
    );
  }

  const data = await response.json();
  const transcript = (data.text || "").trim();
  if (!transcript) {
    throw new Error("Groq Whisper returned empty transcript");
  }

  // Groq Whisper doesn't return summary/tags — generate minimal defaults.
  const firstWords = transcript.split(/\s+/).slice(0, 20).join(" ");
  return {
    transcript,
    summary: `Audio transcription: ${firstWords}${
      transcript.length > 120 ? "..." : ""
    }`,
    tags: ["transcription", "audio"],
  };
}

// ============================================
// PART 6: MAIN HANDLER
// ============================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let creditDeducted = false;
  let deductedUserId: string | null = null;

  try {
    // 1. Authenticate + credit check
    const authResult = await authenticateUser(req);
    if (authResult.error) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error,
        code: authResult.statusCode === 403 ? "NO_CREDITS" : undefined,
      });
    }
    const { user, isFreeTier, customKey } = authResult;
    const userId = user?.id;

    // 2. Parse body
    const { audioBase64, mimeType, fileName, youtubeUrl } =
      (req.body || {}) as TranscribeRequestBody;

    const hasAudio = typeof audioBase64 === "string" && audioBase64.length > 0;
    const hasYoutube = typeof youtubeUrl === "string" && youtubeUrl.length > 0;

    if (!hasAudio && !hasYoutube) {
      return res.status(400).json({
        error: "Provide either `audioBase64` + `mimeType` or `youtubeUrl`",
      });
    }
    if (hasAudio && hasYoutube) {
      return res.status(400).json({
        error: "Provide EITHER audio OR youtubeUrl, not both",
      });
    }

    // 3. Validate inputs
    if (hasYoutube) {
      if (!YOUTUBE_URL_PATTERN.test(youtubeUrl!)) {
        return res.status(400).json({
          error:
            "Invalid YouTube URL. Supported: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...",
        });
      }
    } else {
      if (!mimeType || typeof mimeType !== "string") {
        return res
          .status(400)
          .json({ error: "`mimeType` is required with audio uploads" });
      }
      const mimeAllowed = ALLOWED_MIME_PREFIXES.some((p) =>
        mimeType.toLowerCase().startsWith(p),
      );
      if (!mimeAllowed) {
        return res.status(400).json({
          error: `Unsupported mimeType "${mimeType}". Must be audio/* or video/*`,
        });
      }

      const { raw, estimatedBytes, mime } = decodeBase64(
        audioBase64!,
        mimeType,
      );
      if (!raw || estimatedBytes <= 0) {
        return res.status(400).json({ error: "Invalid base64 audio payload" });
      }
      if (estimatedBytes > MAX_INLINE_BYTES) {
        return res.status(413).json({
          error: `File too large (${(estimatedBytes / 1024 / 1024).toFixed(
            1,
          )} MB). Max is ${MAX_INLINE_BYTES / 1024 / 1024} MB. Please trim the file.`,
        });
      }
      // Overwrite caller-supplied values with canonicalized ones.
      (req.body as TranscribeRequestBody).audioBase64 = raw;
      (req.body as TranscribeRequestBody).mimeType = mime || mimeType;
    }

    // 4. Get Gemini key
    const keyToUse = customKey || getRandomGeminiKey();
    if (!keyToUse) {
      return res
        .status(500)
        .json({ error: "Server misconfiguration: no Gemini API key" });
    }

    // 5. Deduct credits (3) upfront
    if (isFreeTier && userId) {
      for (let i = 0; i < TRANSCRIBE_CREDITS; i++) {
        await deductCredit(userId);
      }
      creditDeducted = true;
      deductedUserId = userId;
    }

    // 6. Call provider chain
    let result: GeminiTranscribeResult;
    let provider: "gemini" | "gemini-youtube" | "groq-whisper";
    const errors: string[] = [];

    if (hasYoutube) {
      // YouTube: only Gemini supports it. No fallback.
      try {
        result = await callGeminiYoutube(keyToUse, youtubeUrl!);
        provider = "gemini-youtube";
      } catch (err: any) {
        errors.push(`gemini-youtube: ${err.message}`);
        throw new Error(
          `YouTube transcription failed: ${err.message}. YouTube URLs can only be processed by Gemini.`,
        );
      }
    } else {
      // Inline audio: Gemini → Groq Whisper fallback
      const body = req.body as TranscribeRequestBody;
      try {
        result = await callGeminiInline(
          keyToUse,
          body.audioBase64!,
          body.mimeType!,
        );
        provider = "gemini";
      } catch (geminiErr: any) {
        errors.push(`gemini: ${geminiErr.message}`);
        console.warn("⚠️ Gemini transcribe failed, trying Groq Whisper:", geminiErr.message);

        try {
          result = await callGroqWhisper(
            body.audioBase64!,
            body.mimeType!,
            body.fileName || "audio",
          );
          provider = "groq-whisper";
        } catch (groqErr: any) {
          errors.push(`groq: ${groqErr.message}`);
          throw new Error(
            `All transcription providers failed. ${errors.join(" | ")}`,
          );
        }
      }
    }

    // 7. Return success
    console.log(
      `✅ Transcribe success — provider=${provider}, transcriptWords=${
        result.transcript.split(/\s+/).length
      }, user=${userId ?? "byok"}`,
    );

    return res.status(200).json({
      transcript: result.transcript,
      summary: result.summary,
      tags: result.tags,
      provider,
      source: hasYoutube ? { youtubeUrl } : { fileName: fileName || null },
    });
  } catch (error: any) {
    console.error("❌ Transcribe handler error:", error);

    // Refund on failure
    if (creditDeducted && deductedUserId) {
      for (let i = 0; i < TRANSCRIBE_CREDITS; i++) {
        await refundCredit(deductedUserId);
      }
      console.log(`↩️ Refunded ${TRANSCRIBE_CREDITS} credits to ${deductedUserId}`);
    }

    return res.status(500).json({
      error: error.message || "Transcription failed",
    });
  }
}

// ============================================
// PART 7: EXPORTS
// ============================================
// Default export above — Vercel expects it.
