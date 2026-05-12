// ============================================
// rssFeedsService.ts - RSS feed subscription CRUD + fetch helper
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import { supabase, isAuthenticated } from "./supabaseClient";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

export interface RssFeed {
  id: string;
  userId: string;
  title: string;
  url: string;
  category: string;
  lastFetchedAt: string | null;
  lastItemDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRssFeedInput {
  title: string;
  url: string;
  category?: string;
}

export interface RssItem {
  id: string;
  title: string;
  link: string;
  summary: string;
  authors: string[];
  pubDate: string | null;
  categories: string[];
}

export interface RssFeedResponse {
  title: string;
  description: string;
  link: string;
  items: RssItem[];
  fetchedAt: string;
  source: "atom" | "rss2" | "rdf" | "unknown";
}

export interface CuratedFeedPreset {
  title: string;
  url: string;
  category: string;
  description: string;
}

// ============================================
// PART 3: CONSTANTS & CONFIGURATION
// ============================================

export const MAX_FEEDS_PER_USER = 20;

/**
 * Curated starter feeds the user can one-click subscribe to.
 */
export const CURATED_FEEDS: CuratedFeedPreset[] = [
  // ── AI / ML ──────────────────────────────────────────────────────
  {
    title: "arXiv — Artificial Intelligence",
    url: "https://rss.arxiv.org/rss/cs.AI",
    category: "AI / ML",
    description: "Daily new papers in AI from arXiv",
  },
  {
    title: "arXiv — Machine Learning",
    url: "https://rss.arxiv.org/rss/cs.LG",
    category: "AI / ML",
    description: "Daily new papers in ML from arXiv",
  },
  {
    title: "arXiv — Computation & Language (NLP)",
    url: "https://rss.arxiv.org/rss/cs.CL",
    category: "AI / ML",
    description: "Daily NLP papers from arXiv",
  },
  {
    title: "arXiv — Computer Vision",
    url: "https://rss.arxiv.org/rss/cs.CV",
    category: "AI / ML",
    description: "Daily computer vision papers from arXiv",
  },
  {
    title: "arXiv — Statistics / ML",
    url: "https://rss.arxiv.org/rss/stat.ML",
    category: "AI / ML",
    description: "Statistical ML papers from arXiv",
  },
  {
    title: "Google AI Blog",
    url: "https://blog.research.google/feeds/posts/default",
    category: "AI / ML",
    description: "Research updates from Google AI",
  },
  {
    title: "OpenAI News",
    url: "https://openai.com/blog/rss.xml",
    category: "AI / ML",
    description: "Latest announcements from OpenAI",
  },
  {
    title: "DeepMind Blog",
    url: "https://deepmind.google/blog/rss.xml",
    category: "AI / ML",
    description: "Research & insights from Google DeepMind",
  },
  // ── Science ──────────────────────────────────────────────────────
  {
    title: "Nature — Latest Research",
    url: "https://www.nature.com/nature.rss",
    category: "Science",
    description: "Flagship Nature research articles",
  },
  {
    title: "Science Magazine",
    url: "https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science",
    category: "Science",
    description: "Top peer-reviewed science",
  },
  {
    title: "Science Daily — Top Science",
    url: "https://www.sciencedaily.com/rss/top/science.xml",
    category: "Science",
    description: "Breaking science news summaries",
  },
  {
    title: "PLOS ONE",
    url: "https://journals.plos.org/plosone/feed/atom",
    category: "Science",
    description: "Open-access research across all disciplines",
  },
  {
    title: "MIT Technology Review",
    url: "https://www.technologyreview.com/feed/",
    category: "Science",
    description: "Technology & science reporting from MIT",
  },
  // ── Biomedical / Health ──────────────────────────────────────────
  {
    title: "PubMed — Trending Articles",
    url: "https://pubmed.ncbi.nlm.nih.gov/rss/trending.xml",
    category: "Biomedical",
    description: "Trending biomedical papers on PubMed",
  },
  {
    title: "The Lancet",
    url: "https://www.thelancet.com/rssfeed/lancet_online.xml",
    category: "Biomedical",
    description: "Top medical research & clinical findings",
  },
  {
    title: "New England Journal of Medicine",
    url: "https://www.nejm.org/action/showFeed?jc=nejm&type=etoc&feed=rss",
    category: "Biomedical",
    description: "Landmark clinical & translational research",
  },
  // ── Physics ──────────────────────────────────────────────────────
  {
    title: "arXiv — High Energy Physics",
    url: "https://rss.arxiv.org/rss/hep-ph",
    category: "Physics",
    description: "Phenomenology in high energy physics",
  },
  {
    title: "arXiv — Quantum Physics",
    url: "https://rss.arxiv.org/rss/quant-ph",
    category: "Physics",
    description: "Latest quantum physics preprints",
  },
  {
    title: "Physical Review Letters",
    url: "https://feeds.aps.org/rss/recent/prl.rss",
    category: "Physics",
    description: "High-impact letters from APS",
  },
  // ── Technology / Engineering ─────────────────────────────────────
  {
    title: "Hacker News — Best",
    url: "https://news.ycombinator.com/rss",
    category: "Tech News",
    description: "Top tech, startup & programming stories",
  },
  {
    title: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    category: "Tech News",
    description: "In-depth tech journalism & analysis",
  },
  {
    title: "IEEE Spectrum",
    url: "https://spectrum.ieee.org/rss/fulltext",
    category: "Tech News",
    description: "Engineering news from the IEEE",
  },
  {
    title: "arXiv — Software Engineering",
    url: "https://rss.arxiv.org/rss/cs.SE",
    category: "Tech News",
    description: "Software engineering research from arXiv",
  },
  // ── Economics & Social Science ───────────────────────────────────
  {
    title: "NBER Working Papers",
    url: "https://feeds.nber.org/nber/new_working_papers",
    category: "Economics",
    description: "New working papers from National Bureau of Economic Research",
  },
  {
    title: "LSE Business Review",
    url: "https://blogs.lse.ac.uk/businessreview/feed/",
    category: "Economics",
    description: "Business & economics research insights from LSE",
  },
  {
    title: "arXiv — Economics",
    url: "https://rss.arxiv.org/rss/econ",
    category: "Economics",
    description: "Economics preprints from arXiv",
  },
  // ── Cybersecurity ────────────────────────────────────────────────
  {
    title: "Krebs on Security",
    url: "https://krebsonsecurity.com/feed/",
    category: "Cybersecurity",
    description: "Investigative cybersecurity journalism",
  },
  {
    title: "The Hacker News",
    url: "https://feeds.feedburner.com/TheHackersNews",
    category: "Cybersecurity",
    description: "Latest cybersecurity news & vulnerabilities",
  },
  {
    title: "arXiv — Cryptography & Security",
    url: "https://rss.arxiv.org/rss/cs.CR",
    category: "Cybersecurity",
    description: "Cryptography & security research from arXiv",
  },
];

// ============================================
// PART 4: DATA TRANSFORMATION
// ============================================

function transformRssFeed(row: any): RssFeed {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    url: row.url,
    category: row.category || "General",
    lastFetchedAt: row.last_fetched_at,
    lastItemDate: row.last_item_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// PART 5: CRUD OPERATIONS
// ============================================

export async function getAllRssFeeds(): Promise<RssFeed[]> {
  if (!(await isAuthenticated())) return [];

  const { data, error } = await supabase
    .from("rss_feeds")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch RSS feeds:", error);
    return [];
  }

  return (data || []).map(transformRssFeed);
}

export async function createRssFeed(
  input: CreateRssFeedInput,
): Promise<RssFeed> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Must be logged in to subscribe to feeds");

  // Enforce per-user cap
  const { count } = await supabase
    .from("rss_feeds")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= MAX_FEEDS_PER_USER) {
    throw new Error(
      `You've reached the maximum of ${MAX_FEEDS_PER_USER} feed subscriptions.`,
    );
  }

  // Basic URL validation
  try {
    const parsed = new URL(input.url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Only http(s) URLs are allowed");
    }
  } catch {
    throw new Error("Invalid feed URL");
  }

  const { data, error } = await supabase
    .from("rss_feeds")
    .insert([
      {
        user_id: user.id,
        title: input.title.trim() || "Untitled Feed",
        url: input.url.trim(),
        category: input.category?.trim() || "General",
      },
    ])
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("You're already subscribed to this feed");
    }
    throw error;
  }

  return transformRssFeed(data);
}

export async function deleteRssFeed(id: string): Promise<void> {
  const { error } = await supabase.from("rss_feeds").delete().eq("id", id);
  if (error) throw error;
}

export async function touchRssFeed(
  id: string,
  lastItemDate: string | null,
): Promise<void> {
  await supabase
    .from("rss_feeds")
    .update({
      last_fetched_at: new Date().toISOString(),
      last_item_date: lastItemDate,
    })
    .eq("id", id);
}

// ============================================
// PART 6: FEED FETCH (via /api/rss proxy)
// ============================================

/**
 * Fetches and parses an RSS/Atom feed via the server-side proxy.
 * Requires a valid Supabase session (auth header is injected automatically).
 */
export async function fetchRssFeed(url: string): Promise<RssFeedResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("Must be logged in to fetch feeds");

  const apiUrl = `/api/rss?url=${encodeURIComponent(url)}`;
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Feed fetch failed (${response.status})`);
  }

  return (await response.json()) as RssFeedResponse;
}
