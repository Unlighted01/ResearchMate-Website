import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing
vi.mock("../src/services/geminiService", () => ({
  generateAiResponse: vi.fn(),
}));
vi.mock("../src/services/ragService", () => ({
  buildSynthesisContext: vi.fn().mockResolvedValue("Sample grounding context"),
}));
vi.mock("../src/services/formularyService", () => ({
  findRelevantFormulary: vi.fn().mockReturnValue([]),
}));
vi.mock("../src/services/supabaseClient", () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  },
  isAuthenticated: vi.fn().mockResolvedValue(false),
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));

import {
  partitionExamSections,
  generateExamInBatches,
  ExamSectionConfig,
  BatchProgress,
} from "../src/services/examService";
import { generateAiResponse } from "../src/services/geminiService";

describe("Phase 4: Multi-Batch Exam Generation & Slicing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("partitions a 50-question midterm into slices of max 20 items", () => {
    const sections: ExamSectionConfig[] = [
      { name: "Midterm Exam", questionCount: 50, mode: "grounded" },
    ];
    const slices = partitionExamSections(sections, 20);
    expect(slices.length).toBe(3);
    expect(slices[0].count).toBe(20);
    expect(slices[1].count).toBe(20);
    expect(slices[2].count).toBe(10);
    expect(slices.reduce((acc, s) => acc + s.count, 0)).toBe(50);
  });

  it("partitions the official 160-item Civil Service (CSC) TOS into discrete batches", () => {
    const cscSections: ExamSectionConfig[] = [
      { name: "Verbal Ability", questionCount: 50, mode: "grounded" },
      { name: "Analytical Ability", questionCount: 40, mode: "grounded" },
      { name: "Numerical Ability", questionCount: 40, mode: "grounded" },
      { name: "General Info & Constitution", questionCount: 30, mode: "grounded" },
    ];

    const slices = partitionExamSections(cscSections, 20);
    expect(slices.length).toBe(9); // 50->(20,20,10), 40->(20,20), 40->(20,20), 30->(20,10) = 3+2+2+2 = 9 slices
    expect(slices.reduce((acc, s) => acc + s.count, 0)).toBe(160);
    slices.forEach((s) => expect(s.count).toBeLessThanOrEqual(20));
  });

  it("fires progressive onProgress event with isFirstBatchReady = true after batch 1", async () => {
    const mockBatchJson = JSON.stringify([
      {
        question: "What is $1 + 1$?",
        options: ["1", "2", "3", "4"],
        correctIndex: 1,
        explanation: "Simple addition",
        topicTag: "Math",
      },
      {
        question: "What is $2 + 2$?",
        options: ["1", "2", "3", "4"],
        correctIndex: 3,
        explanation: "Simple addition",
        topicTag: "Math",
      },
    ]);

    (generateAiResponse as any).mockResolvedValue(mockBatchJson);

    const progressEvents: BatchProgress[] = [];
    const sections: ExamSectionConfig[] = [
      { name: "Section A", questionCount: 2, mode: "grounded" },
    ];

    const questions = await generateExamInBatches(
      [],
      sections,
      "mixed",
      (p) => progressEvents.push(p)
    );

    expect(questions.length).toBe(2);
    expect(progressEvents.length).toBe(1);
    expect(progressEvents[0].isFirstBatchReady).toBe(true);
    expect(progressEvents[0].completedQuestions).toBe(2);
    expect(progressEvents[0].totalQuestions).toBe(2);
  });

  it("retries a batch if AI returns invalid JSON instead of aborting the entire run", async () => {
    const validJson = JSON.stringify([
      {
        question: "Recovered question",
        options: ["A", "B", "C", "D"],
        correctIndex: 0,
        explanation: "Recovered rationale",
        topicTag: "Science",
      },
    ]);

    // First attempt fails with malformed string, second attempt succeeds
    (generateAiResponse as any)
      .mockResolvedValueOnce("MALFORMED JSON {{{")
      .mockResolvedValueOnce(validJson);

    const sections: ExamSectionConfig[] = [
      { name: "Science", questionCount: 1, mode: "grounded" },
    ];

    const questions = await generateExamInBatches([], sections);
    expect(questions.length).toBe(1);
    expect(questions[0].question).toBe("Recovered question");
  });
});
