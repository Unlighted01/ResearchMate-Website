// ============================================
// CITE-ISBN - Book Citation via Open Library API
// Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";

// ============================================
// PART 0.5: AI CONFIG
// ============================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

async function safeJsonParse(response: Response): Promise<any | null> {
  try {
    const text = await response.text();
    if (!text || text.trim() === "") return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ============================================
// PART 1: TYPE DEFINITIONS
// ============================================

interface BookData {
  title: string;
  authors: string[];
  publisher: string;
  publishYear: string;
  publishPlace: string;
  pages: number | null;
  isbn: string;
  isbn13: string;
  coverUrl: string | null;
}

// ============================================
// PART 2: HELPER FUNCTIONS
// ============================================

function cleanISBN(isbn: string): string {
  return isbn.replace(/[-\s]/g, "");
}

function isValidISBN(isbn: string): boolean {
  const clean = cleanISBN(isbn);
  return /^(\d{10}|\d{13})$/.test(clean);
}

async function fetchAuthorName(authorKey: string): Promise<string> {
  try {
    const response = await fetch(`https://openlibrary.org${authorKey}.json`);
    if (!response.ok) return "Unknown Author";
    const author = await response.json();
    return author.name || author.personal_name || "Unknown Author";
  } catch {
    return "Unknown Author";
  }
}

function extractYear(publishDate: string): string {
  const yearMatch = publishDate.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? yearMatch[0] : publishDate;
}

// ============================================
// PART 3: OPEN LIBRARY API
// ============================================

async function lookupISBN(isbn: string): Promise<BookData | null> {
  const cleanedISBN = cleanISBN(isbn);

  try {
    const response = await fetch(
      `https://openlibrary.org/isbn/${cleanedISBN}.json`
    );

    if (!response.ok) {
      return await searchByISBN(cleanedISBN);
    }

    const book = await response.json();

    const authorNames: string[] = [];
    if (book.authors && book.authors.length > 0) {
      for (const author of book.authors.slice(0, 5)) {
        const name = await fetchAuthorName(author.key);
        authorNames.push(name);
      }
    }

    return {
      title: book.title || "Unknown Title",
      authors: authorNames.length > 0 ? authorNames : ["Unknown Author"],
      publisher: book.publishers?.[0] || "Unknown Publisher",
      publishYear: book.publish_date ? extractYear(book.publish_date) : "n.d.",
      publishPlace: book.publish_places?.[0] || "",
      pages: book.number_of_pages || null,
      isbn: book.isbn_10?.[0] || cleanedISBN,
      isbn13:
        book.isbn_13?.[0] || (cleanedISBN.length === 13 ? cleanedISBN : ""),
      coverUrl: book.covers?.[0]
        ? `https://covers.openlibrary.org/b/id/${book.covers[0]}-M.jpg`
        : null,
    };
  } catch (error) {
    console.error("Open Library lookup failed:", error);
    return null;
  }
}

async function searchByISBN(isbn: string): Promise<BookData | null> {
  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?isbn=${isbn}&limit=1`
    );
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.docs || data.docs.length === 0) return null;

    const book = data.docs[0];

    return {
      title: book.title || "Unknown Title",
      authors: book.author_name || ["Unknown Author"],
      publisher: book.publisher?.[0] || "Unknown Publisher",
      publishYear: book.first_publish_year?.toString() || "n.d.",
      publishPlace: book.publish_place?.[0] || "",
      pages: book.number_of_pages_median || null,
      isbn: book.isbn?.[0] || isbn,
      isbn13: book.isbn?.find((i: string) => i.length === 13) || "",
      coverUrl: book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
        : null,
    };
  } catch (error) {
    console.error("ISBN search failed:", error);
    return null;
  }
}

// ============================================
// PART 4: GOOGLE BOOKS FALLBACK
// ============================================

async function googleBooksLookup(isbn: string): Promise<BookData | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    );
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.items || data.items.length === 0) return null;

    const book = data.items[0].volumeInfo;

    return {
      title: book.title || "Unknown Title",
      authors: book.authors || ["Unknown Author"],
      publisher: book.publisher || "Unknown Publisher",
      publishYear: book.publishedDate
        ? extractYear(book.publishedDate)
        : "n.d.",
      publishPlace: "",
      pages: book.pageCount || null,
      isbn: isbn,
      isbn13:
        book.industryIdentifiers?.find((id: any) => id.type === "ISBN_13")
          ?.identifier || "",
      coverUrl: book.imageLinks?.thumbnail || null,
    };
  } catch (error) {
    console.error("Google Books lookup failed:", error);
    return null;
  }
}

// ============================================
// PART 4.5: AI FALLBACK (Final Attempt)
// ============================================

async function lookupISBNWithAI(isbn: string): Promise<BookData | null> {
  if (!GEMINI_API_KEY) return null;

  console.log("🤖 APIs failed, trying AI lookup for ISBN...");

  const prompt = `You are a bibliographic assistant. Look up this book by ISBN: ${isbn}

This is a real ISBN for a published book. Use your knowledge to identify:
- The exact title
- All author names (full names, e.g., "Robert C. Martin" not just "Martin")
- Publisher
- Publication year
- Number of pages (if known)

Example: ISBN 9780132350884 is "Clean Code: A Handbook of Agile Software Craftsmanship" by Robert C. Martin.

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "title": "Full Book Title",
  "authors": ["Full Author Name"],
  "publisher": "Publisher Name",
  "publishYear": "YYYY",
  "pages": 123
}

If you cannot identify this ISBN, respond with null.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 150 },
      }),
    });

    if (response.ok) {
      const respData = await safeJsonParse(response);
      const text = respData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        if (result && result.title && result.title !== "Unknown") {
          return {
            title: result.title,
            authors: result.authors || ["Unknown Author"],
            publisher: result.publisher || "Unknown Publisher",
            publishYear: result.publishYear || "n.d.",
            publishPlace: "",
            pages: result.pages || null,
            isbn: isbn,
            isbn13: isbn.length === 13 ? isbn : "",
            coverUrl: null,
          };
        }
      }
    }
  } catch (e) {
    console.log("AI ISBN lookup failed:", e);
  }

  return null;
}

// ============================================
// PART 5: MAIN HANDLER
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const logs: string[] = []; // Debug logs
  function log(msg: string) {
    console.log(msg);
    logs.push(msg);
  }

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
    const { isbn } = req.body;

    if (!isbn || !isbn.trim()) {
      return res.status(400).json({ error: "ISBN is required" });
    }

    const cleanedISBN = cleanISBN(isbn.trim());

    if (!isValidISBN(cleanedISBN)) {
      return res.status(400).json({
        error: "Invalid ISBN format. Please enter a 10 or 13 digit ISBN.",
      });
    }

    log(`Processing ISBN: ${cleanedISBN}`);

    // Try Open Library first
    let bookData = await lookupISBN(cleanedISBN);
    if (bookData) log("Found in Open Library");

    // Fallback to Google Books
    if (!bookData) {
      log("Open Library failed, trying Google Books...");
      bookData = await googleBooksLookup(cleanedISBN);
      if (bookData) log("Found in Google Books");
    }

    // PARTIAL DATA CHECK
    // Check if authors is invalid or contains "Unknown"
    const hasUnknownAuthor =
      !bookData?.authors ||
      bookData.authors.length === 0 ||
      bookData.authors.some((a) => a.toLowerCase().includes("unknown"));

    if (bookData && hasUnknownAuthor) {
      log("⚠️ Detected 'Unknown' in author list.");
    }

    // Final Fallback: AI (if no data OR if authors are unknown)
    if (!bookData || hasUnknownAuthor) {
      log("Attempting AI Fallback...");

      if (!process.env.GEMINI_API_KEY) {
        log("❌ FAIL: GEMINI_API_KEY is missing in process.env");
      } else {
        const aiData = await lookupISBNWithAI(cleanedISBN);
        if (aiData) {
          log("✅ AI returned data!");
          if (bookData) {
            // Merge logic
            log("Merging AI data into existing bookData...");
            if (
              aiData.authors.length > 0 &&
              !aiData.authors[0].toLowerCase().includes("unknown")
            ) {
              bookData.authors = aiData.authors;
              log(`Updated authors to: ${aiData.authors.join(", ")}`);
            }
            if (
              bookData.publishYear === "n.d." &&
              aiData.publishYear !== "n.d."
            ) {
              bookData.publishYear = aiData.publishYear;
            }
            if (
              bookData.publisher === "Unknown Publisher" &&
              aiData.publisher
            ) {
              bookData.publisher = aiData.publisher;
            }
          } else {
            bookData = aiData;
            log("Using AI data as primary source");
          }
        } else {
          log("❌ AI returned null or failed to identify book.");
        }
      }
    }

    if (!bookData) {
      return res.status(404).json({
        error: "Book not found. AI fallback failed.",
        isbn: cleanedISBN,
        debugLogs: logs,
      });
    }

    return res.status(200).json({
      success: true,
      type: "book",
      data: bookData,
      debugLogs: logs,
    });
  } catch (error) {
    console.error("ISBN citation error:", error);
    return res.status(500).json({
      error: (error as Error).message,
      debugLogs: logs,
    });
  }
}
