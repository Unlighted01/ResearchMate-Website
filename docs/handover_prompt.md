# ResearchMate — AI Handover Document

> Last updated: April 10, 2026
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

## Vercel Serverless Functions (12/12 — FULL)

Vercel Hobby plan allows **max 12 serverless functions**. We are now at the cap after Phase 5.

| # | Endpoint | Purpose | Model | Fallback Chain |
|---|----------|---------|-------|----------------|
| 1 | `api/chat.ts` | Academic chat assistant | gemini-2.5-flash | Gemini -> OpenRouter -> Groq |
| 2 | `api/cite.ts` | ISBN/DOI/YouTube lookup | N/A (data only) | OpenLibrary -> Google Books / CrossRef / oEmbed |
| 3 | `api/extract-citation.ts` | URL -> citation metadata | gemini-2.5-flash | DOI/Crossref/Semantic Scholar + AI |
| 4 | `api/generate-tags.ts` | Auto-tagging | gemini-2.5-flash | Gemini -> OpenRouter -> Groq |
| 5 | `api/identify-source.ts` | Source identification | gemini-2.5-flash | — |
| 6 | `api/insights.ts` | Key insights extraction | gemini-2.5-flash | Gemini -> OpenRouter -> Groq |
| 7 | `api/ocr.ts` | Image text extraction | gemini-2.5-flash | OpenRouter -> Gemini -> Claude |
| 8 | `api/rss.ts` | **RSS/Atom feed proxy** (Phase 4) | N/A | SSRF-guarded fetch + regex XML parser |
| 9 | `api/search.ts` | Unified search (academic + books) | N/A (API calls) | `type:"academic"` -> S2+ArXiv+PubMed; `type:"books"` -> Google Books+CrossRef+OMDB |
| 10 | `api/set-custom-key.ts` | BYOK key management | N/A | — |
| 11 | `api/summarize.ts` | Unified summarization | gemini-2.5-flash | Full: Gemini->OpenRouter->Groq; Item (when `itemId` present): OpenRouter->Gemini->Claude + writes to DB |
| 12 | `api/transcribe.ts` | **Audio/Video/YouTube transcription** (Phase 5) | gemini-2.5-flash | Inline audio: Gemini -> Groq Whisper (whisper-large-v3); YouTube: Gemini only via `fileData.fileUri`. 3 credits/call, 18 MB cap |

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
| 4 | RSS Feeds (ArXiv/PubMed new paper alerts) | DONE | Yes (api/rss.ts — CORS proxy, no credits) |
| 5 | Media Transcription (audio/video -> text) | DONE | Yes (api/transcribe.ts — Gemini native + Groq Whisper fallback) |
| 6 | Knowledge Graph (concept maps) | NOT STARTED | No (client-side D3/force graph) |
| 7 | Paper Citation Graph | NOT STARTED | No (Semantic Scholar API from client) |
| 8 | Kanban Board (project workflow) | NOT STARTED | No (direct Supabase) |
| 9 | Shared Collections (collaboration) | NOT STARTED | No (Supabase RLS) |

**Next up:** Phases 6–9 are all client-side — Knowledge Graph, Paper Citation Graph, Kanban Board, Shared Collections.

---

## What Was Built Recently (April 2026 Sessions)



### Phase 5: Media Transcription (April 11, 2026)

Upload audio/video files or paste a YouTube URL → get a full transcript, AI summary, and auto-tags. Optionally save the result as a regular research item. Costs 3 credits per transcription.

**Files created:**
- `api/transcribe.ts` — Vercel function #12 (fills the last slot). Accepts `{ audioBase64, mimeType, fileName? }` OR `{ youtubeUrl }`. Primary: Gemini 2.5 Flash (native audio/video + YouTube URLs via `fileData.fileUri`). Fallback: Groq `whisper-large-v3` (audio only — no video, no YouTube). Deducts 3 credits upfront, refunds on total failure. 18 MB inline cap. Returns strict JSON `{ transcript, summary, tags, provider, source }`.
- `src/services/transcribeService.ts` — Client service. `transcribeFile(file)` and `transcribeYoutube(url)`, plus helpers `isYoutubeUrl`, `isAcceptedMedia`. Converts File → base64 via `FileReader.readAsDataURL`. Validates MIME + size client-side.
- `src/components/App/Transcribe/TranscribePage.tsx` — Two-mode UI (File / YouTube tabs), drag-and-drop file zone, transcription result card with AI summary + auto-tags + word count + Copy / Save to Library / Clear actions. Saves as item with `deviceSource: "transcription"`.
- `src/components/App/Transcribe/index.ts` — barrel.

**Files modified:**
- `src/types.ts` — Added `"transcription"` to `DeviceSource` union + `DEVICE_SOURCES` map (Mic icon).
- `src/services/storageService.ts` — Added `transcription: 0` to the `bySource` stats record to keep TS happy.
- `src/App.tsx` — Added `/app/transcribe` route + import.
- `src/components/shared/DashboardLayout.tsx` — Added `Mic` icon + `{ icon: Mic, label: "Transcribe", path: "/app/transcribe" }` nav item (between PDF Reader and Collections).

**No migration needed.** Transcriptions are saved as regular `items` rows using the existing schema — full transcript goes in `text`, AI summary in `ai_summary`, topical tags in `tags`, and `deviceSource = "transcription"` so they can be filtered out.

**Key design decisions:**
- **Inline base64 (not Supabase Storage).** Reliability over payload size. Vercel's 4.5 MB body limit is the real bottleneck — base64 inflates ~33%, so a 3 MB audio file sends as a ~4 MB payload. Cap is 18 MB decoded to match Gemini's 20 MB inline limit with safety margin. If users hit that wall, they'll trim the file (most podcasts/lectures compress to well under 18 MB as MP3).
- **YouTube goes direct to Gemini via `fileData.fileUri`** — no download, no yt-dlp, no legal grey zone. Gemini 2.5 Flash handles YouTube URLs natively. This is why YouTube has no fallback: only Gemini knows how to read them.
- **Groq Whisper fallback for inline audio only.** If Gemini is down / rate-limited, we retry with `whisper-large-v3` through Groq's free OpenAI-compatible endpoint. Whisper doesn't return a summary, so we synthesize a truncated first-20-words one and tag `["transcription", "audio"]`.
- **3 credits per call** vs 1 for summarize/tags — transcription is the most expensive single operation we expose, and users are likely to run it once per artifact rather than per paragraph.

### Phase 4: RSS Feeds (April 10, 2026)

On-demand RSS/Atom feed subscriptions. Items open externally (no reader view), per-user cap of 20 feeds, no credit cost.

**Files created:**
- `api/rss.ts` — CORS proxy + parser. Auth via `authenticateUser()` (no credit deduction). Content-sniffs RSS 2.0 vs Atom, regex-based XML parse (no new deps). SSRF guard blocks `localhost`/private IP ranges. Limits: 5 MB feed size, 10 s timeout, max 50 items per feed. Returns normalized `RssFeedResponse { title, description, link, items, fetchedAt, source }`.
- `supabase/migrations/20260410_rss_feeds.sql` — `rss_feeds` table (id, user_id, title, url, category, last_fetched_at, last_item_date, timestamps), `UNIQUE(user_id, url)`, RLS policies (view/insert/update/delete own), auto-bump `updated_at` trigger.
- `src/services/rssFeedsService.ts` — CRUD + `MAX_FEEDS_PER_USER = 20` + `CURATED_FEEDS` array (8 presets: arXiv cs.AI, cs.LG, cs.CL, stat.ML, cs.CV, Nature, Science, PubMed). Exposes `getAllRssFeeds`, `createRssFeed` (enforces cap + URL validation), `deleteRssFeed`, `touchRssFeed`, `fetchRssFeed(url)` (calls `/api/rss` with auth header).
- `src/components/App/Feeds/FeedsPage.tsx` — Two-column UI (subscribed list + items panel). Curated starter grid when empty, "More suggestions" strip when feeds exist. Add Custom Feed modal (URL/Title/Category), per-feed refresh, search within feed, item cards with title/authors/pubDate/summary/categories, delete with confirm.
- `src/components/App/Feeds/index.ts` — barrel export.

**Files modified:**
- `src/App.tsx` — added `/app/feeds` route.
- `src/components/shared/DashboardLayout.tsx` — added `Rss` icon + `{ icon: Rss, label: "Feeds", path: "/app/feeds" }` between Discover and PDF Reader.

**Deployment steps:**
1. Run `supabase/migrations/20260410_rss_feeds.sql` in Supabase SQL Editor — creates `rss_feeds` table + RLS. No secrets, no Edge Function changes. (Completed April 10, 2026.)
2. Push to `main` → Vercel auto-deploys `api/rss.ts` (function #8).

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
+-- api/                             # Vercel Serverless Functions (12/12 — FULL)
|   +-- _utils/auth.ts              # Shared auth + credit system
|   +-- chat.ts
|   +-- cite.ts
|   +-- extract-citation.ts
|   +-- generate-tags.ts
|   +-- identify-source.ts
|   +-- insights.ts
|   +-- ocr.ts
|   +-- rss.ts                      # NEW (Phase 4) — RSS/Atom proxy, SSRF-guarded
|   +-- search.ts                   # MERGED: academic + books search
|   +-- set-custom-key.ts
|   +-- summarize.ts                # MERGED: full + item summaries
|   +-- transcribe.ts               # NEW (Phase 5) — Gemini + Groq Whisper audio/video/YouTube
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
|       |   +-- Discover/            # Phase 2
|       |   |   +-- DiscoverPage.tsx
|       |   |   +-- index.ts
|       |   +-- Feeds/               # Phase 4
|       |   |   +-- FeedsPage.tsx
|       |   |   +-- index.ts
|       |   +-- Transcribe/          # NEW (Phase 5)
|       |   |   +-- TranscribePage.tsx
|       |   |   +-- index.ts
|       |   +-- PdfReader/           # Phase 3
|       |   |   +-- PdfReader.tsx
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
  { icon: GraduationCap, label: "Discover", path: "/app/discover" },
  { icon: Rss, label: "Feeds", path: "/app/feeds" },                      // Phase 4
  { icon: BookOpen, label: "PDF Reader", path: "/app/pdf-reader" },       // Phase 3
  { icon: Mic, label: "Transcribe", path: "/app/transcribe" },            // NEW (Phase 5)
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

1. ~~**Phase 3: PDF Reader & Annotator**~~ — DONE (see Known Issues for deferred text-selection bug)
2. ~~**Phase 4: RSS Feeds**~~ — DONE (api/rss.ts, migration applied)
3. ~~**Phase 5: Media Transcription**~~ — DONE (api/transcribe.ts — Gemini + Groq Whisper, full 12/12 slots)
4. **Phases 6-9** — all client-side (Knowledge Graph, Paper Graph, Kanban, Shared Collections) — NEXT

> **Note:** All 12 Vercel slots are full. Adding any new serverless endpoint now requires either upgrading to Pro, merging two existing endpoints, or moving one to a Supabase Edge Function.

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
