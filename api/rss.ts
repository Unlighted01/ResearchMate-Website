// ============================================
// rss.ts - RSS / Atom Feed CORS Proxy + Parser
// ============================================
// Fetches an external RSS/Atom feed server-side (bypassing browser CORS)
// and returns a normalized JSON representation for the Feeds page.
//
// Auth-gated but does NOT deduct credits — RSS fetches are cheap and
// users will poll often. Rate limiting in auth.ts is enough protection.

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateUser, setCorsHeaders } from "./_utils/auth.js";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

export interface RssItem {
  id: string;
  title: string;
  link: string;
  summary: string;
  authors: string[];
  pubDate: string | null; // ISO string
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

// ============================================
// PART 3: CONSTANTS & CONFIGURATION
// ============================================

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB max feed size
const FETCH_TIMEOUT_MS = 10_000;
const MAX_ITEMS = 50;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

// ============================================
// PART 4: HELPER FUNCTIONS
// ============================================

/**
 * Strip CDATA wrappers and decode a handful of common HTML entities.
 */
function cleanText(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ") // strip inline HTML
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

/**
 * Extract the first matching tag's inner content from an XML string.
 * Supports optional namespaces (e.g. `media:title`).
 */
function extractTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(re);
  return match ? match[1] : null;
}

/**
 * Extract all matching tags (returns inner strings).
 */
function extractAllTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "gi");
  const results: string[] = [];
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1]);
  return results;
}

/**
 * Pull an attribute value out of a self-closing or opening tag.
 * e.g. extractAttr('<link href="https://x.com" />', 'link', 'href')
 */
function extractLinkHref(itemXml: string): string {
  // Atom: <link href="..." rel="alternate" />
  const atomLink = itemXml.match(
    /<link[^>]*\bhref=["']([^"']+)["'][^>]*>/i,
  );
  if (atomLink) {
    // Prefer rel="alternate" or no rel
    const allLinks = [...itemXml.matchAll(/<link[^>]*>/gi)];
    for (const link of allLinks) {
      const tag = link[0];
      const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1];
      if (!rel || rel === "alternate") {
        const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
        if (href) return href;
      }
    }
    return atomLink[1];
  }
  // RSS 2.0: <link>https://...</link>
  const rssLink = extractTag(itemXml, "link");
  return rssLink ? cleanText(rssLink) : "";
}

function parsePubDate(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = cleanText(raw);
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Parse authors from either RSS 2.0 (<author>name</author> or <dc:creator>)
 * or Atom (<author><name>...</name></author>).
 */
function extractAuthors(itemXml: string): string[] {
  const authors: string[] = [];

  // Atom <author><name>...</name></author>
  const atomAuthors = extractAllTags(itemXml, "author");
  for (const a of atomAuthors) {
    const name = extractTag(a, "name");
    if (name) {
      authors.push(cleanText(name));
    } else {
      const plain = cleanText(a);
      if (plain) authors.push(plain);
    }
  }

  // RSS 2.0 dc:creator
  const creators = extractAllTags(itemXml, "dc:creator");
  for (const c of creators) {
    const name = cleanText(c);
    if (name) authors.push(name);
  }

  return Array.from(new Set(authors)).filter((a) => a.length > 0);
}

function extractCategories(itemXml: string): string[] {
  const cats = extractAllTags(itemXml, "category");
  return cats.map((c) => cleanText(c)).filter(Boolean);
}

// ============================================
// PART 5: FEED PARSERS
// ============================================

function parseAtomFeed(xml: string): RssFeedResponse {
  const channelTitle = cleanText(extractTag(xml, "title")) || "Untitled Feed";
  const channelSubtitle = cleanText(extractTag(xml, "subtitle")) || "";
  const channelLink = extractLinkHref(xml);

  const entries = extractAllTags(xml, "entry").slice(0, MAX_ITEMS);
  const items: RssItem[] = entries.map((entry, idx) => ({
    id: cleanText(extractTag(entry, "id")) || `atom-${idx}`,
    title: cleanText(extractTag(entry, "title")) || "Untitled",
    link: extractLinkHref(entry),
    summary:
      cleanText(extractTag(entry, "summary")) ||
      cleanText(extractTag(entry, "content")) ||
      "",
    authors: extractAuthors(entry),
    pubDate: parsePubDate(
      extractTag(entry, "published") || extractTag(entry, "updated"),
    ),
    categories: extractCategories(entry),
  }));

  return {
    title: channelTitle,
    description: channelSubtitle,
    link: channelLink,
    items,
    fetchedAt: new Date().toISOString(),
    source: "atom",
  };
}

function parseRss2Feed(xml: string): RssFeedResponse {
  const channelXml = extractTag(xml, "channel") || xml;
  const channelTitle =
    cleanText(extractTag(channelXml, "title")) || "Untitled Feed";
  const channelDesc = cleanText(extractTag(channelXml, "description")) || "";
  const channelLink = cleanText(extractTag(channelXml, "link")) || "";

  const items = extractAllTags(xml, "item").slice(0, MAX_ITEMS);
  const parsedItems: RssItem[] = items.map((item, idx) => ({
    id:
      cleanText(extractTag(item, "guid")) ||
      cleanText(extractTag(item, "link")) ||
      `rss2-${idx}`,
    title: cleanText(extractTag(item, "title")) || "Untitled",
    link: cleanText(extractTag(item, "link")) || "",
    summary:
      cleanText(extractTag(item, "description")) ||
      cleanText(extractTag(item, "content:encoded")) ||
      "",
    authors: extractAuthors(item),
    pubDate: parsePubDate(
      extractTag(item, "pubDate") || extractTag(item, "dc:date"),
    ),
    categories: extractCategories(item),
  }));

  return {
    title: channelTitle,
    description: channelDesc,
    link: channelLink,
    items: parsedItems,
    fetchedAt: new Date().toISOString(),
    source: "rss2",
  };
}

function parseFeed(xml: string): RssFeedResponse {
  // Cheap content sniff: Atom feeds have <feed xmlns="...atom...">
  if (/<feed[^>]*xmlns=["'][^"']*atom/i.test(xml) || /<entry[\s>]/i.test(xml)) {
    return parseAtomFeed(xml);
  }
  if (/<rss[^>]*>/i.test(xml) || /<channel[\s>]/i.test(xml)) {
    return parseRss2Feed(xml);
  }
  // Fallback — try RSS 2 parser and return whatever we get
  const result = parseRss2Feed(xml);
  return { ...result, source: "unknown" };
}

// ============================================
// PART 6: FETCH HELPER
// ============================================

async function fetchFeedXml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "ResearchMate/1.0 (https://research-mate-website.vercel.app)",
        Accept:
          "application/atom+xml, application/rss+xml, application/xml, text/xml, */*",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      throw new Error(`Feed fetch failed: HTTP ${res.status}`);
    }

    // Guard against oversized responses
    const lenHeader = res.headers.get("content-length");
    if (lenHeader && parseInt(lenHeader, 10) > MAX_BYTES) {
      throw new Error("Feed is too large (>5 MB)");
    }

    const text = await res.text();
    if (text.length > MAX_BYTES) {
      throw new Error("Feed is too large (>5 MB)");
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

// ============================================
// PART 7: HANDLER
// ============================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // CORS
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth (no credit deduction — RSS is cheap)
  const auth = await authenticateUser(req);
  if (!auth.user) {
    return res
      .status(auth.statusCode || 401)
      .json({ error: auth.error || "Unauthorized" });
  }

  // Extract URL from query string or POST body
  const rawUrl =
    (req.query.url as string) ||
    (typeof req.body === "object" && req.body?.url) ||
    "";

  if (!rawUrl || typeof rawUrl !== "string") {
    return res.status(400).json({ error: "Missing 'url' parameter" });
  }

  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return res
      .status(400)
      .json({ error: "Only http(s) URLs are allowed" });
  }

  // Block localhost / private ranges to prevent SSRF
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    return res.status(400).json({ error: "Private/local URLs are blocked" });
  }

  try {
    const xml = await fetchFeedXml(parsed.toString());
    const feed = parseFeed(xml);

    // Lightweight metrics
    console.log(
      `📡 RSS fetched: ${parsed.hostname} | ${feed.source} | ${feed.items.length} items`,
    );

    return res.status(200).json(feed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("RSS fetch/parse error:", msg);
    return res.status(502).json({
      error: `Failed to fetch or parse feed: ${msg}`,
    });
  }
}
