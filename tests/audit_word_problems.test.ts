import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { extractAllPagesWithLayout } from "../src/services/pdfService";
import { parseTwoPassQuestionsAndAnswersDetailed } from "../src/services/pdfQuestionImporter";
import { computeImportPreview, importQuestionsToBank, deleteImportBatch } from "../src/services/questionImportService";

describe("Part 1: Audit and Extraction Fixes for Word_Problems_Explained.pdf", () => {
  it("verifies Part 1 requirements: 0 gradable questions, no stolen choices, step lists suppressed", async () => {
    const fixturePath = path.resolve(__dirname, "../tests/fixtures/Word_Problems_Explained.pdf");
    const buffer = fs.readFileSync(fixturePath);
    const layoutResult = await extractAllPagesWithLayout(buffer);
    const result = parseTwoPassQuestionsAndAnswersDetailed(layoutResult.pages);

    // Requirement F: Correct result is "lesson material, 0 gradable questions"
    expect(result.gradableCount).toBe(0);
    expect(result.isGradable).toBe(false);

    // Requirement A: No answer key = not gradable. All items must be questionType 'prompt' with correctIndex -1
    for (const item of result.items) {
      expect(item.questionType).toBe("prompt");
      expect(item.correctIndex).toBe(-1);
      expect(item.correctLetter).toBe("");
      expect(item.reviewStatus).toBe("needs_review");
      expect(item.isSuspicious).toBe(true);
    }

    // Requirement B: Numbered runs inside tables/step lists (difference, three, times, number, and, seven, second odd integer) are NEVER questions
    const stems = result.items.map((it) => it.stem.toLowerCase());
    expect(stems.some((s) => s === "difference (of __ and __)")).toBe(false);
    expect(stems.some((s) => s === "three")).toBe(false);
    expect(stems.some((s) => s === "times")).toBe(false);
    expect(stems.some((s) => s === "number")).toBe(false);
    expect(stems.some((s) => s === "and")).toBe(false);

    // Requirement C: Question 7 must NOT steal choices a)-e) from the table on page 14/86
    const q7 = result.items.find((it) => it.number === 7);
    expect(q7).toBeDefined();
    expect(q7?.options).toEqual([]);
    expect(q7?.stem.length).toBeLessThan(1200);
    expect(q7?.stem).toContain('nearly" or "almost');

    // Requirement D: Hard stem cap of 1,200 characters
    for (const item of result.items) {
      expect(item.stem.length).toBeLessThanOrEqual(1200);
    }

    // Requirement F: computeImportPreview reports real counts
    const rawItems = result.items.map((it) => ({
      id: it.id,
      stem: it.stem,
      options: it.options,
      correctIndex: it.correctIndex,
      explanation: it.explanation,
      chapter: it.chapter,
      questionType: it.questionType,
      reviewStatus: it.reviewStatus,
    }));
    const preview = computeImportPreview(rawItems, "Word Problems Explained", "Word_Problems_Explained.pdf");
    expect(preview.gradableCount).toBe(0);
    expect(preview.summaryText).toContain("Lesson material, 0 gradable questions");

    // Requirement G: deleteImportBatch removes questions and cleans up
    const importRes = await importQuestionsToBank({
      rawQuestions: rawItems,
      subject: "Word Problems Explained",
      sourceFile: "Word_Problems_Explained.pdf",
    });
    expect(importRes.batchId).toBeDefined();

    const deleteRes = await deleteImportBatch(importRes.batchId);
    expect(deleteRes.deletedCount).toBe(rawItems.length);
  });

  it("inspects phrase table lines on Page 2 and Page 3", async () => {
    const fixturePath = path.resolve(__dirname, "../tests/fixtures/Word_Problems_Explained.pdf");
    const buffer = fs.readFileSync(fixturePath);
    const layoutResult = await extractAllPagesWithLayout(buffer);
    console.log("=== Page 3 bottom lines ===");
    const p3Lines = layoutResult.pages[2].text.split("\n");
    p3Lines.slice(p3Lines.length - 20).forEach((l) => console.log(JSON.stringify(l)));
  });
});
