// ============================================
// TranscribePage.tsx — Media Transcription (Phase 5)
// ============================================
// Lets users upload an audio/video file OR paste a YouTube URL,
// sends it to /api/transcribe (Gemini → Groq Whisper), and optionally
// saves the result to their research library as a new item.

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Mic,
  Upload,
  Youtube,
  Loader2,
  Sparkles,
  Save,
  Copy,
  Check,
  X,
  AlertCircle,
  FileAudio,
  Clock,
} from "lucide-react";
import {
  transcribeFile,
  transcribeYoutube,
  isYoutubeUrl,
  isAcceptedMedia,
  TRANSCRIBE_MAX_BYTES,
  TRANSCRIBE_CREDIT_COST,
  type TranscribeResult,
} from "../../../services/transcribeService";
import { addItem } from "../../../services/storageService";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

type Mode = "file" | "youtube";
type UiState = "idle" | "working" | "done" | "error";

// ============================================
// PART 3: HELPER FUNCTIONS
// ============================================

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function youtubeIdFromUrl(url: string): string | null {
  const match =
    /(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{6,})/.exec(url);
  return match ? match[1] : null;
}

// ============================================
// PART 4: MAIN COMPONENT
// ============================================

const TranscribePage: React.FC = () => {
  // ---------- PART 4A: STATE ----------
  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const [uiState, setUiState] = useState<UiState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscribeResult | null>(null);

  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounter = useRef(0);

  // ---------- PART 4B: DERIVED ----------
  const canSubmit = useMemo(() => {
    if (uiState === "working") return false;
    if (mode === "file") return !!file;
    return isYoutubeUrl(youtubeUrl);
  }, [mode, file, youtubeUrl, uiState]);

  const transcriptWordCount = useMemo(() => {
    if (!result) return 0;
    return result.transcript.trim().split(/\s+/).filter(Boolean).length;
  }, [result]);

  // ---------- PART 4C: HANDLERS ----------
  const resetResult = useCallback(() => {
    setResult(null);
    setError(null);
    setSaved(false);
    setCopied(false);
    setUiState("idle");
  }, []);

  const handleFileSelected = useCallback(
    (f: File) => {
      resetResult();
      if (f.size > TRANSCRIBE_MAX_BYTES) {
        setError(
          `File is ${formatBytes(f.size)}. Max is ${formatBytes(
            TRANSCRIBE_MAX_BYTES,
          )}. Please trim it or split into parts.`,
        );
        return;
      }
      if (!isAcceptedMedia(f)) {
        setError(
          `Unsupported file type (${f.type || "unknown"}). Use MP3, WAV, M4A, OGG, FLAC, WebM, MP4, or MOV.`,
        );
        return;
      }
      setFile(f);
    },
    [resetResult],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFileSelected(f);
    },
    [handleFileSelected],
  );

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDragOver(false);
  }, []);

  const handleTranscribe = useCallback(async () => {
    setError(null);
    setResult(null);
    setSaved(false);
    setCopied(false);
    setUiState("working");

    try {
      let res: TranscribeResult;
      if (mode === "file") {
        if (!file) throw new Error("No file selected");
        res = await transcribeFile(file);
      } else {
        res = await transcribeYoutube(youtubeUrl);
      }
      setResult(res);
      setUiState("done");
    } catch (err: any) {
      setError(err.message || "Transcription failed");
      setUiState("error");
    }
  }, [mode, file, youtubeUrl]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }, [result]);

  const handleSave = useCallback(async () => {
    if (!result) return;
    setSaving(true);
    setError(null);
    try {
      const sourceTitle =
        mode === "youtube" && youtubeUrl
          ? `YouTube Transcription (${youtubeIdFromUrl(youtubeUrl) || "video"})`
          : file
            ? `Transcription — ${file.name}`
            : "Media Transcription";

      const sourceUrl = mode === "youtube" ? youtubeUrl : "";

      await addItem({
        text: result.transcript,
        aiSummary: result.summary,
        tags: result.tags,
        sourceTitle,
        sourceUrl,
        deviceSource: "transcription",
        preferredView: "summary",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save to library");
    } finally {
      setSaving(false);
    }
  }, [result, mode, youtubeUrl, file]);

  const handleReset = useCallback(() => {
    setFile(null);
    setYoutubeUrl("");
    resetResult();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [resetResult]);

  // ---------- PART 4D: RENDER ----------
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#5856D6] to-[#AF52DE] flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Mic size={22} className="text-white" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Transcribe
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm ml-14">
          Convert audio, video, or YouTube videos to searchable text. Costs{" "}
          {TRANSCRIBE_CREDIT_COST} credits per transcription.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="inline-flex items-center gap-1 p-1 rounded-xl theme-panel-muted mb-6">
        <button
          onClick={() => {
            setMode("file");
            resetResult();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "file"
              ? "theme-panel-elevated text-gray-900 dark:text-white shadow-sm"
              : "theme-muted-text hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <FileAudio size={16} />
          Upload File
        </button>
        <button
          onClick={() => {
            setMode("youtube");
            resetResult();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "youtube"
              ? "theme-panel-elevated text-gray-900 dark:text-white shadow-sm"
              : "theme-muted-text hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Youtube size={16} />
          YouTube URL
        </button>
      </div>

      {/* Input card */}
      <div className="theme-surface rounded-2xl border border-gray-200/60 dark:border-white/10 p-6 mb-6">
        {mode === "file" ? (
          <div
            onDrop={handleDrop}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragOver
                ? "border-[#007AFF] bg-[#007AFF]/5 scale-[1.01] shadow-lg shadow-blue-500/10"
                : "border-gray-300 dark:border-white/15 hover:border-[#007AFF]/70 hover:bg-gray-50 dark:hover:bg-white/5"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelected(f);
              }}
            />
            <Upload
              size={36}
              className="mx-auto mb-3 text-gray-400 dark:text-gray-500"
            />
            {file ? (
              <div>
                <div className="text-gray-900 dark:text-white font-medium">
                  {file.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatBytes(file.size)} · {file.type || "unknown type"}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="mt-3 text-xs text-[#FF3B30] hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="text-gray-900 dark:text-white font-medium mb-1">
                  Drop an audio or video file here
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  MP3, WAV, M4A, OGG, FLAC, WebM, MP4, MOV · max{" "}
                  {formatBytes(TRANSCRIBE_MAX_BYTES)}
                </div>
              </>
            )}
          </div>
        ) : (
          <div>
            <label
              htmlFor="youtube-url"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              YouTube URL
            </label>
            <input
              id="youtube-url"
              type="url"
              value={youtubeUrl}
              onChange={(e) => {
                setYoutubeUrl(e.target.value);
                if (result) resetResult();
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-3 bg-gray-100 dark:bg-[#2C2C2E] rounded-xl border-0 focus:ring-2 focus:ring-[#007AFF]/50 text-gray-900 dark:text-white placeholder:text-gray-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Supports youtube.com/watch?v=..., youtu.be/..., and youtube.com/shorts/...
            </p>
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center justify-between mt-5">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Sparkles size={12} />
            Powered by Gemini 2.5 Flash
          </div>
          <button
            onClick={handleTranscribe}
            disabled={!canSubmit}
            className="px-6 py-2.5 bg-[#007AFF] hover:bg-[#0066DD] disabled:bg-gray-300 dark:disabled:bg-white/10 disabled:text-gray-500 text-white font-medium rounded-full transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95 disabled:shadow-none disabled:active:scale-100 flex items-center gap-2"
          >
            {uiState === "working" ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Transcribing...
              </>
            ) : (
              <>
                <Mic size={16} />
                Transcribe
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-[#FF3B30]/10 border border-[#FF3B30]/30 text-[#FF3B30]">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm">{error}</div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-[#FF3B30] hover:opacity-70"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="theme-surface rounded-2xl border border-gray-200/60 dark:border-white/10 overflow-hidden">
          {/* Result header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/60 dark:border-white/10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Clock size={12} />
                {transcriptWordCount.toLocaleString()} words
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Provider:{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {result.provider}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-[#34C759]" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-[#007AFF] hover:bg-[#0066DD] disabled:bg-[#34C759] text-white rounded-full shadow-sm shadow-blue-500/20 transition-all"
              >
                {saved ? (
                  <>
                    <Check size={14} />
                    Saved
                  </>
                ) : saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save to Library
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all"
              >
                <X size={14} />
                Clear
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="px-6 py-5 border-b border-gray-200/60 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles
                size={14}
                className="text-[#AF52DE] dark:text-[#D0A0FF]"
              />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                AI Summary
              </h3>
            </div>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
              {result.summary}
            </p>
            {result.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {result.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full bg-[#007AFF]/10 text-[#007AFF] dark:bg-[#0A84FF]/15 dark:text-[#64B5F6]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Transcript body */}
          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Transcript
            </h3>
            <div className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-normal">
              {result.transcript}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// PART 5: EXPORTS
// ============================================

export default TranscribePage;
