import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { extractAllPagesWithLayout } from "../src/services/pdfService";
import { parseTwoPassQuestionsAndAnswers } from "../src/services/pdfQuestionImporter";
import {
  assertNoStemLeaksOrOptionClashes,
  assertStemGroundedInSourcePage,
  filterEnemyItems,
} from "../src/services/distractorQualityService";
import {
  importQuestionsToBank,
  computeImportPreview,
  RawImportQuestionItem,
} from "../src/services/questionImportService";
import { clearQuestionBank, getUserQuestions } from "../src/services/questionBankService";

describe("QuestionImportModal Pipeline End-to-End Audit - Quality Round 5", () => {
  it("imports RA 6713 through the modal import pipeline and verifies Quality Round 5 requirements", async () => {
    clearQuestionBank();

    const fixturePath = path.resolve(
      __dirname,
      "fixtures/Philippines_Code_of_Conduct_and_Ethical_Standards_for_Public_Officials_1989.pdf"
    );
    expect(fs.existsSync(fixturePath)).toBe(true);

    const buffer = fs.readFileSync(fixturePath);
    // Exact pipeline QuestionImportModal uses: extractAllPagesWithLayout -> parseTwoPassQuestionsAndAnswers
    const layoutResult = await extractAllPagesWithLayout(buffer);
    expect(layoutResult.pages.length).toBeGreaterThan(0);

    const parsedQaList = parseTwoPassQuestionsAndAnswers(layoutResult.pages);
    expect(parsedQaList.length).toBe(85);
    expect(parsedQaList.totalSupported).toBe(85);
    expect(parsedQaList.mcqCount).toBe(20);
    expect(parsedQaList.flashcardCount).toBe(65);
    expect(parsedQaList.coverageSummary).toContain("Document supports 85 distinct questions; 65 converted to flashcards, 20 MCQs.");

    const mcqs = parsedQaList.filter((q) => q.questionType === "mcq");
    expect(mcqs.length).toBe(20);

    // -------------------------------------------------------------
    // 1. UNIVERSAL LEAK & OPTION CLASH ASSERTION
    // -------------------------------------------------------------
    // A. Show it FAILING on leaking items
    const leakingQ1 = {
      stem: 'Under RA 6713, which norm of conduct is defined as: "[______] officials and employees shall always uphold the public interest over and above personal [______]..."?',
      options: ["Commitment to democracy", "Commitment to public interest", "Nationalism and patriotism", "Responsiveness to the public"],
      correctIndex: 1,
      questionType: "mcq",
    };
    const leakCheckFail1 = assertNoStemLeaksOrOptionClashes(leakingQ1);
    expect(leakCheckFail1.passed).toBe(false);
    expect(leakCheckFail1.violations.some((v) => v.includes("public interest"))).toBe(true);

    const leakingQ5 = {
      stem: 'Under RA 6713, which term is defined as: "includes the act of accepting, directly or indirectly, any gift from a person other than..."?',
      options: ["Family of public officials or employees", "Government", "Receiving any gift", "Relatives"],
      correctIndex: 2,
      questionType: "mcq",
    };
    const leakCheckFail2 = assertNoStemLeaksOrOptionClashes(leakingQ5);
    expect(leakCheckFail2.passed).toBe(false);
    expect(leakCheckFail2.violations.some((v) => v.includes("gift"))).toBe(true);

    // B. Show it PASSING over every generated MCQ in the real output
    for (const mcq of mcqs) {
      const leakResult = assertNoStemLeaksOrOptionClashes(mcq);
      if (!leakResult.passed) {
        console.error(`Leak in MCQ #${mcq.number}:`, leakResult.violations);
      }
      expect(leakResult.passed).toBe(true);
      expect(leakResult.violations).toEqual([]);
    }

    // -------------------------------------------------------------
    // 2. GROUNDING TEST: SUBSTRING OF SOURCE PAGE TEXT
    // -------------------------------------------------------------
    // Map pageNumber to page text
    const pageTextMap = new Map<number, string>();
    layoutResult.pages.forEach((p) => {
      pageTextMap.set(p.pageNumber, p.text);
    });

    // A. Show it FAILING on synthetic/buggy draft samples
    const p2Text = pageTextMap.get(2) || "";
    // Bug 1: "act or liberality" instead of "act of liberality"
    const buggyQ4 = {
      stem: 'Under RA 6713, which term is defined as: "refers to a thing or a right disposed of gratuitously, or any act or liberality, in favor of another who accepts it..."?',
      sourcePage: 2,
    };
    const groundFail1 = assertStemGroundedInSourcePage(buggyQ4, p2Text);
    expect(groundFail1.grounded).toBe(false);
    expect(groundFail1.missingFragments.some((f) => f.includes("act or liberality"))).toBe(true);

    // Bug 2: "a person other than a person other than" (duplication)
    const buggyQ5 = {
      stem: 'Under RA 6713, which term is defined as: "includes the act of accepting, directly or indirectly, a [______] from a person other than a person other than a member of his family..."?',
      sourcePage: 2,
    };
    const groundFail2 = assertStemGroundedInSourcePage(buggyQ5, p2Text);
    expect(groundFail2.grounded).toBe(false);
    expect(groundFail2.missingFragments.some((f) => f.includes("person other than a person other than"))).toBe(true);

    // Bug 3: Fabricated tail
    const buggyQ6 = {
      stem: 'Under RA 6713, which term is defined as: "covers both simple [______] and commodatum as well as guarantees and arbitrary authorization by the board."?',
      sourcePage: 2,
    };
    const groundFail3 = assertStemGroundedInSourcePage(buggyQ6, p2Text);
    expect(groundFail3.grounded).toBe(false);
    expect(groundFail3.missingFragments.some((f) => f.includes("arbitrary authorization by the board"))).toBe(true);

    // B. Show it PASSING over every generated MCQ in the real output against its source page text
    for (const mcq of mcqs) {
      const pageNum = mcq.sourcePage || mcq.pageNumber || 1;
      const pageText = pageTextMap.get(pageNum) || "";
      const groundResult = assertStemGroundedInSourcePage(mcq, pageText);
      if (!groundResult.grounded) {
        console.error(`Grounding failure in MCQ #${mcq.number}:`, groundResult.missingFragments);
      }
      expect(groundResult.grounded).toBe(true);
      expect(groundResult.missingFragments).toEqual([]);
    }

    // -------------------------------------------------------------
    // 3. EXAM ASSEMBLY & ENEMY ITEM CHECK
    // -------------------------------------------------------------
    const { selected: assembled, rejected } = filterEnemyItems(mcqs, 20);
    expect(assembled.length).toBe(20);
    expect(rejected.length).toBe(0);

    // -------------------------------------------------------------
    // 4. NUMBER-BLANKS DEADLINE REQUIREMENTS (Q8, Q9, Q10)
    // -------------------------------------------------------------
    const deadlineMcqs = mcqs.filter((q) => q.templateType === "number_blank_deadline");
    expect(deadlineMcqs.length).toBe(3);

    // All options drawn strictly from real document deadlines [15, 30, 45, 60]
    for (const dQ of deadlineMcqs) {
      expect(dQ.options).toEqual(["15", "30", "45", "60"]);
      expect(dQ.stem).not.toMatch(/\b15\b|\b30\b|\b60\b/);
      expect(dQ.stem).toMatch(/Section\s+\d+|Complete the legal provision/);
    }

    // Distinct answers tested (15, 30, 60)
    const deadlineAnswers = deadlineMcqs.map((q) => q.options[q.correctIndex]);
    expect(deadlineAnswers).toContain("15");
    expect(deadlineAnswers).toContain("30");
    expect(deadlineAnswers).toContain("60");

    // Don't use largest value as answer more than half the time (only 60 is max: 1 out of 3 = 33% <= 50%)
    const largestAnswers = deadlineMcqs.filter((q) => q.options[q.correctIndex] === "60");
    expect(largestAnswers.length).toBe(1);
    expect(largestAnswers.length / deadlineMcqs.length).toBeLessThanOrEqual(0.5);

    // -------------------------------------------------------------
    // 5. "NOT" QUESTIONS: GENUINE CONCEPTS & SOURCE CITATIONS
    // -------------------------------------------------------------
    const negativeItems = mcqs.filter((q) => q.templateType === "negative_choice");
    expect(negativeItems.length).toBe(3);

    const oddOptions = negativeItems.map((q) => q.options[q.correctIndex]);
    expect(oddOptions).toContain("Divestment of shareholdings");
    expect(oddOptions).toContain("System of incentives and rewards");
    expect(oddOptions).toContain("Private practice of profession");

    // Zero fabricated options like "Commercial profitability"
    for (const neg of negativeItems) {
      expect(neg.options).not.toContain("Commercial profitability");
      expect(neg.options).not.toContain("Absolute financial secrecy");
      expect(neg.options).not.toContain("Due process of law");
      expect(neg.explanation).toMatch(/Section\s+\d+/);
    }

    // -------------------------------------------------------------
    // 6. MATCHING SET FOR THE 8 NORMS: SOURCE WORDING & QUOTES
    // -------------------------------------------------------------
    const matchingItems = mcqs.filter((q) => q.templateType === "matching_set");
    expect(matchingItems.length).toBe(4);
    for (const m of matchingItems) {
      expect(m.options.length).toBe(8);
      expect(m.sourceQuote).toBeDefined();
      expect(m.sourceQuote!.length).toBeGreaterThan(30);
      expect(m.stem).toContain('[Matching Set: Norms of Conduct');
          }

    // -------------------------------------------------------------
    // 7. TRUE / FALSE VARIETY TEMPLATES
    // -------------------------------------------------------------
    const tfItems = mcqs.filter((q) => q.templateType === "true_false");
    expect(tfItems.length).toBe(3);
    expect(tfItems.filter((q) => q.options[q.correctIndex] === "True").length).toBe(1);
    expect(tfItems.filter((q) => q.options[q.correctIndex] === "False").length).toBe(2);

    // -------------------------------------------------------------
    // 8. IMPORT TO QUESTION BANK
    // -------------------------------------------------------------
    const rawQuestionsForImport: RawImportQuestionItem[] = parsedQaList.map((item) => ({
      id: item.id,
      stem: item.stem,
      options: item.options,
      correctIndex: item.correctIndex,
      explanation: item.explanation,
      chapter: item.chapter,
      sourcePage: item.sourcePage,
      questionType: item.questionType,
      reviewStatus: item.reviewStatus,
      suspiciousReasons: item.suspiciousReasons,
    }));

    const preview = computeImportPreview(
      rawQuestionsForImport,
      "Philippines Code of Conduct",
      "Philippines_Code_of_Conduct_and_Ethical_Standards_for_Public_Officials_1989.pdf"
    );
    expect(preview.total).toBe(85);
    expect(preview.verifiedCount).toBe(82);
    expect(preview.needsReviewCount).toBe(3);

    const importResult = await importQuestionsToBank({
      rawQuestions: rawQuestionsForImport,
      subject: "Philippines Code of Conduct",
      sourceFile: "Philippines_Code_of_Conduct_and_Ethical_Standards_for_Public_Officials_1989.pdf",
      origin: "pdf_import",
    });

    expect(importResult.importedCount).toBe(85);
    expect(importResult.needsReviewCount).toBe(3);
    expect(getUserQuestions().length).toBe(85);
  });
});
