// ============================================
// search-academic.ts - Academic Paper Search API
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser } from "./_utils/auth.js";

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

// ============================================
// PART 3: SEMANTIC SCHOLAR
// ============================================

async function searchSemanticScholar(query: string): Promise<AcademicResult[]> {
  const fields = "title,authors,year,abstract,url,externalIds,citationCount,venue";
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=10&fields=${fields}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.data || []).map((paper: Record<string, unknown>) => {
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
  });
}

// ============================================
// PART 4: ARXIV
// ============================================

async function searchArxiv(query: string): Promise<AcademicResult[]> {
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=10&sortBy=relevance`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const xml = await res.text();
  const results: AcademicResult[] = [];

  // Parse entries with regex — ArXiv Atom XML is simple enough
  const entries = xml.split("<entry>").slice(1);

  for (const entry of entries) {
    const extract = (tag: string): string => {
      const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return match ? match[1].trim() : "";
    };

    const title = extract("title").replace(/\s+/g, " ");
    const abstract = extract("summary").replace(/\s+/g, " ");
    const published = extract("published");
    const year = published ? new Date(published).getFullYear() : null;

    // Extract arxiv ID from the id URL
    const idUrl = extract("id");
    const arxivId = idUrl.replace("http://arxiv.org/abs/", "").replace(/v\d+$/, "");

    // Extract authors
    const authorMatches = entry.match(/<author>\s*<name>([^<]+)<\/name>/g) || [];
    const authors = authorMatches.map((a) => {
      const nameMatch = a.match(/<name>([^<]+)<\/name>/);
      return nameMatch ? nameMatch[1] : "";
    });

    // Extract DOI link if present
    const doiMatch = entry.match(/<arxiv:doi[^>]*>([^<]+)<\/arxiv:doi>/);
    const doi = doiMatch ? doiMatch[1] : undefined;

    // Extract journal ref if present
    const journal = extract("arxiv:journal_ref");

    // PDF link
    const pdfMatch = entry.match(/<link[^>]+title="pdf"[^>]+href="([^"]+)"/);
    const pdfUrl = pdfMatch ? pdfMatch[1] : `https://arxiv.org/pdf/${arxivId}`;

    results.push({
      id: arxivId,
      title,
      authors,
      year,
      abstract,
      venue: journal || "ArXiv",
      url: `https://arxiv.org/abs/${arxivId}`,
      pdfUrl,
      doi,
      arxivId,
      source: "arxiv",
    });
  }

  return results;
}

// ============================================
// PART 5: PUBMED
// ============================================

async function searchPubMed(query: string): Promise<AcademicResult[]> {
  // Step 1: Search for IDs
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=10&retmode=json`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) return [];

  const searchData = await searchRes.json();
  const ids: string[] = searchData.esearchresult?.idlist || [];
  if (ids.length === 0) return [];

  // Step 2: Fetch details
  const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`;
  const summaryRes = await fetch(summaryUrl);
  if (!summaryRes.ok) return [];

  const summaryData = await summaryRes.json();
  const results: AcademicResult[] = [];

  for (const id of ids) {
    const article = summaryData.result?.[id];
    if (!article) continue;

    const authors = (article.authors || []).map(
      (a: { name: string }) => a.name
    );
    const doi = (article.articleids || []).find(
      (aid: { idtype: string; value: string }) => aid.idtype === "doi"
    )?.value;

    results.push({
      id: id,
      title: article.title || "Untitled",
      authors,
      year: article.pubdate
        ? parseInt(article.pubdate.split(" ")[0], 10) || null
        : null,
      abstract: "",
      venue: article.fulljournalname || article.source || "",
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      doi,
      pmid: id,
      source: "pubmed",
    });
  }

  return results;
}

// ============================================
// PART 6: HANDLER
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await authenticateUser(req);
  if (!auth.user) {
    return res.status(auth.statusCode || 401).json({ error: auth.error });
  }

  const { query, source = "all" } = (req.body || {}) as {
    query?: string;
    source?: AcademicSource;
  };

  if (!query?.trim()) {
    return res.status(400).json({ error: "Query is required" });
  }

  try {
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
    const allResults = settled.flatMap((r) =>
      r.status === "fulfilled" ? r.value : []
    );

    // Deduplicate by DOI or normalized title
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Search failed";
    return res.status(500).json({ error: message });
  }
}
