// ============================================
// CITE-DOI - Academic Paper Citation via CrossRef API
// Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";

// ============================================
// PART 1: TYPE DEFINITIONS
// ============================================

interface Author {
  firstName: string;
  lastName: string;
  fullName: string;
}

interface PaperData {
  title: string;
  authors: Author[];
  journal: string;
  publisher: string;
  publishYear: string;
  publishMonth: string;
  publishDay: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
  url: string;
  abstract: string;
  type: string;
}

// ============================================
// PART 2: HELPER FUNCTIONS
// ============================================

function cleanDOI(doi: string): string {
  return doi
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .trim();
}

function isValidDOI(doi: string): boolean {
  return /^10\.\d{4,}\/\S+$/.test(doi);
}

function parseAuthors(authors: any[]): Author[] {
  if (!authors || !Array.isArray(authors)) return [];

  return authors.map((author) => ({
    firstName: author.given || "",
    lastName: author.family || "",
    fullName:
      author.given && author.family
        ? `${author.given} ${author.family}`
        : author.name || "Unknown Author",
  }));
}

function getDateParts(published: any): {
  year: string;
  month: string;
  day: string;
} {
  const defaultDate = { year: "n.d.", month: "", day: "" };

  if (!published || !published["date-parts"] || !published["date-parts"][0]) {
    return defaultDate;
  }

  const parts = published["date-parts"][0];
  return {
    year: parts[0]?.toString() || "n.d.",
    month: parts[1]?.toString().padStart(2, "0") || "",
    day: parts[2]?.toString().padStart(2, "0") || "",
  };
}

// ============================================
// PART 3: CROSSREF API
// ============================================

async function lookupDOI(doi: string): Promise<PaperData | null> {
  try {
    const response = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
      {
        headers: {
          "User-Agent": "ResearchMate/1.0 (mailto:support@researchmate.app)",
        },
      }
    );

    if (!response.ok) {
      console.error(`CrossRef API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const work = data.message;

    if (!work) return null;

    const dateParts = getDateParts(
      work.published || work["published-print"] || work["published-online"]
    );

    return {
      title: Array.isArray(work.title)
        ? work.title[0]
        : work.title || "Unknown Title",
      authors: parseAuthors(work.author),
      journal: Array.isArray(work["container-title"])
        ? work["container-title"][0]
        : work["container-title"] || "",
      publisher: work.publisher || "",
      publishYear: dateParts.year,
      publishMonth: dateParts.month,
      publishDay: dateParts.day,
      volume: work.volume || "",
      issue: work.issue || "",
      pages: work.page || "",
      doi: work.DOI || doi,
      url: work.URL || `https://doi.org/${doi}`,
      abstract: work.abstract || "",
      type: work.type || "article",
    };
  } catch (error) {
    console.error("CrossRef lookup failed:", error);
    return null;
  }
}

// ============================================
// PART 4: DATACITE FALLBACK
// ============================================

async function dataCiteLookup(doi: string): Promise<PaperData | null> {
  try {
    const response = await fetch(
      `https://api.datacite.org/dois/${encodeURIComponent(doi)}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    const attributes = data.data?.attributes;

    if (!attributes) return null;

    const creators = attributes.creators || [];
    const authors: Author[] = creators.map((c: any) => ({
      firstName: c.givenName || "",
      lastName: c.familyName || "",
      fullName: c.name || `${c.givenName || ""} ${c.familyName || ""}`.trim(),
    }));

    return {
      title: Array.isArray(attributes.titles)
        ? attributes.titles[0]?.title
        : attributes.titles || "Unknown Title",
      authors,
      journal: attributes.container?.title || "",
      publisher: attributes.publisher || "",
      publishYear: attributes.publicationYear?.toString() || "n.d.",
      publishMonth: "",
      publishDay: "",
      volume: "",
      issue: "",
      pages: "",
      doi: attributes.doi || doi,
      url: `https://doi.org/${doi}`,
      abstract: attributes.descriptions?.[0]?.description || "",
      type: attributes.types?.resourceTypeGeneral || "dataset",
    };
  } catch (error) {
    console.error("DataCite lookup failed:", error);
    return null;
  }
}

// ============================================
// PART 5: MAIN HANDLER
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
    const { doi } = req.body;

    if (!doi || !doi.trim()) {
      return res.status(400).json({ error: "DOI is required" });
    }

    const cleanedDOI = cleanDOI(doi.trim());

    if (!isValidDOI(cleanedDOI)) {
      return res.status(400).json({
        error:
          "Invalid DOI format. DOI should start with '10.' (e.g., 10.1038/nature12373)",
      });
    }

    // Try CrossRef first
    let paperData = await lookupDOI(cleanedDOI);

    // Fallback to DataCite
    if (!paperData) {
      console.log("CrossRef failed, trying DataCite...");
      paperData = await dataCiteLookup(cleanedDOI);
    }

    if (!paperData) {
      return res.status(404).json({
        error: "DOI not found. Please check the DOI and try again.",
        doi: cleanedDOI,
      });
    }

    return res.status(200).json({
      success: true,
      type: "academic",
      data: paperData,
    });
  } catch (error) {
    console.error("DOI citation error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
