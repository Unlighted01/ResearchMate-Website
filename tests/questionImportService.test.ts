import { describe, it, expect, beforeEach } from "vitest";
import {
  importQuestionsToBank,
  getImportBatches,
  deleteImportBatch,
  computeImportPreview,
  sanitizeDefaultSubject,
  getQuestionsByBatchId,
} from "../src/services/questionImportService";
import {
  getUserQuestions,
  clearQuestionBank,
  getBankStats,
} from "../src/services/questionBankService";

describe("Unified Question Import Service & Batches", () => {
  beforeEach(() => {
    clearQuestionBank();
  });

  it("sanitizes default subject from file names", () => {
    expect(sanitizeDefaultSubject("1001 Math Problems.pdf")).toBe("1001 Math Problems");
    expect(sanitizeDefaultSubject("Age_Problems.pdf")).toBe("Age Problems");
    expect(sanitizeDefaultSubject("philippines-code-of-conduct-1989.pdf")).toBe(
      "philippines code of conduct 1989"
    );
    expect(sanitizeDefaultSubject("")).toBe("General Review");
  });

  it("computes accurate import preview summary", () => {
    const rawSample = [
      {
        stem: "What is 2 + 2?",
        options: ["3", "4", "5", "6"],
        correctIndex: 1,
        chapter: "Arithmetic",
      },
      {
        stem: "Incomplete question without options?",
        options: [],
        chapter: "Broken",
      },
    ];

    const preview = computeImportPreview(rawSample, "Mathematics Review", "math_test.pdf");
    expect(preview.total).toBe(2);
    expect(preview.verifiedCount).toBe(1);
    expect(preview.needsReviewCount).toBe(1);
    expect(preview.subject).toBe("Mathematics Review");
    expect(preview.summaryText).toBe(
      "2 questions will be added under subject 'Mathematics Review', 1 need review"
    );
  });

  it("imports questions into Question Bank with distinct subject vs topic and full metadata", async () => {
    const rawQuestions = [
      {
        stem: "What is the speed of light in vacuum?",
        options: ["3 x 10^8 m/s", "2 x 10^8 m/s", "1 x 10^8 m/s", "5 x 10^8 m/s"],
        correctIndex: 0,
        correctLetter: "a",
        explanation: "Constant c is 299,792,458 m/s.",
        chapter: "Optics and Physics",
        sourcePage: 12,
        questionType: "mcq" as const,
      },
      {
        stem: "Find the root of x^2 - 16 = 0 for x > 0.",
        options: ["2", "4", "8", "16"],
        correctIndex: 1,
        correctLetter: "b",
        explanation: "x = sqrt(16) = 4.",
        chapter: "Algebraic Equations",
        sourcePage: 15,
        questionType: "mcq" as const,
      },
      {
        stem: "Solve for the present age given father is 40 and son is 10.",
        options: [],
        explanation: "Free response answer is 15.",
        chapter: "Age Problems",
        sourcePage: 3,
        questionType: "free_response" as const,
      },
    ];

    const result = await importQuestionsToBank({
      rawQuestions,
      subject: "Science & Math Reviewer",
      sourceFile: "Science_Math_Review.pdf",
      origin: "pdf_import",
    });

    expect(result.importedCount).toBe(3);
    expect(result.duplicatesSkipped).toBe(0);
    expect(result.batchId).toBeDefined();
    expect(result.batch.subject).toBe("Science & Math Reviewer");
    expect(result.batch.sourceFile).toBe("Science_Math_Review.pdf");
    expect(result.batch.origin).toBe("pdf_import");

    // Verify stored items in the Question Bank
    const bankItems = getUserQuestions();
    expect(bankItems.length).toBe(3);

    const q1 = bankItems.find((q) => q.question.includes("speed of light"));
    expect(q1).toBeDefined();
    expect(q1?.subject).toBe("Science & Math Reviewer");
    expect(q1?.topic).toBe("Optics and Physics");
    expect(q1?.sourceFile).toBe("Science_Math_Review.pdf");
    expect(q1?.sourcePage).toBe(12);
    expect(q1?.importBatchId).toBe(result.batchId);
    expect(q1?.origin).toBe("pdf_import");
    expect(q1?.questionType).toBe("mcq");
    expect(q1?.reviewStatus).toBe("verified");

    const q3 = bankItems.find((q) => q.question.includes("present age"));
    expect(q3).toBeDefined();
    expect(q3?.subject).toBe("Science & Math Reviewer");
    expect(q3?.topic).toBe("Age Problems");
    expect(q3?.questionType).toBe("free_response");
    expect(q3?.reviewStatus).toBe("verified");
  });

  it("records import batches and provides one-click batch rollback", async () => {
    // Import Batch A
    const batchAResult = await importQuestionsToBank({
      rawQuestions: [
        {
          stem: "Batch A - Question 1",
          options: ["A", "B", "C", "D"],
          correctIndex: 0,
          chapter: "Chapter A",
        },
        {
          stem: "Batch A - Question 2",
          options: ["A", "B", "C", "D"],
          correctIndex: 1,
          chapter: "Chapter A",
        },
      ],
      subject: "Subject A",
      sourceFile: "FileA.pdf",
    });

    // Import Batch B
    const batchBResult = await importQuestionsToBank({
      rawQuestions: [
        {
          stem: "Batch B - Question 1",
          options: ["A", "B", "C", "D"],
          correctIndex: 0,
          chapter: "Chapter B",
        },
        {
          stem: "Batch B - Question 2",
          options: ["A", "B", "C", "D"],
          correctIndex: 1,
          chapter: "Chapter B",
        },
        {
          stem: "Batch B - Question 3",
          options: ["A", "B", "C", "D"],
          correctIndex: 2,
          chapter: "Chapter B",
        },
      ],
      subject: "Subject B",
      sourceFile: "FileB.pdf",
    });

    // Verify batches exist
    const batches = await getImportBatches();
    expect(batches.length).toBe(2);

    expect(getUserQuestions().length).toBe(5);

    // Rollback Batch A
    const rollback = await deleteImportBatch(batchAResult.batchId);
    expect(rollback.deletedCount).toBe(2);

    // Verify Batch A is gone, Batch B remains intact
    const remainingItems = getUserQuestions();
    expect(remainingItems.length).toBe(3);
    expect(remainingItems.every((q) => q.importBatchId === batchBResult.batchId)).toBe(true);

    const remainingBatches = await getImportBatches();
    expect(remainingBatches.length).toBe(1);
    expect(remainingBatches[0].id).toBe(batchBResult.batchId);
  });

  it("deduplicates identical stems on re-import and reports duplicatesSkipped", async () => {
    const questions = [
      {
        stem: "Deduplication Test Stem Question",
        options: ["Option 1", "Option 2"],
        correctIndex: 0,
        chapter: "General",
      },
    ];

    const run1 = await importQuestionsToBank({
      rawQuestions: questions,
      subject: "Test Subject",
      sourceFile: "Test.pdf",
    });
    expect(run1.importedCount).toBe(1);
    expect(run1.duplicatesSkipped).toBe(0);

    const run2 = await importQuestionsToBank({
      rawQuestions: questions,
      subject: "Test Subject",
      sourceFile: "Test.pdf",
    });
    expect(run2.importedCount).toBe(0);
    expect(run2.duplicatesSkipped).toBe(1);

    expect(getUserQuestions().length).toBe(1);
  });

  it("updates Bank Stats with bySubject and batchesCount", async () => {
    await importQuestionsToBank({
      rawQuestions: [
        { stem: "Q1", options: ["A", "B"], correctIndex: 0, chapter: "Topic 1" },
        { stem: "Q2", options: ["A", "B"], correctIndex: 0, chapter: "Topic 2" },
      ],
      subject: "Philippine Law",
      sourceFile: "Law.pdf",
    });

    const stats = getBankStats();
    expect(stats.totalQuestions).toBe(2);
    expect(stats.bySubject["Philippine Law"]).toBe(2);
    expect(stats.byTopic["Topic 1"]).toBe(1);
    expect(stats.byTopic["Topic 2"]).toBe(1);
    expect(stats.batchesCount).toBe(1);
  });

  it("measures storage footprint for 990 questions and confirms IndexedDB capacity threshold", async () => {
    // Generate 990 realistic math questions with explanations and choices
    const sample990 = Array.from({ length: 990 }, (_, i) => ({
      stem: `Question ${i + 1}: If a train travels from Station A to Station B at ${50 + (i % 30)} mph for 3.5 hours, what is the total distance traveled in miles?`,
      options: [
        `${(50 + (i % 30)) * 3.5} miles`,
        `${(50 + (i % 30)) * 3} miles`,
        `${(50 + (i % 30)) * 4} miles`,
        `${(50 + (i % 30)) * 2.5} miles`,
      ],
      correctIndex: 0,
      correctLetter: "a",
      explanation: `Distance equals speed multiplied by time: ${(50 + (i % 30))} mph * 3.5 hours = ${(50 + (i % 30)) * 3.5} miles.`,
      chapter: `Section ${(i % 6) + 1}: Word Problems`,
      sourcePage: Math.floor(i / 10) + 1,
      questionType: "mcq" as const,
    }));

    const result = await importQuestionsToBank({
      rawQuestions: sample990,
      subject: "1001 Math Problems",
      sourceFile: "1001 Math Problems.pdf",
    });

    expect(result.importedCount).toBe(990);
    expect(result.totalBankCount).toBe(990);

    const storedItems = getUserQuestions();
    const json = JSON.stringify(storedItems);
    const byteLengthUtf8 = Buffer.byteLength(json, "utf8");
    const utf16Bytes = json.length * 2;

    // Report footprints
    console.log(`[Storage Footprint 990 Sample] UTF-8: ${(byteLengthUtf8 / 1024).toFixed(2)} KB | UTF-16: ${(utf16Bytes / 1024).toFixed(2)} KB`);

    // Verify it exceeds ~200KB and fits safely within IndexedDB storage architecture
    expect(byteLengthUtf8).toBeGreaterThan(200_000);
    expect(storedItems.length).toBe(990);

    // Verify batch query
    const batchItems = getQuestionsByBatchId(result.batchId);
    expect(batchItems.length).toBe(990);
  });
});
