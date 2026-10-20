import { describe, it, expect } from "vitest";
import {
  cleanPageText,
  reconstructStackedFractions,
  detectQaBookLikelihood,
  parseTwoPassQuestionsAndAnswers,
  toQuestions,
  toFlashcards,
} from "../src/services/pdfQuestionImporter";
import { PdfLayoutItem } from "../src/services/pdfService";

describe("Phase 3: Zero-Cost No-AI PDF Question Importer", () => {
  it("cleans ligatures, drops running headers, and escapes currency collisions", () => {
    const raw = "Page 12\n501 Math Word Problems\nIf a book costs $15.50 and has a speci\uFB01c discount, calculate the \uFB02oat.";
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
    expect(parsed[0].correctIndex).toBe(1); // 'b' is index 1
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

  it("extracts multiple chapters sequentially without question-answer collisions (501 Math Word Problems pattern)", () => {
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

    // Q1 checks
    expect(parsed[0].number).toBe(1);
    expect(parsed[0].stem).toContain("Bonnie has twice as many cousins");
    expect(parsed[0].options).toEqual(["4", "5", "6", "8"]);
    expect(parsed[0].correctLetter).toBe("d");
    expect(parsed[0].correctIndex).toBe(3);
    expect(parsed[0].explanation).toContain("Work backwards to find the solution");
    expect(parsed[0].hasIncompleteAnswer).toBe(false);

    // Q64 checks (Chapter 2)
    expect(parsed[2].number).toBe(64);
    expect(parsed[2].stem).toContain("Lori ran 5 1/2 miles");
    expect(parsed[2].options).toEqual(["5", "4 1/2", "4", "4 3/4"]);
    expect(parsed[2].correctLetter).toBe("d");
    expect(parsed[2].correctIndex).toBe(3);
    expect(parsed[2].hasIncompleteAnswer).toBe(false);
  });

  it("handles multi-line chapter headings and single-line options seamlessly", () => {
    const rawPdfDump = `
CHAPTER
1
Miscellaneous Math

1. Find the sum of angles in a triangle.
a. 90  b. 180  c. 270  d. 360

Answers and Explanations
1. b. The interior angles of any triangle sum to 180 degrees.

CHAPTER
2
Fractions

64. What is 1/2 plus 1/4?
a. 1/6  b. 2/6  c. 3/4  d. 1

Answers
64. c. Find common denominator: 2/4 + 1/4 = 3/4.
    `;

    const parsed = parseTwoPassQuestionsAndAnswers(rawPdfDump);
    expect(parsed.length).toBe(2);

    expect(parsed[0].number).toBe(1);
    expect(parsed[0].chapter).toContain("CHAPTER 1");
    expect(parsed[0].options).toEqual(["90", "180", "270", "360"]);
    expect(parsed[0].correctLetter).toBe("b");
    expect(parsed[0].correctIndex).toBe(1);
    expect(parsed[0].hasIncompleteAnswer).toBe(false);

    expect(parsed[1].number).toBe(64);
    expect(parsed[1].chapter).toContain("CHAPTER 2");
    expect(parsed[1].options).toEqual(["1/6", "2/6", "3/4", "1"]);
    expect(parsed[1].correctLetter).toBe("c");
    expect(parsed[1].correctIndex).toBe(2);
    expect(parsed[1].hasIncompleteAnswer).toBe(false);
  });
});
