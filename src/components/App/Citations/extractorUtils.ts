// ============================================
// extractorUtils.ts - Citation Extractor Types & Utilities
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import {
  Globe,
  GraduationCap,
  BookOpen,
  Youtube,
  HelpCircle,
} from "lucide-react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

export type DetectedType = "url" | "doi" | "isbn" | "youtube" | "unknown";

export interface ExtractedMetadata {
  title: string;
  author: string;
  authors?:
    | string[]
    | { firstName: string; lastName: string; fullName: string }[];
  publishDate: string;
  publishYear?: string;
  accessDate: string;
  siteName: string;
  description: string;
  url: string;
  publisher?: string;
  isbn?: string;
  pages?: number;
  coverUrl?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  doi?: string;
  channelTitle?: string;
  duration?: string;
  debugLogs?: string[];
}

// ============================================
// PART 3: CONSTANTS
// ============================================

export const API_BASE_URL = "/api";

// ============================================
// PART 4: HELPER FUNCTIONS
// ============================================

export function detectInputType(input: string): {
  type: DetectedType;
  value: string;
} {
  const trimmed = input.trim();

  // Check ISBN (10 or 13 digits, with optional dashes)
  const cleanedForISBN = trimmed.replace(/[-\s]/g, "");
  if (
    /^\d{10}$/.test(cleanedForISBN) ||
    /^97[89]\d{10}$/.test(cleanedForISBN)
  ) {
    return { type: "isbn", value: cleanedForISBN };
  }

  // Check DOI (starts with 10.)
  const doiCleaned = trimmed
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .trim();
  if (/^10\.\d{4,}\/\S+$/.test(doiCleaned)) {
    return { type: "doi", value: doiCleaned };
  }

  // Check YouTube
  const ytPatterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of ytPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return { type: "youtube", value: match[1] };
    }
  }

  // Check if it's a URL
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.includes(".")
  ) {
    const url = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    return { type: "url", value: url };
  }

  // Check if it might be a partial number (could be ISBN)
  if (/^\d{10,13}$/.test(cleanedForISBN)) {
    return { type: "isbn", value: cleanedForISBN };
  }

  return { type: "unknown", value: trimmed };
}

export const getTypeBadge = (
  type: DetectedType
): { icon: React.ReactNode; label: string; color: string } => {
  const badges: Record<
    DetectedType,
    { icon: React.ReactNode; label: string; color: string }
  > = {
    url: {
      icon: React.createElement(Globe, { className: "w-3 h-3" }),
      label: "Website",
      color:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    doi: {
      icon: React.createElement(GraduationCap, { className: "w-3 h-3" }),
      label: "Academic Paper (DOI)",
      color:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    },
    isbn: {
      icon: React.createElement(BookOpen, { className: "w-3 h-3" }),
      label: "Book (ISBN)",
      color:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    youtube: {
      icon: React.createElement(Youtube, { className: "w-3 h-3" }),
      label: "YouTube Video",
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
    unknown: {
      icon: React.createElement(HelpCircle, { className: "w-3 h-3" }),
      label: "Unknown",
      color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    },
  };
  return badges[type] || badges.unknown;
};

export const formatAuthors = (
  authors: ExtractedMetadata["authors"]
): string => {
  if (!authors || authors.length === 0) return "Unknown Author";

  if (typeof authors[0] === "string") {
    return (authors as string[]).join(", ");
  }

  return (authors as { fullName: string }[]).map((a) => a.fullName).join(", ");
};
