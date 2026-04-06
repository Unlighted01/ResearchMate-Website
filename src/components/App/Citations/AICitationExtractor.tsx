// ============================================
// AICitationExtractor.tsx - Smart Unified Citation Extractor
// Client-side detection - no cite-detect API needed!
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useState, useEffect } from "react";
import { Card } from "../../shared/ui";
import { Sparkles } from "lucide-react";
import { supabase } from "../../../services/supabaseClient";
import {
  DetectedType,
  ExtractedMetadata,
  API_BASE_URL,
  detectInputType,
  formatAuthors,
} from "./extractorUtils";
import ExtractorInput from "./ExtractorInput";
import ExtractedCitationCard from "./ExtractedCitationCard";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface AICitationExtractorProps {
  onCitationExtracted?: (metadata: ExtractedMetadata) => void;
}

// ============================================
// PART 3: API CALL HELPERS
// ============================================

async function getAuthToken(): Promise<string | undefined> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token;
}

async function extractISBN(isbn: string): Promise<ExtractedMetadata> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/cite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ isbn }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "ISBN lookup failed");

  const book = data.data;
  return {
    title: book.title,
    author: book.authors?.join(", ") || "Unknown Author",
    authors: book.authors,
    publishDate:
      book.publishYear && book.publishYear !== "n.d."
        ? `${book.publishYear}-01-01`
        : "",
    publishYear: book.publishYear,
    accessDate: new Date().toISOString(),
    siteName: book.publisher || "Unknown Publisher",
    description: "",
    url: `https://openlibrary.org/isbn/${book.isbn || isbn}`,
    publisher: book.publisher,
    isbn: book.isbn13 || book.isbn,
    pages: book.pages,
    coverUrl: book.coverUrl,
    debugLogs: data.debugLogs,
  };
}

async function extractDOI(doi: string): Promise<ExtractedMetadata> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/cite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ doi }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "DOI lookup failed");

  const paper = data.data;
  const authors = paper.authors || [];

  return {
    title: paper.title,
    author: formatAuthors(authors),
    authors,
    publishDate:
      paper.publishYear && paper.publishYear !== "n.d."
        ? `${paper.publishYear}-${paper.publishMonth || "01"}-${paper.publishDay || "01"}`
        : "",
    publishYear: paper.publishYear,
    accessDate: new Date().toISOString(),
    siteName: paper.journal || paper.publisher || "Academic Publication",
    description: paper.abstract || "",
    url: paper.url || `https://doi.org/${doi}`,
    journal: paper.journal,
    volume: paper.volume,
    issue: paper.issue,
    doi: paper.doi,
    publisher: paper.publisher,
  };
}

async function extractYouTube(videoId: string): Promise<ExtractedMetadata> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/cite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ url: `https://youtube.com/watch?v=${videoId}` }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "YouTube lookup failed");

  const video = data.data;
  return {
    title: video.title,
    author: video.channelTitle || "Unknown Channel",
    publishDate: video.publishDate || "",
    publishYear: video.publishYear,
    accessDate: new Date().toISOString(),
    siteName: "YouTube",
    description: video.description || "",
    url: video.url,
    channelTitle: video.channelTitle,
    duration: video.durationFormatted,
  };
}

async function extractURL(
  url: string,
  useAI: boolean
): Promise<ExtractedMetadata> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/extract-citation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ url, useAI }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "URL extraction failed");

  return {
    title: data.metadata.title || "Untitled",
    author: data.metadata.author || "Unknown Author",
    publishDate: data.metadata.publishDate || "",
    accessDate: data.metadata.accessDate || new Date().toISOString(),
    siteName: data.metadata.siteName || "",
    description: data.metadata.description || "",
    url: data.metadata.url || url,
    doi: data.doi,
  };
}

// ============================================
// PART 4: MAIN COMPONENT
// ============================================

const AICitationExtractor: React.FC<AICitationExtractorProps> = ({
  onCitationExtracted,
}) => {
  // ---------- PART 4A: STATE ----------
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [metadata, setMetadata] = useState<ExtractedMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<DetectedType | null>(null);
  const [liveDetection, setLiveDetection] = useState<DetectedType | null>(null);

  // ---------- PART 4B: EFFECTS ----------
  useEffect(() => {
    if (input.trim().length > 3) {
      const { type } = detectInputType(input);
      setLiveDetection(type);
    } else {
      setLiveDetection(null);
    }
  }, [input]);

  // ---------- PART 4C: HANDLERS ----------
  const handleExtract = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) {
      setError("Please enter a URL, DOI, ISBN, or YouTube link");
      return;
    }

    setLoading(true);
    setError(null);
    setMetadata(null);

    try {
      const { type, value } = detectInputType(trimmedInput);
      setDetectedType(type);

      let extractedData: ExtractedMetadata | null = null;

      switch (type) {
        case "isbn":
          extractedData = await extractISBN(value);
          break;
        case "doi":
          extractedData = await extractDOI(value);
          break;
        case "youtube":
          extractedData = await extractYouTube(value);
          break;
        case "url":
          extractedData = await extractURL(value, useAI);
          break;
        default:
          if (trimmedInput.includes(".")) {
            const url = trimmedInput.startsWith("http")
              ? trimmedInput
              : `https://${trimmedInput}`;
            extractedData = await extractURL(url, useAI);
            setDetectedType("url");
          } else {
            throw new Error(
              "Could not determine input type. Please enter a valid URL, DOI (10.xxxx/xxxx), ISBN, or YouTube link."
            );
          }
      }

      if (extractedData) {
        setMetadata(extractedData);
        if (onCitationExtracted) {
          onCitationExtracted(extractedData);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to extract citation. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInput("");
    setMetadata(null);
    setError(null);
    setDetectedType(null);
    setLiveDetection(null);
  };

  // ---------- PART 4D: RENDER ----------
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          AI Citation Extractor
        </h3>
      </div>

      <p className="text-gray-500 text-sm mb-4">
        Paste a URL, DOI, ISBN, or YouTube link - we'll auto-detect and extract
        citation info
      </p>

      <ExtractorInput
        input={input}
        loading={loading}
        useAI={useAI}
        error={error}
        liveDetection={liveDetection}
        metadata={metadata}
        onInputChange={setInput}
        onToggleAI={setUseAI}
        onExtract={handleExtract}
      />

      {metadata && (
        <ExtractedCitationCard
          metadata={metadata}
          detectedType={detectedType}
          onReset={handleReset}
          onUseCitation={onCitationExtracted}
        />
      )}
    </Card>
  );
};

export default AICitationExtractor;
