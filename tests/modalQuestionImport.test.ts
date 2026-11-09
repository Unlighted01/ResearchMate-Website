import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { extractAllPagesWithLayout } from "../src/services/pdfService";
import { parseTwoPassQuestionsAndAnswers } from "../src/services/pdfQuestionImporter";
import {
  assertNoStemLeaksOrOptionClashes,
  filterEnemyItems,
} from "../src/services/distractorQualityService";
import {
  importQuestionsToBank,
  computeImportPreview,
  RawImportQuestionItem,
} from "../src/services/questionImportService";
import { clearQuestionBank, getUserQuestions } from "../src/services/questionBankService";

describe("QuestionImportModal Pipeline End-to-End Audit - Quality Round 4", () => {
  it("imports RA 6713 through the modal import pipeline and verifies Quality Round 4 requirements", async () => {
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

    // 1. UNIVERSAL LEAK & OPTION CLASH ASSERTION OVER EVERY GENERATED MCQ
    for (const mcq of mcqs) {
      const leakResult = assertNoStemLeaksOrOptionClashes(mcq);
      if (!leakResult.passed) {
        console.error(`Leak in MCQ #${mcq.number}:`, leakResult.violations);
      }
      expect(leakResult.passed).toBe(true);
      expect(leakResult.violations).toEqual([]);
    }

    // 2. EXAM ASSEMBLY & ENEMY ITEM CHECK
    const { selected: assembled, rejected } = filterEnemyItems(mcqs, 20);
    expect(assembled.length).toBe(20);
    expect(rejected.length).toBe(0);

    // 3. RULE-BASED VARIETY CHECKS
    const tfItems = mcqs.filter((q) => q.templateType === "true_false");
    expect(tfItems.length).toBe(3);
    expect(tfItems.filter((q) => q.options[q.correctIndex] === "True").length).toBe(1);
    expect(tfItems.filter((q) => q.options[q.correctIndex] === "False").length).toBe(2);

    const negativeItems = mcqs.filter((q) => q.templateType === "negative_choice");
    expect(negativeItems.length).toBe(3);
    for (const neg of negativeItems) {
      expect(neg.stem).toMatch(/NOT|EXCEPT/);
    }

    const matchingItems = mcqs.filter((q) => q.templateType === "matching_set");
    expect(matchingItems.length).toBe(4);
    for (const m of matchingItems) {
      expect(m.options.length).toBe(8);
      expect(m.options).toContain("Commitment to public interest");
      expect(m.options).toContain("Professionalism");
      expect(m.options).toContain("Simple living");
    }

    // 4. VERIFY SPECIFIC LEAK FIXES
    // Professionalism question stem does not contain "professionalism"
    const profQ = mcqs.find((q) => q.templateType === "norm_definition" && q.options[q.correctIndex] === "Professionalism");
    expect(profQ).toBeDefined();
    expect(profQ!.stem).not.toContain("professionalism");
    expect(profQ!.stem).toContain("[______]");

    // Justness and sincerity question stem does not contain "justness" or "sincerity"
    const justQ = mcqs.find((q) => q.templateType === "norm_definition" && q.options[q.correctIndex] === "Justness and sincerity");
    expect(justQ).toBeDefined();
    expect(justQ!.stem).not.toContain("justness");
    expect(justQ!.stem).not.toContain("sincerity");

    // Gift question stem masks "gift"
    const giftQ = mcqs.find((q) => q.templateType === "term_definition" && q.options[q.correctIndex] === "Gift");
    expect(giftQ).toBeDefined();
    expect(giftQ!.stem).toContain("[______]");

    // Loan question stem masks "loan" in "simple loan"
    const loanQ = mcqs.find((q) => q.templateType === "term_definition" && q.options[q.correctIndex] === "Loan");
    expect(loanQ).toBeDefined();
    expect(loanQ!.stem).toContain("simple [______]");
    expect(loanQ!.stem).not.toContain("simple loan");

    // Number blank 15 days stem does not leak digits or word
    const deadline15 = mcqs.find((q) => q.templateType === "number_blank_deadline" && q.options[q.correctIndex] === "15");
    expect(deadline15).toBeDefined();
    expect(deadline15!.stem).not.toMatch(/\b15\b/);
    expect(deadline15!.stem).not.toMatch(/\bfifteen\b/i);

    // Section title cards: 100% converted to flashcards
    const sectionTitleMcqs = mcqs.filter((q) => q.templateType === "section_title");
    expect(sectionTitleMcqs.length).toBe(0);

    const sectionFlashcards = parsedQaList.filter((q) => q.templateType === "section_title");
    expect(sectionFlashcards.length).toBeGreaterThan(0);
    expect(sectionFlashcards.every((f) => f.questionType === "free_response")).toBe(true);

    // 5. IMPORT TO QUESTION BANK
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
