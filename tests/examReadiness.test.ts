// ============================================
// EXAM READINESS & TWIN QUESTION UNIT TESTS
// ============================================

import { describe, it, expect, vi } from "vitest";
import {
  getReadinessStats,
  recordExamAttempt,
  DEFAULT_SPRINT_QUESTIONS,
  ExamAttemptRecord,
} from "../src/services/examReadinessService";
import { generateTwinQuestion } from "../src/services/examService";

describe("Exam Readiness Scoring & Calibration", () => {
  it("reports uncalibrated state when history is empty", () => {
    const stats = getReadinessStats([]);
    expect(stats.isCalibrated).toBe(false);
    expect(stats.score).toBe(0);
    expect(stats.isPassing).toBe(false);
    expect(stats.passingThreshold).toBe(80);
    expect(stats.primaryWeakness).toBeNull();
  });

  it("calculates accurate rolling score across attempts with 80% passing threshold", () => {
    const mockHistory: ExamAttemptRecord[] = [
      {
        id: "att-1",
        timestamp: Date.now() - 1000,
        scorePercent: 100,
        correctCount: 5,
        totalQuestions: 5,
        mode: "sprint",
        categoryBreakdown: {
          "Numerical Reasoning": { correct: 3, total: 3 },
          "Verbal Ability": { correct: 2, total: 2 },
        },
      },
      {
        id: "att-2",
        timestamp: Date.now() - 5000,
        scorePercent: 60,
        correctCount: 3,
        totalQuestions: 5,
        mode: "sprint",
        categoryBreakdown: {
          "Numerical Reasoning": { correct: 1, total: 3 },
          "Verbal Ability": { correct: 2, total: 2 },
        },
      },
    ];

    const stats = getReadinessStats(mockHistory);
    expect(stats.isCalibrated).toBe(true);
    // Total questions: 10, Total correct: 8 -> 80%
    expect(stats.score).toBe(80);
    expect(stats.isPassing).toBe(true);
    expect(stats.totalQuestionsSolved).toBe(10);
    expect(stats.totalTestsCompleted).toBe(2);

    // Weakness spotter: Numerical is 4/6 (67%), Verbal is 4/4 (100%)
    expect(stats.primaryWeakness).toBe("Numerical Reasoning");
    expect(stats.categoryAccuracies["Numerical Reasoning"].percent).toBe(67);
    expect(stats.categoryAccuracies["Verbal Ability"].percent).toBe(100);
  });

  it("flags score below 80% as not passing", () => {
    const mockHistory: ExamAttemptRecord[] = [
      {
        id: "att-fail",
        timestamp: Date.now(),
        scorePercent: 60,
        correctCount: 3,
        totalQuestions: 5,
        mode: "sprint",
      },
    ];

    const stats = getReadinessStats(mockHistory);
    expect(stats.isCalibrated).toBe(true);
    expect(stats.score).toBe(60);
    expect(stats.isPassing).toBe(false);
  });

  it("contains 5 high-yield default sprint questions with explanations", () => {
    expect(DEFAULT_SPRINT_QUESTIONS.length).toBe(5);
    DEFAULT_SPRINT_QUESTIONS.forEach((q) => {
      expect(q.options.length).toBe(4);
      expect(q.options).toContain(q.correctAnswer);
      expect(q.explanation.length).toBeGreaterThan(10);
    });
  });
});

describe("Twin Question Generator", () => {
  it("generates structured twin question with fallback safety", async () => {
    const original = {
      question: "Pipe A takes 6 hrs, Pipe B takes 12 hrs. How long together?",
      options: ["3 hrs", "4 hrs", "6 hrs", "9 hrs"],
      correctAnswer: "4 hrs",
      explanation: "⚡ T = (A × B) / (A + B)",
      topic: "Numerical Reasoning",
    };

    const twin = await generateTwinQuestion(original);
    expect(twin.question).toBeDefined();
    expect(twin.options.length).toBe(4);
    expect(twin.correctAnswer).toBeDefined();
    expect(twin.explanation).toBeDefined();
  });
});
