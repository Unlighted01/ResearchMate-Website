# docs/CLAUDE.md — ResearchMate Website: AI Session Context

> Read root `CLAUDE.md` first for coding conventions, design system, and PART sectioning rules.
> This file captures **current project state** and **pending work** as of April 2026.

---

## What This Folder Contains

| File | Purpose |
|---|---|
| `handover_prompt.md` | Full handover doc — architecture, roadmap, endpoint merges, what to do next |
| `extension-mirror-prompt.md` | Chrome extension features that need to be mirrored on the website |

**Start with `handover_prompt.md`** — it has everything the next AI needs.

---

## Quick Status (April 2026)

- **Vercel functions:** 10/12 (after summarize + search merges)
- **Phase 1 (Bibliography + LaTeX):** Done
- **Phase 2 (Academic Search / Discover):** Done
- **Phase 3 (PDF Reader):** Done ⚠ — text selection/highlight is broken (deferred). See `handover_prompt.md` Known Issues for full debug history. Users can read PDFs but can't highlight text.
- **Next:** Phase 4 (RSS Feeds — needs 1 API slot for CORS proxy)
- **User preference:** Never push without permission. Test on deployed Vercel URL, not localhost.

---

## Pending Endpoint Merges (BLOCKING)

Must be done before any new features that need API endpoints.

1. `summarize.ts` + `summarize-item.ts` -> single `summarize.ts` (update `geminiService.ts`)
2. `search-academic.ts` + `search-books.ts` -> single `search.ts` (update `DiscoverPage.tsx`)

Full merge strategy documented in `handover_prompt.md`.

---

## Do Not Touch

- `src/components/shared/GlassBubble.tsx` — Three.js cursor, working
- `src/components/marketing/FloatingOrbs.tsx` — Ambient orbs, fine
- `src/context/ThemeContext.tsx` + theme CSS in `index.css` — Theme system stable

---

*Last updated: April 9, 2026 — Full rewrite for Phase 2 completion and endpoint merge planning*
