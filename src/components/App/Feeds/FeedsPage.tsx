// ============================================
// FeedsPage.tsx - RSS / Atom feed subscriptions (Phase 4)
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Rss,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  Loader2,
  Sparkles,
  X,
  AlertCircle,
  Search,
} from "lucide-react";
import {
  getAllRssFeeds,
  createRssFeed,
  deleteRssFeed,
  fetchRssFeed,
  touchRssFeed,
  CURATED_FEEDS,
  MAX_FEEDS_PER_USER,
  type RssFeed,
  type RssFeedResponse,
  type RssItem,
} from "../../../services/rssFeedsService";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

type LoadState = "idle" | "loading" | "ready" | "error";

// ============================================
// PART 3: HELPER FUNCTIONS
// ============================================

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return date.toLocaleDateString();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

// ============================================
// PART 4: MAIN COMPONENT
// ============================================

const FeedsPage: React.FC = () => {
  // ---------- PART 4A: STATE ----------
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<RssFeed | null>(null);
  const [feedItems, setFeedItems] = useState<RssItem[]>([]);
  const [feedMeta, setFeedMeta] = useState<RssFeedResponse | null>(null);
  const [listState, setListState] = useState<LoadState>("loading");
  const [itemsState, setItemsState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedTitle, setNewFeedTitle] = useState("");
  const [newFeedCategory, setNewFeedCategory] = useState("General");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  // ---------- PART 4B: DATA LOADING ----------

  const loadFeeds = useCallback(async () => {
    setListState("loading");
    setError(null);
    try {
      const rows = await getAllRssFeeds();
      setFeeds(rows);
      setListState("ready");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load feeds";
      setError(msg);
      setListState("error");
    }
  }, []);

  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  const loadFeedItems = useCallback(async (feed: RssFeed) => {
    setSelectedFeed(feed);
    setItemsState("loading");
    setItemsError(null);
    setFeedItems([]);
    setFeedMeta(null);
    try {
      const result = await fetchRssFeed(feed.url);
      setFeedItems(result.items);
      setFeedMeta(result);
      setItemsState("ready");
      // Fire-and-forget DB update
      const latest = result.items[0]?.pubDate ?? null;
      touchRssFeed(feed.id, latest).catch(() => {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch feed";
      setItemsError(msg);
      setItemsState("error");
    }
  }, []);

  // ---------- PART 4C: HANDLERS ----------

  const handleAddFeed = useCallback(
    async (title: string, url: string, category: string) => {
      setAdding(true);
      setAddError(null);
      try {
        const feed = await createRssFeed({ title, url, category });
        setFeeds((prev) => [feed, ...prev]);
        setShowAddModal(false);
        setNewFeedUrl("");
        setNewFeedTitle("");
        setNewFeedCategory("General");
        // Auto-select and fetch the new feed
        loadFeedItems(feed);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to add feed";
        setAddError(msg);
      } finally {
        setAdding(false);
      }
    },
    [loadFeedItems],
  );

  const handleManualAdd = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newFeedUrl.trim()) {
        setAddError("URL is required");
        return;
      }
      handleAddFeed(
        newFeedTitle.trim() || newFeedUrl.trim(),
        newFeedUrl.trim(),
        newFeedCategory.trim() || "General",
      );
    },
    [handleAddFeed, newFeedUrl, newFeedTitle, newFeedCategory],
  );

  const handleQuickAddCurated = useCallback(
    (preset: (typeof CURATED_FEEDS)[number]) => {
      // Don't re-add if already subscribed
      if (feeds.some((f) => f.url === preset.url)) {
        const existing = feeds.find((f) => f.url === preset.url)!;
        loadFeedItems(existing);
        return;
      }
      handleAddFeed(preset.title, preset.url, preset.category);
    },
    [feeds, handleAddFeed, loadFeedItems],
  );

  const handleDelete = useCallback(
    async (feed: RssFeed, e: React.MouseEvent) => {
      e.stopPropagation();
      if (
        !window.confirm(`Unsubscribe from "${feed.title}"?`)
      )
        return;
      try {
        await deleteRssFeed(feed.id);
        setFeeds((prev) => prev.filter((f) => f.id !== feed.id));
        if (selectedFeed?.id === feed.id) {
          setSelectedFeed(null);
          setFeedItems([]);
          setFeedMeta(null);
          setItemsState("idle");
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to unsubscribe";
        window.alert(msg);
      }
    },
    [selectedFeed],
  );

  const handleRefresh = useCallback(() => {
    if (selectedFeed) loadFeedItems(selectedFeed);
  }, [selectedFeed, loadFeedItems]);

  // ---------- PART 4D: DERIVED STATE ----------

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return feedItems;
    const q = searchQuery.toLowerCase();
    return feedItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.authors.some((a) => a.toLowerCase().includes(q)),
    );
  }, [feedItems, searchQuery]);

  const subscribedUrls = useMemo(
    () => new Set(feeds.map((f) => f.url)),
    [feeds],
  );

  // ---------- PART 4E: RENDER ----------

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Feeds
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Subscribe to RSS / Atom feeds from arXiv, PubMed, Nature, and more
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {feeds.length} / {MAX_FEEDS_PER_USER}
          </span>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={feeds.length >= MAX_FEEDS_PER_USER}
            className="flex items-center gap-2 px-4 py-2 bg-[#007AFF] hover:bg-[#0066DD] text-white text-sm font-medium rounded-full shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Feed
          </button>
        </div>
      </div>

      {/* Curated suggestions (shown when no feed selected or as quick-add bar) */}
      {!selectedFeed && listState === "ready" && feeds.length === 0 && (
        <div className="theme-surface rounded-2xl border border-gray-200/60 dark:border-white/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[#007AFF]" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Popular feeds to get you started
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CURATED_FEEDS.map((preset) => (
              <button
                key={preset.url}
                onClick={() => handleQuickAddCurated(preset)}
                disabled={adding}
                className="text-left p-4 rounded-xl bg-white/40 dark:bg-white/5 hover:bg-[#007AFF]/5 dark:hover:bg-[#007AFF]/10 border border-gray-200/60 dark:border-white/10 hover:border-[#007AFF]/40 transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Rss className="w-4 h-4 text-[#007AFF] flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {preset.title}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {preset.description}
                </p>
                <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#007AFF]/10 text-[#007AFF]">
                  {preset.category}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Two-column: feed list | feed items */}
      {(feeds.length > 0 || selectedFeed) && (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Left: subscribed feeds */}
          <aside className="theme-surface rounded-2xl border border-gray-200/60 dark:border-white/10 p-4 h-fit lg:sticky lg:top-4">
            <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-3 tracking-wide">
              Subscribed
            </h3>

            {listState === "loading" && (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 text-[#007AFF] animate-spin" />
              </div>
            )}

            {listState === "error" && (
              <div className="text-xs text-red-500 p-3">{error}</div>
            )}

            {listState === "ready" && feeds.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 p-3">
                No feeds yet. Pick one from the suggestions above or add a
                custom URL.
              </p>
            )}

            <ul className="space-y-1">
              {feeds.map((feed) => {
                const active = selectedFeed?.id === feed.id;
                return (
                  <li key={feed.id}>
                    <button
                      onClick={() => loadFeedItems(feed)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all group ${
                        active
                          ? "bg-[#007AFF]/10 text-[#007AFF]"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                      }`}
                    >
                      <Rss
                        className={`w-4 h-4 flex-shrink-0 ${
                          active
                            ? "text-[#007AFF]"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{feed.title}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">
                          {feed.category} ·{" "}
                          {formatRelativeDate(feed.lastFetchedAt)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(feed, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-all"
                        aria-label={`Unsubscribe from ${feed.title}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Right: items */}
          <section className="min-w-0">
            {!selectedFeed && (
              <div className="theme-surface rounded-2xl border border-gray-200/60 dark:border-white/10 p-12 text-center">
                <Rss className="w-12 h-12 text-gray-300 dark:text-white/20 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a feed on the left to see its latest items.
                </p>
              </div>
            )}

            {selectedFeed && (
              <>
                {/* Feed header + refresh + search */}
                <div className="theme-surface rounded-2xl border border-gray-200/60 dark:border-white/10 p-4 mb-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {feedMeta?.title || selectedFeed.title}
                      </h2>
                      {feedMeta?.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {feedMeta.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleRefresh}
                      disabled={itemsState === "loading"}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-[#007AFF] hover:bg-[#007AFF]/5 rounded-lg transition-all disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          itemsState === "loading" ? "animate-spin" : ""
                        }`}
                      />
                      Refresh
                    </button>
                  </div>
                  {/* Search within feed */}
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search within feed..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white/50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40"
                    />
                  </div>
                </div>

                {/* Items */}
                {itemsState === "loading" && (
                  <div className="flex flex-col items-center py-16 gap-2">
                    <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Fetching latest items…
                    </p>
                  </div>
                )}

                {itemsState === "error" && (
                  <div className="flex flex-col items-center py-12 gap-3 theme-surface rounded-2xl border border-red-200/60 dark:border-red-900/30">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                    <p className="text-sm text-gray-700 dark:text-gray-300 text-center max-w-md">
                      {itemsError}
                    </p>
                    <button
                      onClick={handleRefresh}
                      className="px-4 py-2 bg-[#007AFF] hover:bg-[#0066DD] text-white text-sm font-medium rounded-full transition-all active:scale-95"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {itemsState === "ready" && filteredItems.length === 0 && (
                  <div className="theme-surface rounded-2xl border border-gray-200/60 dark:border-white/10 p-12 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {searchQuery
                        ? "No items match your search."
                        : "No items in this feed yet."}
                    </p>
                  </div>
                )}

                {itemsState === "ready" && filteredItems.length > 0 && (
                  <ul className="space-y-3">
                    {filteredItems.map((item) => (
                      <li
                        key={item.id}
                        className="theme-surface rounded-2xl border border-gray-200/60 dark:border-white/10 p-5 hover:border-[#007AFF]/40 transition-all group"
                      >
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-[#007AFF] transition-colors leading-snug">
                              {item.title}
                            </h3>
                            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#007AFF] transition-colors flex-shrink-0 mt-0.5" />
                          </div>

                          {(item.authors.length > 0 || item.pubDate) && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                              {item.authors.length > 0 && (
                                <span className="truncate max-w-md">
                                  {item.authors.slice(0, 3).join(", ")}
                                  {item.authors.length > 3 &&
                                    ` +${item.authors.length - 3}`}
                                </span>
                              )}
                              {item.authors.length > 0 && item.pubDate && (
                                <span>·</span>
                              )}
                              {item.pubDate && (
                                <span>{formatRelativeDate(item.pubDate)}</span>
                              )}
                            </div>
                          )}

                          {item.summary && (
                            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                              {truncate(item.summary, 320)}
                            </p>
                          )}

                          {item.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {item.categories.slice(0, 4).map((cat) => (
                                <span
                                  key={cat}
                                  className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400"
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          )}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {/* Curated feeds strip (visible when some feeds exist, so users can add more) */}
      {feeds.length > 0 && (
        <div className="theme-surface rounded-2xl border border-gray-200/60 dark:border-white/10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#007AFF]" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              More suggestions
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {CURATED_FEEDS.filter((p) => !subscribedUrls.has(p.url)).map(
              (preset) => (
                <button
                  key={preset.url}
                  onClick={() => handleQuickAddCurated(preset)}
                  disabled={
                    adding || feeds.length >= MAX_FEEDS_PER_USER
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-white/40 dark:bg-white/5 hover:bg-[#007AFF]/10 border border-gray-200/60 dark:border-white/10 hover:border-[#007AFF]/40 text-gray-700 dark:text-gray-300 transition-all disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" />
                  {preset.title}
                </button>
              ),
            )}
          </div>
        </div>
      )}

      {/* ============================================
          Add Feed Modal
          ============================================ */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => !adding && setShowAddModal(false)}
        >
          <div
            className="theme-surface rounded-2xl border border-gray-200/60 dark:border-white/10 p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Custom Feed
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                disabled={adding}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Feed URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  required
                  placeholder="https://example.com/feed.xml"
                  className="w-full px-3 py-2.5 text-sm rounded-lg bg-white/50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newFeedTitle}
                  onChange={(e) => setNewFeedTitle(e.target.value)}
                  placeholder="Auto-detected if empty"
                  className="w-full px-3 py-2.5 text-sm rounded-lg bg-white/50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Category
                </label>
                <input
                  type="text"
                  value={newFeedCategory}
                  onChange={(e) => setNewFeedCategory(e.target.value)}
                  placeholder="General"
                  className="w-full px-3 py-2.5 text-sm rounded-lg bg-white/50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40"
                />
              </div>

              {addError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-900/40">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-300">
                    {addError}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={adding || !newFeedUrl.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#007AFF] hover:bg-[#0066DD] text-white text-sm font-medium rounded-full shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all active:scale-95"
                >
                  {adding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {adding ? "Adding…" : "Subscribe"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={adding}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// PART 5: EXPORTS
// ============================================

export default FeedsPage;
