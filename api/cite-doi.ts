// ============================================
// CITE-DOI - Academic Paper Citation
// With Semantic Scholar + OpenAlex Fallbacks
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
  venue: string;
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
// PART 3: CROSSREF API (Primary)
// ============================================

async function lookupCrossRef(doi: string): Promise<PaperData | null> {
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
      console.log(`CrossRef: ${response.status} for ${doi}`);
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
      venue: work["container-title"]?.[0] || "",
    };
  } catch (error) {
    console.error("CrossRef lookup failed:", error);
    return null;
  }
}

// ============================================
// PART 4: SEMANTIC SCHOLAR API (Fallback 1)
// Best for CS, AI, ML papers
// ============================================

async function lookupSemanticScholar(doi: string): Promise<PaperData | null> {
  try {
    const response = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(
        doi
      )}?fields=title,authors,year,venue,publicationDate,abstract,externalIds,publicationVenue`,
      {
        headers: {
          "User-Agent": "ResearchMate/1.0",
        },
      }
    );

    if (!response.ok) {
      console.log(`Semantic Scholar: ${response.status} for ${doi}`);
      return null;
    }

    const paper = await response.json();

    if (!paper || !paper.title) return null;

    // Parse authors from Semantic Scholar format
    const authors: Author[] = (paper.authors || []).map((a: any) => {
      const nameParts = (a.name || "").split(" ");
      const lastName = nameParts.pop() || "";
      const firstName = nameParts.join(" ");
      return {
        firstName,
        lastName,
        fullName: a.name || "Unknown Author",
      };
    });

    // Parse publication date
    let publishYear = paper.year?.toString() || "n.d.";
    let publishMonth = "";
    let publishDay = "";

    if (paper.publicationDate) {
      const dateParts = paper.publicationDate.split("-");
      publishYear = dateParts[0] || publishYear;
      publishMonth = dateParts[1] || "";
      publishDay = dateParts[2] || "";
    }

    return {
      title: paper.title,
      authors,
      journal: paper.venue || paper.publicationVenue?.name || "",
      publisher: paper.publicationVenue?.publisher || "",
      publishYear,
      publishMonth,
      publishDay,
      volume: "",
      issue: "",
      pages: "",
      doi: paper.externalIds?.DOI || doi,
      url: `https://doi.org/${doi}`,
      abstract: paper.abstract || "",
      type: "article",
      venue: paper.venue || "",
    };
  } catch (error) {
    console.error("Semantic Scholar lookup failed:", error);
    return null;
  }
}

// ============================================
// PART 5: OPENALEX API (Fallback 2)
// Comprehensive coverage
// ============================================

async function lookupOpenAlex(doi: string): Promise<PaperData | null> {
  try {
    const response = await fetch(
      `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`,
      {
        headers: {
          "User-Agent": "ResearchMate/1.0 (mailto:support@researchmate.app)",
        },
      }
    );

    if (!response.ok) {
      console.log(`OpenAlex: ${response.status} for ${doi}`);
      return null;
    }

    const work = await response.json();

    if (!work || !work.title) return null;

    // Parse authors from OpenAlex format
    const authors: Author[] = (work.authorships || []).map((a: any) => {
      const displayName = a.author?.display_name || "";
      const nameParts = displayName.split(" ");
      const lastName = nameParts.pop() || "";
      const firstName = nameParts.join(" ");
      return {
        firstName,
        lastName,
        fullName: displayName || "Unknown Author",
      };
    });

    // Parse publication date
    const pubDate = work.publication_date || "";
    const dateParts = pubDate.split("-");

    return {
      title: work.title,
      authors,
      journal: work.primary_location?.source?.display_name || "",
      publisher: work.primary_location?.source?.host_organization_name || "",
      publishYear: dateParts[0] || work.publication_year?.toString() || "n.d.",
      publishMonth: dateParts[1] || "",
      publishDay: dateParts[2] || "",
      volume: work.biblio?.volume || "",
      issue: work.biblio?.issue || "",
      pages:
        work.biblio?.first_page && work.biblio?.last_page
          ? `${work.biblio.first_page}-${work.biblio.last_page}`
          : work.biblio?.first_page || "",
      doi: work.doi?.replace("https://doi.org/", "") || doi,
      url: work.doi || `https://doi.org/${doi}`,
      abstract: "",
      type: work.type || "article",
      venue: work.primary_location?.source?.display_name || "",
    };
  } catch (error) {
    console.error("OpenAlex lookup failed:", error);
    return null;
  }
}

// ============================================
// PART 6: DATACITE API (Fallback 3)
// For datasets and some papers
// ============================================

async function lookupDataCite(doi: string): Promise<PaperData | null> {
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
      venue: "",
    };
  } catch (error) {
    console.error("DataCite lookup failed:", error);
    return null;
  }
}

// ============================================
// PART 7: MAIN HANDLER WITH FALLBACK CHAIN
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

    console.log(`Looking up DOI: ${cleanedDOI}`);

    // Try each API in order until one succeeds
    let paperData: PaperData | null = null;
    let source = "";

    // 1. Try CrossRef first (most comprehensive metadata)
    paperData = await lookupCrossRef(cleanedDOI);
    if (paperData && paperData.authors.length > 0) {
      source = "CrossRef";
      console.log("✅ Found in CrossRef");
    }

    // 2. Try Semantic Scholar (great for CS/AI papers)
    if (!paperData || paperData.authors.length === 0) {
      console.log("Trying Semantic Scholar...");
      const ssData = await lookupSemanticScholar(cleanedDOI);
      if (ssData && ssData.authors.length > 0) {
        paperData = ssData;
        source = "Semantic Scholar";
        console.log("✅ Found in Semantic Scholar");
      }
    }

    // 3. Try OpenAlex (very comprehensive)
    if (!paperData || paperData.authors.length === 0) {
      console.log("Trying OpenAlex...");
      const oaData = await lookupOpenAlex(cleanedDOI);
      if (oaData && oaData.authors.length > 0) {
        paperData = oaData;
        source = "OpenAlex";
        console.log("✅ Found in OpenAlex");
      }
    }

    // 4. Try DataCite (for datasets and some papers)
    if (!paperData || paperData.authors.length === 0) {
      console.log("Trying DataCite...");
      const dcData = await lookupDataCite(cleanedDOI);
      if (dcData && dcData.authors.length > 0) {
        paperData = dcData;
        source = "DataCite";
        console.log("✅ Found in DataCite");
      }
    }

    if (!paperData) {
      return res.status(404).json({
        error:
          "DOI not found in any academic database. The paper may be too new or not indexed.",
        doi: cleanedDOI,
        triedSources: ["CrossRef", "Semantic Scholar", "OpenAlex", "DataCite"],
      });
    }

    return res.status(200).json({
      success: true,
      type: "academic",
      data: paperData,
      source,
    });
  } catch (error) {
    console.error("DOI citation error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
