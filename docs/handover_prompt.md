# ResearchMate — AI Handover Document

> Last updated: April 9, 2026
> Read root `CLAUDE.md` first for coding conventions, design system, and PART sectioning rules.

---

## Project Overview

**ResearchMate** — A multi-platform research management ecosystem.
- **Web Dashboard** (React/TypeScript/Vite) — hosted on Vercel
- **Chrome Extension** — calls the same Vercel API endpoints
- **Smart Pen** (ESP32-S3 Hardware) — routes through Supabase Edge Function to Vercel API

**Tech Stack:** React 18, TypeScript, Vite, Supabase (auth + DB + storage + Edge Functions), Vanilla CSS with CSS custom properties, Vercel Serverless Functions, TipTap v3 (ProseMirror-based rich text editor).

**Repo:** `Unlighted01/ResearchMate-Website` on GitHub. Vercel auto-deploys from `main`.

---

## Vercel Serverless Functions (10/12 — 2 FREE SLOTS)

Vercel Hobby plan allows **max 12 serverless functions**. We have 2 free slots after merging.

| # | Endpoint | Purpose | Model | Fallback Chain |
|---|----------|---------|-------|----------------|
| 1 | `api/chat.ts` | Academic chat assistant | gemini-2.5-flash | Gemini -> OpenRouter -> Groq |
| 2 | `api/cite.ts` | ISBN/DOI/YouTube lookup | N/A (data only) | OpenLibrary -> Google Books / CrossRef / oEmbed |
| 3 | `api/extract-citation.ts` | URL -> citation metadata | gemini-2.5-flash | DOI/Crossref/Semantic Scholar + AI |
| 4 | `api/generate-tags.ts` | Auto-tagging | gemini-2.5-flash | Gemini -> OpenRouter -> Groq |
| 5 | `api/identify-source.ts` | Source identification | gemini-2.5-flash | — |
| 6 | `api/insights.ts` | Key insights extraction | gemini-2.5-flash | Gemini -> OpenRouter -> Groq |
| 7 | `api/ocr.ts` | Image text extraction | gemini-2.5-flash | OpenRouter -> Gemini -> Claude |
| 8 | `api/search.ts` | Unified search (academic + books) | N/A (API calls) | `type:"academic"` -> S2+ArXiv+PubMed; `type:"books"` -> Google Books+CrossRef+OMDB |
| 9 | `api/set-custom-key.ts` | BYOK key management | N/A | — |
| 10 | `api/summarize.ts` | Unified summarization | gemini-2.5-flash | Full: Gemini->OpenRouter->Groq; Item (when `itemId` present): OpenRouter->Gemini->Claude + writes to DB |

**Also:** `api/_utils/auth.ts` (shared auth + credit system — underscore prefix means Vercel ignores it).

**Test file:** `tests/ocr.integration.test.ts` — moved OUT of `api/` to avoid counting as a function. Run with `npx vitest run tests/ocr.integration.test.ts`.

**Merges completed (April 2026):**
- `summarize.ts` + `summarize-item.ts` -> `summarize.ts` — if `itemId` is in the request body, uses short prompt + writes to DB; otherwise uses full summarization with mode selection
- `search-academic.ts` + `search-books.ts` -> `search.ts` — `type: "academic"` (default) or `type: "books"` in request body
- Frontend updated: `geminiService.ts` points both functions at `/api/summarize`; `DiscoverPage.tsx` calls `/api/search`
- Chrome extension will need to update calls from `/api/search-books` to `/api/search` with `type: "books"`

---

## Endpoint Merges (COMPLETED April 2026)

Both merges are done. We went from 12 -> 10 functions, freeing 2 slots.

### Merge 1: `summarize.ts` absorbed `summarize-item.ts`
- If `itemId` is in request body -> short 2-4 sentence summary, writes to DB via service role key, fallback: OpenRouter -> Gemini -> Claude
- If no `itemId` -> full summarization with `mode` (ultra-short/standard/detailed), fallback: Gemini -> OpenRouter -> Groq
- `geminiService.ts` updated: both `summarizeText()` and `generateItemSummary()` now call `/api/summarize`

### Merge 2: `search.ts` absorbed `search-academic.ts` + `search-books.ts`
- `type: "academic"` (default) -> Semantic Scholar + ArXiv + PubMed, with ArXiv ID and DOI direct lookup
- `type: "books"` -> Google Books + CrossRef + OMDB
- `DiscoverPage.tsx` calls `/api/search` with `type: "academic"`
- **Chrome extension needs updating** to call `/api/search` with `type: "books"` instead of `/api/search-books`

---

## Feature Roadmap (9 Phases)

All phases were planned and approved by user (Kian) in April 2026.

| Phase | Feature | Status | Needs API? |
|-------|---------|--------|------------|
| 1 | Dynamic Bibliography + LaTeX Export | DONE | No |
| 2 | Academic Database Search (Discover) | DONE | Yes (search-academic.ts) |
| 3 | PDF Reader & Annotator | DONE (⚠ text selection bug — see Known Issues) | No (client-side pdfjs-dist) |
| 4 | RSS Feeds (ArXiv/PubMed new paper alerts) | NOT STARTED | Yes (needs 1 slot — CORS proxy) |
| 5 | Media Transcription (audio/video -> text) | NOT STARTED | Yes (needs 1 slot — Whisper/Gemini) |
| 6 | Knowledge Graph (concept maps) | NOT STARTED | No (client-side D3/force graph) |
| 7 | Paper Citation Graph | NOT STARTED | No (Semantic Scholar API from client) |
| 8 | Kanban Board (project workflow) | NOT STARTED | No (direct Supabase) |
| 9 | Shared Collections (collaboration) | NOT STARTED | No (Supabase RLS) |

**Next up after merges:** Phase 3 (PDF Reader) — entirely client-side, no new serverless function needed.

---

## What Was Built Recently (April 2026 Sessions)

### Phase 1: Dynamic Bibliography + LaTeX Export

Generates formatted reference sections from cited items in the Document Editor and exports documents as `.tex` files.

**Files created/modified:**
- `src/components/App/DocumentEditor/extensions/bibliography.ts` — TipTap extension adding `dataBibliography` attribute to heading nodes
- `src/components/App/DocumentEditor/bibliographyUtils.ts` — Pure functions: `buildCitationDataFromItem()`, `generateBibliographyNodes()`, `removeBibliographyFromDoc()`, `insertBibliography()`
- `src/components/App/DocumentEditor/latexExportUtils.ts` — Full TipTap JSON -> LaTeX conversion with `\begin{thebibliography}` section
- `src/components/App/DocumentEditor/useDocumentEditor.ts` — Added `citedItemIds` state tracking (stored as sibling key in TipTap JSON content — TipTap ignores unknown keys)
- `src/components/App/DocumentEditor/ItemImportDrawer.tsx` — Added `onItemInserted` callback
- `src/components/App/DocumentEditor/DocumentEditor.tsx` — Orchestrates bibliography insertion + LaTeX export
- `src/components/App/DocumentEditor/EditorToolbar.tsx` — Bibliography dropdown (5 formats: APA/MLA/Chicago/Harvard/IEEE) + Export dropdown (docx/pdf/tex)

**How citedItemIds works:** When a user inserts a research item into the editor, its ID is tracked in `citedItemIds` array. This array is stored alongside TipTap content in the same Supabase jsonb column: `{ type: "doc", content: [...], citedItemIds: ["id1", "id2"] }`. TipTap ignores the extra key. No schema migration needed.

### Phase 2: Academic Database Search (Discover Page)

Search papers across Semantic Scholar, ArXiv, and PubMed. Save directly to library.

**Files created/modified:**
- `api/search-academic.ts` — Vercel serverless endpoint. Queries 3 sources in parallel via `Promise.allSettled`. Features:
  - Direct ArXiv ID lookup (detects `2604.06234` or `arXiv:2604.06234` patterns) — bypasses slow ArXiv search index for brand new papers
  - Direct DOI lookup via Semantic Scholar
  - Title-specific ArXiv search (`ti:` field) for long queries, sorted by `submittedDate`
  - Semantic Scholar title-match fallback (year-filtered) when main search returns few results
  - Deduplication by DOI or normalized title
- `src/components/App/Discover/DiscoverPage.tsx` — Search UI with source filter tabs (All/Semantic Scholar/ArXiv/PubMed), paper cards with title/authors/year/venue/abstract/citations, expandable abstracts, View/PDF/DOI links, Save to library button
- `src/components/App/Discover/index.ts` — Barrel export
- `src/App.tsx` — Added `/app/discover` route
- `src/components/shared/DashboardLayout.tsx` — Added "Discover" nav item with `GraduationCap` icon (2nd position in sidebar)

**Known limitation:** ArXiv's search API takes days/weeks to index new papers. That's why the direct ArXiv ID lookup was added — if you know the ID, it fetches instantly. Title search for very new papers (< 1 week old) may not return results from ArXiv.

### Document Editor Toolbar (Earlier in April 2026)

Full Google Docs-style toolbar for TipTap editor.

**Files created:**
- `src/components/App/DocumentEditor/extensions/fontSize.ts` — Custom TipTap extension for fontSize on textStyle mark
- `src/components/App/DocumentEditor/extensions/indent.ts` — Custom TipTap extension for paragraph/heading indent (0-8 levels, Tab/Shift-Tab)

**Files heavily modified:**
- `EditorToolbar.tsx` — Complete rewrite with all formatting buttons. Key patterns:
  - `useForceUpdate()` hook + `editor.on("transaction", forceUpdate)` for reactive toolbar state
  - `useClickOutside()` hook for dropdown dismissal
  - `onMouseDown={e => e.preventDefault()}` on ALL buttons to prevent editor blur
  - Insert and Bibliography are icon-only buttons (compact) to prevent toolbar overflow
- `EditorCanvas.tsx` — Registered 10 new TipTap extensions (TextStyle, Color, Highlight, TextAlign, Subscript, Superscript, FontFamily, FontSize, Indent, Bibliography). Disabled drag-and-drop via `handleDOMEvents`.
- `exportUtils.ts` — Added DOCX export support for all new marks (color, fontFamily, fontSize, highlight, subscript, superscript, textAlign, indent)

**Bugs fixed:**
- Dropdowns not working (buttons stealing focus from editor)
- Font size +/- not responsive (toolbar not re-rendering on selection changes)
- Text draggable anywhere (ProseMirror default drag-and-drop disabled)
- Export dropdown z-index issues
- Toolbar wrapping / Export button cutoff
- "Saving..." layout shift (fixed-width opacity toggle)
- Dropdowns hidden behind editor (z-index layering)

---

## Project Structure (Current)

```
ResearchMate Website/
+-- CLAUDE.md                        # Coding conventions, design system
+-- docs/
|   +-- handover_prompt.md           # You are here
|   +-- CLAUDE.md                    # Session context (needs updating too)
|   +-- extension-mirror-prompt.md   # Chrome extension feature parity
+-- api/                             # Vercel Serverless Functions (10/12 — 2 free)
|   +-- _utils/auth.ts              # Shared auth + credit system
|   +-- chat.ts
|   +-- cite.ts
|   +-- extract-citation.ts
|   +-- generate-tags.ts
|   +-- identify-source.ts
|   +-- insights.ts
|   +-- ocr.ts
|   +-- search.ts                   # MERGED: academic + books search
|   +-- set-custom-key.ts
|   +-- summarize.ts                # MERGED: full + item summaries
+-- tests/
|   +-- ocr.integration.test.ts     # Moved from api/ to avoid function limit
+-- src/
|   +-- App.tsx                      # Router + OAuthPopupHandler
|   +-- context/
|   |   +-- ThemeContext.tsx          # theme (light/dark/system) + visualTheme (minimalist/bubble/glass)
|   |   +-- NotificationContext.tsx
|   +-- services/
|   |   +-- supabaseClient.ts
|   |   +-- geminiService.ts         # Frontend AI service — calls /api/summarize and /api/summarize-item
|   |   +-- storageService.ts        # CRUD for research items (StorageItem type)
|   |   +-- collectionsService.ts
|   +-- components/
|       +-- App/
|       |   +-- Dashboard/           # Refactored into sub-components
|       |   +-- Discover/            # NEW (Phase 2)
|       |   |   +-- DiscoverPage.tsx
|       |   |   +-- index.ts
|       |   +-- DocumentEditor/      # TipTap-based rich text editor
|       |   |   +-- DocumentEditor.tsx
|       |   |   +-- EditorToolbar.tsx
|       |   |   +-- EditorCanvas.tsx
|       |   |   +-- DocumentSidebar.tsx
|       |   |   +-- ItemImportDrawer.tsx
|       |   |   +-- useDocumentEditor.ts
|       |   |   +-- exportUtils.ts
|       |   |   +-- bibliographyUtils.ts   # NEW (Phase 1)
|       |   |   +-- latexExportUtils.ts    # NEW (Phase 1)
|       |   |   +-- extensions/
|       |   |       +-- fontSize.ts
|       |   |       +-- indent.ts
|       |   |       +-- bibliography.ts    # NEW (Phase 1)
|       |   +-- Citations/
|       |   +-- Settings/
|       |   +-- AIAssistant.tsx
|       |   +-- Statistics.tsx
|       |   +-- SmartPenGallery.tsx
|       |   +-- PairSmartPen.tsx
|       +-- shared/
|       |   +-- DashboardLayout.tsx   # Sidebar nav + header
|       |   +-- MarketingLayout.tsx
|       |   +-- GlassBubble.tsx       # DO NOT TOUCH
|       |   +-- BubbleBackground.tsx
|       +-- marketing/
|           +-- MarketingHome.tsx
|           +-- FloatingOrbs.tsx      # DO NOT TOUCH
+-- supabase/
|   +-- functions/
|       +-- smart-pen/               # Edge Function for ESP32 hardware
+-- index.css                        # Global styles + all 3 UI theme CSS
```

---

## Sidebar Navigation Order (DashboardLayout.tsx)

```typescript
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/app/dashboard" },
  { icon: GraduationCap, label: "Discover", path: "/app/discover" },      // NEW
  { icon: FolderOpen, label: "Collections", path: "/app/collections" },
  { icon: MessageSquare, label: "AI Assistant", path: "/app/ai-assistant" },
  { icon: Quote, label: "Citations", path: "/app/citations" },
  { icon: FileEdit, label: "Editor", path: "/app/editor" },
  { icon: PenTool, label: "Smart Pen", path: "/app/smart-pen" },
  { icon: BarChart2, label: "Statistics", path: "/app/statistics" },
];
```

---

## Supabase Configuration

- **Free tier** — 100 Edge Functions, 500K invocations/mo, 500MB DB, 1GB Storage, pg_cron available
- Auth: email/password + Google OAuth (popup flow)
- `items` table: stores all research items (text, tags, citations, OCR data, AI summaries)
- `documents` table: stores TipTap editor documents as jsonb (includes `citedItemIds` array)
- RLS enabled — all queries scoped to `auth.uid()`
- Edge Function: `supabase/functions/smart-pen/` for ESP32 hardware pairing + OCR routing

---

## User Preferences (Kian)

- Likes concise, actionable responses with tables
- NEVER push to git without explicit permission
- Uses the PART sectioning system — no exceptions
- Apple-inspired design aesthetic with `#007AFF` blue accent
- Currently testing on deployed Vercel URL (not localhost — local `vite dev` can't serve API routes)
- Humor welcome when things go wrong

---

## Do Not Touch

- `src/components/shared/GlassBubble.tsx` — Three.js cursor, working
- `src/components/marketing/FloatingOrbs.tsx` — Ambient orbs, fine
- `src/context/ThemeContext.tsx` + theme CSS in `index.css` — Theme system stable
- `parse_pdf.cjs` / `parse_pdf.mjs` — Untracked utility scripts in repo root, not part of the app

---

## Known Issues

### ⚠ PDF Reader — Text Selection Broken (Phase 3)

**Status:** Deferred — Phase 3 shipped, but click+drag text selection inside the rendered PDF does not highlight anything. All other features work: continuous scroll, prev/next buttons, zoom, fit-to-width, upload, Discover-to-reader linking, 200+ page PDFs render fine.

**What was tried (all committed, none fully solved it):**
1. `pdfjs-dist` v5 `TextLayer` class with `streamTextContent` + manual fallback using `Util.transform` (commit `f0817f5`)
2. Force `pointer-events: auto` / `user-select: text` on `.textLayer` + `pointer-events: none` on canvas (commit `f9be2bb`)
3. Escape `.bubble-container` click trap — `.bubble { pointer-events: none }` + PDF viewport `relative z-20 isolation:isolate` (commit `bda6315`)
4. Set pdfjs v5 required CSS vars `--scale-factor`, `--user-unit`, `--total-scale-factor` on wrapper + textLayer container (commit `50b18d7`)

**Current theory (most likely):** `TextLayer.render()` builds divs whose dimensions come from CSS `calc(var(--total-scale-factor) * ...)`. The CSS vars ARE now being set, but possibly:
- They need to be on `html` or `body`, not the per-page wrapper
- Or the inlined `.textLayer` CSS in `index.css` is overriding dimensions that pdfjs wants to set via `style` attribute
- Or the manual fallback is firing but the spans are invisible because the text layer's `::selection` rule has `color: transparent` and the spans have `color: transparent`, preventing selection from showing

**Where to start debugging:**
1. Open DevTools in the deployed PDF reader, inspect a rendered page's `.textLayer` div
2. Check if it has any `<span>` children at all — if not, the TextLayer ctor is silently failing and the manual fallback is not running
3. If spans exist, check their computed `width` / `height` — if zero, the CSS var chain is still broken
4. Try: set `--scale-factor` on `document.documentElement` instead of the wrapper
5. Consider: import `pdfjs-dist/web/pdf_viewer.css` directly instead of our hand-rolled minimal copy in `index.css`
6. Consider: upgrade/downgrade `pdfjs-dist` — v5.4.624 is recent; maybe try v4.x which has more online examples

**Relevant files:**
- `src/components/App/PdfReader/PdfReader.tsx` — `renderPage()` function
- `index.css` — `.textLayer` / `.pdf-page` CSS block (search for `PDF.js Text Layer`)

**Not blocking other phases** — users can still read PDFs, just not highlight. Fix it when someone has time to actually step through the TextLayer source in `node_modules/pdfjs-dist`.

---

## What To Do Next (In Order)

1. ~~**Phase 3: PDF Reader & Annotator**~~ — DONE (see Known Issues above for deferred text-selection bug)
2. **Phase 4: RSS Feeds** — CORS proxy needed (1 API slot) — NEXT
3. **Phase 5: Media Transcription** — Whisper/Gemini server-side (1 API slot)
4. **Phases 6-9** — all client-side (Knowledge Graph, Paper Graph, Kanban, Shared Collections)

---

## Git History (Recent)

```
7f71871 fix: improve title-based search with ArXiv ti: field and S2 fallback
375f36e fix: add direct ArXiv ID and DOI lookup for new/exact papers
9f32734 fix: move test file out of api/ to avoid Vercel 12-function limit
c3eb3e4 feat: add Academic Paper Search (Discover page)
63e01f1 fix: toolbar Export button cutoff — compact Insert/Bibliography to icons
79e28e4 feat: add Dynamic Bibliography generation and LaTeX export
72688aa fix: toolbar dropdowns hidden behind editor + saving layout shift
7d2c5da fix: resolve critical Document Editor toolbar bugs
5a5ec36 feat: add Document Editor with Google Docs-style toolbar
```
