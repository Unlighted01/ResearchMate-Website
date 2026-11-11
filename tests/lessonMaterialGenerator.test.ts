import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import { extractAllPagesWithLayout, FullPdfExtractionResult } from "../src/services/pdfService";
import {
  generateLessonMaterial,
  generatePhraseTableMcqs,
  generateIncorrectVsCorrectMcqs,
  generateWorkedModelCards,
  generateKeywordOperationCards,
  generateExerciseBlankPrompts,
} from "../src/services/lessonMaterialGenerator";
import { lintDistractorQuality, isEnemyItem } from "../src/services/distractorQualityService";

describe("Lesson Material Generator (Generic Rule-Based, Zero AI)", () => {
  let layout: FullPdfExtractionResult;

  beforeAll(async () => {
    const fixturePath = path.resolve(__dirname, "../tests/fixtures/Word_Problems_Explained.pdf");
    const buffer = fs.readFileSync(fixturePath);
    layout = await extractAllPagesWithLayout(buffer);
  });

  it("1. Phrase tables: generates MCQs with named distractor reasons, respects 'or' equivalence, passes stem-leak & enemy checks, and caps 3 per family", () => {
    const phraseItems = generatePhraseTableMcqs(layout.pages);

    // Grouping count per family
    const familyCounts: Record<string, number> = {};
    for (const item of phraseItems) {
      const fam = item.category || "unknown";
      familyCounts[fam] = (familyCounts[fam] || 0) + 1;
    }

    // Must cap at 3 per key-word family
    for (const [fam, count] of Object.entries(familyCounts)) {
      expect(count, `Family ${fam} exceeds cap of 3`).toBeLessThanOrEqual(3);
    }
    expect(familyCounts["addition"]).toBe(3);
    expect(familyCounts["subtraction"]).toBe(3);
    expect(familyCounts["multiplication"]).toBe(3);
    expect(familyCounts["division"]).toBe(3);
    expect(familyCounts["grouping"]).toBe(3);
    expect(phraseItems.length).toBe(15);

    // Verify 'or' equivalence rule: "x + 7 or 7 + x" must never use 7 + x as a distractor for x + 7
    const sumItem = phraseItems.find((it) => it.stem.includes("the sum of a number and seven"));
    expect(sumItem).toBeDefined();
    expect(sumItem!.options[sumItem!.correctIndex]).toBe("x + 7");
    expect(sumItem!.options).not.toContain("7 + x");
    expect(sumItem!.options).not.toContain("7+x");

    // Verify distractors with named reasons
    const minusItem = phraseItems.find((it) => it.stem.includes("four less than some number"));
    expect(minusItem).toBeDefined();
    expect(minusItem!.distractorReasons).toBeDefined();
    // Reversed order distractor check
    expect(minusItem!.options).toContain("4 – x");
    expect(minusItem!.distractorReasons!["4 – x"]).toContain("Reversed order of terms");

    const divItem = phraseItems.find((it) => it.stem.includes("quotient of 7 and 4"));
    expect(divItem).toBeDefined();
    expect(divItem!.options).toContain("4 ÷ 7");
    expect(divItem!.distractorReasons!["4 ÷ 7"]).toContain("Reversed dividend and divisor");

    const groupingItem = phraseItems.find((it) => it.stem.includes("4 times the sum of a number and 5"));
    expect(groupingItem).toBeDefined();
    expect(groupingItem!.options).toContain("4n + 5");
    expect(groupingItem!.distractorReasons!["4n + 5"]).toContain("Missing parentheses");

    // Every item must store sourceQuote and sourcePage
    for (const item of phraseItems) {
      expect(item.sourceQuote).toBeDefined();
      expect(item.sourceQuote.length).toBeGreaterThan(5);
      expect(item.sourcePage).toBeGreaterThanOrEqual(2);
      expect(item.sourcePage).toBeLessThanOrEqual(4);

      // Must pass stem-leak lint
      const lint = lintDistractorQuality({
        stem: item.stem,
        options: item.options,
        correctIndex: item.correctIndex,
        questionType: "mcq",
      });
      expect(lint.issues.some((i) => i.type === "stem-leak")).toBe(false);
      expect(lint.issues.some((i) => i.type === "duplicate")).toBe(false);
    }

    // Must pass enemy-item check across the set
    for (let i = 0; i < phraseItems.length; i++) {
      const candidate = phraseItems[i];
      const previous = phraseItems.slice(0, i);
      const enemyResult = isEnemyItem(candidate, previous);
      expect(enemyResult.isEnemy).toBe(false);
    }
  });

  it("2. 'Incorrect vs correct process' tables: generates MCQs using document's authentic error as distractor", () => {
    const errorItems = generateIncorrectVsCorrectMcqs(layout.pages);

    expect(errorItems.length).toBe(5);

    // Row 1: One half of thirty -> 30 ÷ 1/2 is authentic distractor
    const item1 = errorItems.find((it) => it.stem.includes("One half of thirty"));
    expect(item1).toBeDefined();
    expect(item1!.options[item1!.correctIndex]).toBe("1/2 • 30");
    expect(item1!.options).toContain("30 ÷ 1/2");
    expect(item1!.distractorReasons!["30 ÷ 1/2"]).toContain("Document Common Error");

    // Row 2: Eight less than three times a number -> 8 – 3x is authentic distractor
    const item2 = errorItems.find((it) => it.stem.includes("Eight less than three times a number"));
    expect(item2).toBeDefined();
    expect(item2!.options[item2!.correctIndex]).toBe("3x – 8");
    expect(item2!.options).toContain("8 – 3x");
    expect(item2!.distractorReasons!["8 – 3x"]).toContain("Document Common Error");

    // Row 3: twice the sum of 11 and 4 -> 2 • 11 + 4
    const item3 = errorItems.find((it) => it.stem.includes("twice the sum of 11 and 4"));
    expect(item3).toBeDefined();
    expect(item3!.options[item3!.correctIndex]).toBe("2(11 + 4)");
    expect(item3!.options).toContain("2 • 11 + 4");

    // Row 4: Jan's pay MWF and TTh -> 4 • $8 + 6 • $8
    const item4 = errorItems.find((it) => it.stem.includes("Jan worked 4 hours MWF"));
    expect(item4).toBeDefined();
    expect(item4!.options[item4!.correctIndex]).toBe("$8[(3 • 4) + (2 • 6)]");
    expect(item4!.options).toContain("4 • $8 + 6 • $8");

    // Row 5: seven times some number, plus nine -> 7(x + 9)
    const item5 = errorItems.find((it) => it.stem.includes("seven times some number, plus nine"));
    expect(item5).toBeDefined();
    expect(item5!.options[item5!.correctIndex]).toBe("7x + 9");
    expect(item5!.options).toContain("7(x + 9)");

    for (const it of errorItems) {
      expect(it.sourceQuote).toBeDefined();
      expect(it.sourcePage).toBeGreaterThanOrEqual(9);
      expect(it.sourcePage).toBeLessThanOrEqual(11);
      expect(it.questionType).toBe("mcq");
      expect(it.reviewStatus).toBe("verified");
    }
  });

  it("3. Worked models with 'Answer:' lines become model-answer cards", () => {
    const modelCards = generateWorkedModelCards(layout.pages);

    expect(modelCards.length).toBe(4);
    for (const card of modelCards) {
      expect(card.questionType).toBe("free_response");
      expect(card.templateType).toBe("model_answer_card");
      expect(card.reviewStatus).toBe("verified");
      expect(card.explanation).toContain("Model Answer:");
      expect(card.explanation).toContain("Methodology & Steps:");
      expect(card.sourceQuote).toContain("Model Answer:");
      expect(card.sourcePage).toBeGreaterThanOrEqual(5);
      expect(card.sourcePage).toBeLessThanOrEqual(8);
    }

    // Model 1 (Page 6) includes "Do not simplify!"
    const model1 = modelCards.find((c) => c.stem.includes("Model 1"));
    expect(model1).toBeDefined();
    expect(model1!.explanation).toContain("Do not simplify!");

    // Model 3 (Page 8) consecutive odd integers
    const model3 = modelCards.find((c) => c.stem.includes("Model 3"));
    expect(model3).toBeDefined();
    expect(model3!.explanation).toContain("(2x – 11) + (x + 2)");
  });

  it("4. Key word -> operation flashcards", () => {
    const flashcards = generateKeywordOperationCards(layout.pages);

    expect(flashcards.length).toBe(28);
    for (const card of flashcards) {
      expect(card.questionType).toBe("free_response");
      expect(card.templateType).toBe("active_recall_flashcard");
      expect(card.reviewStatus).toBe("verified");
      expect(card.stem).toContain("[Active Recall]");
      expect(card.explanation).toContain("Operation:");
      expect(card.sourceQuote).toBeDefined();
      expect([2, 3]).toContain(card.sourcePage);
    }

    // Verify key operations are present
    const terms = flashcards.map((f) => f.stem);
    expect(terms.some((t) => t.includes('"sum of"'))).toBe(true);
    expect(terms.some((t) => t.includes('"difference"'))).toBe(true);
    expect(terms.some((t) => t.includes('"times"'))).toBe(true);
    expect(terms.some((t) => t.includes('"quotient"'))).toBe(true);
    expect(terms.some((t) => t.includes('"half"'))).toBe(true);
    expect(terms.some((t) => t.includes('"consecutive numbers"'))).toBe(true);
  });

  it("5. Exercise tables with blank answers: prompts only, never graded", () => {
    const exercisePrompts = generateExerciseBlankPrompts(layout.pages);

    expect(exercisePrompts.length).toBe(24);
    for (const prompt of exercisePrompts) {
      // Must be strictly ungradable prompt
      expect(prompt.questionType).toBe("prompt");
      expect(prompt.correctIndex).toBe(-1);
      expect(prompt.correctLetter).toBe("");
      expect(prompt.options).toEqual([]);
      expect(prompt.reviewStatus).toBe("needs_review");
      expect(prompt.isGradable).toBe(false);
      expect(prompt.hasIncompleteAnswer).toBe(true);
      expect(prompt.sourceQuote).toBeDefined();
      expect(prompt.sourcePage).toBeGreaterThanOrEqual(14);
      expect(prompt.sourcePage).toBeLessThanOrEqual(20);
    }
  });

  it("6. Master generator counts and outputs 10 random generated items with sourceQuote and page", () => {
    const result = generateLessonMaterial(layout.pages, "Word Problems Explained");

    console.log("=== Lesson Material Generation Counts for Word_Problems_Explained.pdf ===");
    console.log(`Phrase Table MCQs (capped <=3 per family): ${result.countsByType.phraseTableMcq}`);
    console.log(`Incorrect vs Correct Process MCQs:        ${result.countsByType.incorrectVsCorrectMcq}`);
    console.log(`Worked Model Cards:                        ${result.countsByType.workedModelCard}`);
    console.log(`Key Word -> Operation Flashcards:          ${result.countsByType.keywordOperationCard}`);
    console.log(`Exercise Blank Prompts (Ungraded only):     ${result.countsByType.exerciseBlankPrompt}`);
    console.log(`Total Generated Items:                     ${result.countsByType.total}`);
    console.log("Phrase Table Counts by Family:", result.countsByFamily);

    expect(result.countsByType.phraseTableMcq).toBe(15);
    expect(result.countsByType.incorrectVsCorrectMcq).toBe(5);
    expect(result.countsByType.workedModelCard).toBe(4);
    expect(result.countsByType.keywordOperationCard).toBe(28);
    expect(result.countsByType.exerciseBlankPrompt).toBe(24);
    expect(result.countsByType.total).toBe(76);

    // Pick 10 sample items across the different types
    const samples = [
      result.items[0], // Phrase table addition
      result.items[3], // Phrase table subtraction
      result.items[6], // Phrase table multiplication
      result.items[9], // Phrase table division
      result.items[12], // Phrase table grouping
      result.items[15], // Incorrect vs correct 1
      result.items[16], // Incorrect vs correct 2
      result.items[20], // Worked model card
      result.items[24], // Keyword card
      result.items[52], // Exercise prompt
    ];

    console.log("\n=== 10 Random Generated Items from Lesson Material ===");
    samples.forEach((it, idx) => {
      console.log(`\n[Item ${idx + 1}] (${it.generatorType})`);
      console.log(`Page: ${it.sourcePage}`);
      console.log(`Stem: ${it.stem.slice(0, 100)}...`);
      if (it.options.length > 0) {
        console.log(`Options: ${it.options.join(" | ")} (Correct: [${it.correctLetter}] ${it.options[it.correctIndex]})`);
      }
      console.log(`Quote: "${it.sourceQuote}"`);
      console.log(`Type: ${it.questionType} | Status: ${it.reviewStatus} | Gradable: ${it.isGradable ?? false}`);
    });

    expect(samples.length).toBe(10);
    for (const sample of samples) {
      expect(sample.sourceQuote).toBeDefined();
      expect(sample.sourcePage).toBeGreaterThan(0);
    }
  });
});

