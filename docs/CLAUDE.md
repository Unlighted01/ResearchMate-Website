# docs/CLAUDE.md — ResearchMate Website: AI Session Context

> Read `docs/handover_prompt.md` for the full system architecture, quick-start prompt, corpus report, and current milestones.
> This file captures the **current development state** as of November 2026.

---

## What This Folder Contains

| File | Purpose |
|---|---|
| `handover_prompt.md` | **Master Handover Document** — Copy-paste prompt for new AIs, system architecture, PDF Importer rules, 58-file corpus audit, and pending parser improvements. |
| `CLAUDE.md` | Session context & quick reference. |
| `extension-mirror-prompt.md` | Chrome extension features mirrored on the web app. |

**Start with `handover_prompt.md`** — it contains all context required for any new AI to resume work immediately.

---

## Current Status (November 2026)

- **Primary Focus**: Review Companion, Exam Engine, and Universal PDF Question Importer (`src/services/pdfQuestionImporter.ts`).
- **Target Corpus**: 2027 Philippine Civil Service Examination (CSE) reviewer corpus (58 PDFs).
- **Corpus Scan Results**: 43 PASS, 13 WARN, 1 UNVERIFIED, 1 FAIL across 58 files (`reports/corpus_report.md`).
- **Test Suite Health**: **43 test files, 320 tests passed** (100% passing locally).
- **Git Policy**: **Strictly local commits on `main`. Never push to `origin/main`.**
- **Next Decision**: Confirm implementation of 4 generic parser enhancements for under-yield files (space-padded digits, 5-letter condensed block keys, parenthesized numeric keys, in-page top/bottom split Q&A).

---

## Do Not Touch / Stable Modules

- `src/components/shared/GlassBubble.tsx` — Three.js cursor, working
- `src/components/marketing/FloatingOrbs.tsx` — Ambient orbs, stable
- `src/context/ThemeContext.tsx` + theme CSS in `index.css` — Theme system stable
- Core passing reviewer fixtures (`1001 Math Problems`, `501 Word Analogy`, `501 Math Word Problems`, `501 Synonym and Antonym`, `Age Problems`, `RA 6713`) — zero regressions allowed.
