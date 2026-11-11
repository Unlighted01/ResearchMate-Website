import { describe, it, expect, beforeEach } from "vitest";
import {
  saveQuestionsToBank,
  getUserQuestions,
  getNeedsReviewQuestions,
  getVerifiedQuestions,
  updateQuestionStatus,
  updateQuestion,
  deleteQuestion,
  getBankStats,
  recordQuestionResult,
  sampleSprintQuestions,
  clearQuestionBank,
  hashNormalizedText,
  computeReviewStatus,
  deleteImportBatch,
  assembleExamFromBank,
} from "../src/services/questionBankService";
import {
  Question,
  StoredExam,
  saveLocalExams,
  getLocalExams,
  saveLocalAttempts,
} from "../src/services/examService";

describe("questionBankService", () => {
  beforeEach(() => {
    clearQuestionBank();
  });

  const mockQuestions: Question[] = [
    {
      id: "q-1",
      question: "What is 15% of 240?",
      options: ["36", "32", "40", "30"],
      correctIndex: 0,
      explanation: "10% is 24, 5% is 12, 24 + 12 = 36.",
      topicTag: "Numerical Reasoning",
    },
    {
      id: "q-2",
      question: "Pipe A takes 4 hours, Pipe B takes 12 hours. Together?",
      options: ["3 hours", "4 hours", "2 hours", "6 hours"],
      correctIndex: 0,
      explanation: "(4 * 12) / (4 + 12) = 48 / 16 = 3 hours.",
      topicTag: "Numerical Reasoning",
    },
    {
      id: "q-3",
      question: "EPHEMERAL is most nearly opposite to:",
      options: ["Permanent", "Fleeting", "Fragile", "Swift"],
      correctIndex: 0,
      explanation: "Ephemeral means short-lived; permanent is the antonym.",
      topicTag: "Verbal Ability",
    },
  ];

  it("saves questions, hashes stems, and computes bank statistics", () => {
    const result = saveQuestionsToBank(mockQuestions, "Math_Reviewer.pdf", "append", "parsed_pdf");
    expect(result.addedCount).toBe(3);
    expect(result.totalCount).toBe(3);
    expect(result.needsReviewCount).toBe(0);

    const stats = getBankStats();
    expect(stats.totalQuestions).toBe(3);
    expect(stats.verifiedCount).toBe(3);
    expect(stats.needsReviewCount).toBe(0);
    expect(stats.byTopic["Numerical Reasoning"]).toBe(2);
    expect(stats.byTopic["Verbal Ability"]).toBe(1);
    expect(stats.sourceDocuments).toContain("Math_Reviewer.pdf");

    const retrieved = getUserQuestions();
    expect(retrieved[0].normalizedTextHash).toBeTruthy();
    expect(retrieved[0].origin).toBe("parsed_pdf");
    expect(retrieved[0].reviewStatus).toBe("verified");
  });

  it("deduplicates questions by two-stage FNV-1a hash and normalized stem equality", () => {
    saveQuestionsToBank(mockQuestions, "Doc1.pdf");

    // Slightly different punctuation and casing
    const duplicateVariant = saveQuestionsToBank(
      [
        {
          id: "dup-1",
          question: "  What is 15% of 240???  ",
          options: ["36", "32", "40", "30"],
          correctIndex: 0,
          explanation: "Duplicate explanation.",
          topicTag: "Numerical Reasoning",
        },
      ],
      "Doc2.pdf"
    );

    expect(duplicateVariant.addedCount).toBe(0);
    expect(getUserQuestions().length).toBe(3);
  });

  it("applies hard reviewStatus rule: True/False and 3-choice questions are valid; < 2 choices flags needs_review", () => {
    // 2 choices (True/False) -> Verified!
    const tfStatus = computeReviewStatus(["True", "False"], 0);
    expect(tfStatus).toBe("verified");

    // 5 choices (A-E) -> Verified!
    const fiveChoiceStatus = computeReviewStatus(["A", "B", "C", "D", "E"], 4);
    expect(fiveChoiceStatus).toBe("verified");

    // 1 choice -> Needs review!
    const singleChoiceStatus = computeReviewStatus(["Single option only"], 0);
    expect(singleChoiceStatus).toBe("needs_review");

    // Missing / out of bounds correct index -> Needs review!
    const invalidIndexStatus = computeReviewStatus(["A", "B", "C", "D"], -1);
    expect(invalidIndexStatus).toBe("needs_review");
  });

  it("isolates needs_review questions and allows student approval", () => {
    saveQuestionsToBank([
      ...mockQuestions,
      {
        id: "q-incomplete",
        question: "Incomplete question stem with missing choices",
        options: ["Only one choice"],
        correctIndex: 0,
        explanation: "Incomplete item.",
        topicTag: "Drafts",
      },
    ]);

    const needsReview = getNeedsReviewQuestions();
    expect(needsReview.length).toBe(1);
    expect(needsReview[0].id).toBe("q-incomplete");

    const verified = getVerifiedQuestions();
    expect(verified.length).toBe(3);

    // Student updates question with valid choices and marks verified
    updateQuestion("q-incomplete", {
      options: ["Only one choice", "Second choice added"],
      correctIndex: 1,
      reviewStatus: "verified",
    });

    expect(getNeedsReviewQuestions().length).toBe(0);
    expect(getVerifiedQuestions().length).toBe(4);
  });

  it("allows updating question text and recalculates stem hash", () => {
    saveQuestionsToBank(mockQuestions);
    const originalHash = hashNormalizedText(mockQuestions[0].question);

    updateQuestion("q-1", {
      question: "What is 20% of 300?",
      options: ["60", "50", "40", "30"],
      correctIndex: 0,
    });

    const updated = getUserQuestions().find((q) => q.id === "q-1");
    expect(updated?.question).toBe("What is 20% of 300?");
    expect(updated?.normalizedTextHash).not.toBe(originalHash);
  });

  it("deletes a question from the bank", () => {
    saveQuestionsToBank(mockQuestions);
    expect(getUserQuestions().length).toBe(3);

    const deleted = deleteQuestion("q-2");
    expect(deleted).toBe(true);
    expect(getUserQuestions().length).toBe(2);
    expect(getUserQuestions().some((q) => q.id === "q-2")).toBe(false);
  });

  it("records question accuracy and weights sprint sampling", () => {
    saveQuestionsToBank(mockQuestions);

    recordQuestionResult("q-1", false);
    recordQuestionResult("q-2", true);

    const stats = getBankStats();
    expect(stats.totalAttempted).toBe(2);
    expect(stats.averageAccuracy).toBe(50);

    const sprintSample = sampleSprintQuestions(2);
    expect(sprintSample.length).toBe(2);
    const hasMissed = sprintSample.some((q) => q.id === "q-1");
    expect(hasMissed).toBe(true);
  });

  it("deleteImportBatch removes questions, deletes unattempted practice sets, and preserves attempted or custom exams with '[Source Removed]'", async () => {
    // 1. Setup questions with importBatchId
    const batchId = "batch-101";
    const q1: Question = {
      id: "q-batch-1",
      question: "Question in batch 1?",
      options: ["A", "B", "C", "D"],
      correctIndex: 0,
      importBatchId: batchId,
      topicTag: "General",
    };
    const q2: Question = {
      id: "q-batch-2",
      question: "Second question in batch 1?",
      options: ["A", "B", "C", "D"],
      correctIndex: 1,
      importBatchId: batchId,
      topicTag: "General",
    };
    saveQuestionsToBank([q1, q2], "BatchDoc.pdf", "append", "parsed_pdf", batchId);
    expect(getUserQuestions().length).toBe(2);

    // 2. Setup 3 exams:
    // Exam A: unattempted practice set generated directly from batch
    const examA: StoredExam = {
      id: "exam-practice-set",
      title: "BatchDoc Practice Set",
      source_document_title: "BatchDoc.pdf",
      import_batch_id: batchId,
      questions: [q1, q2],
      version: 1,
      visibility: "private",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Exam B: attempted exam from batch
    const examB: StoredExam = {
      id: "exam-attempted",
      title: "BatchDoc Midterm Exam",
      source_document_title: "BatchDoc.pdf",
      import_batch_id: batchId,
      questions: [q1],
      version: 1,
      visibility: "private",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Exam C: user-assembled custom exam containing a question from batch
    const examC: StoredExam = {
      id: "exam-custom",
      title: "My Custom Final Exam",
      source_document_title: "Custom Assembly",
      import_batch_id: batchId,
      origin: "assembled",
      questions: [q2],
      version: 1,
      visibility: "private",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveLocalExams([examA, examB, examC]);
    saveLocalAttempts([
      {
        id: "attempt-1",
        exam_id: "exam-attempted",
        score: 100,
        total_questions: 1,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        answers: {},
      },
    ]);

    // 3. Delete batch
    const result = await deleteImportBatch(batchId);
    expect(result.deletedCount).toBe(2);
    expect(getUserQuestions().length).toBe(0);

    // 4. Verify exams state
    const remainingExams = getLocalExams();
    // examA should be deleted
    expect(remainingExams.find((e) => e.id === "exam-practice-set")).toBeUndefined();

    // examB (attempted) should be preserved and marked [Source Removed]
    const preservedB = remainingExams.find((e) => e.id === "exam-attempted");
    expect(preservedB).toBeDefined();
    expect(preservedB?.title).toContain("[Source Removed]");
    expect(preservedB?.import_batch_id).toBeUndefined();

    // examC (user-assembled) should be preserved and marked [Source Removed]
    const preservedC = remainingExams.find((e) => e.id === "exam-custom");
    expect(preservedC).toBeDefined();
    expect(preservedC?.title).toContain("[Source Removed]");
    expect(preservedC?.import_batch_id).toBeUndefined();
  });

  it("allows gradable free-response items with verified key in sprint and exam assembly while excluding ungradable prompts", () => {
    const freeRespItem: Question = {
      id: "fr-1",
      question: "A father is 3 times as old as his son. In 14 years he will be twice as old. Find son's age.",
      options: [],
      correctIndex: 0,
      answerKey: "14",
      questionType: "free_response",
      gradable: true,
      topicTag: "Algebra",
    };

    const promptItem: Question = {
      id: "prompt-1",
      question: "Write an essay discussing the themes of honesty in governance.",
      options: [],
      correctIndex: 0,
      questionType: "prompt",
      gradable: false,
      topicTag: "Essay",
    };

    saveQuestionsToBank([freeRespItem, promptItem], "Math_and_Prompts.pdf");

    // Sprint sampling: free response item should be included, prompt item excluded
    const sprint = sampleSprintQuestions(5);
    expect(sprint.some((q) => q.id === "fr-1")).toBe(true);
    expect(sprint.some((q) => q.id === "prompt-1")).toBe(false);

    // Exam assembly: free response item should be included, prompt item excluded
    const assembled = assembleExamFromBank(5, { allowFreeResponse: true });
    expect(assembled.selectedQuestions.some((q) => q.id === "fr-1")).toBe(true);
    expect(assembled.selectedQuestions.some((q) => q.id === "prompt-1")).toBe(false);
  });
});
