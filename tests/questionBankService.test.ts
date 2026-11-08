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
} from "../src/services/questionBankService";
import { Question } from "../src/services/examService";

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
});
