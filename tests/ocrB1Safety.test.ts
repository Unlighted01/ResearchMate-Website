import { describe, expect, it } from "vitest";
import { getGradableQuestions } from "../src/services/examQuestionPolicy";
import { getLocalAttempts, saveLocalAttempts, type Question } from "../src/services/examService";
import { confirmOcrKey, confirmOcrPage, isSkewedKeyPage, type KeyConfirmation } from "../src/services/keyProvenance";
import { changeConfirmedOcrKey } from "../src/services/ocrKeyConfirmationService";
import { importQuestionsToBank } from "../src/services/questionImportService";
import { clearQuestionBank, getUserQuestions, updateQuestion, sampleSprintQuestions } from "../src/services/questionBankService";

const plausibleOcrQuestion = {
  id: "ocr-1",
  question: "What is 2 + 2?",
  options: ["3", "4", "5", "6"],
  correctIndex: 1,
  explanation: "The source shows four.",
  topicTag: "Math",
  reviewStatus: "verified",
  keyProvenance: "none",
  sourceHash: "a".repeat(64),
  sourcePage: 1,
  sourceCrop: { x: 0.1, y: 0.1, width: 0.4, height: 0.2 },
} as Question;

const confirmation: KeyConfirmation = {
  value: "B",
  sourceHash: "a".repeat(64),
  page: 1,
  crop: { x: 0.1, y: 0.1, width: 0.4, height: 0.2 },
  time: "2026-11-18T08:00:00.000Z",
};

describe("OCR key safety", () => {
  it("preserves OCR provenance through bank import, serialization, and edits", async () => {
    clearQuestionBank();
    await importQuestionsToBank({ rawQuestions: [plausibleOcrQuestion], sourceFile: "ocr.png" });
    let stored = getUserQuestions().find((q) => q.id === "ocr-1")!;
    expect(stored.keyProvenance).toBe("none");
    expect(getGradableQuestions([JSON.parse(JSON.stringify(stored))])).toHaveLength(0);
    expect(sampleSprintQuestions(1)).toHaveLength(0);
    updateQuestion(stored.id, confirmOcrKey(stored, confirmation));
    stored = getUserQuestions().find((q) => q.id === "ocr-1")!;
    expect(getGradableQuestions([JSON.parse(JSON.stringify(stored))])).toHaveLength(1);
    updateQuestion(stored.id, { correctIndex: 2 });
    expect(getGradableQuestions(getUserQuestions())).toHaveLength(0);
    clearQuestionBank();
  });
  it("keeps a plausible OCR key ungradable before confirmation", () => {
    expect(getGradableQuestions([plausibleOcrQuestion])).toHaveLength(0);
    expect(getGradableQuestions([{ ...plausibleOcrQuestion, keyProvenance: undefined }])).toHaveLength(0);
  });

  it("grades only a confirmed exact value bound to the same source hash and crop", () => {
    const confirmed = confirmOcrKey(plausibleOcrQuestion, confirmation);
    expect(getGradableQuestions([confirmed])).toHaveLength(1);
    expect(getGradableQuestions([{ ...confirmed, correctIndex: 2 }])).toHaveLength(0);
    expect(getGradableQuestions([{ ...confirmed, sourceHash: "b".repeat(64) }])).toHaveLength(0);
    expect(getGradableQuestions([{ ...confirmed, sourceCrop: { ...confirmed.sourceCrop!, x: 0.2 } }])).toHaveLength(0);
    expect(getGradableQuestions([{ ...confirmed, keyConfirmation: { ...confirmation, crop: { ...confirmation.crop, y: 0.2 } } }])).toHaveLength(0);
  });

  it("blocks bulk confirmation above 60% one letter when n is at least 10", () => {
    const sevenOfTen = Array.from({ length: 10 }, (_, index) => ({
      ...plausibleOcrQuestion,
      id: `q-${index}`,
      correctIndex: index < 7 ? 0 : 1,
    }));
    expect(isSkewedKeyPage(sevenOfTen)).toBe(true);
    expect(() => confirmOcrPage(sevenOfTen, Array(10).fill(confirmation))).toThrow(/skewed/i);
    expect(isSkewedKeyPage(sevenOfTen.slice(0, 9))).toBe(false);
    expect(isSkewedKeyPage(sevenOfTen.map((item, index) => ({ ...item, correctIndex: index < 6 ? 0 : 1 })))).toBe(false);
  });

  it("marks old local attempts when a confirmed key changes without changing their score", () => {
    saveLocalAttempts([{
      id: "attempt-1",
      exam_id: null,
      score: 1,
      total: 1,
      percentage: 100,
      answers: { "ocr-1": 1 },
      questions_snapshot: [confirmOcrKey(plausibleOcrQuestion, confirmation)],
      passed: true,
      created_at: "2026-11-18T08:10:00.000Z",
    }]);
    const updated = changeConfirmedOcrKey(
      confirmOcrKey(plausibleOcrQuestion, confirmation),
      2,
      { ...confirmation, value: "C" },
    );
    expect(getGradableQuestions([updated])).toHaveLength(1);
    expect(getLocalAttempts()[0]).toMatchObject({
      gradedWithEarlierKey: true,
      score: 1,
      percentage: 100,
      questions_snapshot: [{ correctIndex: 1 }],
    });
    saveLocalAttempts([]);
  });
});
