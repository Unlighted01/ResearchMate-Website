// ============================================
// ExtractedCitationCard.tsx - Extracted Metadata Display & APA Preview
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useState } from "react";
import { Button } from "../../shared/ui";
import {
  CheckCircle2,
  Copy,
  RefreshCw,
  ArrowRight,
  FileText,
  User,
  Building,
  Calendar,
} from "lucide-react";
import {
  DetectedType,
  ExtractedMetadata,
  getTypeBadge,
} from "./extractorUtils";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface ExtractedCitationCardProps {
  metadata: ExtractedMetadata;
  detectedType: DetectedType | null;
  onReset: () => void;
  onUseCitation?: (metadata: ExtractedMetadata) => void;
}

// ============================================
// PART 3: HELPER - APA CITATION GENERATOR
// ============================================

const buildAPACitation = (
  metadata: ExtractedMetadata,
  detectedType: DetectedType | null
): string => {
  const author = metadata.author || "Unknown Author";
  const year =
    metadata.publishYear ||
    (metadata.publishDate
      ? new Date(metadata.publishDate).getFullYear()
      : "n.d.");
  const title = metadata.title || "Untitled";

  if (detectedType === "isbn") {
    const publisher = metadata.publisher || "Unknown Publisher";
    return `${author}. (${year}). ${title}. ${publisher}.`;
  }

  if (detectedType === "doi") {
    const journal = metadata.journal || "";
    const volume = metadata.volume ? `, ${metadata.volume}` : "";
    const issue = metadata.issue ? `(${metadata.issue})` : "";
    const doi = metadata.doi ? ` https://doi.org/${metadata.doi}` : "";
    if (journal) {
      return `${author}. (${year}). ${title}. ${journal}${volume}${issue}.${doi}`;
    }
    return `${author}. (${year}). ${title}.${doi}`;
  }

  if (detectedType === "youtube") {
    const channel = metadata.channelTitle || author;
    return `${channel}. (${year}). ${title} [Video]. YouTube. ${metadata.url}`;
  }

  const site = metadata.siteName || "Website";
  const accessDate = new Date(metadata.accessDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `${author}. (${year}). ${title}. ${site}. Retrieved ${accessDate}, from ${metadata.url}`;
};

// ============================================
// PART 4: COMPONENT
// ============================================

const ExtractedCitationCard: React.FC<ExtractedCitationCardProps> = ({
  metadata,
  detectedType,
  onReset,
  onUseCitation,
}) => {
  const [copied, setCopied] = useState(false);
  const badge = detectedType ? getTypeBadge(detectedType) : null;
  const apaCitation = buildAPACitation(metadata, detectedType);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apaCitation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Success Header */}
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle2 className="w-5 h-5" />
        <span className="font-medium">Citation extracted successfully!</span>
        {badge && (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}
          >
            {badge.icon}
            {badge.label}
          </span>
        )}
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Title */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <FileText className="w-3 h-3" />
            Title
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
            {metadata.title || "Not found"}
          </p>
        </div>

        {/* Author / Channel */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <User className="w-3 h-3" />
            {detectedType === "youtube" ? "Channel" : "Author"}
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {metadata.author || "Unknown"}
          </p>
        </div>

        {/* Publisher / Journal / Website */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Building className="w-3 h-3" />
            {detectedType === "isbn"
              ? "Publisher"
              : detectedType === "doi"
                ? "Journal"
                : "Website"}
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {metadata.journal ||
              metadata.publisher ||
              metadata.siteName ||
              "Unknown"}
          </p>
        </div>

        {/* Date */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Calendar className="w-3 h-3" />
            {detectedType === "youtube" ? "Published" : "Publish Date"}
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {metadata.publishYear ||
              (metadata.publishDate
                ? new Date(metadata.publishDate).toLocaleDateString()
                : "Not found")}
          </p>
        </div>

        {/* Book cover for ISBN */}
        {metadata.coverUrl && (
          <div className="md:col-span-2 flex justify-center">
            <img
              src={metadata.coverUrl}
              alt={metadata.title}
              className="h-32 rounded shadow-md"
            />
          </div>
        )}

        {/* Debug Logs */}
        {metadata.debugLogs && metadata.debugLogs.length > 0 && (
          <div className="md:col-span-2 mt-4">
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-medium select-none">
                🛠️ View Debug Logs
              </summary>
              <div className="mt-2 p-3 bg-gray-900 text-green-400 font-mono rounded max-h-40 overflow-y-auto whitespace-pre-wrap">
                {metadata.debugLogs.join("\n")}
              </div>
            </details>
          </div>
        )}
      </div>

      {/* APA Citation Preview */}
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
          {apaCitation}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onReset}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Extract Another
        </Button>
        {onUseCitation && (
          <Button size="sm" onClick={() => onUseCitation(metadata)}>
            <ArrowRight className="w-4 h-4 mr-2" />
            Use This Citation
          </Button>
        )}
      </div>
    </div>
  );
};

export default ExtractedCitationCard;
