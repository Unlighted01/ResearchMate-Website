# Website Mirror Prompt — ResearchMate Extension → Website Sync

> Read `CLAUDE.md` first before touching any code.
> This prompt documents what was built in the Chrome extension and what needs to be mirrored on the website.

---

## Context

The Chrome extension (`ResearchMate Extension/`) just received a major update before Chrome Store submission. Several features were added or fixed that the website dashboard (`src/components/App/`) needs to mirror so both platforms stay in sync.

---

## What Was Built in the Extension (source of truth)

### 1. Citation Accuracy Overhaul (`src/services/geminiService.ts`)

The old citation code used `querySelector` (got only 1 author), `new Date(x).getFullYear()` (returned NaN on formats like `"2025/12"` or `"December 2025"`), and had no DOI lookup.

**New citation lookup waterfall (in order):**

```
Tier 1    → ISBN → Open Library API
Tier 1.5  → DOI found (meta tag / URL / DOM text scan / <a> link scan) → CrossRef DOI lookup
Tier 1.75 → No DOI but title present → CrossRef title search (fixes ResearchGate, Springer, PubMed)
Tier 2    → Local meta tags (author + title) → rule-based formatting
Tier 3    → AI (only if useAiCitation=true or all above fail)
```

**Key helpers added:**
- `extractDOIFromUrl(url)` — regex `/10\.\d{4,}\/[^\s"<>...]+/` on any string
- `lookupCrossRef(doi)` — `GET https://api.crossref.org/works/${doi}` (free, no key, CORS-enabled)
- `searchCrossRefByTitle(title, year?)` — `GET https://api.crossref.org/works?query.bibliographic=...&rows=3`, fuzzy title match
- `extractYear(dateStr)` — handles `"2025"`, `"2025/12"`, `"2025-12-01"`, `"December 2025"` — no more NaN → "n.d."
- `toInitials(given)` — `"Scott W." → "S. W."`
- `formatAuthors(authors, style)` — per-style author list for APA, MLA, Chicago, Harvard, IEEE, BibTeX
- `formatCrossRefCitation(work, style, url)` — full academic citation with vol/issue/pages per style

**DOM scraping improvements (inside `executeScript` callback):**
- `querySelectorAll('meta[name="citation_author"]')` — collects ALL authors (was `querySelector`, got only first)
- DOM scan for DOI: body text → `<a href>` attributes → meta tags (in that priority)
- New fields extracted: `volume`, `issue`, `pages` (from `citation_firstpage`/`citation_lastpage`)
- Title cleaning before CrossRef search: strips `(PDF)` prefix and `| SiteName` suffixes

**Default citation format changed from `"apa"` to `"mla"`**

---

### 2. Citation Card UX Fixes (`src/components/ItemDetail.tsx`)

- **Copy button** added inside the citation card (below the citation text)
- **`break-all`** added to citation `<p>` — long DOI/URLs no longer overflow the card
- Default format state changed to `"mla"`

---

### 3. Accessibility / #8 (`src/hooks/useFocusTrap.ts` + components)

A reusable `useFocusTrap(containerRef, isActive, onEscape)` hook was created:
- Auto-focuses first focusable element on open
- Traps Tab/Shift+Tab within the container
- Fires `onEscape` on Escape key
- Restores focus to the previously focused element on close

Applied to:
- Auth modal: `role="dialog"`, `aria-modal="true"`, `aria-label`, backdrop click to close
- CollectionSelector: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, backdrop click to close
- Color swatches: `aria-pressed` + `aria-label` with `"(selected)"` state
- Sync status: wrapped in `aria-live="polite"` region

---

### 4. Items Already Working (confirmed, not broken)

These were in the backlog but were already implemented — do NOT re-implement:
- Undo delete (optimistic remove + 5s toast with Undo action, then actual delete at 5100ms)
- Loading skeleton (SkeletonCard with `animate-pulse`)
- Empty state (SVG illustration + step-by-step for new users)
- Infinite scroll (PAGE_SIZE=30, IntersectionObserver sentinel)
- Keyboard nav on list items (role="button", tabIndex, onKeyDown Enter/Space)

---

## What Needs to Be Mirrored on the Website

### Priority 1 — Citation accuracy (high impact, user-facing)

**File: `src/components/App/CitationGenerator.tsx`**

The website's CitationGenerator likely calls `api/extract-citation.ts` for all citations. Mirror the following:

1. **CrossRef waterfall** — add the same Tier 1.5 + 1.75 logic client-side OR update `api/extract-citation.ts` to use CrossRef as the first lookup before the AI fallback. The API endpoint already has some CrossRef/Semantic Scholar logic per the CLAUDE.md — verify it uses `searchCrossRefByTitle` as a fallback when DOI isn't found.

2. **`extractYear()` helper** — replace any `new Date(x).getFullYear()` calls with the robust version that handles `"2025/12"`, `"December 2025"`, etc.

3. **Multi-author fix** — if the website scrapes meta tags anywhere client-side, use `querySelectorAll('meta[name="citation_author"]')` not `querySelector`.

4. **Copy button on citation output** — add a copy button below the citation text in the CitationGenerator component.

5. **`break-all` / `overflow-wrap: break-word`** on citation text — long DOI URLs overflow the card.

6. **Default format** — change default from `"apa"` to `"mla"` in CitationGenerator state and any localStorage fallback.

### Priority 2 — Accessibility (medium impact)

**File: `src/hooks/useFocusTrap.ts`** (create this — same hook as extension)

Apply to any modal overlays in the website dashboard:
- Any `<div className="fixed inset-0 ...">` modal wrapper needs `role="dialog"`, `aria-modal="true"`, the focus trap hook, and Escape-to-close.
- Buttons that are cosmetic (non-`<button>` elements acting as buttons) need `role="button"` + `tabIndex={0}` + `onKeyDown`.

### Priority 3 — Sync status announcements

Wrap any loading/status messages (sync results, save confirmations) in `aria-live="polite"` so screen readers announce them.

---

## Files to Check / Modify

| Website File | What to Check / Change |
|---|---|
| `api/extract-citation.ts` | Add CrossRef title-search fallback before AI; verify multi-author handling |
| `src/components/App/CitationGenerator.tsx` | Copy button, break-all, default MLA, extractYear helper |
| `src/services/geminiService.ts` (website) | Mirror extractYear, formatAuthors, formatCrossRefCitation helpers |
| `src/hooks/useFocusTrap.ts` | Create (copy from extension — same implementation) |
| Any modal component | Add role="dialog", aria-modal, useFocusTrap, Escape-to-close |

---

## CrossRef API Reference

```
DOI lookup:   GET https://api.crossref.org/works/{DOI}
Title search: GET https://api.crossref.org/works?query.bibliographic={title}&rows=3
```

- Free, no API key required
- CORS-enabled (works from browser and server)
- Returns: `title[]`, `author[]` (`{ given, family }`), `published.date-parts[][]`, `container-title[]`, `volume`, `issue`, `page`, `DOI`

---

## Notes for the AI working on this

- Follow the PART sectioning system from `CLAUDE.md` — every file must use it
- Keep Apple design aesthetic — no design changes, just functional additions
- Run `npm run build` or `npx tsc --noEmit` after changes
- The extension's `useFocusTrap` hook can be copied verbatim — it's pure TypeScript with no extension-specific APIs
- Do NOT touch the Three.js bubble cursor, FloatingOrbs, or theme system — those are unrelated
