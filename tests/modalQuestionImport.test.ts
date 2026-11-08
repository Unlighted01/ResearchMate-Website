import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { extractAllPagesWithLayout } from "../src/services/pdfService";
import { parseTwoPassQuestionsAndAnswers } from "../src/services/pdfQuestionImporter";
import {
  importQuestionsToBank,
  computeImportPreview,
  RawImportQuestionItem,
} from "../src/services/questionImportService";
import { clearQuestionBank, getUserQuestions } from "../src/services/questionBankService";

describe("QuestionImportModal Pipeline End-to-End Audit", () => {
  it("imports RA 6713 through the modal import pipeline and verifies counts and options", async () => {
    clearQuestionBank();

    const fixturePath = path.resolve(
      __dirname,
      "fixtures/Philippines_Code_of_Conduct_and_Ethical_Standards_for_Public_Officials_1989.pdf"
    );
    expect(fs.existsSync(fixturePath)).toBe(true);

    const buffer = fs.readFileSync(fixturePath);
    // Mimic QuestionImportModal: extractAllPagesWithLayout -> parseTwoPassQuestionsAndAnswers
    const layoutResult = await extractAllPagesWithLayout(buffer);
    expect(layoutResult.pages.length).toBeGreaterThan(0);

    const parsedQaList = parseTwoPassQuestionsAndAnswers(layoutResult.pages);
    expect(parsedQaList.length).toBe(70);

    // Map to raw questions as QuestionImportModal does
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
    expect(preview.total).toBe(70);
    expect(preview.needsReviewCount).toBe(3);
    expect(preview.verifiedCount).toBe(67);
    expect(preview.summaryText).toContain("70 questions will be added under subject 'Philippines Code of Conduct', 3 need review");

    // 1. Verify Gift question has category siblings (not old hardcoded slice(0, 3))
    const giftQuestion = parsedQaList.find(
      (q) => q.options[q.correctIndex] === "Gift" && /Sec\.?\s*3/i.test(q.chapter || q.explanation || "")
    );
    expect(giftQuestion).toBeDefined();
    expect(giftQuestion!.options).toEqual(["Divestment", "Gift", "Loan", "Receiving any gift"]);
    expect(giftQuestion!.reviewStatus).toBe("verified");

    // 2. Verify Loan question masks "loan" in "simple loan"
    const loanQuestion = parsedQaList.find(
      (q) => q.options[q.correctIndex] === "Loan" && /Sec\.?\s*3/i.test(q.chapter || q.explanation || "")
    );
    expect(loanQuestion).toBeDefined();
    expect(loanQuestion!.options).toEqual(["Divestment", "Gift", "Loan", "Receiving any gift"]);
    expect(loanQuestion!.stem).toContain("simple [______]");
    expect(loanQuestion!.stem).not.toContain("simple loan");
    expect(loanQuestion!.reviewStatus).toBe("verified");

    // 3. Verify Government in Sec. 3 is skipped as an MCQ because government_entities has < 3 siblings
    const govSec3Mcq = parsedQaList.find(
      (q) => q.chapter?.includes("Sec. 3") && q.options.includes("Government")
    );
    expect(govSec3Mcq).toBeUndefined();

    // 4. Import into Question Bank via questionImportService
    const importResult = await importQuestionsToBank({
      rawQuestions: rawQuestionsForImport,
      subject: "Philippines Code of Conduct",
      sourceFile: "Philippines_Code_of_Conduct_and_Ethical_Standards_for_Public_Officials_1989.pdf",
      origin: "pdf_import",
    });

    expect(importResult.importedCount + importResult.duplicatesSkipped).toBe(70);
    expect(importResult.importedCount).toBe(67);
    expect(importResult.needsReviewCount).toBe(3);

    const saved = getUserQuestions();
    expect(saved.length).toBe(67);
  });
});
