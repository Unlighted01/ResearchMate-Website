// ============================================
// EXTRACT-CITATION - Smart URL Citation Extractor
// Now tries DOI lookup for academic sites!
// Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// ============================================
// PART 1: ACADEMIC SITE DETECTION
// ============================================

const ACADEMIC_DOMAINS = [
  "ieee.org",
  "ieeexplore.ieee.org",
  "acm.org",
  "dl.acm.org",
  "springer.com",
  "link.springer.com",
  "sciencedirect.com",
  "nature.com",
  "science.org",
  "wiley.com",
  "onlinelibrary.wiley.com",
  "tandfonline.com",
  "sagepub.com",
  "arxiv.org",
  "researchgate.net",
  "ncbi.nlm.nih.gov",
  "pubmed.ncbi.nlm.nih.gov",
  "jstor.org",
  "mdpi.com",
  "frontiersin.org",
  "plos.org",
  "biomedcentral.com",
  "elsevier.com",
];

function isAcademicSite(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return ACADEMIC_DOMAINS.some((domain) => hostname.includes(domain));
  } catch {
    return false;
  }
}

// ============================================
// PART 2: DOI EXTRACTION FROM URL/PAGE
// ============================================

function extractDOIFromURL(url: string): string | null {
  // Pattern 1: DOI in URL path (e.g., /doi/10.1000/xyz)
  const doiPathMatch = url.match(/\/doi\/(10\.\d{4,}\/[^\s?#]+)/i);
  if (doiPathMatch) return doiPathMatch[1];

  // Pattern 2: DOI as query parameter
  const doiParamMatch = url.match(/[?&]doi=(10\.\d{4,}\/[^\s&#]+)/i);
  if (doiParamMatch) return doiParamMatch[1];

  // Pattern 3: doi.org URL
  const doiOrgMatch = url.match(/doi\.org\/(10\.\d{4,}\/[^\s?#]+)/i);
  if (doiOrgMatch) return doiOrgMatch[1];

  return null;
}

function extractDOIFromHTML(html: string): string | null {
  // Pattern 1: meta tag with DOI
  const metaDOIMatch = html.match(
    /<meta[^>]*name=["'](?:citation_doi|DC\.identifier|doi)["'][^>]*content=["']([^"']+)["']/i
  );
  if (metaDOIMatch) {
    const doi = metaDOIMatch[1].replace(/^https?:\/\/doi\.org\//i, "");
    if (doi.startsWith("10.")) return doi;
  }

  // Pattern 2: Reverse order meta tag
  const metaDOIMatch2 = html.match(
    /<meta[^>]*content=["']([^"']*10\.\d{4,}\/[^"']+)["'][^>]*name=["'](?:citation_doi|DC\.identifier|doi)["']/i
  );
  if (metaDOIMatch2) {
    const doi = metaDOIMatch2[1].replace(/^https?:\/\/doi\.org\//i, "");
    return doi;
  }

  // Pattern 3: data-doi attribute
  const dataDOIMatch = html.match(/data-doi=["']([^"']+)["']/i);
  if (dataDOIMatch && dataDOIMatch[1].startsWith("10.")) {
    return dataDOIMatch[1];
  }

  // Pattern 4: DOI link in page
  const doiLinkMatch = html.match(
    /href=["']https?:\/\/doi\.org\/(10\.\d{4,}\/[^"']+)["']/i
  );
  if (doiLinkMatch) return doiLinkMatch[1];

  // Pattern 5: Plain text DOI
  const plainDOIMatch = html.match(/\bDOI:\s*(10\.\d{4,}\/[^\s<"']+)/i);
  if (plainDOIMatch) return plainDOIMatch[1];

  return null;
}

// ============================================
// PART 3: ACADEMIC PAPER LOOKUP
// ============================================

async function lookupDOI(doi: string): Promise<any | null> {
  // Try Semantic Scholar first (better for IEEE/CS papers)
  try {
    const ssResponse = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(
        doi
      )}?fields=title,authors,year,venue,publicationDate,abstract`,
      { headers: { "User-Agent": "ResearchMate/1.0" } }
    );

    if (ssResponse.ok) {
      const paper = await ssResponse.json();
      if (paper && paper.title) {
        console.log("✅ Found in Semantic Scholar");
        return {
          title: paper.title,
          author: (paper.authors || []).map((a: any) => a.name).join(", "),
          publishDate:
            paper.publicationDate || (paper.year ? `${paper.year}-01-01` : ""),
          siteName: paper.venue || "Academic Publication",
          description: paper.abstract || "",
          doi: doi,
        };
      }
    }
  } catch (e) {
    console.log("Semantic Scholar failed:", e);
  }

  // Try OpenAlex
  try {
    const oaResponse = await fetch(
      `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`,
      { headers: { "User-Agent": "ResearchMate/1.0" } }
    );

    if (oaResponse.ok) {
      const work = await oaResponse.json();
      if (work && work.title) {
        console.log("✅ Found in OpenAlex");
        return {
          title: work.title,
          author: (work.authorships || [])
            .map((a: any) => a.author?.display_name)
            .filter(Boolean)
            .join(", "),
          publishDate: work.publication_date || "",
          siteName:
            work.primary_location?.source?.display_name ||
            "Academic Publication",
          description: "",
          doi: doi,
        };
      }
    }
  } catch (e) {
    console.log("OpenAlex failed:", e);
  }

  // Try CrossRef
  try {
    const crResponse = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
      { headers: { "User-Agent": "ResearchMate/1.0" } }
    );

    if (crResponse.ok) {
      const data = await crResponse.json();
      const work = data.message;
      if (work && work.title) {
        console.log("✅ Found in CrossRef");
        const year = work.published?.["date-parts"]?.[0]?.[0];
        return {
          title: Array.isArray(work.title) ? work.title[0] : work.title,
          author: (work.author || [])
            .map((a: any) => `${a.given || ""} ${a.family || ""}`.trim())
            .join(", "),
          publishDate: year ? `${year}-01-01` : "",
          siteName:
            work["container-title"]?.[0] ||
            work.publisher ||
            "Academic Publication",
          description: work.abstract || "",
          doi: doi,
        };
      }
    }
  } catch (e) {
    console.log("CrossRef failed:", e);
  }

  return null;
}

// ============================================
// PART 4: METADATA EXTRACTION FROM HTML
// ============================================

function extractMetadata(html: string, url: string) {
  const metadata = {
    title: "",
    author: "",
    publishDate: "",
    siteName: "",
    description: "",
    url: url,
  };

  // Title extraction (in order of preference)
  const ogTitleMatch =
    html.match(
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
    ) ||
    html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i
    );
  if (ogTitleMatch) metadata.title = ogTitleMatch[1].trim();

  if (!metadata.title) {
    const citationTitleMatch = html.match(
      /<meta[^>]*name=["']citation_title["'][^>]*content=["']([^"']+)["']/i
    );
    if (citationTitleMatch) metadata.title = citationTitleMatch[1].trim();
  }

  if (!metadata.title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) metadata.title = titleMatch[1].trim();
  }

  // Site name
  const ogSiteNameMatch = html.match(
    /<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i
  );
  if (ogSiteNameMatch) metadata.siteName = ogSiteNameMatch[1].trim();

  // Author extraction (multiple patterns)
  const authorPatterns = [
    /<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*name=["']citation_author["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*property=["']article:author["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*name=["']DC\.creator["'][^>]*content=["']([^"']+)["']/i,
  ];

  for (const pattern of authorPatterns) {
    const match = html.match(pattern);
    if (match && match[1].trim()) {
      metadata.author = match[1].trim();
      break;
    }
  }

  // Multiple authors (citation_author can appear multiple times)
  if (!metadata.author) {
    const multiAuthorMatches = html.matchAll(
      /<meta[^>]*name=["']citation_author["'][^>]*content=["']([^"']+)["']/gi
    );
    const authors = Array.from(multiAuthorMatches, (m) => m[1].trim());
    if (authors.length > 0) {
      metadata.author = authors.join(", ");
    }
  }

  // Publish date
  const datePatterns = [
    /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*name=["']citation_publication_date["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*name=["']date["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*name=["']DC\.date["'][^>]*content=["']([^"']+)["']/i,
  ];

  for (const pattern of datePatterns) {
    const match = html.match(pattern);
    if (match && match[1].trim()) {
      metadata.publishDate = match[1].trim();
      break;
    }
  }

  // Description
  const descMatch = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
  );
  if (descMatch) metadata.description = descMatch[1].trim();

  // Extract site name from URL if not found
  if (!metadata.siteName) {
    try {
      const urlObj = new URL(url);
      metadata.siteName = urlObj.hostname.replace("www.", "");
    } catch {}
  }

  return metadata;
}

// ============================================
// PART 5: AI ENHANCEMENT
// ============================================

async function enhanceWithAI(metadata: any, url: string): Promise<any> {
  if (!GEMINI_API_KEY) return metadata;
  if (metadata.author && metadata.publishDate) return metadata;

  const prompt = `Analyze this webpage metadata and provide your best guess for missing citation info.

URL: ${url}
Current Title: ${metadata.title}
Current Author: ${metadata.author || "Unknown"}
Current Site: ${metadata.siteName}
Description: ${metadata.description}

Based on common patterns for this website, provide:
1. Author name (if it's a news site, organization, or can be inferred)
2. Likely publish date (if not found, estimate based on content or say "n.d.")

Respond in this exact JSON format only, no other text:
{"author": "Author Name or Organization", "publishDate": "YYYY-MM-DD or n.d.", "improvedTitle": "Cleaned up title if needed"}`;

  try {
    const aiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
      }),
    });

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiResult = JSON.parse(jsonMatch[0]);
        if (
          aiResult.author &&
          aiResult.author !== "Unknown" &&
          !metadata.author
        ) {
          metadata.author = aiResult.author;
        }
        if (
          aiResult.publishDate &&
          aiResult.publishDate !== "n.d." &&
          !metadata.publishDate
        ) {
          metadata.publishDate = aiResult.publishDate;
        }
        if (aiResult.improvedTitle && !metadata.title) {
          metadata.title = aiResult.improvedTitle;
        }
      }
    }
  } catch (aiError) {
    console.error("AI enhancement failed:", aiError);
  }

  return metadata;
}

// ============================================
// PART 6: MAIN HANDLER
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
    const { url, useAI } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Validate URL
    let validUrl: URL;
    try {
      validUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    const urlString = validUrl.toString();
    console.log(`Processing URL: ${urlString}`);

    // Check if it's an academic site
    const isAcademic = isAcademicSite(urlString);
    console.log(`Is academic site: ${isAcademic}`);

    // First, try to extract DOI from URL directly
    let doi = extractDOIFromURL(urlString);

    // Fetch the webpage
    let html = "";
    try {
      const response = await fetch(urlString, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (response.ok) {
        html = await response.text();

        // Try to extract DOI from HTML if not found in URL
        if (!doi) {
          doi = extractDOIFromHTML(html);
        }
      }
    } catch (fetchError) {
      console.log("Failed to fetch page:", fetchError);
    }

    // If we found a DOI (from URL or page), try academic database lookup
    if (doi) {
      console.log(`Found DOI: ${doi}`);
      const academicData = await lookupDOI(doi);

      if (academicData && academicData.author) {
        console.log("✅ Using academic database data");
        return res.status(200).json({
          success: true,
          metadata: {
            ...academicData,
            url: urlString,
            accessDate: new Date().toISOString(),
          },
          source: "academic_database",
          doi: doi,
          message: "Extracted from academic database using DOI",
        });
      }
    }

    // Fallback to HTML metadata extraction
    if (!html) {
      return res.status(400).json({
        error: `Failed to fetch URL. The site may be blocking automated requests.`,
        suggestion: isAcademic
          ? "Try entering the DOI directly (e.g., 10.1109/xxx.2021.xxx)"
          : undefined,
      });
    }

    let metadata = extractMetadata(html, urlString);

    // AI enhancement if requested
    if (
      useAI &&
      GEMINI_API_KEY &&
      (!metadata.author || !metadata.publishDate)
    ) {
      metadata = await enhanceWithAI(metadata, urlString);
    }

    // Clean up title
    metadata.title = metadata.title.replace(/\s*[-|–—]\s*[^-|–—]+$/, "").trim();
    const accessDate = new Date().toISOString();

    return res.status(200).json({
      success: true,
      metadata: { ...metadata, accessDate },
      source: "html_metadata",
      message: useAI
        ? "Extracted with AI enhancement"
        : "Extracted from page metadata",
      suggestion:
        isAcademic && !metadata.author
          ? "For better results with academic papers, try entering the DOI directly"
          : undefined,
    });
  } catch (error) {
    console.error("Extract citation error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
