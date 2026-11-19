import { describe, expect, it } from "vitest";
import { parseTwoPassQuestionsAndAnswersDetailed, SAVED_PARSER_PROFILES } from "../src/services/pdfQuestionImporter";

const questions = (numbers: number[], twoOptions = false) => numbers.map((n) => `${n}. Calculate the result for problem ${n}.\na. Four\nb. Seven${twoOptions ? "" : "\nc. Nine\nd. Twelve"}`).join("\n");
const parse = (texts: string[]) => parseTwoPassQuestionsAndAnswersDetailed(texts.map((text, i) => ({ pageNumber: i + 1, text })), { profile: SAVED_PARSER_PROFILES.standard_two_pass });

describe("PDF confirmation safety", () => {
  it("accepts a numeric key at the top of its aligned question page", () => {
    const result = parse([`Answers\n1. (2)\n2. (1)\nQuestions\n${questions([1, 2])}`]);
    expect(result.items.map((item) => item.correctLetter)).toEqual(["b", "a"]);
  });
  it("accepts numeric keys at the bottom of their aligned question page", () => {
    const result = parse([`${questions([1, 2])}\nAnswers\n1. (2)\n2. (1)`]);
    expect(result.items.map((item) => item.correctLetter)).toEqual(["b", "a"]);
    expect(result.items.map((item) => item.sourcePage)).toEqual([1, 1]);
  });
  it("keeps question source page when its buffer flushes on the next page", () => {
    const result = parse([questions([1, 2]), "Answers\n1. (2)\n2. (1)"]);
    expect(result.items.map((item) => item.sourcePage)).toEqual([1, 1]);
    expect(result.items.map((item) => item.correctLetter)).toEqual(["b", "a"]);
  });
  it("rejects swapped top-of-page numeric keys even when those numbers exist elsewhere", () => {
    const result = parse([
      `Answers\n3. (2)\n4. (1)\nQuestions\n${questions([1, 2])}`,
      `Answers\n1. (1)\n2. (2)\nQuestions\n${questions([3, 4])}`,
    ]);
    expect(result.items).toHaveLength(4);
    expect(result.items.every((item) => item.correctIndex === -1)).toBe(true);
  });
  it("rejects an entire numeric key page containing an out-of-range choice", () => {
    const result = parse([questions([1, 2], true), "Answers\n1. (2)\n2. (4)"]);
    expect(result.items.map((item) => item.correctLetter)).toEqual(["", ""]);
  });
  it("rejects trailing block-key letters instead of silently accepting a matching prefix", () => {
    const result = parse([questions([1, 2, 3]), "Answers\n1 to 3: CAB D"]);
    expect(result.items.map((item) => item.correctLetter)).toEqual(["", "", ""]);
  });
});
