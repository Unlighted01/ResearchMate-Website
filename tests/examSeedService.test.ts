import { describe, it, expect, beforeEach } from "vitest";
import {
  mulberry32,
  stringToSeed,
  seededShuffle,
  createSeededExam,
  getExamRecord,
  getExamRecordBySeed,
  generateQrPayload,
  clearExamRecords,
  EXAM_FORMAT_VERSION,
} from "../src/services/examSeedService";
import { Question } from "../src/services/examService";

describe("examSeedService", () => {
  beforeEach(() => {
    clearExamRecords();
  });

  const fixedQuestions: Question[] = [
    {
      id: "q-alpha",
      question: "What is the speed of light in vacuum?",
      options: ["300,000 km/s", "150,000 km/s", "1,000 km/s", "Instantaneous"],
      correctIndex: 0,
      explanation: "Approx 3 x 10^8 m/s.",
      topicTag: "Physics",
    },
    {
      id: "q-beta",
      question: "Which organelle synthesizes ATP?",
      options: ["Ribosome", "Mitochondria", "Golgi body", "Vacuole"],
      correctIndex: 1,
      explanation: "Cellular powerhouse.",
      topicTag: "Biology",
    },
    {
      id: "q-gamma",
      question: "What is 12 x 12?",
      options: ["144", "124", "154", "148"],
      correctIndex: 0,
      explanation: "12 squared is 144.",
      topicTag: "Math",
    },
    {
      id: "q-delta",
      question: "Is water a polar molecule?",
      options: ["Yes", "No"],
      correctIndex: 0,
      explanation: "Due to bent shape and electronegativity.",
      topicTag: "Chemistry",
    },
  ];

  it("produces deterministic numbers from Mulberry32 PRNG", () => {
    const rng1 = mulberry32(123456789);
    const rng2 = mulberry32(123456789);

    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());

    expect(seq1).toEqual(seq2);
    expect(seq1[0]).toBeGreaterThanOrEqual(0);
    expect(seq1[0]).toBeLessThan(1);
  });

  it("GOLDEN TEST: fixed seed + fixed questions must match hard-coded frozen expectations", () => {
    const FIXED_SEED = "GOLDEN-2026-X";

    // FROZEN EXPECTED VALUES FOR v:1 (Mulberry32 + FNV-1a balanced permutation)
    // Correct-answer positions are deterministically balanced across choices
    const HARDCODED_EXPECTED_ORDER = ["q-gamma", "q-beta", "q-delta", "q-alpha"];
    const HARDCODED_EXPECTED_KEY = [3, 0, 0, 1];
    const HARDCODED_EXPECTED_PERMUTATIONS = {
      "q-gamma": { questionId: "q-gamma", choiceOrder: [3, 1, 2, 0], originalCorrectIndex: 0, newCorrectIndex: 3 },
      "q-beta": { questionId: "q-beta", choiceOrder: [1, 2, 0, 3], originalCorrectIndex: 1, newCorrectIndex: 0 },
      "q-delta": { questionId: "q-delta", choiceOrder: [0, 1], originalCorrectIndex: 0, newCorrectIndex: 0 },
      "q-alpha": { questionId: "q-alpha", choiceOrder: [1, 0, 2, 3], originalCorrectIndex: 0, newCorrectIndex: 1 },
    };

    const run = createSeededExam(
      fixedQuestions,
      { totalQuestions: 4, choicesPerItem: 4 },
      FIXED_SEED,
      "exam-fixed-001"
    );

    // 1. Question order must match hard-coded frozen constant
    expect(run.examRecord.orderedQuestionIds).toEqual(HARDCODED_EXPECTED_ORDER);
    expect(run.orderedQuestions.map((q) => q.id)).toEqual(HARDCODED_EXPECTED_ORDER);

    // 2. Choice permutations must match hard-coded frozen constant
    expect(run.examRecord.permutations).toEqual(HARDCODED_EXPECTED_PERMUTATIONS);

    // 3. Answer key must match hard-coded frozen constant
    expect(run.examRecord.answerKey).toEqual(HARDCODED_EXPECTED_KEY);

    // 4. Content verification: correct answers remain logically true after choice shuffle
    run.orderedQuestions.forEach((q, idx) => {
      const orig = fixedQuestions.find((fq) => fq.id === q.id)!;
      const expectedAnswerText = orig.options[orig.correctIndex];
      const actualAnswerText = q.options[q.correctIndex];
      expect(actualAnswerText).toBe(expectedAnswerText);
      expect(run.examRecord.answerKey[idx]).toBe(q.correctIndex);
    });
  });

  it("stores and retrieves ExamRecord by examId for OMR answer key lookup", () => {
    const { examRecord } = createSeededExam(
      fixedQuestions,
      { totalQuestions: 3 },
      "SEED-LOOKUP-123",
      "exam-target-id-999"
    );

    const retrieved = getExamRecord("exam-target-id-999");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.examId).toBe("exam-target-id-999");
    expect(retrieved?.seed).toBe("SEED-LOOKUP-123");
    expect(retrieved?.formatVersion).toBe(EXAM_FORMAT_VERSION);
    expect(retrieved?.orderedQuestionIds.length).toBe(3);
    expect(retrieved?.answerKey.length).toBe(3);
  });

  it("retrieves ExamRecord by seed for retaking tests", () => {
    createSeededExam(
      fixedQuestions,
      { totalQuestions: 4 },
      "SEED-RETAKE-456",
      "exam-retake-001"
    );

    const retrieved = getExamRecordBySeed("seed-retake-456");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.examId).toBe("exam-retake-001");
  });

  it("generates QR payload with format version and metadata", () => {
    const payloadStr = generateQrPayload("exam-888", "SEED-999", 1, 2);
    const parsed = JSON.parse(payloadStr);

    expect(parsed.v).toBe(EXAM_FORMAT_VERSION);
    expect(parsed.e).toBe("exam-888");
    expect(parsed.s).toBe("SEED-999");
    expect(parsed.p).toBe(1);
    expect(parsed.t).toBe(2);
  });
});
