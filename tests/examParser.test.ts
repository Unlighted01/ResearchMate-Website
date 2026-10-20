import { describe, it, expect } from "vitest";
import {
  parsePlainTextQuestions,
  parseCsvQuestions,
  sanitizeCurrencyAndMath,
  normalizeAnswerIndex,
} from "../src/services/examParser";

describe("Phase 2: Question Import & Parser Engine", () => {
  it("protects currency dollar signs from KaTeX collisions while preserving math delimiters", () => {
    const raw = "The textbook costs $50 and the notebook costs $15. Formula: $E = mc^2$.";
    const sanitized = sanitizeCurrencyAndMath(raw);
    expect(sanitized).toContain("\\$50");
    expect(sanitized).toContain("\\$15");
    expect(sanitized).toContain("$E = mc^2$");
  });

  it("normalizes diverse answer representations to 0-based indices", () => {
    expect(normalizeAnswerIndex("A")).toBe(0);
    expect(normalizeAnswerIndex("Answer: B")).toBe(1);
    expect(normalizeAnswerIndex("ans: c")).toBe(2);
    expect(normalizeAnswerIndex("Key: D")).toBe(3);
    expect(normalizeAnswerIndex("1")).toBe(0);
    expect(normalizeAnswerIndex("3")).toBe(2);
  });

  it("parses multi-line plain text questions with diverse option formats", () => {
    const input = `
1. A 5kg object is subjected to an applied force.
Given that acceleration is 2 m/s^2,
what is the total net force acting on the object?
(a) 5 N
(b) 10 N
(c) 15 N
(d) 20 N
Answer: B
Explanation: By Newton's Second Law, F = ma = (5kg)(2 m/s^2) = 10 N.
Topic: Classical Physics

2. Evaluate the integral of cos(x):
A) sin(x) + C
B) -sin(x) + C
C) tan(x) + C
D) sec(x) + C
Ans: A
    `.trim();

    const result = parsePlainTextQuestions(input);
    expect(result.totalParsed).toBe(2);
    expect(result.validCount).toBe(2);

    const q1 = result.items[0].question;
    expect(q1.question).toContain("what is the total net force");
    expect(q1.options[0]).toBe("5 N");
    expect(q1.options[1]).toBe("10 N");
    expect(q1.correctIndex).toBe(1); // B
    expect(q1.explanation).toContain("Newton's Second Law");
    expect(q1.topicTag).toBe("Classical Physics");

    const q2 = result.items[1].question;
    expect(q2.correctIndex).toBe(0); // A
    expect(q2.options[0]).toBe("sin(x) + C");
  });

  it("handles asterisk-marked correct choices (* C) Option)", () => {
    const input = `
1. What is the derivative of x^2?
A) x
B) 2
* C) 2x
D) x^3
    `.trim();

    const result = parsePlainTextQuestions(input);
    expect(result.totalParsed).toBe(1);
    expect(result.items[0].question.correctIndex).toBe(2); // C
  });

  it("handles missing explanations and 3-option blocks gracefully without crashing", () => {
    const input = `
1. Is water a polar molecule?
A. Yes
B. No
C. Sometimes
Answer: A
    `.trim();

    const result = parsePlainTextQuestions(input);
    expect(result.totalParsed).toBe(1);
    expect(result.items[0].isValid).toBe(true);
    expect(result.items[0].warnings).toContain("Expected 4 options, found 3.");
    expect(result.items[0].question.explanation).toContain("Identified based on study materials");
    expect(result.items[0].question.options.length).toBe(4); // padded
  });

  it("parses CSV with quoted commas and formulas using PapaParse", () => {
    const csv = `Question,Option A,Option B,Option C,Option D,Answer,Explanation,Topic
"Evaluate $\\lim_{x \\to 0} \\frac{\\sin(3x)}{x}$, where x is non-zero","0","1","3","Does not exist","C","Using standard limit $\\lim \\frac{\\sin u}{u} = 1$, coefficient is 3.","Calculus"
"What is $2 + 2$?","3","4","5","6","B","Basic arithmetic","Math"`;

    const result = parseCsvQuestions(csv);
    expect(result.totalParsed).toBe(2);
    expect(result.validCount).toBe(2);

    const q1 = result.items[0].question;
    expect(q1.question).toContain("\\lim_{x \\to 0}");
    expect(q1.correctIndex).toBe(2); // C
    expect(q1.options[2]).toBe("3");
    expect(q1.topicTag).toBe("Calculus");
  });
});
