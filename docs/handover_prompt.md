# ResearchMate — Master AI Handover & Architecture Document

> **Last Updated**: November 12, 2026  
> **Status**: Review Companion / Exam Engine Hardening & Corpus Generalization Milestone  
> **Test Suite**: 43 test files, 320 unit/integration tests passing (0 failures)  
> **Primary Rule**: Strictly local Git commits on `main`. Never push to `origin/main`.

---

## 📋 QUICK-START PROMPT FOR NEW AI AGENTS
*(Copy and paste the block below into any new AI assistant — Claude, GPT-4, DeepSeek, Cursor, etc. — to give it full instant context without uploading the codebase)*

```markdown
You are assisting on ResearchMate, a multi-platform research management and exam preparation ecosystem built with React 18, TypeScript, Vite, Tailwind CSS, Supabase (Auth/DB/Storage), and Vercel Serverless Functions (`api/`).

### Current Goal & Focus
We are building and hardening the **Review Companion & Universal PDF Question Importer** (`src/services/pdfQuestionImporter.ts` and `src/components/App/ReviewCompanion/QuestionImportModal.tsx`). The importer parses complex review books, multi-chapter PDFs, practice tests, and legal reviewers (e.g. Philippine Civil Service Exam / CSE 2027 reviewer corpus) into structured, graded multiple-choice questions (MCQs), flashcards, and study prompts with rendered KaTeX formulas.

### Critical Invariants & Rules
1. **Strictly Local Git**: Always commit locally (`git commit`). NEVER run `git push origin main`.
2. **Generic Rules Only**: Never hard-code regex or logic tuned to a single filename. Every parser addition must be generic, feature-based, and backed by automated tests.
3. **Zero Regressions**: Core passing files must never worsen:
   - `1001 Math Problems` (1001 Qs, 991 graded)
   - `501 Word Analogy Questions` (501 Qs graded)
   - `501 Math Word Problems` (500 Qs graded)
   - `501 Synonym and Antonym Questions` (501 Qs graded)
   - `Age Problems` (40 Qs graded)
   - `Republic Act No. 6713` (20 graded MCQs, 45/67 study cards)
   - `300 items Mathematics Reviewer with Detailed Solutions` (300 items parsed, key distribution A:65 B:60 C:74 D:63 E:13)
   - `CSE MOCK EXAM` (0 graded items, 144 study prompts; survey items skipped)
4. **Strict Key Gate**: A question CANNOT be graded unless its question number matches an explicit key entry in an identified answer key region. Never use default or fallback keys (missing keys must set `correctIndex = -1`). If >60% of resolved keys in a file evaluate to a single letter (for n >= 10), the file is demoted to ungradable prompts (`reviewStatus = "needs_review"`) with "Answer keys look unreliable".
5. **Stem Cap**: Question stems longer than 1,200 characters are demoted to ungradable prompts (`reviewStatus = "needs_review"`).
6. **Pre-Parse Document Classifier**: Non-question documents (statutes, dictionaries, application forms) are classified before parsing via structural features and routed to study notes or 0 items, never graded questions.
7. **Execution Environment**: Windows PowerShell. Use `.cmd` commands (e.g. `npm.cmd test`, `npx.cmd vitest run`).

### Where We Are Right Now
- 58-file corpus audit complete via `scripts/corpus_report.ts`: 43 PASS, 13 WARN, 1 UNVERIFIED (scanned PDF), 1 FAIL.
- Under-yield analysis complete for 6 files (`CSE MOCK EXAM`, `Civil Service Exam Reviewer with Answers`, `Professional and Sub-Professional Practice Test (1)`, `255 item Mathematics Reviewer`, `250 MATH Problems`, and `501 Algebra Questions`).
- 4 generic enhancements are designed and awaiting implementation:
  1. Space-padded line-initial digits (`2 0. )` -> `20.)`)
  2. Condensed 5-letter block keys (`1 to 5: DABDA`)
  3. Parenthesized numeric keys (`8. (1) 198`)
  4. In-page top/bottom split Q&A (questions on top, step-by-step solutions with `<- Ans` on bottom)
```

---

## 1. System Architecture & Tech Stack

```
+---------------------------------------------------------------------------------+
|                                RESEARCHMATE                                     |
+---------------------------------------------------------------------------------+
|  WEB APP: React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + KaTeX     |
|  STATE: React Context (Theme, Ingestion) + IndexedDB Cache + Custom Hooks        |
|  BACKEND: Supabase (PostgreSQL, RLS, Storage Buckets, Auth)                      |
|  SERVERLESS: 12 Vercel Functions in api/ (LLM Orchestration: Gemini/Groq/OpenRouter)|
|  TESTING: Vitest (43 test files, 320 tests, fast isolated execution)            |
+---------------------------------------------------------------------------------+
```

### Core Product Modules
1. **Research Workspace**:
   - **TipTap v3 Rich Text Editor**: Document editor with APA/MLA/IEEE dynamic bibliographies, DOCX export, and LaTeX export (`\begin{thebibliography}`).
   - **Discover & Search**: Academic paper search across Semantic Scholar, arXiv, and PubMed via `api/search.ts`.
   - **RSS Feeds**: On-demand subscriptions to arXiv/PubMed feeds via `api/rss.ts` with SSRF protection.
   - **Media Transcription**: Audio, video, and YouTube transcription via `api/transcribe.ts` (Gemini 2.5 Flash + Groq Whisper fallback).
   - **3D Knowledge Graph**: Interactive Three.js / `react-force-graph-3d` galaxy visualization connecting research items by extracted semantic keywords.
2. **Review Companion & Exam Engine**:
   - **Mock Exam Engine** (`src/services/mockExamEngine.ts`, `src/services/examService.ts`): Timed exams, sectional pacing (`practicePacer.ts`), question batching (`examBatching.ts`), and seed record recovery.
   - **Question Bank** (`src/services/questionBankService.ts`): Ingestion, duplicate detection, topic categorization, and distractor quality linting (`distractorQuality.ts`).
   - **Offline-First Sync**: IndexedDB caching with backoff retry logic, JWT session refresh guards, and sync queue persistence (`indexedDbCache.ts`, `reliabilityService.ts`).
3. **Universal PDF Question Importer**:
   - Client-side PDF layout extraction (`src/services/pdfService.ts` via `pdfjs-dist/legacy`) extracting coordinates, fonts, and bounding boxes.
   - Multi-chapter two-pass parsing engine (`src/services/pdfQuestionImporter.ts`) with profile auto-detection, fraction/superscript math reconstruction, column uncurling, and strict key gating.
   - Visual import modal (`src/components/App/ReviewCompanion/QuestionImportModal.tsx`) with preview, chapter selection, KaTeX rendering, and flashcard export.

---

## 2. Serverless API Architecture (`api/`)

Vercel Hobby plan enforces a **strict limit of 12 serverless functions**. All 12 slots are fully allocated:

| # | Endpoint | Description | Primary Engine | Fallback Chain |
|---|---|---|---|---|
| 1 | `api/chat.ts` | Academic chat & exam generator | Gemini 2.5 Flash | Gemini $\to$ OpenRouter $\to$ Groq |
| 2 | `api/cite.ts` | ISBN, DOI, YouTube citation lookup | Data APIs | OpenLibrary $\to$ Google Books / CrossRef |
| 3 | `api/extract-citation.ts` | URL to bibliographic metadata | Gemini 2.5 Flash | Semantic Scholar / CrossRef + AI |
| 4 | `api/generate-tags.ts` | Research item auto-tagging | Gemini 2.5 Flash | Gemini $\to$ OpenRouter $\to$ Groq |
| 5 | `api/identify-source.ts` | Source identification & metadata | Gemini 2.5 Flash | — |
| 6 | `api/insights.ts` | Key insights & extract synthesis | Gemini 2.5 Flash | Gemini $\to$ OpenRouter $\to$ Groq |
| 7 | `api/ocr.ts` | Canvas & image OCR transcription | Gemini Vision | OpenRouter $\to$ Gemini $\to$ Claude |
| 8 | `api/rss.ts` | CORS proxy & RSS/Atom parser | SSRF-guarded fetch | Regex-based XML streaming |
| 9 | `api/search.ts` | Unified academic + books search | Multi-API | Semantic Scholar + ArXiv + PubMed / Google Books |
| 10 | `api/set-custom-key.ts` | BYOK key encryption & storage | Supabase Vault | — |
| 11 | `api/summarize.ts` | Unified full & item summarization | Gemini 2.5 Flash | Gemini $\to$ OpenRouter $\to$ Groq |
| 12 | `api/transcribe.ts` | Audio, video & YouTube transcription | Gemini 2.5 Flash | Gemini (YouTube/media) $\to$ Groq Whisper (audio) |

Shared utilities live in `api/_utils/auth.ts` (prefixed with `_` so Vercel does not count it as a serverless function).

---

## 3. Directory Map & File Responsibilities

```
ResearchMate Website/
├── api/                                      # 12 Vercel serverless endpoints + _utils
├── corpus_manifest.csv                       # Classification rules for 58-file reviewer corpus
├── docs/                                     # Architecture & handover documentation
│   ├── CLAUDE.md                             # AI context & development conventions
│   └── handover_prompt.md                    # THIS FILE: Master handover document
├── reports/                                  # Generated audit reports
│   ├── corpus_report.md                      # Complete 58-file Markdown audit table
│   └── corpus_report.jsonl                   # Resumable JSONL test scanner cache
├── scripts/                                  # Operational scripts
│   └── corpus_report.ts                      # Corpus test scanner & generator
├── sidecars/                                 # Ground-truth assertion sidecars (*.expected.json)
│   ├── 1001 Math Problems.expected.json
│   ├── 300 items Mathematics Reviewer with Detailed Solutions.expected.json
│   ├── 501 Word Analogy Questions.expected.json
│   ├── Age Problems.expected.json
│   ├── CSE MOCK EXAM.expected.json
│   ├── Philippines Code of Conduct...expected.json
│   └── Republic Act No. 6713.expected.json
├── src/
│   ├── components/
│   │   ├── App/
│   │   │   ├── Dashboard/                    # Main research dashboard
│   │   │   ├── Discover/                     # Academic search UI
│   │   │   ├── DocumentEditor/               # TipTap v3 rich text editor + bibliographies
│   │   │   ├── Feeds/                        # RSS feed reader
│   │   │   ├── KnowledgeGraph/               # 3D Three.js Galaxy concept map
│   │   │   ├── ReviewCompanion/              # CSE Exam & Question Prep suite
│   │   │   │   ├── QuestionImportModal.tsx   # PDF Question Ingestion Modal
│   │   │   │   ├── MockExamEngine.tsx        # Timed exam interface
│   │   │   │   ├── PracticePacer.tsx         # Pacing & stopwatch tracker
│   │   │   │   └── MaterialsWorkspacePage.tsx# Ingested study materials
│   │   │   └── Transcribe/                   # Audio/video/YouTube transcription
│   │   └── shared/                           # Shell layouts, navigation, theme orbs
│   └── services/
│       ├── pdfService.ts                     # pdfjs-dist layout extraction & OCR fallback
│       ├── pdfQuestionImporter.ts            # CORE: Multi-chapter two-pass parser
│       ├── examService.ts                    # Exam generation, JSON repair, slicing
│       ├── mockExamEngine.ts                 # Exam session state, scoring, analysis
│       ├── questionBankService.ts            # Question deduplication & Supabase persistence
│       ├── distractorQuality.ts              # Distractor quality linter & auto-fixing
│       └── indexedDbCache.ts                 # Offline-first caching & reliability sync
└── tests/                                    # 43 Vitest integration & regression test suites
    ├── reviewer_triage_audit.test.ts         # Triage invariants for 300 Math & CSE Mock
    ├── audit_1001.test.ts                    # 1001 Math Problems full audit
    ├── audit_501_word_analogy.test.ts        # 501 Word Analogy full audit
    ├── audit_word_problems.test.ts           # 501 Math Word Problems full audit
    ├── modalQuestionImport.test.ts           # End-to-end import modal pipeline test
    ├── distractorQuality.test.ts             # Distractor linter audit
    └── corpus_scan.test.ts                   # 58-file corpus scanner test runner
```

---

## 4. Current Milestone: Review Companion & PDF Importer Hardening

### The Challenge
The user is assembling a preparation platform for the **2027 Philippine Civil Service Examination (CSE)**. The source material consists of a large, messy corpus of 58 PDFs located at `C:\Users\netne\Documents\CSC REVIEWER 2027\📝 2027 CSE Reviewer`. These documents vary wildly in typography, publisher conventions, and structure:
- **Massive LearningExpress drill books** (*1001 Math Problems*, *501 Word Analogy Questions*, *501 Synonym and Antonym Questions*) with multi-page sets and consolidated end-of-chapter or end-of-book answer keys.
- **Dense local reviewers** (*300 items Mathematics Reviewer*, *255 item Mathematics Reviewer*, *250 MATH Problems*) featuring 2-column interleaved keys, YouTube link noise, space-padded digits (`2 0. )`), and inline solutions ending with `<- Ans`.
- **Statutes and Legal Codes** (*Republic Act No. 6713*, *1987 Philippine Constitution*, *Labor Code*) with legal sections that must become study cards and structured notes, not spurious MCQs.
- **Examinations without keys** (*CSE MOCK EXAM*, *Professional and Sub-Professional Practice Test (1)*) that must produce 0 graded questions and import strictly as self-check prompts/flashcards.
- **Scanned documents** (*Sample Answer Sheet*, *MSA Training Program*) with zero digital text layers.

### Completed Hardening Invariants
1. **Key Gate & Anti-Guessing Invariant**:
   - `correctIndex = -1` when an item has no explicit matching key in the identified answer key region.
   - If $>60\%$ of resolved keys in a document evaluate to a single letter ($n \ge 10$), the file is demoted to ungradable prompts (`reviewStatus = "needs_review"`) with `"Answer keys look unreliable"`.
   - Free-response items carry `letter: ""` and `correctIndex = -1` (removed legacy placeholder `"a"`).
2. **Stem Character Cap**:
   - Question stems exceeding 1,200 characters are demoted to ungradable study prompts (`reviewStatus = "needs_review"`).
3. **Pre-Parse Document Classifier**:
   - `classifyDocumentType()` inspects paragraph lengths, question-number density, headwords, and section patterns before parsing begins.
   - Statutes $\to$ legal notes/flashcards; dictionaries $\to$ self-check prompts; forms $\to$ 0 items.
4. **Missing Numbers Calculation**:
   - Sequence gap calculations ignore numbers $> 1,500$ and calendar years ($1900 \le n \le 2099$).
5. **Generic Feature Profiles**:
   - Replaced book-specific profile names with structural feature profiles:
     - `PROFILE_SECTIONED_NUMERICAL_DRILL` (`id: "sectioned_numerical_drill"`, `"Sectioned Numerical Drill (End-of-Book Keys)"`)
     - `PROFILE_CHAPTER_PRACTICE_DRILL` (`id: "chapter_practice_drill"`, `"Chapter Practice Drill (End-of-Chapter Keys)"`)
6. **KaTeX Math Reconstruction**:
   - Superscript exponents reconstructed via layout font size and horizontal line clustering (`^{exponent}`).
   - Stacked horizontal fractions reconstructed into clean LaTeX `\frac{numerator}{denominator}`.
   - JSON string repair preserves valid LaTeX escape sequences (`\frac`, `\times`, `\neq`, `\right`, `\beta`).

---

## 5. Under-Yield Investigation & Proposed Next Steps

Detailed analysis of the 6 under-yield target files from the corpus:

### Findings
1. **`CSE MOCK EXAM.pdf` (24 pages)**: No answer key exists anywhere in the PDF. Expected: 0 graded, 144 study prompt cards (items 21–170). Items 1–20 are personal survey demographics and are cleanly skipped. **Status: ✅ PASS**.
2. **`Civil Service Exam Reviewer with Answers.pdf` (62 pages)**: Questions restart at `1.` across multiple subjects (English, Analogy, Reading, Numerical Reasoning). End-of-book keys on pp. 58–62 use parenthesized numeric choices: `8. (1) 198 – explanation`.
3. **`Professional and Sub-Professional Practice Test (1).pdf` (160 pages)**: No answer keys exist. The skew gate correctly demotes all 75 items to ungradable prompt cards. **Status: ⚠️ WARN**.
4. **`255 item Mathematics Reviewer with Detailed Solutions.pdf` (29 pages)**: Split-page layout. Every page features questions on the upper half and step-by-step solutions ending with `<- Ans` on the lower half. Items 175 and 181–185 are free-response word problems without options A–E.
5. **`250 MATH Problems with links for tutorial VIDEOS.pdf` (26 pages)**: Questions use space-split numbers (`2 0. )`, `2 1. )`). Answer keys for items 1–30 are formatted as 5-letter condensed blocks (`1 to 5: DABDA`), while items 31–250 use `3 1. c. Explanation`.
6. **`501 Algebra Questions (LearningExpress)` (285 pages)**: Pure free-response algebraic exercises without options A–E, followed by step-by-step solutions. All 455 items correctly parse as free-response study cards. **Status: ⚠️ WARN**.

### 4 Proposed Generic Parser Enhancements (Awaiting User Go-Ahead)
1. **Space-Padded Digits Normalization**: Normalize `\b(\d)\s+(\d)\b` inside line-initial markers (e.g. `2 0. )` $\to$ `20.)`, `3 1. c.` $\to$ `31. c.`) $\to$ benefits `250 MATH Problems`, `255 item Mathematics Reviewer`, `300 items Mathematics Reviewer`.
2. **Condensed 5-Letter Block Key Parser**: Support range keys formatted as `(\d+)\s+to\s+(\d+)\s*:\s*([A-Ea-e]{2,10})` by indexing each character offset to its item number $\to$ benefits `250 MATH Problems`, `Civil Service Exam Reviewer with Answers`.
3. **Parenthesized Numeric Key Matching**: Match `(\d+)[\.\)]\s*\(([1-5])\)` as choice index `int(group) - 1` when questions use `1.` through `5.` $\to$ benefits `Civil Service Exam Reviewer with Answers`.
4. **In-Page Top/Bottom Split Q&A Profile**: For pages partitioned with horizontal rules/headers (`Questions ... Answers`), parse upper questions as stems and lower entries ending with `<- Ans` as solutions $\to$ benefits `255 item Mathematics Reviewer with Detailed Solutions`.

---

## 6. How to Run Tests & Verify

Run from project root (`C:\Users\netne\ReserachMate\Researchmate Website`):

```powershell
# Run the complete test suite (43 files, ~9 seconds)
npm.cmd test

# Run a single targeted test file
npx.cmd vitest run tests/reviewer_triage_audit.test.ts
npx.cmd vitest run tests/modalQuestionImport.test.ts
npx.cmd vitest run tests/audit_1001.test.ts
npx.cmd vitest run tests/audit_501_word_analogy.test.ts

# Run the full 58-file corpus scanner
npx.cmd vitest run tests/corpus_scan.test.ts

# Check git status (always keep commits local, never push)
git status
git log -n 5 --oneline
```
