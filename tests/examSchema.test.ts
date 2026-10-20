import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock supabaseClient before importing examService
vi.mock("../src/services/supabaseClient", () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  isAuthenticated: vi.fn().mockResolvedValue(false),
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));

import {
  generateUUID,
  saveExam,
  getAllExams,
  saveExamAttempt,
  getExamAttempts,
  deleteExam,
  Question,
  saveLocalExams,
  saveLocalAttempts,
} from "../src/services/examService";

describe("Phase 1: Exam Schema & Local-First Storage", () => {
  beforeEach(() => {
    saveLocalExams([]);
    saveLocalAttempts([]);
    vi.clearAllMocks();
  });

  it("generates standard UUID strings", () => {
    const id1 = generateUUID();
    const id2 = generateUUID();
    expect(typeof id1).toBe("string");
    expect(id1.length).toBeGreaterThanOrEqual(32);
    expect(id1).not.toBe(id2);
  });

  it("saves and retrieves exams in local store when unauthenticated", async () => {
    const sampleQuestions: Question[] = [
      {
        id: generateUUID(),
        question: "Evaluate $\\lim_{x \\to 0} \\frac{\\sin x}{x}$.",
        options: ["0", "1", "-1", "undefined"],
        correctIndex: 1,
        explanation: "By standard limit theorem, limit is 1.",
        topicTag: "Calculus",
      },
    ];

    const saved = await saveExam({
      title: "Calculus Diagnostic",
      questions: sampleQuestions,
      source_item_ids: ["item-1"],
    });

    expect(saved.id).toBeDefined();
    expect(saved.title).toBe("Calculus Diagnostic");
    expect(saved.questions.length).toBe(1);
    expect(saved.questions[0].id).toBe(sampleQuestions[0].id);

    const all = await getAllExams();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(saved.id);
  });

  it("stores an immutable questions_snapshot in exam attempts", async () => {
    const qId = generateUUID();
    const examId = generateUUID();
    const originalQuestions: Question[] = [
      {
        id: qId,
        question: "What is $2 + 2$?",
        options: ["3", "4", "5", "6"],
        correctIndex: 1,
        explanation: "Basic addition",
        topicTag: "Math",
      },
    ];

    const attempt = await saveExamAttempt({
      exam_id: examId,
      score: 1,
      total: 1,
      percentage: 100,
      answers: { [qId]: 1 }, // keyed by question ID string
      questions_snapshot: originalQuestions,
      passed: true,
    });

    expect(attempt.id).toBeDefined();
    expect(attempt.exam_id).toBe(examId);
    expect(attempt.answers[qId]).toBe(1);
    expect(attempt.questions_snapshot.length).toBe(1);
    expect(attempt.questions_snapshot[0].question).toBe("What is $2 + 2$?");

    // Verify retrieval
    const history = await getExamAttempts(examId);
    expect(history.length).toBe(1);
    expect(history[0].questions_snapshot[0].options[1]).toBe("4");
  });

  it("deletes an exam cleanly from local cache", async () => {
    const saved = await saveExam({
      title: "To be deleted",
      questions: [],
    });
    expect((await getAllExams()).length).toBe(1);

    await deleteExam(saved.id);
    expect((await getAllExams()).length).toBe(0);
  });
});
