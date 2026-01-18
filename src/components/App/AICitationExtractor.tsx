// ============================================
// AICitationExtractor.tsx - Smart Unified Citation Extractor
// Client-side detection - no cite-detect API needed!
// ============================================

import React, { useState, useEffect } from "react";
import { Button, Card } from "../shared/UIComponents";
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
  BookOpen,
  Youtube,
  GraduationCap,
  HelpCircle,
} from "lucide-react";

// ============================================
// PART 1: TYPES
// ============================================

type DetectedType = "url" | "doi" | "isbn" | "youtube" | "unknown";

interface ExtractedMetadata {
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

interface AICitationExtractorProps {
  onCitationExtracted?: (metadata: ExtractedMetadata) => void;
}

// ============================================
// PART 2: API URL CONFIGURATION
// ============================================

// API Base URL - Always use /api since we use Vercel serverless functions
const API_BASE_URL = "/api";

// ============================================
// PART 3: CLIENT-SIDE TYPE DETECTION
// ============================================

function detectInputType(input: string): { type: DetectedType; value: string } {
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

// Type badge styling
const getTypeBadge = (type: DetectedType) => {
  const badges: Record<
    DetectedType,
    { icon: React.ReactNode; label: string; color: string }
  > = {
    url: {
      icon: <Globe className="w-3 h-3" />,
      label: "Website",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    doi: {
      icon: <GraduationCap className="w-3 h-3" />,
      label: "Academic Paper (DOI)",
      color:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    },
    isbn: {
      icon: <BookOpen className="w-3 h-3" />,
      label: "Book (ISBN)",
      color:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    youtube: {
      icon: <Youtube className="w-3 h-3" />,
      label: "YouTube Video",
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
    unknown: {
      icon: <HelpCircle className="w-3 h-3" />,
      label: "Unknown",
      color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    },
  };
  return badges[type] || badges.unknown;
};

// Format authors for display
const formatAuthors = (authors: ExtractedMetadata["authors"]): string => {
  if (!authors || authors.length === 0) return "Unknown Author";

  if (typeof authors[0] === "string") {
    return (authors as string[]).join(", ");
  }

  return (authors as { fullName: string }[]).map((a) => a.fullName).join(", ");
};

// ============================================
// PART 4: COMPONENT
// ============================================

const AICitationExtractor: React.FC<AICitationExtractorProps> = ({
  onCitationExtracted,
}) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [metadata, setMetadata] = useState<ExtractedMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [detectedType, setDetectedType] = useState<DetectedType | null>(null);
  const [liveDetection, setLiveDetection] = useState<DetectedType | null>(null);

  // Live detection as user types
  useEffect(() => {
    if (input.trim().length > 3) {
      const { type } = detectInputType(input);
      setLiveDetection(type);
    } else {
      setLiveDetection(null);
    }
  }, [input]);

  // ============================================
  // PART 5: EXTRACTION HANDLERS
  // ============================================

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
      // Client-side detection
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
          extractedData = await extractURL(value);
          break;
        default:
          // Try URL extraction as fallback
          if (trimmedInput.includes(".")) {
            const url = trimmedInput.startsWith("http")
              ? trimmedInput
              : `https://${trimmedInput}`;
            extractedData = await extractURL(url);
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
      console.error("Extraction error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to extract citation. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PART 6: API CALLS
  // ============================================

  const extractISBN = async (isbn: string): Promise<ExtractedMetadata> => {
    const response = await fetch(`${API_BASE_URL}/cite-isbn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isbn }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "ISBN lookup failed");

    const book = data.data;
    return {
      title: book.title,
      author: book.authors?.join(", ") || "Unknown Author",
      authors: book.authors,
      publishDate: book.publishYear ? `${book.publishYear}-01-01` : "",
      publishYear: book.publishYear,
      accessDate: new Date().toISOString(),
      siteName: book.publisher || "Unknown Publisher",
      description: "",
      url: `https://openlibrary.org/isbn/${book.isbn || isbn}`,
      publisher: book.publisher,
      isbn: book.isbn13 || book.isbn,
      pages: book.pages,
      coverUrl: book.coverUrl,
      debugLogs: data.debugLogs, // Pass logs to frontend
    };
  };

  const extractDOI = async (doi: string): Promise<ExtractedMetadata> => {
    const response = await fetch(`${API_BASE_URL}/cite-doi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doi }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "DOI lookup failed");

    const paper = data.data;
    const authors = paper.authors || [];

    return {
      title: paper.title,
      author: formatAuthors(authors),
      authors: authors,
      publishDate: paper.publishYear
        ? `${paper.publishYear}-${paper.publishMonth || "01"}-${
            paper.publishDay || "01"
          }`
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
  };

  const extractYouTube = async (
    videoId: string
  ): Promise<ExtractedMetadata> => {
    const response = await fetch(`${API_BASE_URL}/cite-youtube`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  };

  const extractURL = async (url: string): Promise<ExtractedMetadata> => {
    const response = await fetch(`${API_BASE_URL}/extract-citation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  };

  // ============================================
  // PART 7: CITATION FORMATTING
  // ============================================

  const generateAPACitation = (): string => {
    if (!metadata) return "";

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
    setInput("");
    setMetadata(null);
    setError(null);
    setDetectedType(null);
    setLiveDetection(null);
  };

  // ============================================
  // PART 8: RENDER
  // ============================================

  const badge =
    detectedType || liveDetection
      ? getTypeBadge(detectedType || liveDetection!)
      : null;

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

      {/* Input Field */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://... or 10.1000/xyz or 978-0-123456-78-9"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleExtract()}
            />
          </div>
          <Button onClick={handleExtract} disabled={loading || !input.trim()}>
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

        {/* Live Detection Badge */}
        {badge && !metadata && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Detected:</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}
            >
              {badge.icon}
              {badge.label}
            </span>
          </div>
        )}

        {/* AI Toggle - only show for URL type */}
        {(!liveDetection ||
          liveDetection === "url" ||
          liveDetection === "unknown") &&
          !metadata && (
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
          )}

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p>{error}</p>
              <p className="mt-1 text-xs opacity-75">
                Tip: For academic papers, try entering just the DOI (e.g.,
                10.1038/nature12373)
              </p>
            </div>
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
              {badge && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}
                >
                  {badge.icon}
                  {badge.label}
                </span>
              )}
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
                  {detectedType === "youtube" ? "Channel" : "Author"}
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {metadata.author || "Unknown"}
                </p>
              </div>

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

              {/* Debug Logs (Hidden by default, useful for diagnosis) */}
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
