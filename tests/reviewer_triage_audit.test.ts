import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";

vi.mock("../api/_utils/auth.js", () => ({
  authenticateUser: vi.fn(),
  deductCredit: vi.fn(),
  checkRateLimit: vi.fn().mockReturnValue(true),
  setCorsHeaders: vi.fn(),
  refundCredit: vi.fn(),
}));

import { extractAllPagesWithLayout } from "../src/services/pdfService";
import { parseTwoPassQuestionsAndAnswersDetailed } from "../src/services/pdfQuestionImporter";
import { extractJsonQuestions, repairJsonString } from "../src/services/examService";
import { EXAM_SYSTEM_INSTRUCTION } from "../api/chat";

const corpusDir = "C:/Users/netne/Documents/CSC REVIEWER 2027/📝 2027 CSE Reviewer/Practice Tests with Answer Keys";

describe("Reviewer Triage Audit & Importer Hardening", () => {
  const mathPdfPath = path.join(corpusDir, "300 items Mathematics Reviewer with Detailed Solutions.pdf");
  const csePdfPath = path.join(corpusDir, "CSE MOCK EXAM.pdf");

  describe("1. 300 items Mathematics Reviewer with Detailed Solutions", () => {
    it("extracts 300 questions, preserves letter counts, passes spot checks, and flags review items", async () => {
      if (!fs.existsSync(mathPdfPath)) {
        console.warn("Skipping real PDF test: file not found at", mathPdfPath);
        return;
      }

      const layout = await extractAllPagesWithLayout(fs.readFileSync(mathPdfPath));
      const result = parseTwoPassQuestionsAndAnswersDetailed(layout.pages);

      // Total questions
      expect(result.items.length).toBe(300);
      expect(result.missingQuestionNumbers).toEqual([]);

      // Spot-checks: 1=C, 7=C, 15=D, 22=D, 45=A, 50=E
      const item1 = result.items.find((it) => it.number === 1);
      const item7 = result.items.find((it) => it.number === 7);
      const item15 = result.items.find((it) => it.number === 15);
      const item22 = result.items.find((it) => it.number === 22);
      const item45 = result.items.find((it) => it.number === 45);
      const item50 = result.items.find((it) => it.number === 50);

      expect(item1?.correctLetter?.toLowerCase()).toBe("c");
      expect(item7?.correctLetter?.toLowerCase()).toBe("c");
      expect(item15?.correctLetter?.toLowerCase()).toBe("d");
      expect(item22?.correctLetter?.toLowerCase()).toBe("d");
      expect(item45?.correctLetter?.toLowerCase()).toBe("a");
      expect(item50?.correctLetter?.toLowerCase()).toBe("e");

      // Verify answer key counts across the 300-answer key region: A:71, B:63, C:80, D:72, E:14
      // Parse answers directly from key region
      const answerPages = layout.pages.slice(20, 29);
      const fullAnswerText = answerPages.map((p) => p.text).join("\n");
      const keyRegex = /(?:^|\n)\s*(\d{1,3})\.\)\s*([\s\S]*?)(?=(?:\n\s*\d{1,3}\.\)|$))/g;
      const keyLetters: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
      let km;
      while ((km = keyRegex.exec(fullAnswerText)) !== null) {
        const num = parseInt(km[1], 10);
        if (num >= 1 && num <= 300) {
          const content = km[2].trim().replace(/^\)\s*/, "");
          const lm = content.match(/^([A-Ea-e])\b/);
          if (lm) {
            keyLetters[lm[1].toUpperCase()]++;
          }
        }
      }

      expect(keyLetters.A).toBe(71);
      expect(keyLetters.B).toBe(63);
      expect(keyLetters.C).toBe(80);
      expect(keyLetters.D).toBe(72);
      expect(keyLetters.E).toBe(14);
      expect(keyLetters.A + keyLetters.B + keyLetters.C + keyLetters.D + keyLetters.E).toBe(300);

      // Review flagging on conditional/ambiguous answer entries: #29 and #124
      const item29 = result.items.find((it) => it.number === 29);
      const item124 = result.items.find((it) => it.number === 124);
      expect(item29?.reviewStatus).toBe("needs_review");
      expect(item124?.reviewStatus).toBe("needs_review");

      // Figure questions with no text choices become figure_based (not graded)
      const figureItems = result.items.filter((it) => it.questionType === "figure_based");
      expect(figureItems.length).toBe(23); // items 75-97
      for (const fig of figureItems) {
        expect(fig.correctIndex).toBe(-1);
        expect(fig.hasIncompleteAnswer).toBe(true);
      }

      // Options all identical (#202-204) go to needs_review
      const item202 = result.items.find((it) => it.number === 202);
      const item203 = result.items.find((it) => it.number === 203);
      const item204 = result.items.find((it) => it.number === 204);
      expect(item202?.reviewStatus).toBe("needs_review");
      expect(item203?.reviewStatus).toBe("needs_review");
      expect(item204?.reviewStatus).toBe("needs_review");

      // Lost superscripts (#4) go to needs_review
      const item4 = result.items.find((it) => it.number === 4);
      expect(item4?.reviewStatus).toBe("needs_review");
    });
  });

  describe("2. CSE MOCK EXAM & Strict Key Gate", () => {
    it("extracts 0 graded questions, skips survey items 1-20, and imports prompts 21-170", async () => {
      if (!fs.existsSync(csePdfPath)) {
        console.warn("Skipping real PDF test: file not found at", csePdfPath);
        return;
      }

      const layout = await extractAllPagesWithLayout(fs.readFileSync(csePdfPath));
      const result = parseTwoPassQuestionsAndAnswersDetailed(layout.pages);

      // Strict Key Gate: 0 graded items when no answer key exists
      expect(result.gradableCount).toBe(0);
      expect(result.items.every((it) => it.correctIndex === -1)).toBe(true);
      expect(result.items.every((it) => it.hasIncompleteAnswer === true)).toBe(true);

      // Personal survey items (items 1-20) skipped
      const surveyItems = result.items.filter((it) => it.number <= 20);
      expect(surveyItems.length).toBe(0);

      // Total prompts imported: 144 items (items 21-170, excluding skipped 61-66)
      expect(result.items.length).toBe(144);
      expect(result.promptCount).toBe(144);

      // Missing numbers reflect author's skipped numbers in PDF (61-66)
      expect(result.missingQuestionNumbers).toEqual([61, 62, 63, 64, 65, 66]);

      // Verify numeric options 1-5 support on item 21
      const item21 = result.items.find((it) => it.number === 21);
      expect(item21).toBeDefined();
      expect(item21?.options.length).toBe(5);
      expect(item21?.options[0]).toBe("pagod");
      expect(item21?.options[1]).toBe("galit");
      expect(item21?.options[2]).toBe("pihikan");
      expect(item21?.options[3]).toBe("mabagal");
      expect(item21?.options[4]).toBe("mahinahon");
    });

    it("fails if any graded item exists in a file with no key region", () => {
      // Simulate synthetic layout with no answer key region
      const fakeText = `
        1. What is the value of x?
        a. 1
        b. 2
        c. 3
        d. 4

        2. What is the capital of the Philippines?
        a. Manila
        b. Cebu
        c. Davao
        d. Quezon City
      `;
      const result = parseTwoPassQuestionsAndAnswersDetailed(fakeText);

      // Must have 0 graded items
      expect(result.gradableCount).toBe(0);
      for (const item of result.items) {
        expect(item.correctIndex).toBe(-1);
        expect(item.hasIncompleteAnswer).toBe(true);
        expect(item.questionType).toBe("prompt");
      }
    });
  });

  describe("3. JSON Repair & LaTeX Backslash Preservation", () => {
    it("preserves real backslashes for \\frac, \\times, \\neq, \\right, and \\beta", () => {
      // Raw JSON string containing LaTeX expressions that collide with JSON escapes (\f, \t, \n, \r, \b)
      const rawAiResponse = JSON.stringify({
        questions: [
          {
            question: "Compute \\frac{1}{2} \\times \\beta where x \\neq y and \\right bracket",
            options: ["A", "B", "C", "D"],
            correctIndex: 0,
            explanation: "Step 1: Simplify \\frac{a}{b} and evaluate \\times \\beta.",
          },
        ],
      });

      const parsed = extractJsonQuestions(rawAiResponse);
      expect(parsed).not.toBeNull();
      expect(parsed?.length).toBe(1);

      const q = parsed![0];
      // Assert that real backslashes are kept, not replaced with control characters \x0C, \t, \n, \r, \b
      expect(q.question).toContain("\\frac");
      expect(q.question).toContain("\\times");
      expect(q.question).toContain("\\neq");
      expect(q.question).toContain("\\right");
      expect(q.question).toContain("\\beta");

      expect(q.explanation).toContain("\\frac");
      expect(q.explanation).toContain("\\times");
      expect(q.explanation).toContain("\\beta");
    });

    it("confirms Groq/OpenRouter prompt asks for an object envelope with questions array", () => {
      expect(EXAM_SYSTEM_INSTRUCTION).toContain('{ "questions": [ ... ] }');
      expect(EXAM_SYSTEM_INSTRUCTION).toContain('"questions": [');
      expect(EXAM_SYSTEM_INSTRUCTION).toContain("valid, parseable JSON object envelope with a \"questions\" key");
    });
  });
});
