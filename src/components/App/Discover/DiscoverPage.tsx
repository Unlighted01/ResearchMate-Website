// ============================================
// DiscoverPage.tsx - Academic Paper Search
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useState, useCallback, useRef } from "react";
import {
  Search,
  ExternalLink,
  FileText,
  BookmarkPlus,
  Loader2,
  GraduationCap,
  Users,
  Calendar,
  Quote,
  ChevronDown,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../../../services/supabaseClient";
import { addItem } from "../../../services/storageService";

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

type SourceFilter = "all" | "semanticscholar" | "arxiv" | "pubmed";

interface DiscoverPageProps {
  useToast: () => {
    showToast: (message: string, type: "success" | "error" | "info") => void;
  };
}

// ============================================
// PART 3: CONSTANTS
// ============================================

const SOURCE_TABS: { value: SourceFilter; label: string; color: string }[] = [
  { value: "all", label: "All Sources", color: "#007AFF" },
  { value: "semanticscholar", label: "Semantic Scholar", color: "#1857B6" },
  { value: "arxiv", label: "ArXiv", color: "#B31B1B" },
  { value: "pubmed", label: "PubMed", color: "#326599" },
];

const SOURCE_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  semanticscholar: {
    label: "Semantic Scholar",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
  },
  arxiv: {
    label: "ArXiv",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
  },
  pubmed: {
    label: "PubMed",
    bg: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-700 dark:text-teal-300",
  },
};

// ============================================
// PART 4: HELPER FUNCTIONS
// ============================================

function truncateAbstract(text: string, maxLen = 250): string {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "...";
}

// ============================================
// PART 5: MAIN COMPONENT
// ============================================

const DiscoverPage: React.FC<DiscoverPageProps> = ({ useToast }) => {
  const { showToast } = useToast();

  // ---------- PART 5A: STATE ----------
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [results, setResults] = useState<AcademicResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ---------- PART 5B: HANDLERS ----------

  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;

      setLoading(true);
      setHasSearched(true);
      setResults([]);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const res = await fetch("/api/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || ""}`,
          },
          body: JSON.stringify({ query: trimmed, type: "academic", source }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Search failed" }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        setResults(data.results || []);

        if ((data.results || []).length === 0) {
          showToast("No results found. Try different keywords.", "info");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Search failed";
        showToast(msg, "error");
      } finally {
        setLoading(false);
      }
    },
    [query, source, showToast]
  );

  const handleSave = useCallback(
    async (paper: AcademicResult) => {
      setSavingIds((prev) => new Set(prev).add(paper.id));

      try {
        const citationText = [
          paper.authors.length > 0 ? paper.authors.join(", ") : "",
          paper.year ? `(${paper.year})` : "",
          `"${paper.title}"`,
          paper.venue || "",
          paper.doi ? `DOI: ${paper.doi}` : "",
        ]
          .filter(Boolean)
          .join(". ");

        await addItem({
          text: paper.abstract || paper.title,
          tags: [paper.source, paper.venue || "academic"].filter(Boolean),
          sourceUrl: paper.url,
          sourceTitle: paper.title,
          note: paper.abstract || "",
          citation: citationText,
          citationFormat: "apa",
          deviceSource: "web",
        });

        setSavedIds((prev) => new Set(prev).add(paper.id));
        showToast(`Saved "${paper.title.slice(0, 50)}..."`, "success");
      } catch {
        showToast("Failed to save paper", "error");
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev);
          next.delete(paper.id);
          return next;
        });
      }
    },
    [showToast]
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ---------- PART 5C: RENDER ----------

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Discover
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Search academic papers across Semantic Scholar, ArXiv & PubMed
          </p>
        </div>
        <GraduationCap className="w-8 h-8 text-[#007AFF] opacity-50" />
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search papers... e.g. "transformer attention mechanism"'
            className="theme-input w-full pl-12 pr-32 py-3.5 rounded-2xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 transition-all"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-[#007AFF] hover:bg-[#0066DD] disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium text-sm rounded-xl transition-all active:scale-95"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Search"
            )}
          </button>
        </div>

        {/* Source Tabs */}
        <div className="flex gap-2 flex-wrap">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSource(tab.value)}
              className={`
                px-4 py-1.5 rounded-full text-xs font-medium transition-all
                ${
                  source === tab.value
                    ? "text-white shadow-md"
                    : "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                }
              `}
              style={
                source === tab.value
                  ? { backgroundColor: tab.color }
                  : undefined
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </form>

      {/* Results */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Searching academic databases...
          </p>
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertCircle className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No papers found. Try different keywords or a broader search.
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {results.length} result{results.length !== 1 ? "s" : ""} found
          </p>

          {results.map((paper) => {
            const badge = SOURCE_BADGES[paper.source];
            const isExpanded = expandedIds.has(paper.id);
            const isSaving = savingIds.has(paper.id);
            const isSaved = savedIds.has(paper.id);

            return (
              <div
                key={`${paper.source}-${paper.id}`}
                className="theme-surface p-5 rounded-2xl border border-gray-200/60 dark:border-white/10 hover:border-[#007AFF]/30 transition-all group"
              >
                {/* Top row: source badge + citation count */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.bg} ${badge.text}`}
                  >
                    {badge.label}
                  </span>

                  {paper.citationCount !== undefined && paper.citationCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Quote className="w-3 h-3" />
                      {paper.citationCount.toLocaleString()} citations
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-gray-900 dark:text-white leading-snug mb-1.5">
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#007AFF] transition-colors"
                  >
                    {paper.title}
                  </a>
                </h3>

                {/* Authors + Year */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {paper.authors.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate max-w-[400px]">
                        {paper.authors.slice(0, 4).join(", ")}
                        {paper.authors.length > 4
                          ? ` +${paper.authors.length - 4} more`
                          : ""}
                      </span>
                    </span>
                  )}
                  {paper.year && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {paper.year}
                    </span>
                  )}
                  {paper.venue && (
                    <span className="text-gray-400 dark:text-gray-500 italic truncate max-w-[250px]">
                      {paper.venue}
                    </span>
                  )}
                </div>

                {/* Abstract */}
                {paper.abstract && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {isExpanded
                        ? paper.abstract
                        : truncateAbstract(paper.abstract)}
                    </p>
                    {paper.abstract.length > 250 && (
                      <button
                        onClick={() => toggleExpand(paper.id)}
                        className="text-xs text-[#007AFF] hover:text-[#0066DD] mt-1 flex items-center gap-0.5"
                      >
                        {isExpanded ? "Show less" : "Show more"}
                        <ChevronDown
                          className={`w-3 h-3 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-[#007AFF] hover:bg-[#007AFF]/5 rounded-lg transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View
                  </a>

                  {paper.pdfUrl && (
                    <a
                      href={paper.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-[#007AFF] hover:bg-[#007AFF]/5 rounded-lg transition-all"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      PDF
                    </a>
                  )}

                  {paper.doi && (
                    <a
                      href={`https://doi.org/${paper.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-all"
                    >
                      DOI
                    </a>
                  )}

                  <div className="flex-1" />

                  <button
                    onClick={() => handleSave(paper)}
                    disabled={isSaving || isSaved}
                    className={`
                      flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg transition-all active:scale-95
                      ${
                        isSaved
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : "bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF]/20"
                      }
                    `}
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isSaved ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <BookmarkPlus className="w-3.5 h-3.5" />
                    )}
                    {isSaved ? "Saved" : isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state (before first search) */}
      {!loading && !hasSearched && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-[#007AFF]" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Search Academic Papers
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
              Find papers from Semantic Scholar, ArXiv, and PubMed. Save them
              directly to your library for citations and AI analysis.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {[
              "machine learning",
              "quantum computing",
              "CRISPR gene editing",
              "climate change mitigation",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setQuery(suggestion);
                  searchInputRef.current?.focus();
                }}
                className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// PART 6: EXPORTS
// ============================================

export default DiscoverPage;
