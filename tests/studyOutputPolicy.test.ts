import { describe, expect, it } from "vitest";
import { recommendStudyOutput, selectGroundedFlashcards } from "../src/services/studyOutputPolicy";

describe("study output routing", () => {
  it("keeps fewer source-backed flashcards when a short note cannot support the requested count", () => {
    const source = "The Constitution establishes three branches of government.";
    const candidates = [
      { front: "How many branches are described?", back: "Three.", sourceQuote: "three branches of government" },
      { front: "Who wrote the note?", back: "A named author.", sourceQuote: "A named author" },
      { front: "What year?", back: "1987.", sourceQuote: "" },
    ];
    expect(selectGroundedFlashcards(candidates, source)).toEqual([candidates[0]]);
  });

  it("routes a material to its strongest supported study format", () => {
    expect(recommendStudyOutput({ hasReadableText: false, verifiedQuestions: 0, verifiedCards: 0, ungradedPrompts: 0 })).toBe("ocr_required");
    expect(recommendStudyOutput({ hasReadableText: true, verifiedQuestions: 0, verifiedCards: 2, ungradedPrompts: 5 })).toBe("flashcards");
    expect(recommendStudyOutput({ hasReadableText: true, verifiedQuestions: 1, verifiedCards: 0, ungradedPrompts: 0 })).toBe("exam_or_quiz");
    expect(recommendStudyOutput({ hasReadableText: true, verifiedQuestions: 0, verifiedCards: 0, ungradedPrompts: 0 })).toBe("concept_generation");
  });
});
