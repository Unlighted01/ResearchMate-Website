// ============================================
// search.ts - Unified Search API (Academic + Books/Media)
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, setCorsHeaders } from "./_utils/auth.js";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface AcademicResult {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string;
  venue: string;
  url: string;
  pdfUrl?: string;
  doi?: string;
  arxivId?: string;
  pmid?: string;
  citationCount?: number;
  source: "semanticscholar" | "arxiv" | "pubmed";
}

type AcademicSource = "all" | "semanticscholar" | "arxiv" | "pubmed";
type SearchType = "academic" | "books";

// ============================================
// PART 3: SEMANTIC SCHOLAR
// ============================================

function mapSemanticScholarPaper(paper: Record<string, unknown>): AcademicResult {
  const authors = (paper.authors as Array<{ name: string }>) || [];
  const externalIds = (paper.externalIds as Record<string, string>) || {};
  return {
    id: externalIds.DOI || externalIds.ArXiv || (paper.paperId as string) || "",
    title: (paper.title as string) || "Untitled",
    authors: authors.map((a) => a.name),
    year: (paper.year as number) || null,
    abstract: (paper.abstract as string) || "",
    venue: (paper.venue as string) || "",
    url: (paper.url as string) || "",
    pdfUrl: externalIds.ArXiv
      ? `https://arxiv.org/pdf/${externalIds.ArXiv}`
      : undefined,
    doi: externalIds.DOI || undefined,
    arxivId: externalIds.ArXiv || undefined,
    citationCount: (paper.citationCount as number) || 0,
    source: "semanticscholar" as const,
  };
}

async function searchSemanticScholar(query: string): Promise<AcademicResult[]> {
  const fields = "title,authors,year,abstract,url,externalIds,citationCount,venue";
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=10&fields=${fields}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.data || []).map(mapSemanticScholarPaper);
}

async function searchSemanticScholarByTitle(title: string): Promise<AcademicResult[]> {
  const fields = "title,authors,year,abstract,url,externalIds,citationCount,venue";
  const currentYear = new Date().getFullYear();
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(title)}&limit=5&fields=${fields}&year=${currentYear - 1}-${currentYear}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.data || []).map(mapSemanticScholarPaper);
}

// ============================================
// PART 4: ARXIV
// ============================================

const ARXIV_ID_RE = /(?:arxiv[:\s]?|arxiv\.org\/abs\/)?([\d]{4}\.[\d]{4,5}(?:v\d+)?)/i;

async function fetchArxivById(arxivId: string): Promise<AcademicResult[]> {
  const url = `https://export.arxiv.org/api/query?id_list=${arxivId}&max_results=1`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return parseArxivXml(await res.text());
}

function parseArxivXml(xml: string): AcademicResult[] {
  const results: AcademicResult[] = [];
  const entries = xml.split("<entry>").slice(1);

  for (const entry of entries) {
    const extract = (tag: string): string => {
      const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return match ? match[1].trim() : "";
    };

    const title = extract("title").replace(/\s+/g, " ");
    if (!title) continue;

    const abstract = extract("summary").replace(/\s+/g, " ");
    const published = extract("published");
    const year = published ? new Date(published).getFullYear() : null;

    const idUrl = extract("id");
    const arxivId = idUrl.replace("http://arxiv.org/abs/", "").replace(/v\d+$/, "");

    const authorMatches = entry.match(/<author>\s*<name>([^<]+)<\/name>/g) || [];
    const authors = authorMatches.map((a) => {
      const nameMatch = a.match(/<name>([^<]+)<\/name>/);
      return nameMatch ? nameMatch[1] : "";
    });

    const doiMatch = entry.match(/<arxiv:doi[^>]*>([^<]+)<\/arxiv:doi>/);
    const doi = doiMatch ? doiMatch[1] : undefined;
    const journal = extract("arxiv:journal_ref");
    const pdfMatch = entry.match(/<link[^>]+title="pdf"[^>]+href="([^"]+)"/);
    const pdfUrl = pdfMatch ? pdfMatch[1] : `https://arxiv.org/pdf/${arxivId}`;

    results.push({
      id: arxivId, title, authors, year, abstract,
      venue: journal || "ArXiv",
      url: `https://arxiv.org/abs/${arxivId}`,
      pdfUrl, doi, arxivId, source: "arxiv",
    });
  }

  return results;
}

async function searchArxiv(query: string): Promise<AcademicResult[]> {
  const isLikelyTitle = query.split(/\s+/).length >= 5;

  const fetches: Promise<AcademicResult[]>[] = [
    fetch(`https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=10&sortBy=relevance`)
      .then((r) => (r.ok ? r.text() : ""))
      .then(parseArxivXml),
  ];

  if (isLikelyTitle) {
    fetches.push(
      fetch(`https://export.arxiv.org/api/query?search_query=ti:${encodeURIComponent(query)}&max_results=5&sortBy=submittedDate&sortOrder=descending`)
        .then((r) => (r.ok ? r.text() : ""))
        .then(parseArxivXml)
    );
  }

  const settled = await Promise.allSettled(fetches);
  const all = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  const seen = new Set<string>();
  return all.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

// ============================================
// PART 5: PUBMED
// ============================================

async function searchPubMed(query: string): Promise<AcademicResult[]> {
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=10&retmode=json`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) return [];

  const searchData = await searchRes.json();
  const ids: string[] = searchData.esearchresult?.idlist || [];
  if (ids.length === 0) return [];

  const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`;
  const summaryRes = await fetch(summaryUrl);
  if (!summaryRes.ok) return [];

  const summaryData = await summaryRes.json();
  const results: AcademicResult[] = [];

  for (const id of ids) {
    const article = summaryData.result?.[id];
    if (!article) continue;

    const authors = (article.authors || []).map((a: { name: string }) => a.name);
    const doi = (article.articleids || []).find(
      (aid: { idtype: string; value: string }) => aid.idtype === "doi"
    )?.value;

    results.push({
      id, title: article.title || "Untitled", authors,
      year: article.pubdate ? parseInt(article.pubdate.split(" ")[0], 10) || null : null,
      abstract: "", venue: article.fulljournalname || article.source || "",
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      doi, pmid: id, source: "pubmed",
    });
  }

  return results;
}

// ============================================
// PART 6: BOOKS & MEDIA SEARCH (Google Books, CrossRef, OMDB)
// ============================================

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
      "journal-article": "journal", "proceedings-article": "conference",
      "book": "book", "book-chapter": "book", "report": "report", "dissertation": "thesis",
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

async function searchOMDB(query: string): Promise<any[]> {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) return [];
  const url = `https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (data.Response === "False" || !data.Search) return [];
  return data.Search.map((item: any) => ({
    sourceType: item.Type === "series" ? "tv" : "movie",
    title: item.Title,
    authors: [],
    publishedDate: item.Year ? `${item.Year.replace(/[^0-9]/g, "").slice(0, 4)}-01-01` : undefined,
    imageLinks: item.Poster && item.Poster !== "N/A" ? { thumbnail: item.Poster } : undefined,
    previewLink: `https://www.imdb.com/title/${item.imdbID}`,
    imdbId: item.imdbID,
  }));
}

async function handleBooksSearch(query: string, res: VercelResponse) {
  const [books, articles, movies] = await Promise.allSettled([
    searchGoogleBooks(query),
    searchCrossRef(query),
    searchOMDB(query),
  ]);

  const bookResults = books.status === "fulfilled" ? books.value : [];
  const articleResults = articles.status === "fulfilled" ? articles.value : [];
  const movieResults = movies.status === "fulfilled" ? movies.value : [];

  const seen = new Set<string>();
  const items: any[] = [];

  for (const item of [...articleResults, ...bookResults, ...movieResults]) {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
    if (!seen.has(key)) {
      seen.add(key);
      items.push(item);
    }
  }

  return res.status(200).json({ items: items.slice(0, 15) });
}

// ============================================
// PART 7: ACADEMIC SEARCH HANDLER
// ============================================

async function handleAcademicSearch(
  query: string,
  source: AcademicSource,
  res: VercelResponse
) {
  // Direct ArXiv ID lookup
  const arxivMatch = query.match(ARXIV_ID_RE);
  if (arxivMatch) {
    const directResults = await fetchArxivById(arxivMatch[1].replace(/v\d+$/, ""));
    if (directResults.length > 0) {
      return res.status(200).json({ results: directResults });
    }
  }

  // Direct DOI lookup via Semantic Scholar
  const DOI_RE = /^10\.\d{4,9}\/[^\s]+$/i;
  if (DOI_RE.test(query.trim())) {
    const doiRes = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(query.trim())}?fields=title,authors,year,abstract,url,externalIds,citationCount,venue`
    );
    if (doiRes.ok) {
      const paper = await doiRes.json();
      return res.status(200).json({
        results: [mapSemanticScholarPaper(paper)],
      });
    }
  }

  // Multi-source search
  const fetchers: Promise<AcademicResult[]>[] = [];

  if (source === "all" || source === "semanticscholar") {
    fetchers.push(searchSemanticScholar(query));
  }
  if (source === "all" || source === "arxiv") {
    fetchers.push(searchArxiv(query));
  }
  if (source === "all" || source === "pubmed") {
    fetchers.push(searchPubMed(query));
  }

  const settled = await Promise.allSettled(fetchers);
  let allResults = settled.flatMap((r) =>
    r.status === "fulfilled" ? r.value : []
  );

  // Title-match fallback for long queries with few results
  if (allResults.length < 3 && query.split(/\s+/).length >= 4) {
    const titleMatch = await searchSemanticScholarByTitle(query);
    allResults = [...titleMatch, ...allResults];
  }

  // Deduplicate
  const seen = new Set<string>();
  const unique: AcademicResult[] = [];

  for (const item of allResults) {
    const key = item.doi
      ? `doi:${item.doi.toLowerCase()}`
      : item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  return res.status(200).json({ results: unique.slice(0, 20) });
}

// ============================================
// PART 8: MAIN HANDLER
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = await authenticateUser(req);
  if (!auth.user) return res.status(auth.statusCode || 401).json({ error: auth.error });

  const { query, type = "academic", source = "all" } = (req.body || {}) as {
    query?: string;
    type?: SearchType;
    source?: AcademicSource;
  };

  if (!query?.trim()) return res.status(400).json({ error: "Query is required" });

  try {
    if (type === "books") {
      return await handleBooksSearch(query, res);
    }
    return await handleAcademicSearch(query, source, res);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Search failed";
    return res.status(500).json({ error: message });
  }
}
