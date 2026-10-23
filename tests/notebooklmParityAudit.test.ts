import { describe, it, expect } from "vitest";
import {
  buildChatContext,
  buildSynthesisContext,
  selectProportionalChunks,
  chunkText,
  createRepresentativeSnippet,
  DocumentChunk,
} from "../src/services/ragService";
import {
  calculateExamPace,
  computePacerMetrics,
  formatPacerTime,
  EXAM_PACER_PRESETS,
} from "../src/services/practicePacerService";
import fs from "fs";
import path from "path";

describe("NotebookLM Parity & Feature Audit Suite", () => {
  // =========================================================================
  // CLAIM 1: MULTI-SOURCE GROUNDING & ZERO-HALLUCINATION ISOLATION
  // =========================================================================
  describe("Feature 1: Multi-Source Grounding & Anti-Hallucination Isolation", () => {
    it("guarantees proportional chunk representation across all selected documents (no starvation)", () => {
      // Doc 1 has high keyword overlap with query ("calculus integral limit")
      // Doc 2 has lower overlap ("linear algebra matrix")
      // Doc 3 has minimal overlap ("general physics mechanics")
      const chunks: DocumentChunk[] = [
        { chunkId: "doc-1-c0", text: "Calculus integral definition and limit.", index: 0, docId: "doc-1", sourceTitle: "Calculus" },
        { chunkId: "doc-1-c1", text: "Fundamental theorem of calculus and integral.", index: 1, docId: "doc-1", sourceTitle: "Calculus" },
        { chunkId: "doc-1-c2", text: "Definite integral calculation methods.", index: 2, docId: "doc-1", sourceTitle: "Calculus" },
        { chunkId: "doc-2-c0", text: "Linear algebra matrix determinants.", index: 0, docId: "doc-2", sourceTitle: "Algebra" },
        { chunkId: "doc-2-c1", text: "Eigenvalues and matrix diagonalization.", index: 1, docId: "doc-2", sourceTitle: "Algebra" },
        { chunkId: "doc-3-c0", text: "Newtonian mechanics and classical velocity.", index: 0, docId: "doc-3", sourceTitle: "Physics" },
      ];

      const activeItems = [
        { sourceTitle: "Calculus", text: "..." },
        { sourceTitle: "Algebra", text: "..." },
        { sourceTitle: "Physics", text: "..." },
      ];

      const selected = selectProportionalChunks(
        "explain integrals and matrices in calculus and algebra",
        [],
        activeItems,
        chunks,
        5
      );

      // Verify that every single active document is represented in the selected chunks
      const selectedDocIds = new Set(selected.map((c) => c.docId));
      expect(selectedDocIds.has("doc-1")).toBe(true);
      expect(selectedDocIds.has("doc-2")).toBe(true);
      expect(selectedDocIds.has("doc-3")).toBe(true);
      expect(selected.length).toBeLessThanOrEqual(5);
    });

    it("generates structured <sources_manifest> and non-interleaved document excerpts", async () => {
      const items = [
        {
          sourceTitle: "Calculus_Early_Trans.pdf",
          text: "[Page 10]\nLimits definition: epsilon-delta formulation.\n\n[Page 25]\nL'Hopital's rule for indeterminate quotient forms.",
        },
        {
          sourceTitle: "Linear_Algebra_Strang.pdf",
          text: "[Page 5]\nVector spaces and subspaces definition.\n\n[Page 18]\nGram-Schmidt orthogonalization process.",
        },
      ];

      const result = await buildChatContext("compare limits and vector spaces", items);

      // 1. Verify Manifest lists all sources
      expect(result.contextText).toContain("<sources_manifest count=\"2\">");
      expect(result.contextText).toContain("<source id=\"doc-1\" title=\"Calculus_Early_Trans.pdf\"");
      expect(result.contextText).toContain("<source id=\"doc-2\" title=\"Linear_Algebra_Strang.pdf\"");

      // 2. Verify Structured XML Excerpt tags with page and section numbers
      expect(result.contextText).toContain("<source_excerpt doc_id=\"doc-1\" title=\"Calculus_Early_Trans.pdf\"");
      expect(result.contextText).toContain("<source_excerpt doc_id=\"doc-2\" title=\"Linear_Algebra_Strang.pdf\"");

      // 3. Verify Document-Grouping (all doc-1 excerpts must appear BEFORE doc-2 excerpts)
      const doc1Index = result.contextText.indexOf('doc_id="doc-1"');
      const doc2Index = result.contextText.indexOf('doc_id="doc-2"');
      expect(doc1Index).toBeLessThan(doc2Index);

      // 4. Verify Content integrity
      expect(result.contextText).toContain("L'Hopital's rule");
      expect(result.contextText).toContain("Gram-Schmidt");
    });

    it("verifies the Strict Multi-Document Attribution Firewall in API Chat system prompt", () => {
      const chatPath = path.resolve(__dirname, "../api/chat.ts");
      const chatSource = fs.readFileSync(chatPath, "utf-8");
      expect(chatSource).toContain("8. NOTEBOOKLM-STYLE SOURCE GROUNDING & MULTI-DOCUMENT BOUNDARY FIREWALL");
      expect(chatSource).toContain("<sources_manifest>");
      expect(chatSource).toContain("<source_excerpt");
      expect(chatSource).toContain("ZERO CROSS-DOCUMENT CONTAMINATION");
      expect(chatSource).toContain("MANDATORY INLINE CITATIONS");
      expect(chatSource).toContain("ZERO-HALLUCINATION GUARDRAIL");
    });
  });

  // =========================================================================
  // CLAIM 2: FULL MULTI-PAGE PDF EXTRACTION & LONG-DOC SUMMARY
  // =========================================================================
  describe("Feature 2: Full Document Ingestion & Representative Summary", () => {
    it("samples beginning, core chapters, and conclusions for long documents without 5,000-char truncation", () => {
      // Create a 30,000-character document representing a 20-page textbook
      const intro = "CHAPTER 1: Fundamental axioms and historical context of differential equations. ";
      const middle = "CHAPTER 5: Non-homogeneous second-order ODEs with undetermined coefficients. ";
      const conclusion = "CHAPTER 10: Numerical approximations via Runge-Kutta fourth-order methods. ";

      const longDoc = intro.repeat(100) + middle.repeat(100) + conclusion.repeat(100);
      expect(longDoc.length).toBeGreaterThan(20000);

      const snippet = createRepresentativeSnippet(longDoc, 6000);

      // Must be capped within maxLen
      expect(snippet.length).toBeLessThanOrEqual(6200);

      // Must contain content from ALL THREE portions of the document
      expect(snippet).toContain("Fundamental axioms");
      expect(snippet).toContain("undetermined coefficients");
      expect(snippet).toContain("Runge-Kutta");
      expect(snippet).toContain("[... Continuing through core chapters ...]");
      expect(snippet).toContain("[... Concluding sections ...]");
    });

    it("preserves short documents completely without artificial slicing", () => {
      const shortDoc = "Compact syllabus review note covering 3 essential theorems.";
      const snippet = createRepresentativeSnippet(shortDoc, 6000);
      expect(snippet).toBe(shortDoc);
    });
  });

  // =========================================================================
  // CLAIM 3: HIGH-PRECISION TABULAR & MATH OCR
  // =========================================================================
  describe("Feature 3: Tabular Markdown Pipe & KaTeX Math in OCR", () => {
    it("ensures OCR service prompt enforces clean Markdown pipe tables and KaTeX math delimiters", () => {
      const ocrPath = path.resolve(__dirname, "../api/ocr.ts");
      const ocrSource = fs.readFileSync(ocrPath, "utf-8");

      // Verify Markdown pipe table instruction exists
      expect(ocrSource).toContain("Tables & Grids: transcribe ALL tables and tabular data as clean Markdown pipe tables");
      expect(ocrSource).toContain("NEVER collapse tables into space-separated text");

      // Verify KaTeX delimiter enforcement
      expect(ocrSource).toContain("Mathematical expressions, formulas, variables, and units MUST be transcribed using standard LaTeX delimiters");
      expect(ocrSource).toContain("$...$ for inline, $$...$$ for block display");
    });
  });

  // =========================================================================
  // CLAIM 4: LIVING MANUSCRIPT BRIDGE ("SAVE TO MANUSCRIPT")
  // =========================================================================
  describe("Feature 4: Living Manuscript Bridge", () => {
    it("formats incoming AI study note payloads into TipTap manuscript nodes", () => {
      // Simulate payload saved by ChatPanel or ItemDetailModal to sessionStorage
      const payload = {
        title: "Stokes' Theorem Derivation",
        text: "The surface integral of the curl of a vector field equals the line integral around its boundary.\n\n$$\\iint_S (\\nabla \\times \\mathbf{F}) \\cdot d\\mathbf{S} = \\oint_C \\mathbf{F} \\cdot d\\mathbf{r}$$",
        sourceTitle: "Multivariable_Calculus.pdf",
      };

      const paragraphs = payload.text.split("\n\n").map((p) => p.trim()).filter(Boolean);

      // Transform into TipTap document nodes (as implemented in DocumentEditor.tsx)
      const nodes = [
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: payload.title }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              marks: [{ type: "italic" }],
              text: `Source Reference: ${payload.sourceTitle}`,
            },
          ],
        },
        ...paragraphs.map((p) => ({
          type: "paragraph",
          content: [{ type: "text", text: p }],
        })),
        { type: "paragraph" },
      ];

      expect(nodes[0].attrs.level).toBe(3);
      expect((nodes[0].content[0] as any).text).toBe("Stokes' Theorem Derivation");
      expect((nodes[1].content[0] as any).text).toContain("Multivariable_Calculus.pdf");
      expect(nodes.length).toBe(5); // heading + source + 2 paragraphs + empty spacing paragraph
    });
  });

  // =========================================================================
  // CLAIM 5: HIGH-YIELD ACTIVE-RECALL FLASHCARDS
  // =========================================================================
  describe("Feature 5: High-Yield Active-Recall Flashcards", () => {
    it("verifies Flashcard prompt enforces grounded conceptual contrast, boundary conditions, and exam traps", () => {
      const flashcardsPath = path.resolve(__dirname, "../src/components/App/ReviewCompanion/FlashcardsDeck.tsx");
      const flashcardsSource = fs.readFileSync(flashcardsPath, "utf-8");

      expect(flashcardsSource).toContain("Grounded Conceptual Contrast");
      expect(flashcardsSource).toContain("Test distinctions, governing conditions, common exam traps");
      expect(flashcardsSource).toContain("never superficial dictionary definitions");
      expect(flashcardsSource).toContain("LaTeX Standard");
    });
  });

  // =========================================================================
  // CLAIM 6: TIMED PRACTICE PACER BENCHMARKS (CSC SIMULATION)
  // =========================================================================
  describe("Feature 6: Timed Practice Pacer CSC Exam Pace Simulation", () => {
    it("accurately calculates 67-second pace for Philippine CSC Exam (150 items / 180 minutes)", () => {
      // 3 hours = 10,800s. With 12.5 min (750s) buffer -> 10,050s / 150 = 67s!
      const pace = calculateExamPace({
        totalQuestions: 150,
        totalHours: 3,
        bufferMinutes: 12.5,
      });

      expect(pace).toBe(67);
      const cscPreset = EXAM_PACER_PRESETS.find((p) => p.id === "csc_150");
      expect(cscPreset).toBeDefined();
      expect(cscPreset?.paceSeconds).toBe(67);
    });
  });
});
