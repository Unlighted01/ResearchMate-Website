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
  {
    title: "arXiv — Artificial Intelligence",
    url: "https://rss.arxiv.org/rss/cs.AI",
    category: "AI / ML",
    description: "Latest cs.AI submissions",
  },
  {
    title: "arXiv — Machine Learning",
    url: "https://rss.arxiv.org/rss/cs.LG",
    category: "AI / ML",
    description: "Latest cs.LG submissions",
  },
  {
    title: "arXiv — Computation and Language (NLP)",
    url: "https://rss.arxiv.org/rss/cs.CL",
    category: "AI / ML",
    description: "Latest cs.CL submissions (NLP)",
  },
  {
    title: "arXiv — Statistics / Machine Learning",
    url: "https://rss.arxiv.org/rss/stat.ML",
    category: "AI / ML",
    description: "Latest stat.ML submissions",
  },
  {
    title: "arXiv — Computer Vision",
    url: "https://rss.arxiv.org/rss/cs.CV",
    category: "AI / ML",
    description: "Latest cs.CV submissions",
  },
  {
    title: "Nature — Latest Research",
    url: "https://www.nature.com/nature.rss",
    category: "Science",
    description: "Latest Nature research articles",
  },
  {
    title: "Science Magazine — Current Issue",
    url: "https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science",
    category: "Science",
    description: "Current Science issue feed",
  },
  {
    title: "PubMed — Trending Articles",
    url: "https://pubmed.ncbi.nlm.nih.gov/rss/trending.xml",
    category: "Biomedical",
    description: "PubMed trending biomedical papers",
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
