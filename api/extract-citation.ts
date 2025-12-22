// ============================================
// EXTRACT-CITATION - Smart URL Citation Extractor
// Uses URL pattern recognition for academic sites!
// Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Safe JSON parsing helper
async function safeJsonParse(response: Response): Promise<any | null> {
  try {
    const text = await response.text();
    if (!text || text.trim() === "") {
      console.log("Empty response body");
      return null;
    }
    return JSON.parse(text);
  } catch (e) {
    console.log("JSON parse error:", e);
    return null;
  }
}

// ============================================
// PART 1: URL PATTERN DOI EXTRACTION
// No fetch required - just parse the URL!
// ============================================

interface DOIExtractionResult {
  doi: string | null;
  source: string;
  needsLookup?: boolean;
  lookupId?: string;
  lookupType?: "ieee" | "pii" | "pmid";
}

function extractDOIFromURLPatterns(url: string): DOIExtractionResult {
  const patterns: {
    name: string;
    regex: RegExp;
    handler: (match: RegExpMatchArray) => DOIExtractionResult;
  }[] = [
    // IEEE: /document/{id} - needs lookup
    {
      name: "IEEE",
      regex: /ieeexplore\.ieee\.org\/(?:abstract\/)?document\/(\d+)/i,
      handler: (match) => ({
        doi: null,
        source: "IEEE",
        needsLookup: true,
        lookupId: match[1],
        lookupType: "ieee",
      }),
    },
    // Springer: /article/10.xxxx/xxx or /chapter/10.xxxx/xxx
    {
      name: "Springer",
      regex: /link\.springer\.com\/(?:article|chapter)\/(10\.\d+\/[^?#]+)/i,
      handler: (match) => ({
        doi: decodeURIComponent(match[1]),
        source: "Springer URL",
      }),
    },
    // Nature: /articles/xxx
    {
      name: "Nature",
      regex: /nature\.com\/articles\/([a-z0-9-]+)/i,
      handler: (match) => ({
        doi: `10.1038/${match[1]}`,
        source: "Nature URL",
      }),
    },
    // ACM Digital Library: /doi/10.xxxx/xxx
    {
      name: "ACM",
      regex: /dl\.acm\.org\/doi\/(10\.\d+\/[^?#]+)/i,
      handler: (match) => ({
        doi: decodeURIComponent(match[1]),
        source: "ACM URL",
      }),
    },
    // Wiley Online Library
    {
      name: "Wiley",
      regex: /onlinelibrary\.wiley\.com\/doi\/(10\.\d+\/[^?#]+)/i,
      handler: (match) => ({
        doi: decodeURIComponent(match[1]),
        source: "Wiley URL",
      }),
    },
    // Taylor & Francis
    {
      name: "Taylor & Francis",
      regex: /tandfonline\.com\/doi\/(?:abs|full)\/(10\.\d+\/[^?#]+)/i,
      handler: (match) => ({
        doi: decodeURIComponent(match[1]),
        source: "T&F URL",
      }),
    },
    // SAGE Journals
    {
      name: "SAGE",
      regex: /journals\.sagepub\.com\/doi\/(10\.\d+\/[^?#]+)/i,
      handler: (match) => ({
        doi: decodeURIComponent(match[1]),
        source: "SAGE URL",
      }),
    },
    // ScienceDirect (Elsevier) - pii needs lookup
    {
      name: "ScienceDirect",
      regex: /sciencedirect\.com\/science\/article\/pii\/([A-Z0-9]+)/i,
      handler: (match) => ({
        doi: null,
        source: "ScienceDirect",
        needsLookup: true,
        lookupId: match[1],
        lookupType: "pii",
      }),
    },
    // arXiv - has DOI equivalent
    {
      name: "arXiv",
      regex: /arxiv\.org\/abs\/(\d+\.\d+)/i,
      handler: (match) => ({
        doi: `10.48550/arXiv.${match[1]}`,
        source: "arXiv URL",
      }),
    },
    // PubMed
    {
      name: "PubMed",
      regex: /pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i,
      handler: (match) => ({
        doi: null,
        source: "PubMed",
        needsLookup: true,
        lookupId: match[1],
        lookupType: "pmid",
      }),
    },
    // PLOS
    {
      name: "PLOS",
      regex: /journals\.plos\.org\/\w+\/article\?id=(10\.\d+\/[^&]+)/i,
      handler: (match) => ({
        doi: decodeURIComponent(match[1]),
        source: "PLOS URL",
      }),
    },
    // Frontiers
    {
      name: "Frontiers",
      regex:
        /frontiersin\.org\/(?:articles|journals\/[^/]+\/articles)\/(10\.\d+\/[^?#]+)/i,
      handler: (match) => ({
        doi: decodeURIComponent(match[1]),
        source: "Frontiers URL",
      }),
    },
    // MDPI
    {
      name: "MDPI",
      regex: /mdpi\.com\/(\d+-\d+)\/(\d+)\/(\d+)\/(\d+)/i,
      handler: (match) => ({
        doi: `10.3390/${match[1].toLowerCase()}${match[2]}${match[3].padStart(
          2,
          "0"
        )}${match[4].padStart(4, "0")}`,
        source: "MDPI URL",
      }),
    },
    // Generic DOI in URL
    {
      name: "Generic DOI",
      regex: /doi\.org\/(10\.\d+\/[^?#\s]+)/i,
      handler: (match) => ({
        doi: decodeURIComponent(match[1]),
        source: "DOI URL",
      }),
    },
    // Generic DOI pattern in any URL
    {
      name: "Embedded DOI",
      regex: /[?&/](10\.\d{4,}\/[^\s?&#]+)/i,
      handler: (match) => ({
        doi: decodeURIComponent(match[1]),
        source: "URL embedded",
      }),
    },
  ];

  for (const { regex, handler } of patterns) {
    const match = url.match(regex);
    if (match) {
      return handler(match);
    }
  }

  return { doi: null, source: "none" };
}

// ============================================
// PART 2: IEEE DOCUMENT ID LOOKUP
// Search academic databases for IEEE papers
// ============================================

async function lookupIEEEDocument(documentId: string): Promise<{
  doi: string | null;
  metadata: any | null;
}> {
  console.log(`Looking up IEEE document: ${documentId}`);

  // Method 1: Search CrossRef for IEEE papers with this document ID in DOI
  // IEEE DOIs contain the document ID, e.g., 10.1109/SLAAI-ICAI54477.2021.9664714
  try {
    const crUrl = `https://api.crossref.org/works?query=${documentId}&filter=member:263&rows=5`;
    const response = await fetch(crUrl, {
      headers: {
        "User-Agent": "ResearchMate/1.0 (mailto:support@researchmate.app)",
      },
    });

    if (response.ok) {
      const data = await safeJsonParse(response);
      const works = data?.message?.items || [];

      // Find the work whose DOI contains this document ID
      for (const work of works) {
        if (work.DOI && work.DOI.includes(documentId)) {
          console.log(`✅ Found DOI via CrossRef: ${work.DOI}`);
          const dateParts = work.published?.["date-parts"]?.[0];
          return {
            doi: work.DOI,
            metadata: {
              title: Array.isArray(work.title) ? work.title[0] : work.title,
              authors: work.author?.map((a: any) =>
                `${a.given || ""} ${a.family || ""}`.trim()
              ),
              year: dateParts?.[0]?.toString(),
              venue: work["container-title"]?.[0] || "IEEE",
            },
          };
        }
      }
    }
  } catch (e) {
    console.log("CrossRef IEEE lookup failed:", e);
  }

  // Method 2: Search OpenAlex with document ID
  try {
    const oaUrl = `https://api.openalex.org/works?search=${documentId}&filter=authorships.institutions.country_code:US|authorships.institutions.country_code:CN|authorships.institutions.country_code:GB,primary_location.source.type:journal|primary_location.source.type:conference&per_page=5`;
    const response = await fetch(oaUrl, {
      headers: {
        "User-Agent": "ResearchMate/1.0 (mailto:support@researchmate.app)",
      },
    });

    if (response.ok) {
      const data = await safeJsonParse(response);
      const works = data?.results || [];

      for (const work of works) {
        // Check if DOI contains IEEE prefix and document ID
        if (
          work.doi &&
          work.doi.includes("10.1109") &&
          work.doi.includes(documentId)
        ) {
          const doi = work.doi.replace("https://doi.org/", "");
          console.log(`✅ Found DOI via OpenAlex: ${doi}`);
          return {
            doi,
            metadata: {
              title: work.title,
              authors: work.authorships
                ?.map((a: any) => a.author?.display_name)
                .filter(Boolean),
              year: work.publication_year,
              venue: work.primary_location?.source?.display_name,
            },
          };
        }
      }
    }
  } catch (e) {
    console.log("OpenAlex IEEE lookup failed:", e);
  }

  // Method 3: Direct DOI construction - IEEE DOIs always end with the document ID
  // Try to find any DOI ending with this document ID from CrossRef
  try {
    const searchUrl = `https://api.crossref.org/works?query.bibliographic=${documentId}&filter=prefix:10.1109&rows=3`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "ResearchMate/1.0 (mailto:support@researchmate.app)",
      },
    });

    if (response.ok) {
      const data = await safeJsonParse(response);
      const works = data?.message?.items || [];

      for (const work of works) {
        // IEEE DOIs end with the document ID
        if (work.DOI && work.DOI.endsWith(documentId)) {
          console.log(
            `✅ Found DOI via CrossRef bibliographic search: ${work.DOI}`
          );
          const dateParts = work.published?.["date-parts"]?.[0];
          return {
            doi: work.DOI,
            metadata: {
              title: Array.isArray(work.title) ? work.title[0] : work.title,
              authors: work.author?.map((a: any) =>
                `${a.given || ""} ${a.family || ""}`.trim()
              ),
              year: dateParts?.[0]?.toString(),
              venue: work["container-title"]?.[0] || "IEEE",
            },
          };
        }
      }
    }
  } catch (e) {
    console.log("CrossRef bibliographic search failed:", e);
  }

  console.log(`❌ Could not find DOI for IEEE document ${documentId}`);
  return { doi: null, metadata: null };
}

// ============================================
// PART 3: PUBMED ID LOOKUP
// ============================================

async function lookupPMID(pmid: string): Promise<{
  doi: string | null;
  metadata: any | null;
}> {
  try {
    // PubMed E-utilities API
    const response = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`
    );

    if (response.ok) {
      const data = await safeJsonParse(response);
      const article = data?.result?.[pmid];

      if (article) {
        // Extract DOI from article IDs
        const doiId = article.articleids?.find(
          (id: any) => id.idtype === "doi"
        );

        return {
          doi: doiId?.value || null,
          metadata: {
            title: article.title,
            authors: article.authors?.map((a: any) => a.name),
            year: article.pubdate?.split(" ")?.[0],
            venue: article.fulljournalname || article.source,
          },
        };
      }
    }
  } catch (e) {
    console.log("PubMed lookup failed:", e);
  }

  return { doi: null, metadata: null };
}

// ============================================
// PART 4: DOI VERIFICATION & LOOKUP
// ============================================

async function verifyDOI(doi: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
      {
        method: "HEAD",
        headers: { "User-Agent": "ResearchMate/1.0" },
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

async function lookupDOI(doi: string): Promise<any | null> {
  // Try Semantic Scholar first (better for CS/IEEE papers)
  try {
    const response = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(
        doi
      )}?fields=title,authors,year,venue,publicationDate,abstract`,
      { headers: { "User-Agent": "ResearchMate/1.0" } }
    );

    if (response.ok) {
      const paper = await safeJsonParse(response);
      if (paper && paper.title && paper.authors?.length > 0) {
        console.log("✅ Found in Semantic Scholar");
        return {
          title: paper.title,
          author: paper.authors.map((a: any) => a.name).join(", "),
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
    const response = await fetch(
      `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`,
      { headers: { "User-Agent": "ResearchMate/1.0" } }
    );

    if (response.ok) {
      const work = await safeJsonParse(response);
      if (work && work.title) {
        console.log("✅ Found in OpenAlex");
        return {
          title: work.title,
          author: work.authorships
            ?.map((a: any) => a.author?.display_name)
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
    const response = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
      { headers: { "User-Agent": "ResearchMate/1.0" } }
    );

    if (response.ok) {
      const data = await safeJsonParse(response);
      const work = data?.message;
      if (work && work.title) {
        console.log("✅ Found in CrossRef");
        const year = work.published?.["date-parts"]?.[0]?.[0];
        return {
          title: Array.isArray(work.title) ? work.title[0] : work.title,
          author: work.author
            ?.map((a: any) => `${a.given || ""} ${a.family || ""}`.trim())
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
// PART 5: HTML METADATA EXTRACTION (Fallback)
// ============================================

function extractMetadataFromHTML(html: string, url: string) {
  const metadata = {
    title: "",
    author: "",
    publishDate: "",
    siteName: "",
    description: "",
    url: url,
  };

  // Title extraction
  const titlePatterns = [
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i,
    /<meta[^>]*name=["']citation_title["'][^>]*content=["']([^"']+)["']/i,
    /<title[^>]*>([^<]+)<\/title>/i,
  ];

  for (const pattern of titlePatterns) {
    const match = html.match(pattern);
    if (match && match[1].trim()) {
      metadata.title = match[1].trim();
      break;
    }
  }

  // Author extraction
  const authorPatterns = [
    /<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*name=["']citation_author["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*property=["']article:author["'][^>]*content=["']([^"']+)["']/i,
  ];

  for (const pattern of authorPatterns) {
    const match = html.match(pattern);
    if (match && match[1].trim()) {
      metadata.author = match[1].trim();
      break;
    }
  }

  // Multiple citation_author tags
  if (!metadata.author) {
    const multiAuthorMatches = html.matchAll(
      /<meta[^>]*name=["']citation_author["'][^>]*content=["']([^"']+)["']/gi
    );
    const authors = Array.from(multiAuthorMatches, (m) => m[1].trim());
    if (authors.length > 0) {
      metadata.author = authors.join(", ");
    }
  }

  // Site name
  const siteMatch = html.match(
    /<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i
  );
  if (siteMatch) metadata.siteName = siteMatch[1].trim();

  // Publish date
  const datePatterns = [
    /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*name=["']citation_publication_date["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*name=["']date["'][^>]*content=["']([^"']+)["']/i,
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
      metadata.siteName = new URL(url).hostname.replace("www.", "");
    } catch {}
  }

  return metadata;
}

// ============================================
// PART 6: AI ENHANCEMENT
// ============================================

async function enhanceWithAI(metadata: any, url: string): Promise<any> {
  if (!GEMINI_API_KEY) return metadata;
  if (
    metadata.author &&
    metadata.author !== "Unknown Author" &&
    metadata.publishDate
  ) {
    return metadata;
  }

  const prompt = `Analyze this webpage metadata and provide your best guess for missing citation info.

URL: ${url}
Current Title: ${metadata.title}
Current Author: ${metadata.author || "Unknown"}
Current Site: ${metadata.siteName}

Provide:
1. Author name (if organization, use that)
2. Likely publish date (YYYY-MM-DD or "n.d.")

Respond ONLY with JSON, no other text:
{"author": "Name", "publishDate": "YYYY-MM-DD"}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 100 },
      }),
    });

    if (response.ok) {
      const data = await safeJsonParse(response);
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        if (result.author && result.author !== "Unknown" && !metadata.author) {
          metadata.author = result.author;
        }
        if (
          result.publishDate &&
          result.publishDate !== "n.d." &&
          !metadata.publishDate
        ) {
          metadata.publishDate = result.publishDate;
        }
      }
    }
  } catch (e) {
    console.log("AI enhancement failed:", e);
  }

  return metadata;
}

// ============================================
// PART 7: MAIN HANDLER
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
    console.log(`\n========================================`);
    console.log(`Processing URL: ${urlString}`);

    // STEP 1: Try to extract DOI from URL pattern
    const extraction = extractDOIFromURLPatterns(urlString);
    console.log(`URL pattern extraction: ${JSON.stringify(extraction)}`);

    let doi: string | null = extraction.doi;
    let preloadedMetadata: any = null;

    // STEP 2: Handle special lookups (IEEE, PubMed, etc.)
    if (extraction.needsLookup) {
      console.log(
        `Performing ${extraction.lookupType} lookup for: ${extraction.lookupId}`
      );

      if (extraction.lookupType === "ieee") {
        const result = await lookupIEEEDocument(extraction.lookupId!);
        doi = result.doi;
        preloadedMetadata = result.metadata;
      } else if (extraction.lookupType === "pmid") {
        const result = await lookupPMID(extraction.lookupId!);
        doi = result.doi;
        preloadedMetadata = result.metadata;
      }
    }

    // STEP 3: If we have a DOI, look up full metadata from academic APIs
    if (doi) {
      console.log(`Looking up DOI: ${doi}`);
      const academicData = await lookupDOI(doi);

      if (academicData && academicData.author) {
        console.log(`✅ SUCCESS: Found full citation data`);
        return res.status(200).json({
          success: true,
          metadata: {
            ...academicData,
            url: urlString,
            accessDate: new Date().toISOString(),
          },
          source: "academic_database",
          doi: doi,
          message: `Found via ${extraction.source} + academic database lookup`,
        });
      }
    }

    // STEP 4: If we have preloaded metadata from lookup, use that
    if (preloadedMetadata && preloadedMetadata.authors?.length > 0) {
      console.log(
        `Using preloaded metadata from ${extraction.lookupType} lookup`
      );
      return res.status(200).json({
        success: true,
        metadata: {
          title: preloadedMetadata.title,
          author: preloadedMetadata.authors.join(", "),
          publishDate: preloadedMetadata.year
            ? `${preloadedMetadata.year}-01-01`
            : "",
          siteName: preloadedMetadata.venue || extraction.source,
          description: "",
          url: urlString,
          accessDate: new Date().toISOString(),
        },
        source: extraction.lookupType,
        doi: doi,
        message: `Found via ${extraction.lookupType} database search`,
      });
    }

    // STEP 5: Fallback to HTML scraping (for non-academic or unblocked sites)
    console.log("Falling back to HTML metadata extraction...");
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
      } else {
        console.log(`Fetch failed with status: ${response.status}`);
      }
    } catch (e) {
      console.log("Failed to fetch page:", e);
    }

    if (!html) {
      // Can't fetch the page - return partial data if we have any
      if (preloadedMetadata) {
        return res.status(200).json({
          success: true,
          metadata: {
            title: preloadedMetadata.title || "Unknown Title",
            author: preloadedMetadata.authors?.join(", ") || "Unknown Author",
            publishDate: preloadedMetadata.year
              ? `${preloadedMetadata.year}-01-01`
              : "",
            siteName: preloadedMetadata.venue || extraction.source,
            url: urlString,
            accessDate: new Date().toISOString(),
          },
          source: "partial_lookup",
          warning: "Could not fetch full page data",
        });
      }

      return res.status(400).json({
        error:
          "Could not fetch URL. The site may be blocking automated requests.",
        suggestion:
          "Try entering the DOI directly (e.g., 10.1109/xxx.2021.xxx)",
      });
    }

    // STEP 6: Extract metadata from HTML
    let metadata = extractMetadataFromHTML(html, urlString);

    // STEP 7: AI enhancement if requested
    if (useAI && (!metadata.author || !metadata.publishDate)) {
      metadata = await enhanceWithAI(metadata, urlString);
    }

    // Clean up title
    metadata.title = metadata.title.replace(/\s*[-|–—]\s*[^-|–—]+$/, "").trim();

    return res.status(200).json({
      success: true,
      metadata: {
        ...metadata,
        accessDate: new Date().toISOString(),
      },
      source: "html_metadata",
      message: useAI
        ? "Extracted with AI enhancement"
        : "Extracted from page metadata",
    });
  } catch (error) {
    console.error("Extract citation error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
