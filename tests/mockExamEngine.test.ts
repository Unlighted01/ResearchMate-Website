import { describe, it, expect } from "vitest";

// Test suite for Universal Mock Exam & Diagnostic Engine
describe("Universal Mock Exam & Diagnostic Engine", () => {
  it("computes exam score and passing benchmark accurately", () => {
    const questions = [
      { id: 1, correctIndex: 0, topicTag: "Calculus" },
      { id: 2, correctIndex: 1, topicTag: "Physics" },
      { id: 3, correctIndex: 2, topicTag: "Discrete Math" },
      { id: 4, correctIndex: 1, topicTag: "Calculus" },
      { id: 5, correctIndex: 3, topicTag: "Verbal" },
    ];

    // User gets 4 out of 5 correct (80%)
    const userAnswers: Record<number, number> = {
      1: 0, // correct
      2: 1, // correct
      3: 2, // correct
      4: 1, // correct
      5: 0, // wrong (correct is 3)
    };

    let correctCount = 0;
    questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctIndex) correctCount++;
    });

    const percentage = Math.round((correctCount / questions.length) * 100);
    expect(correctCount).toBe(4);
    expect(percentage).toBe(80);

    // Standard 80% benchmark
    const passed80 = percentage >= 80;
    expect(passed80).toBe(true);

    // 90% Honor benchmark
    const passed90 = percentage >= 90;
    expect(passed90).toBe(false);
  });

  it("calculates topic mastery breakdown accurately", () => {
    const questions = [
      { id: 1, correctIndex: 0, topicTag: "Calculus" },
      { id: 2, correctIndex: 1, topicTag: "Physics" },
      { id: 3, correctIndex: 2, topicTag: "Calculus" },
      { id: 4, correctIndex: 1, topicTag: "Physics" },
    ];

    const userAnswers: Record<number, number> = {
      1: 0, // Calculus: correct
      2: 1, // Physics: correct
      3: 0, // Calculus: wrong
      4: 1, // Physics: correct
    };

    const map: Record<string, { total: number; correct: number }> = {};
    questions.forEach((q) => {
      const tag = q.topicTag;
      if (!map[tag]) map[tag] = { total: 0, correct: 0 };
      map[tag].total += 1;
      if (userAnswers[q.id] === q.correctIndex) {
        map[tag].correct += 1;
      }
    });

    expect(map["Calculus"]).toEqual({ total: 2, correct: 1 });
    expect(map["Physics"]).toEqual({ total: 2, correct: 2 });
  });

  it("filters missed questions accurately for retake drill", () => {
    const questions = [
      { id: 1, question: "Q1", correctIndex: 0 },
      { id: 2, question: "Q2", correctIndex: 1 },
      { id: 3, question: "Q3", correctIndex: 2 },
    ];

    const userAnswers: Record<number, number> = {
      1: 0, // correct
      2: 3, // wrong
      3: 2, // correct
    };

    const missed = questions.filter((q) => userAnswers[q.id] !== q.correctIndex);
    expect(missed.length).toBe(1);
    expect(missed[0].id).toBe(2);
  });
});
