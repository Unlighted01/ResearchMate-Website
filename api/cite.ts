// ============================================
// CITE - Unified Academic, Book, Video & Web Citation
// Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, deductCredit, refundCredit, setCorsHeaders } from "./_utils/auth.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

async function safeJsonParse(response: Response): Promise<any | null> {
  try {
    const text = await response.text();
    if (!text || text.trim() === "") return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// --- SHARED HELPER FUNCTIONS ---
function extractYear(publishDate: string): string {
  if (!publishDate) return "n.d.";
  const yearMatch = publishDate.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? yearMatch[0] : publishDate;
}

// ============================================
// PART 1: ISBN LOOKUP
// ============================================
function cleanISBN(isbn: string): string { return isbn.replace(/[-\s]/g, ""); }
function isValidISBN(isbn: string): boolean { return /^(\d{10}|\d{13})$/.test(cleanISBN(isbn)); }

async function resolveOLAuthors(authorRefs: any[]): Promise<string[]> {
  if (!Array.isArray(authorRefs) || authorRefs.length === 0) return ["Unknown Author"];
  const names: string[] = [];
  for (const ref of authorRefs) {
    const key = ref?.key || ref?.author?.key;
    if (!key) continue;
    try {
      const res = await fetch(`https://openlibrary.org${key}.json`);
      if (res.ok) {
        const author = await res.json();
        if (author.name) names.push(author.name);
      }
    } catch { /* skip failed author lookups */ }
  }
  return names.length > 0 ? names : ["Unknown Author"];
}

async function lookupISBNData(isbn: string) {
  const cleaned = cleanISBN(isbn);
  let bookData = null;

  try {
    const response = await fetch(`https://openlibrary.org/isbn/${cleaned}.json`);
    if (response.ok) {
      const book = await response.json();
      const authors = await resolveOLAuthors(book.authors);
      bookData = {
        title: book.title || "Unknown Title",
        authors,
        publisher: book.publishers?.[0] || "Unknown Publisher",
        publishYear: book.publish_date ? extractYear(book.publish_date) : "n.d.",
        isbn: cleaned,
        coverUrl: book.covers?.[0] ? `https://covers.openlibrary.org/b/id/${book.covers[0]}-M.jpg` : undefined,
      };
    } else {
      const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleaned}`);
      if (gbRes.ok) {
        const gbData = await gbRes.json();
        if (gbData.items && gbData.items.length > 0) {
          const book = gbData.items[0].volumeInfo;
          bookData = {
            title: book.title || "Unknown Title",
            authors: book.authors || ["Unknown Author"],
            publisher: book.publisher || "Unknown Publisher",
            publishYear: book.publishedDate ? extractYear(book.publishedDate) : "n.d.",
            isbn: cleaned,
            coverUrl: book.imageLinks?.thumbnail || undefined,
          };
        }
      }
    }
  } catch (e) {
    console.error("ISBN Lookup failed", e);
  }

  return bookData ? { success: true, type: "book", data: bookData } : null;
}

// ============================================
// PART 2: DOI LOOKUP
// ============================================
function cleanDOI(doi: string): string {
  return doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "").trim();
}
function isValidDOI(doi: string): boolean { return /^10\.\d{4,}\/\S+$/.test(doi); }

async function lookupDOIData(doi: string) {
  const cleanedDOI = cleanDOI(doi);
  try {
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanedDOI)}`);
    if (response.ok) {
      const data = await response.json();
      const work = data.message;
      if (work) {
        return {
          success: true,
          type: "academic",
          data: {
            title: Array.isArray(work.title) ? work.title[0] : work.title || "Unknown Title",
            authors: work.author ? work.author.map((a: any) => ({ fullName: `${a.given || ""} ${a.family || ""}`.trim() })) : [],
            journal: Array.isArray(work["container-title"]) ? work["container-title"][0] : work["container-title"] || "",
            publishYear: work.published?.["date-parts"]?.[0]?.[0]?.toString() || "n.d.",
            doi: cleanedDOI,
            url: work.URL || `https://doi.org/${cleanedDOI}`,
          },
        };
      }
    }
  } catch (e) {
    console.error("DOI Lookup failed", e);
  }
  return null;
}

// ============================================
// PART 3: YOUTUBE LOOKUP
// ============================================
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function lookupYouTubeData(url: string) {
  const videoId = extractVideoId(url);
  if (!videoId) return null;

  try {
    const oembedUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(oembedUrl)}&format=json`);
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        type: "video",
        data: {
          title: data.title || "Unknown Title",
          channelTitle: data.author_name || "Unknown Channel",
          publishYear: "n.d.",
          url: oembedUrl,
          videoId: videoId,
        },
      };
    }
  } catch (e) {
    console.error("YouTube Lookup failed", e);
  }
  return null;
}

// ============================================
// PART 4: WEB URL CITATION EXTRACTION ENGINE
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
    {
      name: "Springer",
      regex: /link\.springer\.com\/(?:article|chapter)\/(10\.\d+\/[^?#]+)/i,
      handler: (match) => ({
        doi: decodeURIComponent(match[1]),
        source: "Springer URL",
      }),
    },
    {
      name: "Nature",
      regex: /nature\.com\/articles\/([a-z0-9-]+)/i,
      handler: (match) => ({
        doi: `10.1038/${match[1]}`,
        source: "Nature URL",
      }),
    },
    {
      name: "ACM",
      regex: /dl\.acm\.org\/doi\/(10\.\d+\/[^?#]+)/i,
      handler: (match) => ({
        doi: decodeURIComponent(match[1]),
        source: "ACM URL",
      }),
    },
    {
      name: "Wiley",
      regex: /onlinelibrary\.wiley\.com\/doi\/(10\.\d+\/[^?#]+)/i,
      handler: (match) => ({
        doi: decodeURIComponent(match[1]),
        source: "Wiley URL",
      }),
    },
    {
      name: "Taylor & Francis",
      regex: /tandfonline\.com\/doi\/(?:abs|full)\/(10\.\d+\/[^?#]+)/i,
      handler: (match) => ({
        doi: decodeURIComponent(match[1]),
        source: "T&F URL",
      }),
    },
    {
      name: "SAGE",
      regex: /journals\.sagepub\.com\/doi\/(10\.\d+\/[^?#]+)/i,
      handler: (match) => ({
        doi: decodeURIComponent(match[1]),
        source: "SAGE URL",
      }),
    },
    {
      name: "arXiv",
      regex: /arxiv\.org\/abs\/(\d+\.\d+)/i,
      handler: (match) => ({
        doi: `10.48550/arXiv.${match[1]}`,
        source: "arXiv URL",
      }),
    },
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
    {
      name: "PLOS",
      regex: /journals\.plos\.org\/\w+\/article\?id=(10\.\d+\/[^&]+)/i,
      handler: (match) => ({
        doi: decodeURIComponent(match[1]),
        source: "PLOS URL",
      }),
    },
    {
      name: "Frontiers",
      regex: /frontiersin\.org\/(?:articles|journals\/[^/]+\/articles)\/(10\.\d+\/[^?#]+)/i,
      handler: (match) => ({
        doi: decodeURIComponent(match[1]),
        source: "Frontiers URL",
      }),
    },
    {
      name: "Generic DOI",
      regex: /doi\.org\/(10\.\d+\/[^?#\s]+)/i,
      handler: (match) => ({
        doi: decodeURIComponent(match[1]),
        source: "DOI URL",
      }),
    },
  ];

  for (const { regex, handler } of patterns) {
    const match = url.match(regex);
    if (match) return handler(match);
  }

  return { doi: null, source: "none" };
}

async function lookupIEEEDocument(documentId: string): Promise<{ doi: string | null; metadata: any | null }> {
  try {
    const crUrl = `https://api.crossref.org/works?filter=member:263&query.bibliographic=${documentId}&rows=5`;
    const response = await fetch(crUrl, {
      headers: { "User-Agent": "ResearchMate/1.0 (mailto:support@researchmate.app)" },
    });
    if (response.ok) {
      const data = await safeJsonParse(response);
      const works = data?.message?.items || [];
      for (const work of works) {
        if (work.DOI && work.DOI.endsWith(documentId)) {
          const dateParts = work.published?.["date-parts"]?.[0];
          return {
            doi: work.DOI,
            metadata: {
              title: Array.isArray(work.title) ? work.title[0] : work.title,
              authors: work.author?.map((a: any) => `${a.given || ""} ${a.family || ""}`.trim()),
              year: dateParts?.[0]?.toString(),
              venue: work["container-title"]?.[0] || "IEEE",
            },
          };
        }
      }
    }
  } catch (e) {
    console.error("CrossRef IEEE lookup failed:", e);
  }
  return { doi: null, metadata: null };
}

async function lookupPMID(pmid: string): Promise<{ doi: string | null; metadata: any | null }> {
  try {
    const response = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`
    );
    if (response.ok) {
      const data = await safeJsonParse(response);
      const article = data?.result?.[pmid];
      if (article) {
        const doiId = article.articleids?.find((id: any) => id.idtype === "doi");
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
    console.error("PubMed lookup failed:", e);
  }
  return { doi: null, metadata: null };
}

async function lookupDOI(doi: string): Promise<any | null> {
  try {
    const response = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=title,authors,year,venue,publicationDate,abstract`,
      { headers: { "User-Agent": "ResearchMate/1.0" } }
    );
    if (response.ok) {
      const paper = await safeJsonParse(response);
      if (paper && paper.title && paper.authors?.length > 0) {
        return {
          title: paper.title,
          author: paper.authors.map((a: any) => a.name).join(", "),
          publishDate: paper.publicationDate || (paper.year ? `${paper.year}-01-01` : ""),
          siteName: paper.venue || "Academic Publication",
          description: paper.abstract || "",
          doi: doi,
        };
      }
    }
  } catch {}

  try {
    const response = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
      { headers: { "User-Agent": "ResearchMate/1.0" } }
    );
    if (response.ok) {
      const data = await safeJsonParse(response);
      const work = data?.message;
      if (work && work.title) {
        const year = work.published?.["date-parts"]?.[0]?.[0];
        return {
          title: Array.isArray(work.title) ? work.title[0] : work.title,
          author: work.author?.map((a: any) => `${a.given || ""} ${a.family || ""}`.trim()).join(", "),
          publishDate: year ? `${year}-01-01` : "",
          siteName: work["container-title"]?.[0] || work.publisher || "Academic Publication",
          description: work.abstract || "",
          doi: doi,
        };
      }
    }
  } catch {}

  return null;
}

async function lookupOpenAlexByURL(targetUrl: string): Promise<any | null> {
  try {
    const response = await fetch(
      `https://api.openalex.org/works?filter=locations.source.url:${targetUrl}`,
      { headers: { "User-Agent": "ResearchMate/1.0" } }
    );
    if (response.ok) {
      const data = await safeJsonParse(response);
      const work = data?.results?.[0];
      if (work && work.title) {
        return {
          title: work.title,
          author: work.authorships?.map((a: any) => a.author?.display_name).filter(Boolean).join(", "),
          publishDate: work.publication_date || "",
          publishYear: work.publication_year?.toString(),
          siteName: work.primary_location?.source?.display_name || "Academic Publication",
          description: "",
          doi: work.doi?.replace("https://doi.org/", ""),
          url: work.doi || targetUrl,
        };
      }
    }
  } catch {}
  return null;
}

function extractMetadataFromHTML(html: string, url: string) {
  const metadata = {
    title: "",
    author: "",
    publishDate: "",
    siteName: "",
    description: "",
    url: url,
  };

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

  const siteMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
  if (siteMatch) metadata.siteName = siteMatch[1].trim();

  const dateMatch = html.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]*name=["']citation_publication_date["'][^>]*content=["']([^"']+)["']/i);
  if (dateMatch) metadata.publishDate = dateMatch[1].trim();

  if (!metadata.siteName) {
    try {
      metadata.siteName = new URL(url).hostname.replace("www.", "");
    } catch {}
  }

  return metadata;
}

async function enhanceWithAI(metadata: any, url: string): Promise<any> {
  if (!GEMINI_API_KEY) return metadata;
  if (metadata.author && metadata.author !== "Unknown Author" && metadata.publishDate) {
    return metadata;
  }

  const prompt = `Analyze this webpage metadata and provide your best guess for missing citation info.
URL: ${url}
Title: ${metadata.title}
Current Author: ${metadata.author || "Unknown"}
Respond ONLY with JSON: {"author": "Name", "publishDate": "YYYY-MM-DD"}`;

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
        if (result.author && !metadata.author) metadata.author = result.author;
        if (result.publishDate && !metadata.publishDate) metadata.publishDate = result.publishDate;
      }
    }
  } catch {}

  return metadata;
}

// ============================================
// MAIN UNIFIED HANDLER
// ============================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed. Use POST." });

  let creditDeducted = false;
  let deductedUserId: string | null = null;

  try {
    const authResult = await authenticateUser(req);
    if (authResult.error) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error,
        code: authResult.statusCode === 403 ? "NO_CREDITS" : "AUTH_ERROR",
      });
    }

    const { action, isbn, doi, url, useAI } = req.body || {};

    // ----------------------------------------------------
    // BRANCH A: Full Web URL Extraction
    // ----------------------------------------------------
    const isUrlExtraction =
      action === "extract" ||
      useAI !== undefined ||
      (!isbn && !doi && url && !url.includes("youtu"));

    if (isUrlExtraction && url) {
      let validUrl: URL;
      try {
        validUrl = new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      const urlString = validUrl.toString();

      // Check OpenAlex
      const openAlexData = await lookupOpenAlexByURL(urlString);
      if (openAlexData?.author) {
        if (authResult.isFreeTier && authResult.user?.id) {
          await deductCredit(authResult.user.id);
        }
        return res.status(200).json({
          success: true,
          metadata: { ...openAlexData, accessDate: new Date().toISOString() },
          source: "openalex_url_match",
          doi: openAlexData.doi,
          message: "Verified Academic Source (OpenAlex)",
        });
      }

      // Check pattern extraction
      const extraction = extractDOIFromURLPatterns(urlString);
      let foundDoi: string | null = extraction.doi;
      let preloadedMetadata: any = null;

      if (extraction.needsLookup && extraction.lookupId) {
        if (extraction.lookupType === "ieee") {
          const result = await lookupIEEEDocument(extraction.lookupId);
          foundDoi = result.doi;
          preloadedMetadata = result.metadata;
        } else if (extraction.lookupType === "pmid") {
          const result = await lookupPMID(extraction.lookupId);
          foundDoi = result.doi;
          preloadedMetadata = result.metadata;
        }
      }

      if (foundDoi) {
        const academicData = await lookupDOI(foundDoi);
        if (academicData?.author) {
          if (authResult.isFreeTier && authResult.user?.id) {
            await deductCredit(authResult.user.id);
          }
          return res.status(200).json({
            success: true,
            metadata: { ...academicData, url: urlString, accessDate: new Date().toISOString() },
            source: "academic_database",
            doi: foundDoi,
            message: `Found via ${extraction.source} + academic lookup`,
          });
        }
      }

      if (preloadedMetadata?.authors?.length > 0) {
        if (authResult.isFreeTier && authResult.user?.id) {
          await deductCredit(authResult.user.id);
        }
        return res.status(200).json({
          success: true,
          metadata: {
            title: preloadedMetadata.title,
            author: preloadedMetadata.authors.join(", "),
            publishDate: preloadedMetadata.year ? `${preloadedMetadata.year}-01-01` : "",
            siteName: preloadedMetadata.venue || extraction.source,
            description: "",
            url: urlString,
            accessDate: new Date().toISOString(),
          },
          source: extraction.lookupType,
          doi: foundDoi,
        });
      }

      // Scrape HTML
      let html = "";
      try {
        const fetchRes = await fetch(urlString, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
        if (fetchRes.ok) html = await fetchRes.text();
      } catch {}

      let metadata = extractMetadataFromHTML(html, urlString);

      if (useAI && (!metadata.author || !metadata.publishDate)) {
        metadata = await enhanceWithAI(metadata, urlString);
      }

      if (!metadata.title) {
        metadata.title = validUrl.pathname.split("/").filter(Boolean).pop() || "Web Page";
      }

      if (authResult.isFreeTier && authResult.user?.id) {
        await deductCredit(authResult.user.id);
        creditDeducted = true;
        deductedUserId = authResult.user.id;
      }

      return res.status(200).json({
        success: true,
        metadata: { ...metadata, accessDate: new Date().toISOString() },
        source: "html_metadata",
        message: useAI ? "Extracted with AI enhancement" : "Extracted from page metadata",
      });
    }

    // ----------------------------------------------------
    // BRANCH B: Specific ISBN / DOI / YouTube Lookups
    // ----------------------------------------------------
    let result = null;

    if (isbn) {
      if (!isValidISBN(isbn)) return res.status(400).json({ error: "Invalid ISBN format." });
      result = await lookupISBNData(isbn);
    } else if (doi) {
      if (!isValidDOI(cleanDOI(doi))) return res.status(400).json({ error: "Invalid DOI format." });
      result = await lookupDOIData(doi);
    } else if (url && url.includes("youtu")) {
      result = await lookupYouTubeData(url);
    } else {
      return res.status(400).json({ error: "Must provide isbn, doi, url, or action=extract." });
    }

    if (!result) {
      return res.status(404).json({ error: "Citation data not found." });
    }

    if (authResult.isFreeTier && authResult.user?.id) {
      await deductCredit(authResult.user.id);
      creditDeducted = true;
      deductedUserId = authResult.user.id;
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Citation error:", error);
    if (creditDeducted && deductedUserId) await refundCredit(deductedUserId);
    return res.status(500).json({ error: (error as Error).message });
  }
}
