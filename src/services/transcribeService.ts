// ============================================
// transcribeService.ts — Media transcription client service (Phase 5)
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import { supabase } from "./supabaseClient";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

export interface TranscribeResult {
  transcript: string;
  summary: string;
  tags: string[];
  provider: "gemini" | "gemini-youtube" | "groq-whisper";
  source: { youtubeUrl?: string; fileName?: string | null };
}

// ============================================
// PART 3: CONSTANTS & CONFIGURATION
// ============================================

export const TRANSCRIBE_MAX_BYTES = 18 * 1024 * 1024; // 18 MB — matches server cap
export const TRANSCRIBE_CREDIT_COST = 3;

export const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mp4",
  "audio/flac",
];

export const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
];

export const ACCEPTED_MIME_TYPES = [
  ...ACCEPTED_AUDIO_TYPES,
  ...ACCEPTED_VIDEO_TYPES,
];

const YOUTUBE_PATTERN =
  /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[A-Za-z0-9_-]{6,}/i;

// ============================================
// PART 4: HELPER FUNCTIONS
// ============================================

/**
 * Convert a File object to a base64 string (without the data URI prefix).
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip "data:<mime>;base64," prefix
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function isYoutubeUrl(url: string): boolean {
  return YOUTUBE_PATTERN.test(url.trim());
}

export function isAcceptedMedia(file: File): boolean {
  const t = file.type.toLowerCase();
  // Some browsers report "" for unusual containers — fall back to extension
  if (!t) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    return ["mp3", "wav", "m4a", "ogg", "flac", "webm", "mp4", "mov"].includes(
      ext,
    );
  }
  return ACCEPTED_MIME_TYPES.some((m) => t === m || t.startsWith(m.split("/")[0] + "/"));
}

// ============================================
// PART 5: TRANSCRIBE CALLS
// ============================================

async function getAuthHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be signed in to transcribe media");
  return { Authorization: `Bearer ${session.access_token}` };
}

/**
 * Transcribe an uploaded audio/video file.
 * File must be ≤18 MB (enforced both client- and server-side).
 */
export async function transcribeFile(file: File): Promise<TranscribeResult> {
  if (file.size > TRANSCRIBE_MAX_BYTES) {
    throw new Error(
      `File is ${(file.size / 1024 / 1024).toFixed(1)} MB. Max is ${
        TRANSCRIBE_MAX_BYTES / 1024 / 1024
      } MB. Please trim it.`,
    );
  }
  if (!isAcceptedMedia(file)) {
    throw new Error(
      `Unsupported file type (${file.type || "unknown"}). Use MP3, WAV, M4A, OGG, FLAC, WebM, MP4, or MOV.`,
    );
  }

  const authHeader = await getAuthHeader();
  const audioBase64 = await fileToBase64(file);

  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
    body: JSON.stringify({
      audioBase64,
      mimeType: file.type || "audio/mpeg",
      fileName: file.name,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Transcription failed (${response.status})`);
  }

  return (await response.json()) as TranscribeResult;
}

/**
 * Transcribe a YouTube URL directly — no download needed.
 * Gemini processes the URL natively via fileData.fileUri.
 */
export async function transcribeYoutube(
  youtubeUrl: string,
): Promise<TranscribeResult> {
  const trimmed = youtubeUrl.trim();
  if (!isYoutubeUrl(trimmed)) {
    throw new Error(
      "Invalid YouTube URL. Expected youtube.com/watch?v=... or youtu.be/...",
    );
  }

  const authHeader = await getAuthHeader();

  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
    body: JSON.stringify({ youtubeUrl: trimmed }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Transcription failed (${response.status})`);
  }

  return (await response.json()) as TranscribeResult;
}

// ============================================
// PART 6: EXPORTS
// ============================================
// Named exports above — no default export
