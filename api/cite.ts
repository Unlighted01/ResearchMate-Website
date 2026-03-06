// ============================================
// CITE - Unified Academic, Book, and Video Citation
// Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, deductCredit } from "./_utils/auth.js";


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

async function lookupISBNData(isbn: string) {
  const cleaned = cleanISBN(isbn);
  let bookData = null;

  try {
    const response = await fetch(`https://openlibrary.org/isbn/${cleaned}.json`);
    if (response.ok) {
      const book = await response.json();
      bookData = {
        title: book.title || "Unknown Title",
        authors: ["Unknown Author"], // Simplified for consolidation
        publisher: book.publishers?.[0] || "Unknown Publisher",
        publishYear: book.publish_date ? extractYear(book.publish_date) : "n.d.",
        isbn: cleaned,
      };
    } else {
        // Fallback to Google Books
        const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleaned}`);
        if(gbRes.ok) {
           const gbData = await gbRes.json();
           if(gbData.items && gbData.items.length > 0) {
              const book = gbData.items[0].volumeInfo;
              bookData = {
                  title: book.title || "Unknown Title",
                  authors: book.authors || ["Unknown Author"],
                  publisher: book.publisher || "Unknown Publisher",
                  publishYear: book.publishedDate ? extractYear(book.publishedDate) : "n.d.",
                  isbn: cleaned,
              }
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
        if(response.ok) {
            const data = await response.json();
            const work = data.message;
            if (work) {
                return {
                    success: true,
                    type: "academic",
                    data: {
                        title: Array.isArray(work.title) ? work.title[0] : work.title || "Unknown Title",
                        authors: work.author ? work.author.map((a:any) => ({fullName: `${a.given || ''} ${a.family || ''}`.trim()})) : [],
                        journal: Array.isArray(work["container-title"]) ? work["container-title"][0] : work["container-title"] || "",
                        publishYear: work.published?.["date-parts"]?.[0]?.[0]?.toString() || "n.d.",
                        doi: cleanedDOI,
                        url: work.URL || `https://doi.org/${cleanedDOI}`
                    }
                }
            }
        }
    } catch(e) {
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
    if(!videoId) return null;

    try {
        const oembedUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(oembedUrl)}&format=json`);
        if(response.ok) {
            const data = await response.json();
            return {
                success: true,
                type: "video",
                data: {
                    title: data.title || "Unknown Title",
                    channelTitle: data.author_name || "Unknown Channel",
                    publishYear: "n.d.", // oEmbed doesn't give date
                    url: oembedUrl,
                    videoId: videoId
                }
            }
        }
    } catch(e) {
        console.error("YouTube Lookup failed", e);
    }
    return null;
}

// ============================================
// MAIN HANDLER
// ============================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const authResult = await authenticateUser(req);
    if (authResult.error) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error,
        code: authResult.statusCode === 403 ? "NO_CREDITS" : "AUTH_ERROR",
      });
    }

    const { isbn, doi, url } = req.body;

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
        return res.status(400).json({ error: "Must provide isbn, doi, or youtube url." });
    }

    if (!result) {
        return res.status(404).json({ error: "Citation data not found." });
    }

    if (authResult.isFreeTier && authResult.user?.id) {
      await deductCredit(authResult.user.id);
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("Citation error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
