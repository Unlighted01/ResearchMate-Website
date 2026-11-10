# ResearchMate: Comprehensive Codebase Overview & System Architecture

> **Last Updated**: November 2026  
> **Platform Version**: 2.0 (Universal Assessment & Synthesis Engine)  
> **Repository**: `ResearchMate-Website`  
> **Runtime Stack**: React 19 + TypeScript + Vite 6 + Tailwind CSS v4 + Supabase + IndexedDB + Gemini Vision

---

## 1. Executive Summary & Vision

**ResearchMate** is a dual-engine academic and assessment platform built for university researchers, graduate students, and high-stakes examinees (e.g., Bar Examination, Civil Service Commission, PRC Licensure, STEM Graduate Reviews). 

The platform bridges the gap between **raw document ingestion** and **board-grade assessment & publication-ready synthesis**:
1. **The Assessment & Mock Exam Engine**: An offline-first, $0-cost, psychometrically rigorous test generator that transforms statutory documents, pre-structured question banks, and handwritten notes into conflict-free mock exams with printable OMR bubble sheet planning.
2. **The Research & Document Studio**: An integrated literature synthesis and manuscript workspace featuring multi-paper comparative matrices, LaTeX math formula OCR, 3D citation force graphs, and TipTap document editing with Overleaf (.tex) export.

---

## 2. Core Architectural Engines

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              RESEARCHMATE PLATFORM                              │
├──────────────────────────────────────┬──────────────────────────────────────────┤
│        EXAM & ASSESSMENT ENGINE      │       RESEARCH & SYNTHESIS ENGINE        │
├──────────────────────────────────────┼──────────────────────────────────────────┤
│ • 2-Pass Structured PDF Ingestion   │ • PDF Studio & In-Text Citations         │
│ • Distractor Quality & Anti-Slop     │ • Multi-Paper Literature Review Matrix   │
│ • Cross-Template Enemy Item Filter   │ • STEM Handwritten Math OCR to LaTeX     │
│ • Deterministic Seeded PRNG Shuffler │ • 3D Citation Knowledge Graph            │
│ • OMR Bubble Answer Sheet Planner    │ • TipTap Manuscript Editor (.tex/.docx)  │
│ • Local-First IndexedDB Bank ($0)    │ • Document-Scoped Semantic RAG Chat      │
└──────────────────────────────────────┴──────────────────────────────────────────┘
```

### Engine 1: Deterministic Question Ingestion & Parsing
* **File**: `src/services/pdfQuestionImporter.ts`, `src/services/pdfService.ts`
* **Mechanism**: Two-pass deterministic layout-aware PDF parser. Reads physical font coordinates and line breaks to identify legal headings, section titles, definitions, and enumerated clauses without calling external LLM APIs.
* **Output Types**:
  - **Standard MCQs**: 4 options with context-drawn distractors.
  - **True/False**: Verbatim statutory facts with exact counter-factual negation.
  - **Negative-Choice ("Which is NOT")**: High-level outlier detection using strictly disjoint options from sister statutory sections.
  - **Matching Sets**: 8-item unified option bank (A–H) testing categorical definitions.
  - **Number-Blank Deadlines**: Tests statutory days/timeframes (e.g. 15, 30, 45, 60 days) with numerical distractor sets drawn exclusively from valid document deadlines.
  - **Flashcards**: Quick recall decks for section titles, norms, and penalties.

### Engine 2: Distractor Quality, Linting & Enemy Item Filter
* **File**: `src/services/distractorQualityService.ts`
* **Mechanism**: Psychometric verification engine running automated sanity checks:
  - **Zero Stem Cluing**: Stems are strictly checked to ensure they do not give away the answer or mention option values.
  - **Enemy Item Elimination**: Exam candidate pools are filtered so no selected item shares a source clause or mentions another selected question's answer term/deadline (e.g. #11 containing "60 days" dropped if #10 tests "60 days").
  - **Source Grounding**: 100% of extracted quotes and fragments ($\ge 10$ chars) must match verbatim substrings in the source PDF.
  - **Statutory Linting**: Handles currency decimals without splitting sentences (e.g. `(P5,000.00)`), strips scraping artifacts ("back to top"), and flags statutory drafting errors (e.g., fines measured in years) into a `needs_review` queue.

### Engine 3: Deterministic Seeded Shuffling & Answer Sheet Planner
* **File**: `src/services/examSeedService.ts`
* **Mechanism**: 
  - **PRNG**: 32-bit `Mulberry32` engine initialized by `FNV-1a` string hashing. Every seed code (`SEED-XXXX`) yields an identical, reproducible examination order and answer key.
  - **Balanced Slot Distribution**: Correct options are evenly permuted across positions (A, B, C, D) to eliminate answer-position bias.
  - **Answer Sheet Layout Planning**: Computes per-section bubble configurations (`choicesPerItem`):
    - True/False: Exactly 2 bubbles (A–B).
    - Standard MCQ: Default 4 bubbles (A–D), capped at 5 (A–E).
    - Matching Sets: Dedicated section with up to 8 bubbles (A–H).

### Engine 4: Local-First Question Bank & Ingestion Pipeline
* **File**: `src/services/questionBankService.ts`, `src/services/questionImportService.ts`, `src/services/questionBankDb.ts`
* **Mechanism**: Multi-tier storage (IndexedDB &rarr; in-memory cache &rarr; localStorage fallback). 
  - **Zero Cloud Cost**: Ingests thousands of questions completely client-side.
  - **Batch Provenance & Rollback**: Every import tracks `importBatchId`, `subject`, `topic`, `sourceFile`, and `sourcePage` with instant one-click rollback.
  - **Verification States**: Questions flow through `verified`, `needs_review`, and `flagged` lifecycles.

### Engine 5: RAG, Vision OCR & Document Synthesis
* **File**: `src/services/ragService.ts`, `src/services/geminiService.ts`, `api/ocr.ts`, `api/literature-matrix.ts`
* **Mechanism**: Hybrid semantic retrieval and multimodal vision:
  - Gemini Vision OCR extracts handwritten whiteboard and notebook derivations directly into LaTeX.
  - Literature matrix endpoint cross-compares methodology, datasets, and research gaps across 20+ PDFs.
  - 3D Force Graph renders citation topology and cross-paper linkages.

---

## 3. Detailed File Structure & Key Modules

### Directory Tree

```
Researchmate Website/
├── api/                           # Vercel Serverless Functions
├── docs/                          # Architecture & Audit Documentation
├── public/                        # Static Assets & PDF.js Workers
├── scratch/                       # Local generation artifacts (git-ignored)
├── src/
│   ├── components/                # React UI Component Hierarchy
│   │   ├── App/                   # Core Authenticated Application Modules
│   │   │   ├── AIAssistant/       # Floating & Full-Page Research Chat
│   │   │   ├── CollectionsPage/   # Research Collections Management
│   │   │   ├── Dashboard/         # Main Workspace Hub & Daily Sprint Modal
│   │   │   ├── PdfReader/         # Legacy Inline PDF Viewer
│   │   │   ├── PdfStudio/         # Document Studio with In-Text Citations
│   │   │   ├── ReviewCompanion/   # Mock Exam Engine, Question Bank & Importer
│   │   │   ├── Settings/          # Account, API Keys & Data Import/Export
│   │   │   └── Statistics/        # Study Habits, Accuracy & Progress Visuals
│   │   ├── auth/                  # Supabase Login, Signup & OAuth Callbacks
│   │   ├── icons/                 # Custom Vector & Lucide Icons
│   │   ├── marketing/             # Landing Page, Pricing & Hero Sections
│   │   ├── Mobile/                # Mobile Layouts & Responsive Navigation
│   │   └── shared/                # Modals, Dropdowns, Toast Notifications
│   ├── constants/                 # System Configurations & Default Values
│   ├── context/                   # Global React State Providers
│   ├── hooks/                     # Custom Utility Hooks
│   ├── services/                  # Business Logic & Backend Service Engines
│   ├── utils/                     # Formatting, Hashing & String Helpers
│   ├── App.tsx                    # Top-Level Router & Protected Layouts
│   ├── main.tsx                   # React 19 Entrypoint
│   └── types.ts                   # Core Domain Type Definitions
└── tests/                         # Vitest Test Suites & End-to-End Audits
```

---

### Important Files & Responsibilities

#### `src/services/` (The Core Engine Suite)
| File | Responsibility |
| :--- | :--- |
| `pdfQuestionImporter.ts` | The 2-pass deterministic PDF extractor. Converts PDF layouts into structured MCQs, T/F, matching sets, deadline blanks, and flashcards. |
| `distractorQualityService.ts` | The psychometric linting engine. Validates distractor plausibility, eliminates stem clue leaks, verifies verbatim source quotes, and filters cross-template enemy items. |
| `examSeedService.ts` | Deterministic exam engine. Manages 32-bit Mulberry32 PRNG shuffling, balanced answer keys, and answer sheet layout planning (`choicesPerItem`). |
| `questionBankService.ts` | Question bank repository. Handles IndexedDB caching, stats aggregation, verified/needs_review queries, and exam assembly. |
| `questionImportService.ts` | Unified ingestion pipeline for Dashboard, Document Studio, and Study Companion with batch rollback support. |
| `questionBankDb.ts` | Low-level browser IndexedDB wrapper using `idb` for high-capacity question storage. |
| `examService.ts` | Mock exam session state, scoring logic, timer management, and performance histories. |
| `examParser.ts` | Parses free-text and AI responses into standardized question objects. |
| `twinTemplateService.ts` | Generates paired "twin" practice items to re-test missed concepts without showing the exact same question. |
| `examReadinessService.ts` | Calculates student exam readiness scores based on accuracy, topic coverage, and decay curves. |
| `practicePacerService.ts` | Tracks time-per-question and paces students to meet real-world exam time limits. |
| `formularyService.ts` | Extraction and cataloging of STEM formulas and statutory citations. |
| `mathSolverEngine.ts` | Step-by-step math solver interface with LaTeX step rendering. |
| `pdfService.ts` | Client-side PDF.js rendering engine with coordinate-aware text extraction. |
| `ragService.ts` | Retrieval-augmented generation engine managing document context injection. |
| `citationService.ts` | Citation parser and formatter supporting APA, MLA, Chicago, and IEEE. |
| `paymongoService.ts` | Client-side PayMongo payment integration for subscription upgrades. |
| `supabaseClient.ts` | Supabase authentication, database queries, and real-time sync client. |
| `geminiService.ts` | Google Gemini API integration for chat, summarization, and vision OCR. |

---

#### `src/components/App/ReviewCompanion/` (The Examination Suite)
| File | Responsibility |
| :--- | :--- |
| `ReviewCompanionPage.tsx` | Main study hub organizing Mock Exams, Question Bank, Flashcards, and Import tools. |
| `MockExamEngine.tsx` | Full-screen examination simulator with timed mode, question navigator, flag-for-review, and final score audit. |
| `QuestionImportModal.tsx` | Visual ingestion modal showing real-time PDF extraction previews, review status badges, and one-click import into the Bank. |
| `FlashcardsDeck.tsx` | Interactive 3D flip-card study deck with Leitner spaced repetition. |
| `QuestionEditorModal.tsx` | In-place question editor allowing students and teachers to adjust stems, distractors, and explanations. |
| `MaterialScopeSelector.tsx` | Filters study sessions by specific documents, chapters, or custom subject tags. |
| `TopicScholarSearch.tsx` | Deep academic search linking concepts to external scholarly databases. |

---

#### `src/components/App/PdfStudio/` (The Literature & Research Suite)
| File | Responsibility |
| :--- | :--- |
| `DocumentStudio.tsx` | Split-screen workspace uniting the PDF reader with the active manuscript note editor. |
| `PdfViewerCanvas.tsx` | Canvas-based PDF viewer supporting text selection, rectangle annotations, and color tagging. |
| `StudioNoteEditor.tsx` | Rich-text manuscript editor (TipTap) supporting LaTeX formulas, tables, and citation pins. |
| `CitationDrawer.tsx` | Side panel managing document bibliography and bibtex exports. |
| `FloatingSelectionToolbar.tsx` | Instant selection toolbar to convert highlighted PDF text into notes, citations, or flashcards. |

---

#### `api/` (Serverless Edge Functions)
| File | Responsibility |
| :--- | :--- |
| `ocr.ts` | Gemini Vision OCR endpoint converting physical note scans into text and LaTeX. |
| `literature-matrix.ts` | Generates comparative synthesis matrices across multiple ingested research papers. |
| `checkout.ts` | Creates PayMongo checkout sessions for user subscription tiers. |
| `paymongo-webhook.ts` | Webhook receiver upgrading user accounts upon payment verification. |
| `chat.ts` | Streaming chat endpoint with document-scoped system prompts. |
| `embed.ts` | Vector embedding generation for semantic document search. |
| `summarize.ts` | Extractive and abstractive research paper summarization. |

---

## 4. Current & Future Milestones

### Current State (Completed in Quality Round 6)
- **100% Deterministic PDF-to-Exam Pipeline**: Validated against Philippine statutory code (RA 6713) producing 87 verified items (MCQs, T/F, Negative, Matching, Deadlines, Cards).
- **Enemy Item Elimination**: Prevents cross-item answer clue leaks at both exam assembly and seeded shuffle runtimes.
- **Answer Sheet Architecture**: Added `choicesPerItem` per-section layout planning (2-bubble, 4-bubble, 5-bubble, 8-bubble).
- **Full Offline Question Bank**: Local-first storage with batch rollback and provenance tracking.

---

### Ingestion Pipeline Expansion (Immediate Roadmap)
We are actively expanding the unified importer to handle three distinct material types:

```
                  ┌──────────────────────────────────────────────┐
                  │          UNIFIED INGESTION PIPELINE          │
                  └──────────────────────┬───────────────────────┘
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         ▼                               ▼                               ▼
┌──────────────────┐           ┌──────────────────┐           ┌──────────────────┐
│  MATERIAL TYPE A │           │  MATERIAL TYPE B │           │  MATERIAL TYPE C │
│  Structured PDFs │           │  Concept Texts   │           │  Handwritten /   │
│  (Problem +      │           │  (Statutes,      │           │  Multimodal      │
│   Choices exist) │           │   Codes, Books)  │           │  (Scans, Notes)  │
└────────┬─────────┘           └────────┬─────────┘           └────────┬─────────┘
         │                              │                              │
         │ Direct Stem/Choice           │ 2-Pass Heading/              │ Gemini Vision   │
         │ Parsing & Key Sync           │ Provision Synthesizer        │ OCR & LaTeX     │
         └──────────────────────────────┼──────────────────────────────┘
                                        │
                                        ▼
                  ┌──────────────────────────────────────────────┐
                  │       DISTRACTOR LINT & ENEMY FILTER         │
                  └─────────────────────┬────────────────────────┘
                                        │
                                        ▼
                  ┌──────────────────────────────────────────────┐
                  │     UNIFIED QUESTION BANK (IndexedDB)        │
                  │    • Verified vs Needs Review                │
                  │    • Seeded Exam Generator                   │
                  │    • OMR Answer Sheet Layout Engine          │
                  └──────────────────────────────────────────────┘
```

1. **Material Type A — Structured Question PDFs**:
   - Ingests test banks that *already* contain stems and multiple choices (e.g., review center mock exams, previous board questions).
   - Extracts options `(A)-(D)`, captures letter keys, validates distractor counts, and preserves existing question numbers.
2. **Material Type B — Concept Review Texts**:
   - Our battle-tested 2-pass synthesizer (as demonstrated with RA 6713).
   - Generates brand new, legally grounded MCQs, matching sets, and deadline questions directly from raw statutory or textbook provisions.
3. **Material Type C — Handwritten & Whiteboard Notes**:
   - Ingests phone camera captures, notebook scans, and smart pen uploads.
   - Preprocessed through `api/ocr.ts` into clean Markdown/LaTeX before importing into the question bank.

---

### Future Platform Capabilities
1. **Physical OMR Scanner / Camera Grading**:
   - Allow users to take a photo of their physical bubble sheet.
   - Automatically score the bubbles against the seeded `answerKey` in real-time.
2. **Printable Exam Paper Generator**:
   - Export publication-ready, dual-column PDF examination booklets (Set A / Set B) with student instructions and test cover sheets.
3. **Psychometric Distractor Discrimination Tracking**:
   - Record student answer choices locally to calculate distractor efficiency and flag non-discriminating items over time.
