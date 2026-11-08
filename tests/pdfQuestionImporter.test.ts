import { describe, it, expect } from "vitest";
import {
  cleanPageText,
  reconstructStackedFractions,
  detectQaBookLikelihood,
  parseTwoPassQuestionsAndAnswers,
  parseTwoPassQuestionsAndAnswersDetailed,
  detectParserProfile,
  findRepeatingHeadersAndFooters,
  splitStemAndOptions,
  evaluateSuspiciousItem,
  toQuestions,
  toFlashcards,
  DEFAULT_IMPORTER_CONFIG,
  PROFILE_STANDARD_TWO_PASS,
  PROFILE_1001_MATH,
  PROFILE_INLINE_KEYS,
  PROFILE_PAREN_5_CHOICE,
} from "../src/services/pdfQuestionImporter";
import { PdfLayoutItem } from "../src/services/pdfService";

import layout1 from "./fixtures/layouts/layout1_two_pass_end_of_chapter.json";
import layout2 from "./fixtures/layouts/layout2_inline_answers.json";
import layout3 from "./fixtures/layouts/layout3_paren_choices_end_grid.json";
import layout4 from "./fixtures/layouts/layout4_5choices_short_stems.json";

describe("Phase 3: Zero-Cost No-AI PDF Question Importer", () => {
  it("cleans ligatures, drops running headers, and escapes currency collisions", () => {
    const raw = "Page 12\nIf a book costs $15.50 and has a speci\uFB01c discount, calculate the \uFB02oat.";
    const cleaned = cleanPageText(raw);

    expect(cleaned).toContain("specific");
    expect(cleaned).toContain("float");
    expect(cleaned).toContain("\\$15.50");
    expect(cleaned).not.toContain("Page 12");
  });

  it("reconstructs stacked fractions from 2D coordinate text items and unicode glyphs", () => {
    const items: PdfLayoutItem[] = [
      { str: "What is", x: 10, y: 100, width: 30, height: 10 },
      // Top number 3 at x=45, y=105
      { str: "3", x: 45, y: 105, width: 6, height: 8 },
      // Bottom number 4 directly beneath at x=45, y=95
      { str: "4", x: 45, y: 95, width: 6, height: 8 },
      { str: "plus ½ ?", x: 60, y: 100, width: 30, height: 10 },
    ];

    const reconstructed = reconstructStackedFractions(items);
    expect(reconstructed).toContain("$\\frac{3}{4}$");
    expect(reconstructed).toContain("$\\frac{1}{2}$");
  });

  it("detects Q&A book likelihood with question and option density heuristics", () => {
    const qaSample = `
      1. What is the derivative of x^2?
      a. 2x
      b. x
      c. 2
      d. 0

      2. Evaluate integral of 2x dx.
      a. x^2 + C
      b. 2x + C
      c. x + C
      d. 4x + C

      Answers and Explanations
      1. a. The power rule states d/dx(x^n) = n*x^(n-1).
      2. a. The anti-derivative of 2x is x^2 + C.
    `;

    const detection = detectQaBookLikelihood(qaSample);
    expect(detection.isLikelyQa).toBe(true);
    expect(detection.estimatedQuestionCount).toBeGreaterThanOrEqual(2);
    expect(detection.sampleConfidence).toBeGreaterThan(20);

    const nonQa = "This is a regular research article discussing global climate patterns over two decades.";
    expect(detectQaBookLikelihood(nonQa).isLikelyQa).toBe(false);
  });

  it("executes two-pass correlation matching questions with chapter answer keys and step-by-step explanations", () => {
    const bookContent = `
Chapter 1: Word Problems

1. A car travels 150 miles in 3 hours. What is its average speed?
a. 45 mph
b. 50 mph
c. 55 mph
d. 60 mph

2. A bakery bakes 120 loaves of bread each morning. If 75% are sold, how many loaves remain?
a. 25 loaves
b. 30 loaves
c. 45 loaves
d. 90 loaves

Answers and Explanations
1. b. Average speed is calculated by dividing total distance by total time: 150 miles / 3 hours = 50 mph.
2. b. If 75% of loaves are sold, 25% remain: 0.25 * 120 = 30 loaves.
`;

    const parsed = parseTwoPassQuestionsAndAnswers(bookContent);
    expect(parsed.length).toBe(2);

    // Question 1 Verification
    expect(parsed[0].number).toBe(1);
    expect(parsed[0].stem).toContain("A car travels 150 miles in 3 hours");
    expect(parsed[0].options.length).toBe(4);
    expect(parsed[0].correctLetter).toBe("b");
    expect(parsed[0].correctIndex).toBe(1);
    expect(parsed[0].explanation).toContain("150 miles / 3 hours = 50 mph");
    expect(parsed[0].chapter).toBe("Chapter 1: Word Problems");

    // Question 2 Verification
    expect(parsed[1].number).toBe(2);
    expect(parsed[1].stem).toContain("A bakery bakes 120 loaves");
    expect(parsed[1].correctLetter).toBe("b");
    expect(parsed[1].correctIndex).toBe(1);
    expect(parsed[1].explanation).toContain("0.25 * 120 = 30 loaves");
  });

  it("converts parsed Q&A items to valid Question records and Flashcard decks", () => {
    const parsed = [
      {
        id: "q-1",
        number: 1,
        stem: "Evaluate lim(x->0) sin(x)/x",
        options: ["0", "1", "Infinity", "Undefined"],
        correctLetter: "b",
        correctIndex: 1,
        explanation: "Fundamental trigonometric limit equals 1.",
        chapter: "Calculus",
      },
    ];

    const questions = toQuestions(parsed);
    expect(questions.length).toBe(1);
    expect(questions[0].question).toBe("Evaluate lim(x->0) sin(x)/x");
    expect(questions[0].correctIndex).toBe(1);
    expect(questions[0].topicTag).toBe("Calculus");

    const flashcards = toFlashcards(parsed);
    expect(flashcards.length).toBe(1);
    expect(flashcards[0].front).toBe("Evaluate lim(x->0) sin(x)/x");
    expect(flashcards[0].back).toContain("Option B: 1");
    expect(flashcards[0].back).toContain("Fundamental trigonometric limit equals 1.");
    expect(flashcards[0].category).toBe("Calculus");
  });

  it("extracts multiple chapters sequentially without question-answer collisions", () => {
    const multiChapterBook = `
Chapter 1: Miscellaneous Math

1. Bonnie has twice as many cousins as Robert. George has 5 cousins, which is 11 less than Bonnie has. How many cousins does Robert have?
a. 4
b. 5
c. 6
d. 8

2. The number of cars in the lot is 30. If 40% are blue, how many are blue?
a. 10
b. 12
c. 14
d. 16

Answers and Explanations
1. d. Work backwards to find the solution. George has 5 cousins, which is 11 less than Bonnie has; therefore, Bonnie has 16 cousins. Bonnie has twice as many as Robert has, so half of 16 is 8. Robert has 8 cousins.
2. b. Multiply 30 by 0.40 to get 12 blue cars.

Chapter 2: Fractions

64. Lori ran 5 1/2 miles Monday, 6 1/4 miles Tuesday, 4 1/2 miles Wednesday, and 2 3/4 miles on Thursday. What is the average number of miles Lori ran?
a. 5
b. 4 1/2
c. 4
d. 4 3/4

Answers and Explanations
64. d. Add total miles = 19. Average = 19 / 4 = 4 3/4.
    `;

    const parsed = parseTwoPassQuestionsAndAnswers(multiChapterBook);
    expect(parsed.length).toBe(3);

    expect(parsed[0].number).toBe(1);
    expect(parsed[0].stem).toContain("Bonnie has twice as many cousins");
    expect(parsed[0].options).toEqual(["4", "5", "6", "8"]);
    expect(parsed[0].correctLetter).toBe("d");
    expect(parsed[0].correctIndex).toBe(3);
    expect(parsed[0].hasIncompleteAnswer).toBe(false);

    expect(parsed[2].number).toBe(64);
    expect(parsed[2].stem).toContain("Lori ran 5 1/2 miles");
    expect(parsed[2].options).toEqual(["5", "4 1/2", "4", "4 3/4"]);
    expect(parsed[2].correctLetter).toBe("d");
    expect(parsed[2].correctIndex).toBe(3);
    expect(parsed[2].hasIncompleteAnswer).toBe(false);
  });

  // ============================================
  // REQUIREMENT 1: FREQUENCY-BASED HEADER/FOOTER DETECTION & GENERIC BOILERPLATE
  // ============================================
  it("drops lines that repeat across many pages by frequency regardless of text content", () => {
    // 5 pages with a custom repeated running header and footer
    const pages = [
      "[Page 1]\nMedical Board Clinical Review Series\nChapter 1: Cardiology\n1. What is normal heart rate?\na. 60-100 bpm\nb. 120-140 bpm\nc. 40-50 bpm\nd. 150+ bpm\nCONFIDENTIAL REVIEW COPY - DO NOT DISTRIBUTE\nPage 1",
      "[Page 2]\nMedical Board Clinical Review Series\n2. Which valve separates left atrium and left ventricle?\na. Mitral\nb. Tricuspid\nc. Aortic\nd. Pulmonary\nCONFIDENTIAL REVIEW COPY - DO NOT DISTRIBUTE\nPage 2",
      "[Page 3]\nMedical Board Clinical Review Series\n3. What wave represents ventricular depolarization?\na. P wave\nb. QRS complex\nc. T wave\nd. U wave\nCONFIDENTIAL REVIEW COPY - DO NOT DISTRIBUTE\nPage 3",
      "[Page 4]\nMedical Board Clinical Review Series\nAnswers and Explanations\n1. a. Normal resting adult HR is 60-100 bpm.\n2. a. The mitral (bicuspid) valve.\nCONFIDENTIAL REVIEW COPY - DO NOT DISTRIBUTE\nPage 4",
      "[Page 5]\nMedical Board Clinical Review Series\n3. b. The QRS complex represents ventricular depolarization.\nCONFIDENTIAL REVIEW COPY - DO NOT DISTRIBUTE\nPage 5",
    ];

    const repeatingHeaders = findRepeatingHeadersAndFooters(pages);
    expect(repeatingHeaders.has("medical board clinical review series")).toBe(true);
    expect(repeatingHeaders.has("confidential review copy - do not distribute")).toBe(true);

    const fullDoc = pages.join("\n");
    const result = parseTwoPassQuestionsAndAnswersDetailed(fullDoc);

    expect(result.items.length).toBe(3);
    expect(result.repeatingHeadersStripped).toBeDefined();
    expect(result.items[0].stem).not.toContain("Medical Board Clinical Review Series");
    expect(result.items[0].stem).not.toContain("CONFIDENTIAL REVIEW COPY");
  });

  it("strips generic publisher boilerplate (ISBN, cataloging, copyright, printing runs) without publisher-specific names", () => {
    const rawGeneric = `
Chapter 1: Core Principles

1. What is the acceleration due to gravity on Earth?
a. 9.8 m/s^2
b. 8.9 m/s^2
c. 10.5 m/s^2
d. 12.0 m/s^2

Answers and Explanations
1. a. Earth standard gravity is approximately 9.8 m/s^2.
Library of Congress Cataloging-in-Publication Data
Physics Examination Review Guide
ISBN: 978-0-123456-78-9
ISBN-10: 0-123456-78-X
Copyright © 2024 by Academic Test Prep Press. All rights reserved.
Printed in the United States of America.
10 9 8 7 6 5 4 3 2 1
For more information about bulk discounts, visit www.testpreppress.com
    `;

    const result = parseTwoPassQuestionsAndAnswersDetailed(rawGeneric);
    expect(result.items.length).toBe(1);

    const q = result.items[0];
    expect(q.explanation).toBe("Earth standard gravity is approximately 9.8 m/s^2.");
    expect(q.explanation).not.toContain("Library of Congress");
    expect(q.explanation).not.toContain("ISBN");
    expect(q.explanation).not.toContain("All rights reserved");
    expect(q.explanation).not.toContain("Printed in the United States");
    expect(q.explanation).not.toContain("bulk discounts");
    expect(q.reviewStatus).toBe("verified");
  });

  // ============================================
  // REQUIREMENT 2: PARSER PROFILES & AUTO-DETECTION
  // ============================================
  it("auto-detects ParserProfiles and computes confidence summaries across diverse document types", () => {
    // Test 1: Standard two-pass
    const standardSample = `
Chapter 1: Algebra
1. Solve 2x = 10.
a. 5  b. 4  c. 3  d. 2
Answers and Explanations
1. a. x = 5.
    `;
    const det1 = detectParserProfile(standardSample);
    expect(det1.confidence).toBeGreaterThanOrEqual(50);
    expect(det1.summary).toContain("letter_dot");
    expect(det1.profile.id).toBe("standard_two_pass");

    // Test 2: Inline keys
    const inlineSample = `
1. What is H2O?
a. Water  b. Hydrogen  c. Oxygen  d. Acid
Answer: a. Water is dihydrogen monoxide.
2. What is CO2?
a. Carbon  b. Carbon dioxide  c. Monoxide  d. Gas
Answer: b. CO2 is carbon dioxide.
3. What is NaCl?
a. Salt  b. Sugar  c. Pepper  d. Oil
Answer: a. Common salt.
4. What is O2?
a. Ozone  b. Oxygen  c. Air  d. Nitrogen
Answer: b. Diatomic oxygen.
    `;
    const det2 = detectParserProfile(inlineSample);
    expect(det2.profile.keyLocation).toBe("inline");
    expect(det2.summary).toContain("inline");

    // Test 3: 5-Choice Parenthesized
    const paren5Sample = `
1. Select option:
(A) First (B) Second (C) Third (D) Fourth (E) Fifth
2. Select option:
(A) First (B) Second (C) Third (D) Fourth (E) Fifth
Answer Key
1. A  2. B
    `;
    const det3 = detectParserProfile(paren5Sample);
    expect(det3.profile.expectedChoicesPerItem).toBe(5);
    expect(det3.profile.choiceStyle).toBe("paren_letter");
  });

  // ============================================
  // REQUIREMENT 4: RUNNING AGAINST ALL 4 FIXTURE LAYOUTS
  // ============================================
  it("executes successfully against Fixture Layout 1 (Two-Pass End-of-Chapter)", () => {
    const detailed = parseTwoPassQuestionsAndAnswersDetailed(layout1.text);
    expect(detailed.items.length).toBe(4);
    expect(detailed.chaptersDetected).toContain("Chapter 1: Arithmetic Operations");
    expect(detailed.chaptersDetected).toContain("Chapter 2: Fractions and Ratios");
    expect(detailed.items[0].correctLetter).toBe("b");
    expect(detailed.items[1].correctLetter).toBe("c");
    expect(detailed.items[2].correctLetter).toBe("b");
    expect(detailed.items[3].correctLetter).toBe("b");
    expect(detailed.missingQuestionNumbers).toEqual([]);
    expect(detailed.suspiciousCount).toBe(0);
  });

  it("executes successfully against Fixture Layout 2 (Inline Answer Keys)", () => {
    const detailed = parseTwoPassQuestionsAndAnswersDetailed(layout2.text);
    expect(detailed.items.length).toBe(3);
    expect(detailed.items[0].stem).toContain("powerhouse of the eukaryotic cell");
    expect(detailed.items[0].correctLetter).toBe("c");
    expect(detailed.items[0].correctIndex).toBe(2);
    expect(detailed.items[0].explanation.toLowerCase()).toContain("mitochondria");
    expect(detailed.items[1].correctLetter).toBe("d");
    expect(detailed.items[2].correctLetter).toBe("b");
    expect(detailed.suspiciousCount).toBe(0);
  });

  it("executes successfully against Fixture Layout 3 (Parenthesized Choices + End Grid)", () => {
    const detailed = parseTwoPassQuestionsAndAnswersDetailed(layout3.text);
    expect(detailed.items.length).toBe(3);
    expect(detailed.items[0].stem).toContain("chemical formula for table salt");
    expect(detailed.items[0].options).toEqual(["NaCl", "KCl", "CaCl2", "MgSO4"]);
    expect(detailed.items[0].correctLetter).toBe("a");
    expect(detailed.items[1].correctLetter).toBe("b");
    expect(detailed.items[2].correctLetter).toBe("c");
    expect(detailed.suspiciousCount).toBe(0);
  });

  it("executes successfully against Fixture Layout 4 (5 Choices, Short Math Stems, 2-Choice True/False)", () => {
    const detailed = parseTwoPassQuestionsAndAnswersDetailed(layout4.text);
    expect(detailed.items.length).toBe(3);

    // Q1: Short math stem "Solve $2x = 8$." with 5 choices (a)-(e)
    const q1 = detailed.items[0];
    expect(q1.stem).toContain("Solve");
    expect(q1.stem).toContain("2x = 8");
    expect(q1.options.length).toBe(5);
    expect(q1.correctLetter).toBe("d");
    expect(q1.correctIndex).toBe(3);
    // Crucial: Must NOT be flagged as suspicious because it's a valid math stem!
    expect(q1.isSuspicious).toBe(false);
    expect(q1.reviewStatus).toBe("verified");

    // Q2: Short math stem "Evaluate $\sqrt{49}$."
    const q2 = detailed.items[1];
    expect(q2.stem).toContain("Evaluate $\\sqrt{49}$.");
    expect(q2.options.length).toBe(5);
    expect(q2.correctLetter).toBe("c");
    expect(q2.isSuspicious).toBe(false);

    // Q3: 2-choice True/False
    const q3 = detailed.items[2];
    expect(q3.stem).toContain("isosceles triangle always possesses");
    expect(q3.options).toEqual(["True", "False"]);
    expect(q3.correctLetter).toBe("a");
    expect(q3.correctIndex).toBe(0);
    expect(q3.isSuspicious).toBe(false);
  });

  // ============================================
  // REQUIREMENT 5: SHORT-STEM REVIEW & MULTI-CHOICE VARIATIONS
  // ============================================
  it("evaluates short math stems vs non-math short stems with unified threshold config", () => {
    // 1. Valid short math stem
    const evalMath = evaluateSuspiciousItem({
      stem: "Solve $x + 2 = 5$.",
      options: ["1", "2", "3", "4"],
    });
    expect(evalMath.isSuspicious).toBe(false);
    expect(evalMath.reviewStatus).toBe("verified");

    // 2. Non-math truncated stem
    const evalTruncated = evaluateSuspiciousItem({
      stem: "Too short",
      options: ["A", "B", "C", "D"],
    });
    expect(evalTruncated.isSuspicious).toBe(true);
    expect(evalTruncated.reviewStatus).toBe("needs_review");
    expect(evalTruncated.reasons).toContain("Question stem suspiciously short (< 15 characters)");

    // 3. 2-choice True/False question
    const eval2Choice = evaluateSuspiciousItem({
      stem: "Water boils at 100 degrees Celsius at sea level.",
      options: ["True", "False"],
    });
    expect(eval2Choice.isSuspicious).toBe(false);

    // 4. 3-choice item
    const eval3Choice = evaluateSuspiciousItem({
      stem: "Which primary color is missing: Red, Blue, and ___?",
      options: ["Yellow", "Green", "Purple"],
    });
    expect(eval3Choice.isSuspicious).toBe(false);

    // 5. Duplicate choices
    const evalDup = evaluateSuspiciousItem({
      stem: "What is the capital of France?",
      options: ["Paris", "Paris", "Lyon", "Marseille"],
    });
    expect(evalDup.isSuspicious).toBe(true);
    expect(evalDup.reasons).toContain("Duplicate choices detected");
  });

  it("handles lowercase, parenthesized, and letter-paren choice variations seamlessly", () => {
    const variationsText = `
1. Lowercase dot style:
a. Option 1  b. Option 2  c. Option 3  d. Option 4

2. Lowercase paren style:
a) Alpha  b) Beta  c) Gamma  d) Delta

3. Parenthesized style:
(a) Choice One  (b) Choice Two  (c) Choice Three  (d) Choice Four

Answers and Explanations
1. a. Expl 1
2. b. Expl 2
3. c. Expl 3
    `;

    const parsed = parseTwoPassQuestionsAndAnswers(variationsText);
    expect(parsed.length).toBe(3);

    expect(parsed[0].options[0]).toBe("Option 1");
    expect(parsed[0].correctLetter).toBe("a");

    expect(parsed[1].options[1]).toBe("Beta");
    expect(parsed[1].correctLetter).toBe("b");

    expect(parsed[2].options[2]).toBe("Choice Three");
    expect(parsed[2].correctLetter).toBe("c");
  });
});
