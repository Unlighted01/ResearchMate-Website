import { describe, expect, it } from "vitest";
import { getGradableQuestions, assertPublicExamReady, assertPublicFlashcardsReady } from "../src/services/examQuestionPolicy";
import type { Question } from "../src/services/examService";

const base: Question = {
  id: "q1",
  question: "What is two plus two?",
  options: ["3", "4", "5", "6"],
  correctIndex: 1,
  explanation: "Two plus two equals four.",
  topicTag: "Math",
};

describe("exam grading gate", () => {
  it("keeps unreviewed and invalid questions out of seeded grading", () => {
    const candidates: Question[] = [
      base,
      { ...base, id: "draft", reviewStatus: "needs_review" },
      { ...base, id: "missing-key", correctIndex: -1 },
      { ...base, id: "dummy-options", options: ["A", "B", "C", "D"] },
      { ...base, id: "flagged", reviewStatus: "flagged" },
    ];
    expect(getGradableQuestions(candidates).map((item) => item.id)).toEqual(["q1"]);
    expect(getGradableQuestions(candidates.slice(1))).toEqual([]);
    expect(getGradableQuestions([{ ...base, explanation: "" }])).toHaveLength(1);
  });

  it("requires reviewed content and recorded publication rights for shareable sets", () => {
    expect(() => assertPublicExamReady([{ ...base, reviewStatus: "verified" }], "public")).toThrow(/publication rights/i);
    expect(() => assertPublicExamReady([{ ...base, reviewStatus: "needs_review", publicationRights: "original" }], "public")).toThrow(/reviewed/i);
    expect(() => assertPublicExamReady([{ ...base, reviewStatus: "verified", publicationRights: "licensed" }], "public")).toThrow(/rights evidence/i);
    expect(() => assertPublicExamReady([{ ...base, reviewStatus: "verified", publicationRights: "original" }], "public")).not.toThrow();
    expect(() => assertPublicExamReady([{ ...base, explanation: "", reviewStatus: "verified", publicationRights: "original" }], "public")).toThrow(/reviewed/i);
    expect(() => assertPublicFlashcardsReady([{ id: "card", front: "Prompt", back: "Answer", category: "Topic", reviewStatus: "needs_review", publicationRights: "original" }], "public")).toThrow(/reviewed/i);
  });
});
