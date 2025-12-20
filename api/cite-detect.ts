// ============================================
// CITE-DETECT - Smart Citation Type Detection
// Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";

// ============================================
// PART 1: TYPE DEFINITIONS
// ============================================

type CitationType = "isbn" | "doi" | "youtube" | "pmid" | "url" | "unknown";

interface DetectionResult {
  type: CitationType;
  value: string;
  confidence: "high" | "medium" | "low";
  suggestion?: string;
}

// ============================================
// PART 2: DETECTION FUNCTIONS
// ============================================

function detectISBN(input: string): { isISBN: boolean; cleaned: string } {
  const cleaned = input.replace(/[-\s]/g, "");
  const isISBN10 = /^\d{9}[\dXx]$/.test(cleaned);
  const isISBN13 = /^97[89]\d{10}$/.test(cleaned);

  return {
    isISBN: isISBN10 || isISBN13,
    cleaned,
  };
}

function detectDOI(input: string): { isDOI: boolean; cleaned: string } {
  let cleaned = input
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .trim();

  const isDOI = /^10\.\d{4,}\/\S+$/.test(cleaned);

  return { isDOI, cleaned };
}

function detectYouTube(input: string): {
  isYouTube: boolean;
  videoId: string | null;
} {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return { isYouTube: true, videoId: match[1] };
    }
  }

  return { isYouTube: false, videoId: null };
}

function detectPMID(input: string): { isPMID: boolean; cleaned: string } {
  const cleaned = input
    .replace(/^pmid:\s*/i, "")
    .replace(/^https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\//i, "")
    .replace(/\/$/, "")
    .trim();

  const isPMID = /^\d{7,8}$/.test(cleaned);

  return { isPMID, cleaned };
}

function detectURL(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch {
    try {
      new URL(`https://${input}`);
      return input.includes(".");
    } catch {
      return false;
    }
  }
}

// ============================================
// PART 3: MAIN DETECTION LOGIC
// ============================================

function detectCitationType(input: string): DetectionResult {
  const trimmed = input.trim();

  // Check ISBN first
  const isbnCheck = detectISBN(trimmed);
  if (isbnCheck.isISBN) {
    return {
      type: "isbn",
      value: isbnCheck.cleaned,
      confidence: "high",
    };
  }

  // Check DOI
  const doiCheck = detectDOI(trimmed);
  if (doiCheck.isDOI) {
    return {
      type: "doi",
      value: doiCheck.cleaned,
      confidence: "high",
    };
  }

  // Check YouTube
  const ytCheck = detectYouTube(trimmed);
  if (ytCheck.isYouTube && ytCheck.videoId) {
    return {
      type: "youtube",
      value: ytCheck.videoId,
      confidence: "high",
    };
  }

  // Check PMID
  const pmidCheck = detectPMID(trimmed);
  if (pmidCheck.isPMID) {
    return {
      type: "pmid",
      value: pmidCheck.cleaned,
      confidence: "medium",
      suggestion:
        "Detected as PubMed ID. If this is incorrect, please specify the type.",
    };
  }

  // Check if it's a URL
  if (detectURL(trimmed)) {
    return {
      type: "url",
      value: trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
      confidence: "high",
    };
  }

  // Check if it might be a partial ISBN
  if (/^\d{10,13}$/.test(trimmed.replace(/[-\s]/g, ""))) {
    return {
      type: "isbn",
      value: trimmed.replace(/[-\s]/g, ""),
      confidence: "medium",
      suggestion: "This looks like an ISBN. If not, please specify the type.",
    };
  }

  return {
    type: "unknown",
    value: trimmed,
    confidence: "low",
    suggestion:
      "Could not detect citation type. Please specify if this is an ISBN, DOI, YouTube URL, or website URL.",
  };
}

// ============================================
// PART 4: MAIN HANDLER
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
    const { input } = req.body;

    if (!input || !input.trim()) {
      return res.status(400).json({ error: "Input is required" });
    }

    const result = detectCitationType(input.trim());

    return res.status(200).json({
      success: true,
      detection: result,
      endpoints: {
        isbn: "/api/cite-isbn",
        doi: "/api/cite-doi",
        youtube: "/api/cite-youtube",
        url: "/api/extract-citation",
        pmid: "/api/cite-pmid",
      },
    });
  } catch (error) {
    console.error("Detection error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
