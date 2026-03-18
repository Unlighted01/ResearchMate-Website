import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function verifyUser(req: VercelRequest): Promise<boolean> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  return !error && !!data.user;
}

// ── Google Books ────────────────────────────────────────────────────────────
async function searchGoogleBooks(query: string): Promise<any[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&printType=all&langRestrict=en`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []).map((item: any) => {
    const info = item.volumeInfo || {};
    const isbn13 = (info.industryIdentifiers || []).find((id: any) => id.type === "ISBN_13")?.identifier;
    const isbn10 = (info.industryIdentifiers || []).find((id: any) => id.type === "ISBN_10")?.identifier;
    return {
      sourceType: info.printType === "MAGAZINE" ? "journal" : "book",
      title: info.title || "Untitled",
      authors: info.authors || [],
      publisher: info.publisher,
      publishedDate: info.publishedDate,
      description: info.description,
      imageLinks: info.imageLinks,
      previewLink: info.previewLink,
      infoLink: info.infoLink,
      isbn: isbn13 || isbn10,
      industryIdentifiers: info.industryIdentifiers,
    };
  });
}

// ── CrossRef (academic journals, conference papers) ─────────────────────────
async function searchCrossRef(query: string): Promise<any[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=8&select=title,author,publisher,published-print,published-online,type,DOI,URL,container-title,ISSN&mailto=researchmate@app.com`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.message?.items || []).map((item: any) => {
    const date = item["published-print"]?.["date-parts"]?.[0] || item["published-online"]?.["date-parts"]?.[0];
    const authors = (item.author || []).map((a: any) =>
      [a.given, a.family].filter(Boolean).join(" ")
    );
    const typeMap: Record<string, string> = {
      "journal-article": "journal",
      "proceedings-article": "conference",
      "book": "book",
      "book-chapter": "book",
      "report": "report",
      "dissertation": "thesis",
    };
    return {
      sourceType: typeMap[item.type] || "article",
      title: Array.isArray(item.title) ? item.title[0] : item.title || "Untitled",
      authors,
      publisher: item.publisher || (item["container-title"]?.[0]),
      publishedDate: date ? `${date[0]}-${String(date[1] || 1).padStart(2, "0")}-01` : undefined,
      journal: item["container-title"]?.[0],
      doi: item.DOI,
      previewLink: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : undefined),
    };
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ok = await verifyUser(req);
  if (!ok) return res.status(401).json({ error: "Unauthorized" });

  const { query } = req.body || {};
  if (!query?.trim()) return res.status(400).json({ error: "Query is required" });

  try {
    // Run both sources in parallel
    const [books, articles] = await Promise.allSettled([
      searchGoogleBooks(query),
      searchCrossRef(query),
    ]);

    const bookResults = books.status === "fulfilled" ? books.value : [];
    const articleResults = articles.status === "fulfilled" ? articles.value : [];

    // Deduplicate by title similarity and interleave: articles first (more academic)
    const seen = new Set<string>();
    const items: any[] = [];

    for (const item of [...articleResults, ...bookResults]) {
      const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
      if (!seen.has(key)) {
        seen.add(key);
        items.push(item);
      }
    }

    return res.status(200).json({ items: items.slice(0, 15) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
