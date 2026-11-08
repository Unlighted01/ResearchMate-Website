import { describe, it, expect, beforeEach } from "vitest";
import {
  saveQuestionsToBank,
  getUserQuestions,
  getBankStats,
  recordQuestionResult,
  sampleSprintQuestions,
  clearQuestionBank,
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

  it("saves questions and computes bank statistics", () => {
    const result = saveQuestionsToBank(mockQuestions, "Math_Reviewer.pdf");
    expect(result.addedCount).toBe(3);
    expect(result.totalCount).toBe(3);

    const stats = getBankStats();
    expect(stats.totalQuestions).toBe(3);
    expect(stats.byTopic["Numerical Reasoning"]).toBe(2);
    expect(stats.byTopic["Verbal Ability"]).toBe(1);
    expect(stats.sourceDocuments).toContain("Math_Reviewer.pdf");
  });

  it("deduplicates questions with identical stems", () => {
    saveQuestionsToBank(mockQuestions, "Doc1.pdf");
    const duplicate = saveQuestionsToBank(
      [
        {
          id: "dup-1",
          question: "What is 15% of 240?",
          options: ["36", "32", "40", "30"],
          correctIndex: 0,
          explanation: "Duplicate explanation.",
          topicTag: "Numerical Reasoning",
        },
      ],
      "Doc2.pdf"
    );

    expect(duplicate.addedCount).toBe(0);
    expect(getUserQuestions().length).toBe(3);
  });

  it("filters questions by topic tag", () => {
    saveQuestionsToBank(mockQuestions);
    const mathOnly = getUserQuestions({ topic: "Numerical Reasoning" });
    expect(mathOnly.length).toBe(2);
    expect(mathOnly.every((q) => q.topicTag === "Numerical Reasoning")).toBe(true);

    const verbalOnly = getUserQuestions({ topic: "Verbal Ability" });
    expect(verbalOnly.length).toBe(1);
    expect(verbalOnly[0].question).toContain("EPHEMERAL");
  });

  it("records question accuracy and weights sprint sampling", () => {
    saveQuestionsToBank(mockQuestions);

    // Miss q-1
    recordQuestionResult("q-1", false);
    // Correct q-2
    recordQuestionResult("q-2", true);

    const stats = getBankStats();
    expect(stats.totalAttempted).toBe(2);
    expect(stats.averageAccuracy).toBe(50);

    // Sprints should prioritize missed questions
    const sprintSample = sampleSprintQuestions(2);
    expect(sprintSample.length).toBe(2);
    // q-1 should definitely be included because its accuracy is 0%
    const hasMissed = sprintSample.some((q) => q.id === "q-1");
    expect(hasMissed).toBe(true);
  });
});
