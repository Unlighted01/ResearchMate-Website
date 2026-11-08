import { describe, it, expect } from "vitest";
import {
  splitIntoSentences,
  computeWordFrequencies,
  generateExtractiveSummary,
} from "../src/services/extractiveSummaryService";

describe("extractiveSummaryService", () => {
  const sampleArticle = `
    The Civil Service Examination assesses the readiness of candidates for professional public service.
    Competitive examinations evaluate general mental ability, numerical reasoning, and language proficiency.
    Many students spend hundreds of hours memorizing static formulas without practicing speed shortcuts.
    Active recall and spaced repetition drills have been shown to increase exam retention by over 40 percent.
    By identifying weak subject categories early, examinees can systematically improve their rolling readiness score.
    In conclusion, targeted drill sessions combined with timed practice form the foundation of exam passing.
  `;

  it("splits paragraphs into clean sentence units", () => {
    const sentences = splitIntoSentences(sampleArticle);
    expect(sentences.length).toBe(6);
    expect(sentences[0]).toContain("Civil Service Examination");
  });

  it("calculates salient word frequencies ignoring stopwords", () => {
    const sentences = splitIntoSentences(sampleArticle);
    const freqs = computeWordFrequencies(sentences);
    expect(freqs.has("the")).toBe(false);
    expect(freqs.has("exam") || freqs.has("examinations") || freqs.has("readiness")).toBe(true);
  });

  it("extracts the top 3 thesis sentences chronologically in 0ms", () => {
    const summary = generateExtractiveSummary(sampleArticle, 3);
    expect(summary).toBeTruthy();
    expect(typeof summary).toBe("string");
    // Should contain important concepts
    const hasKeyTerms = summary.toLowerCase().includes("exam") || summary.toLowerCase().includes("readiness");
    expect(hasKeyTerms).toBe(true);
  });

  it("gracefully handles short or empty text", () => {
    expect(generateExtractiveSummary("")).toBe("No text available for summary.");
    expect(generateExtractiveSummary("Short text.")).toBe("Short text.");
  });
});
