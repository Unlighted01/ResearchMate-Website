// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useState } from "react";
import { Button, Card, Input } from "../shared/UIComponents";
import {
  Sparkles,
  Link as LinkIcon,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  RefreshCw,
  Globe,
  User,
  Calendar,
  FileText,
  Building,
  ArrowRight,
} from "lucide-react";

// ============================================
// PART 2: TYPES
// ============================================

interface ExtractedMetadata {
  title: string;
  author: string;
  publishDate: string;
  accessDate: string;
  siteName: string;
  description: string;
  url: string;
}

interface AICitationExtractorProps {
  onCitationExtracted?: (metadata: ExtractedMetadata) => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const AICitationExtractor: React.FC<AICitationExtractorProps> = ({
  onCitationExtracted,
}) => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [metadata, setMetadata] = useState<ExtractedMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Use /api for production (Vercel), localhost for development
  const isProduction =
    window.location.hostname.includes("vercel.app") ||
    window.location.hostname.includes("researchmate") ||
    !window.location.hostname.includes("localhost");
  const BACKEND_URL = isProduction ? "" : "http://localhost:3001";

  // ============================================
  // PART 4: HANDLERS
  // ============================================

  const handleExtract = async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL (include https://)");
      return;
    }

    setLoading(true);
    setError(null);
    setMetadata(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/extract-citation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, useAI }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract citation");
      }

      setMetadata(data.metadata);

      // Callback if provided
      if (onCitationExtracted) {
        onCitationExtracted(data.metadata);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to extract citation. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const generateAPACitation = () => {
    if (!metadata) return "";

    const author = metadata.author || "Unknown Author";
    const year = metadata.publishDate
      ? new Date(metadata.publishDate).getFullYear()
      : "n.d.";
    const title = metadata.title || "Untitled";
    const site = metadata.siteName || "Website";
    const accessDate = new Date(metadata.accessDate).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    return `${author}. (${year}). ${title}. ${site}. Retrieved ${accessDate}, from ${metadata.url}`;
  };

  const handleCopy = async () => {
    const citation = generateAPACitation();
    await navigator.clipboard.writeText(citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setUrl("");
    setMetadata(null);
    setError(null);
  };

  // ============================================
  // PART 5: RENDER
  // ============================================

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          AI Citation Extractor
        </h3>
      </div>

      <p className="text-gray-500 text-sm mb-4">
        Paste a URL and let AI automatically extract citation information
      </p>

      {/* URL Input */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleExtract()}
            />
          </div>
          <Button onClick={handleExtract} disabled={loading || !url.trim()}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Extract
              </>
            )}
          </Button>
        </div>

        {/* AI Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useAI}
            onChange={(e) => setUseAI(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Use AI to enhance extraction (better author/date detection)
          </span>
        </label>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Extracted Metadata */}
        {metadata && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">
                Citation extracted successfully!
              </span>
            </div>

            {/* Metadata Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <FileText className="w-3 h-3" />
                  Title
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                  {metadata.title || "Not found"}
                </p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <User className="w-3 h-3" />
                  Author
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {metadata.author || "Unknown"}
                </p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Building className="w-3 h-3" />
                  Website
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {metadata.siteName || "Unknown"}
                </p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Calendar className="w-3 h-3" />
                  Publish Date
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {metadata.publishDate
                    ? new Date(metadata.publishDate).toLocaleDateString()
                    : "Not found"}
                </p>
              </div>
            </div>

            {/* Generated Citation Preview */}
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-100 dark:border-primary-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-primary-600">
                  APA Citation Preview
                </span>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    copied
                      ? "bg-green-100 text-green-600"
                      : "bg-primary-100 dark:bg-primary-800 text-primary-600 hover:bg-primary-200"
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 break-all">
                {generateAPACitation()}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Extract Another
              </Button>
              {onCitationExtracted && (
                <Button size="sm" onClick={() => onCitationExtracted(metadata)}>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Use This Citation
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AICitationExtractor;
