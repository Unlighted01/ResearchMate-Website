# docs/CLAUDE.md — ResearchMate Website: AI Session Context

> Read root `CLAUDE.md` first for coding conventions, design system, and PART sectioning rules.
> This file captures **current project state** and **pending work** as of March 2026.

---

## 🗺️ What This Folder Contains

| File | Purpose |
|---|---|
| `handover_prompt.md` | Full architectural overview — themes, OAuth fix, magic logic, roadmap |
| `extension-mirror-prompt.md` | Chrome extension features that need to be mirrored on the website |

---

## ✅ What Has Been Built (Stable)

### Visual Theme System (3 themes)
- **Glass** — editorial glassmorphism, light/dark variants, `backdrop-filter: blur(18px)`. Henning Tillmann inspired.
- **Minimalist** — electric blue `#2563eb` accent, hairline borders, true black/white, `letter-spacing: -0.025em` headings.
- **Bubble** — rose/lavender palette, warm cream light bg, deep violet-black dark bg, pill buttons.
- Theme stored in `localStorage` as `visualTheme`, applied as `data-ui-theme` on `<html>`.
- Context: `src/context/ThemeContext.tsx`
- All CSS: `index.css` (clearly labelled blocks)

### Three.js Glass Cursor (Bubble theme only)
- `src/components/shared/GlassBubble.tsx` — full Three.js WebGL cursor, `transmission: 1.0`, simplex noise wobble.
- Rendered only when `visualTheme === 'bubble'` via `ThemedCursorBubble` in `App.tsx`.
- **DO NOT TOUCH** — it's working and unrelated to pending tasks.

### FloatingOrbs Background
- `src/components/marketing/FloatingOrbs.tsx`
- Cyan / Violet / Indigo palette, slow drift + mouse parallax.

### OAuth Popup Fix
- Google OAuth strips hash fragments from redirect URIs → popup lands on `/` not `/#/auth/callback`.
- Fix: `OAuthPopupHandler` in `App.tsx` (rendered outside router, inside `ThemeProvider`).
- Detects `?code=` + `window.opener` → posts `AUTH_SUCCESS` to parent → closes popup.

### 3-Tier OCR Fallback (`api/ocr.ts`)
- OpenRouter (gemini-2.0-flash) → Gemini 2.5 Flash → Claude 3.5 Sonnet
- Response includes `ocrConfidence` (integer 0–100): heuristic based on word count — `min(98, 65 + min(33, wordCount/300))`.
- `SettingsPage.tsx` bulk import accepts multiple JPG/PNG files simultaneously (via `multiple` attribute on the file input) and routes each through `POST /api/ocr` with `{ image: base64DataUrl }`. Results are saved as `device_source: "smart_pen"` items in Supabase.

### Smart Pen Hardware
- `/supabase/functions/smart-pen/` Edge Function
- `list`, `unpair`, `confirm` actions added to manage devices without RLS restrictions.

### OCR Edit UI + Confidence (SmartPenScanModal)
- Inline Edit/Save/Cancel textarea in scan detail modal — saves corrected text + adds `"ocr:edited"` tag.
- Confidence badge rendered from `ocrConfidence` field (≥80% green, ≥60% yellow, <60% red).
- After OCR save, inline "Re-link citation?" prompt appears when a citation already exists.
- `ocrConfidence` field added to `StorageItem`, `AddItemInput`, `UpdateItemInput` and mapped to `ocr_confidence` DB column in `storageService.ts`.
- `SettingsPage.tsx` bulk import now persists `ocr_confidence` to Supabase.
- Hardcoded Supabase anon key removed from `SmartPenGallery.tsx` — replaced with `supabase.functions.invoke()`.

### Color Metadata System
- Colors stored as `color:x` entries in the `tags` array — no separate DB column.
- `Dashboard.tsx` detail modal handles color changes via `updateItem`.

---

## 🔧 Pending Work (from `extension-mirror-prompt.md`)

The Chrome extension received a major pre-submission update. The website needs to mirror these changes.

### Priority 1 — Citation Accuracy (High Impact)

The extension rewrote its citation logic in `geminiService.ts`. The website's `CitationGenerator.tsx` + `api/extract-citation.ts` need the same upgrades.

**Citation waterfall to implement:**
```
Tier 1    → ISBN → Open Library API
Tier 1.5  → DOI found (meta/URL/DOM/link scan) → CrossRef DOI lookup
Tier 1.75 → No DOI but title present → CrossRef title search
Tier 2    → Local meta tags → rule-based formatting
Tier 3    → AI (only if useAiCitation=true or all above fail)
```

**Specific fixes needed:**
- `extractYear(dateStr)` — handles `"2025"`, `"2025/12"`, `"2025-12-01"`, `"December 2025"` — replaces broken `new Date(x).getFullYear()` (returns NaN)
- `querySelectorAll('meta[name="citation_author"]')` — was `querySelector`, only got first author
- `extractDOIFromUrl(url)` — regex on any string
- `lookupCrossRef(doi)` — `GET https://api.crossref.org/works/${doi}`
- `searchCrossRefByTitle(title, year?)` — `GET https://api.crossref.org/works?query.bibliographic=...&rows=3`
- `formatAuthors(authors, style)` + `formatCrossRefCitation(work, style, url)` — full per-style citation
- New meta fields: `volume`, `issue`, `pages` (from `citation_firstpage`/`citation_lastpage`)
- Title cleaning before CrossRef: strip `(PDF)` prefix and `| SiteName` suffixes

**UX fixes for `CitationGenerator.tsx`:**
- Add copy button inside citation card (below citation text)
- Add `overflow-wrap: break-word` / `word-break: break-all` on citation `<p>` — long DOIs overflow
- Change default format from `"apa"` → `"mla"` (state + localStorage fallback)

**CrossRef API reference (free, no key, CORS-enabled):**
```
DOI lookup:   GET https://api.crossref.org/works/{DOI}
Title search: GET https://api.crossref.org/works?query.bibliographic={title}&rows=3
Returns: title[], author[]{given,family}, published.date-parts[][], container-title[], volume, issue, page, DOI
```

### Priority 2 — Accessibility (Medium Impact)

**Create `src/hooks/useFocusTrap.ts`** (copy verbatim from extension — pure TypeScript, no extension APIs):
- Auto-focuses first focusable element on open
- Traps Tab/Shift+Tab within container
- Fires `onEscape` on Escape key
- Restores focus to previously focused element on close

**Apply to all modals (`<div className="fixed inset-0 ...">`):**
- Add `role="dialog"`, `aria-modal="true"`, `aria-label`/`aria-labelledby`
- Add backdrop click to close
- Cosmetic buttons (non-`<button>` elements): add `role="button"` + `tabIndex={0}` + `onKeyDown`
- Color swatches: `aria-pressed` + `aria-label` with `"(selected)"` state

### Priority 2B — Failed Test Fixes ✅ RESOLVED March 2026

| # | Test ID | Issue | Status |
|---|---------|-------|--------|
| — | 8.3-7 | Citation — non-standard date formats | ✅ `extractYear()` regex fix in `CitationGenerator.tsx` + `api/extract-citation.ts` |
| T-1 | 8.5-10, 8.5-11, 9.1-5 | OCR edit UI | ✅ Inline Edit/Save/Cancel textarea + "Edited" badge in `SmartPenScanModal.tsx` |
| T-2 | 8.5-11, 9.1-5 | OCR confidence not saved or displayed | ✅ Saved on import + re-run; colored badge in modal; `ocrConfidence` in `storageService.ts` |
| T-3 | 9.3-4 | Citation not regenerated after OCR edit | ✅ "Re-link citation?" inline prompt after OCR save in `SmartPenScanModal.tsx` |
| T-4 | 9.1-6 | No Retry OCR button | ✅ Already existed via `onRunOCR` + Re-run OCR button |
| — | 9.4-1 | Bulk import rejected jpg/png | ✅ `SettingsPage.tsx` now accepts all image types via `/api/ocr` |

### Priority 3 — Sync Status Announcements (Low Impact)

Wrap loading/status messages in `aria-live="polite"` so screen readers announce sync results and save confirmations.

---

## 📋 Files to Touch (When Starting)

| File | What to Do |
|---|---|
| `api/extract-citation.ts` | Add CrossRef title-search fallback before AI; fix multi-author |
| `src/components/App/CitationGenerator.tsx` | Copy button, break-word, default MLA, extractYear |
| `src/services/geminiService.ts` | Mirror extractYear, formatAuthors, formatCrossRefCitation |
| `src/hooks/useFocusTrap.ts` | Create (same as extension) |
| Any modal component | role="dialog", aria-modal, useFocusTrap, Escape-to-close |

---

## 🗺️ Longer-Term Roadmap (from `handover_prompt.md`)

1. **Global Search (Command+K)** — search across all collections and OCR texts. High priority.
2. **Shared Collections** — Supabase RLS policies for collaborative research folders.
3. **AI Assistant Chat** — `AIAssistant.tsx` draft exists, needs RAG over research collection.
4. **Condensed display font for Glass theme** — Barlow Condensed (Google Fonts) for headings under `html[data-ui-theme="glass"] .theme-title`.

---

## ⚠️ Do Not Touch

- `src/components/shared/GlassBubble.tsx` — Three.js cursor, it's working.
- `src/components/marketing/FloatingOrbs.tsx` — Ambient orbs, fine as-is.
- `src/context/ThemeContext.tsx` + theme CSS in `index.css` — Theme system is stable.
- No design changes — functional additions only (per extension mirror prompt).

---

*Last updated: March 2026 — T-1/T-2/T-3/T-4 test fixes resolved; hardcoded Supabase key removed; `ocrConfidence` added to storageService*
