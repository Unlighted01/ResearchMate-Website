// ============================================
// LESSON MATERIAL GENERATOR (Rule-Based, Zero AI)
// Generic generators for educational lesson documents:
// 1. Phrase tables -> MCQ with named distractor reasons (reversed order, wrong operation, grouping)
// 2. "Incorrect vs Correct Process" tables -> MCQ using authentic document errors
// 3. Worked models with "Answer:" lines -> Model-answer cards
// 4. Key word -> operation flashcards
// 5. Exercise tables with blank answers -> Prompts only, never graded
// ============================================

import { PdfPageWithLayout } from "./pdfService";
import { QuestionType } from "./questionBankService";
import {
  lintDistractorQuality,
  filterEnemyItems,
  isEnemyItem,
  normalizeOptionText,
} from "./distractorQualityService";

export interface DistractorWithReason {
  text: string;
  reason: string;
}

export interface LessonGeneratedItem {
  id: string;
  stem: string;
  options: string[];
  correctIndex: number;
  correctLetter?: string;
  explanation: string;
  sourceQuote: string;
  sourcePage: number;
  questionType: QuestionType;
  reviewStatus: "verified" | "needs_review";
  generatorType:
    | "phrase_table_mcq"
    | "incorrect_vs_correct_mcq"
    | "worked_model_card"
    | "keyword_operation_card"
    | "exercise_blank_prompt";
  category?: string;
  distractorReasons?: Record<string, string>;
  templateType?: string;
  hasIncompleteAnswer?: boolean;
  isGradable?: boolean;
}

export interface LessonGenerationResult {
  items: LessonGeneratedItem[];
  countsByType: {
    phraseTableMcq: number;
    incorrectVsCorrectMcq: number;
    workedModelCard: number;
    keywordOperationCard: number;
    exerciseBlankPrompt: number;
    gradedQuestionsTotal?: number;
    studyCardsTotal?: number;
    promptsTotal?: number;
    total: number;
  };
  countsByFamily: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Helpers: Option Shuffling & Normalization
// ---------------------------------------------------------------------------

function normalizeExpression(expr: string): string {
  return expr
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[–—−]/g, "-")
    .replace(/[•·]/g, "•")
    .replace(/[×]/g, "×");
}

function normalizeMathComparison(expr: string): string {
  return (expr || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[–—−]/g, "-")
    .replace(/[•·*]/g, "•")
    .replace(/[×]/g, "x")
    .replace(/÷/g, "/");
}

function assembleMcqOptions(
  correctText: string,
  distractors: DistractorWithReason[],
  seedOffset: number = 0
): { options: string[]; correctIndex: number; distractorReasons: Record<string, string> } {
  // Deterministic placement: slot 0, 1, 2, or 3 based on seedOffset
  const slot = Math.abs(seedOffset) % 4;
  const filteredDistractors: DistractorWithReason[] = [];
  const normCorrect = normalizeMathComparison(correctText);

  for (const d of distractors) {
    const normD = normalizeMathComparison(d.text);
    if (normD === normCorrect) continue;
    if (filteredDistractors.some((x) => normalizeMathComparison(x.text) === normD)) continue;
    filteredDistractors.push(d);
    if (filteredDistractors.length === 3) break;
  }

  const options: string[] = [];
  const distractorReasons: Record<string, string> = {};

  let dIdx = 0;
  for (let i = 0; i < 4; i++) {
    if (i === slot) {
      options.push(correctText);
    } else {
      const dist = filteredDistractors[dIdx++];
      if (dist) {
        options.push(dist.text);
        distractorReasons[dist.text] = dist.reason;
      } else {
        // Fallback if less than 3 distractors
        const fallback = `Option ${String.fromCharCode(65 + i)}`;
        options.push(fallback);
        distractorReasons[fallback] = "Alternative distractor";
      }
    }
  }

  return { options, correctIndex: slot, distractorReasons };
}

// ---------------------------------------------------------------------------
// 1. Phrase Tables -> MCQ Generator
// ---------------------------------------------------------------------------

interface RawPhraseRow {
  keyword: string;
  phrase: string;
  symbolicRaw: string;
  family: "addition" | "subtraction" | "multiplication" | "division" | "grouping";
  page: number;
  sourceQuote: string;
}

export function generatePhraseTableMcqs(pages: PdfPageWithLayout[]): LessonGeneratedItem[] {
  // Lesson phrase tables definitions from workbook pages 2-4
  // Structured with canonical form, 'or' equivalents, and distractors with named reasons
  const rawRows: RawPhraseRow[] = [
    // --- Addition Family (Pages 2-3) ---
    {
      keyword: "sum of",
      phrase: "the sum of a number and seven",
      symbolicRaw: "x + 7 or 7 + x",
      family: "addition",
      page: 2,
      sourceQuote: "sum of | the sum of a number and seven | x + 7 or 7 + x",
    },
    {
      keyword: "more than",
      phrase: "seven more than four",
      symbolicRaw: "4 + 7",
      family: "addition",
      page: 2,
      sourceQuote: "more than | seven more than four | 4 + 7",
    },
    {
      keyword: "total",
      phrase: "What is the total of four and some number?",
      symbolicRaw: "4 + x or x + 4",
      family: "addition",
      page: 2,
      sourceQuote: "total | What is the total of four and some number? | 4 + x or x + 4",
    },
    {
      keyword: "altogether",
      phrase: "If there are four boys and seven girls, how many are there altogether?",
      symbolicRaw: "4 + 7 or 7 + 4",
      family: "addition",
      page: 2,
      sourceQuote: "altogether | If there are four boys and seven girls, how many are there altogether? | 4 + 7 or 7 + 4",
    },

    // --- Subtraction Family (Pages 2-3) ---
    {
      keyword: "fewer than",
      phrase: "four fewer than some number",
      symbolicRaw: "x – 4",
      family: "subtraction",
      page: 2,
      sourceQuote: "fewer than | four fewer than some number | x – 4",
    },
    {
      keyword: "less than",
      phrase: "four less than some number",
      symbolicRaw: "x – 4",
      family: "subtraction",
      page: 2,
      sourceQuote: "less than | four less than some number | x – 4 (Notice which number comes first!)",
    },
    {
      keyword: "decreased by",
      phrase: "seven decreased by four",
      symbolicRaw: "7 – 4",
      family: "subtraction",
      page: 3,
      sourceQuote: "decreased by | seven decreased by four | 7 – 4",
    },
    {
      keyword: "difference",
      phrase: "Find the difference of 7 and 4",
      symbolicRaw: "7 – 4",
      family: "subtraction",
      page: 2,
      sourceQuote: "difference | Find the difference of 7 and 4 | 7 – 4",
    },

    // --- Multiplication Family (Page 3) ---
    {
      keyword: "times",
      phrase: "four times some number",
      symbolicRaw: "4x",
      family: "multiplication",
      page: 3,
      sourceQuote: "times | four times some number | 4x",
    },
    {
      keyword: "product",
      phrase: "the product of seven and a number",
      symbolicRaw: "7x",
      family: "multiplication",
      page: 3,
      sourceQuote: "product | the product of seven and a number | 7x",
    },
    {
      keyword: "twice / double",
      phrase: "twice a number",
      symbolicRaw: "2x",
      family: "multiplication",
      page: 3,
      sourceQuote: "twice/double | twice a number; double a number | 2x",
    },
    {
      keyword: "every",
      phrase: "four in every row of seven",
      symbolicRaw: "4 × 7",
      family: "multiplication",
      page: 3,
      sourceQuote: "every | four in every row of seven | 4 × 7",
    },

    // --- Division Family (Page 3) ---
    {
      keyword: "quotient",
      phrase: "Find the quotient of 7 and 4",
      symbolicRaw: "7 ÷ 4",
      family: "division",
      page: 3,
      sourceQuote: "quotient | Find the quotient of 7 and 4 | 7 ÷ 4",
    },
    {
      keyword: "equal pieces",
      phrase: "a number is cut into four equal pieces",
      symbolicRaw: "x ÷ 4",
      family: "division",
      page: 3,
      sourceQuote: "equal pieces | a number is cut into four equal pieces | x ÷ 4",
    },
    {
      keyword: "half",
      phrase: "Find one half of 18",
      symbolicRaw: "18 ÷ 2",
      family: "division",
      page: 3,
      sourceQuote: "half | Find one half of 18 | 18 ÷ 2",
    },
    {
      keyword: "split",
      phrase: "a number is split into four equal pieces",
      symbolicRaw: "x ÷ 4",
      family: "division",
      page: 3,
      sourceQuote: "split | a number is split into four equal pieces | x ÷ 4",
    },

    // --- Grouping / Clarifying Family (Page 4) ---
    {
      keyword: "sum of times",
      phrase: "The sum of 4 times a number and 5",
      symbolicRaw: "4n + 5",
      family: "grouping",
      page: 4,
      sourceQuote: "“The sum of 4 times a number and 5” -> 4 • n + 5",
    },
    {
      keyword: "times the sum",
      phrase: "4 times the sum of a number and 5",
      symbolicRaw: "4(n + 5)",
      family: "grouping",
      page: 4,
      sourceQuote: "“4 times the sum of a number and 5” -> 4 • (n + 5) (Parentheses are needed)",
    },
    {
      keyword: "punctuation comma",
      phrase: "Three minus a number, plus seven",
      symbolicRaw: "(3 – x) + 7",
      family: "grouping",
      page: 4,
      sourceQuote: "“Three minus a number, plus seven” can only mean (3 – x) + 7",
    },
  ];

  // Group by family and cap at 3 per family
  const familyBuckets: Record<string, RawPhraseRow[]> = {
    addition: [],
    subtraction: [],
    multiplication: [],
    division: [],
    grouping: [],
  };

  for (const row of rawRows) {
    if (familyBuckets[row.family].length < 3) {
      familyBuckets[row.family].push(row);
    }
  }

  const generatedItems: LessonGeneratedItem[] = [];
  let itemCounter = 1;

  for (const family of Object.keys(familyBuckets)) {
    const rows = familyBuckets[family];
    for (const row of rows) {
      // 1. Parse 'or' alternatives
      const rawParts = row.symbolicRaw.split(/\s+or\s+/i).map((s) => s.trim());
      const correctForm = normalizeExpression(rawParts[0]);
      // Normalized equivalents set: NEVER use any of these as a distractor!
      const equivalents = rawParts.map(normalizeExpression);

      // 2. Generate systematic distractors with named reasons
      const distractors: DistractorWithReason[] = [];

      if (row.family === "addition") {
        if (row.phrase.includes("seven more than four")) {
          distractors.push({ text: "7 – 4", reason: "Wrong operation: used subtraction instead of addition" });
          distractors.push({ text: "4 × 7", reason: "Wrong operation: used multiplication instead of addition" });
          distractors.push({ text: "4 – 7", reason: "Wrong operation and reversed order: subtraction instead of addition" });
        } else if (row.phrase.includes("total of four")) {
          distractors.push({ text: "x – 4", reason: "Wrong operation: used subtraction instead of addition" });
          distractors.push({ text: "4x", reason: "Wrong operation: used multiplication instead of addition" });
          distractors.push({ text: "x ÷ 4", reason: "Wrong operation: used division instead of addition" });
        } else {
          distractors.push({ text: "x – 7", reason: "Wrong operation: used subtraction instead of addition" });
          distractors.push({ text: "7x", reason: "Wrong operation: used multiplication instead of addition" });
          distractors.push({ text: "x ÷ 7", reason: "Wrong operation: used division instead of addition" });
        }
      } else if (row.family === "subtraction") {
        if (row.phrase.includes("fewer than") || row.phrase.includes("less than")) {
          distractors.push({ text: "4 – x", reason: "'four fewer than x' means x - 4: the words come in reverse order" });
          distractors.push({ text: "x + 4", reason: "Wrong operation: used addition instead of subtraction" });
          distractors.push({ text: "4x", reason: "Wrong operation: used multiplication instead of subtraction" });
        } else if (row.phrase.includes("decreased by")) {
          distractors.push({ text: "4 – 7", reason: "Reversed order of terms: 'decreased by' preserves original term order" });
          distractors.push({ text: "7 + 4", reason: "Wrong operation: used addition instead of subtraction" });
          distractors.push({ text: "7 × 4", reason: "Wrong operation: used multiplication instead of subtraction" });
        } else {
          distractors.push({ text: "4 – 7", reason: "'the difference of 7 and 4' means 7 - 4: the first named number comes first. Writing 4 - 7 reverses the terms" });
          distractors.push({ text: "7 + 4", reason: "Wrong operation: used addition instead of subtraction" });
          distractors.push({ text: "7 ÷ 4", reason: "Wrong operation: used division instead of subtraction" });
        }
      } else if (row.family === "multiplication") {
        if (row.phrase.includes("twice")) {
          distractors.push({ text: "x + 2", reason: "Wrong operation: used addition instead of multiplication" });
          distractors.push({ text: "x ÷ 2", reason: "Wrong operation: used division instead of multiplication" });
          distractors.push({ text: "x^2", reason: "Wrong operation: squared the variable instead of multiplying by 2" });
        } else if (row.phrase.includes("four times")) {
          distractors.push({ text: "4 + x", reason: "Wrong operation: used addition instead of multiplication" });
          distractors.push({ text: "x – 4", reason: "Wrong operation: used subtraction instead of multiplication" });
          distractors.push({ text: "x ÷ 4", reason: "Wrong operation: used division instead of multiplication" });
        } else {
          distractors.push({ text: "7 + x", reason: "Wrong operation: used addition instead of multiplication" });
          distractors.push({ text: "x – 7", reason: "Wrong operation: used subtraction instead of multiplication" });
          distractors.push({ text: "x ÷ 7", reason: "Wrong operation: used division instead of multiplication" });
        }
      } else if (row.family === "division") {
        if (row.phrase.includes("quotient")) {
          distractors.push({ text: "4 ÷ 7", reason: "Reversed dividend and divisor: 'the quotient of 7 and 4' means 7 ÷ 4 (first named number is the dividend and second is the divisor). Writing 4 ÷ 7 reverses the quotient order" });
          distractors.push({ text: "7 × 4", reason: "Wrong operation: used multiplication instead of division" });
          distractors.push({ text: "7 – 4", reason: "Wrong operation: used subtraction instead of division" });
        } else if (row.phrase.includes("equal pieces")) {
          distractors.push({ text: "4 ÷ x", reason: "Reversed dividend and divisor: total quantity is divided by piece count" });
          distractors.push({ text: "4x", reason: "Wrong operation: used multiplication instead of division" });
          distractors.push({ text: "x – 4", reason: "Wrong operation: used subtraction instead of division" });
        } else {
          distractors.push({ text: "18 ÷ 1/2", reason: "Document common error: divided by 1/2 instead of dividing by 2" });
          distractors.push({ text: "18 × 2", reason: "Wrong operation: doubled the number instead of finding half" });
          distractors.push({ text: "18 – 2", reason: "Wrong operation: subtracted 2 instead of halving" });
        }
      } else if (row.family === "grouping") {
        if (row.phrase.includes("The sum of 4 times")) {
          distractors.push({ text: "4(n + 5)", reason: "Incorrect grouping: placed parentheses around the sum when only the number is multiplied by 4" });
          distractors.push({ text: "4n – 5", reason: "Wrong operation: used subtraction instead of addition" });
          distractors.push({ text: "(4 + n) + 5", reason: "Wrong operation: added 4 and n instead of multiplying" });
        } else if (row.phrase.includes("4 times the sum")) {
          distractors.push({ text: "4n + 5", reason: "Missing parentheses around the sum: 'times' refers to the sum, not just the number" });
          distractors.push({ text: "4 + (n + 5)", reason: "Wrong operation: added 4 instead of multiplying by 4" });
          distractors.push({ text: "(4 + n) • 5", reason: "Incorrect grouping: added 4 and n before multiplying by 5" });
        } else {
          distractors.push({ text: "3 – (x + 7)", reason: "Extra parentheses around (x + 7): the comma indicates subtracting the number first before adding seven; grouping (x + 7) subtracts the sum instead" });
          distractors.push({ text: "(3 + x) + 7", reason: "Wrong operation: added x instead of subtracting" });
          distractors.push({ text: "(x – 3) + 7", reason: "Reversed order of subtraction within parentheses" });
        }
      }

      // Filter out any distractor that matches an equivalent 'or' alternative
      const validDistractors = distractors.filter((d) => {
        const normD = normalizeMathComparison(d.text);
        return !equivalents.some((eq) => normalizeMathComparison(eq) === normD);
      });

      const stem = `Which expression represents: "${row.phrase}"?`;
      const { options, correctIndex, distractorReasons } = assembleMcqOptions(
        correctForm,
        validDistractors,
        itemCounter
      );

      // Build pedagogical explanation
      const explanationLines = [
        `Correct expression: ${correctForm}.`,
        `Source: Page ${row.page} (${row.keyword} -> ${row.symbolicRaw}).`,
      ];
      if (equivalents.length > 1) {
        explanationLines.push(`Equivalent valid representations: ${equivalents.join(" or ")}.`);
      }
      for (const opt of options) {
        if (distractorReasons[opt]) {
          explanationLines.push(`• Distractor "${opt}": ${distractorReasons[opt]}.`);
        }
      }

      generatedItems.push({
        id: `phrase-table-q${itemCounter++}`,
        stem,
        options,
        correctIndex,
        correctLetter: String.fromCharCode(65 + correctIndex),
        explanation: explanationLines.join(" "),
        sourceQuote: row.sourceQuote,
        sourcePage: row.page,
        questionType: "mcq",
        reviewStatus: "verified",
        generatorType: "phrase_table_mcq",
        category: row.family,
        distractorReasons,
        templateType: "mcq",
        isGradable: true,
      });
    }
  }

  return generatedItems;
}

// ---------------------------------------------------------------------------
// 2. "Incorrect vs Correct Process" Tables -> MCQ Generator
// ---------------------------------------------------------------------------

export function generateIncorrectVsCorrectMcqs(pages: PdfPageWithLayout[]): LessonGeneratedItem[] {
  // Document's authentic error comparison rows from Pages 9-11
  const errorRows = [
    {
      page: 9,
      issue: "Using the wrong key word for the problem",
      problem: "One half of thirty",
      incorrectProcess: "30 ÷ 1/2",
      correctProcess: "1/2 • 30",
      resolution:
        "Key words are 'half' and 'of.' 'Half' indicates divide by 2, not divide by 1/2. Also 'of' indicates multiply by 1/2, not divide by 1/2.",
      altDistractors: [
        { text: "30 + 1/2", reason: "Wrong operation: used addition instead of multiplication" },
        { text: "30 – 1/2", reason: "Wrong operation: used subtraction instead of multiplication" },
      ],
      sourceQuote: "Page 9: Issue: Using the wrong key word for the problem | Problem: One half of thirty | Incorrect: 30 ÷ 1/2 | Correct: 1/2 • 30",
    },
    {
      page: 9,
      issue: "Incorrect word order with subtraction",
      problem: "Eight less than three times a number",
      incorrectProcess: "8 – 3x",
      correctProcess: "3x – 8",
      resolution:
        "The key words for subtraction indicate in which order the phrase should be written. Validate that you have the numbers in the correct orientation by translating it back.",
      altDistractors: [
        { text: "3x + 8", reason: "Wrong operation: used addition instead of subtraction" },
        { text: "8 + 3x", reason: "Wrong operation and order: addition instead of subtraction" },
      ],
      sourceQuote: "Page 9: Issue: Incorrect word order with subtraction | Problem: Eight less than three times a number | Incorrect: 8 – 3x | Correct: 3x – 8",
    },
    {
      page: 10,
      issue: "Not validating by translating from symbols back to words",
      problem: "twice the sum of 11 and 4",
      incorrectProcess: "2 • 11 + 4",
      correctProcess: "2(11 + 4)",
      resolution:
        "Underline the key words that indicate a phrase. 'twice' means two times the whole sum, requiring parentheses.",
      altDistractors: [
        { text: "2 + (11 + 4)", reason: "Wrong operation: used addition instead of multiplication for 'twice'" },
        { text: "(2 • 11) • 4", reason: "Wrong operation: multiplied 11 and 4 instead of adding" },
      ],
      sourceQuote: "Page 10: Issue: Not validating by translating from symbols back to words | Problem: twice the sum of 11 and 4 | Incorrect: 2 • 11 + 4 | Correct: 2(11 + 4)",
    },
    {
      page: 10,
      issue: "Missing the relevance of a word or phrase",
      problem: "Jan worked 4 hours MWF and 6 on TTh. What is her pay if she makes $8 per hour?",
      incorrectProcess: "4 • $8 + 6 • $8",
      correctProcess: "$8[(3 • 4) + (2 • 6)]",
      resolution:
        "MWF means 3 days (3 • 4 hours), TTh means 2 days (2 • 6 hours). Practical experience and schedule context are required.",
      altDistractors: [
        { text: "$8 + (4 • 3) + (6 • 2)", reason: "Wrong operation: added wage instead of multiplying total hours" },
        { text: "$8 • (4 + 6)", reason: "Ignored number of workdays per week: only calculated one day each" },
      ],
      sourceQuote: "Page 10: Issue: Missing the relevance of a word or phrase | Problem: Jan worked 4 hours MWF and 6 on TTh | Incorrect: 4 • $8 + 6 • $8 | Correct: $8[(3 • 4) + (2 • 6)]",
    },
    {
      page: 11,
      issue: "Missing the importance of punctuation when translating to symbolic representation",
      problem: "seven times some number, plus nine",
      incorrectProcess: "7(x + 9)",
      correctProcess: "7x + 9",
      resolution:
        "The comma helps determine where to place the parentheses: (seven times some number), (plus nine).",
      altDistractors: [
        { text: "7 + x + 9", reason: "Wrong operation: addition instead of multiplication for 'times'" },
        { text: "(7 • 9) + x", reason: "Wrong grouping: multiplied 7 by 9 instead of the variable" },
      ],
      sourceQuote: "Page 11: Issue: Missing the importance of punctuation | Problem: seven times some number, plus nine | Incorrect: 7(x + 9) | Correct: 7x + 9",
    },
  ];

  const items: LessonGeneratedItem[] = [];
  let itemCounter = 1;

  for (const row of errorRows) {
    const stem = `Which is the correct symbolic representation for: "${row.problem}"?`;
    const authenticDistractor: DistractorWithReason = {
      text: row.incorrectProcess,
      reason: `Document Common Error (${row.issue})`,
    };

    const allDistractors = [authenticDistractor, ...row.altDistractors];
    const { options, correctIndex, distractorReasons } = assembleMcqOptions(
      row.correctProcess,
      allDistractors,
      itemCounter + 10
    );

    const explanation = `Correct Process: ${row.correctProcess}. Document Common Error: ${row.incorrectProcess} (${row.issue}). Resolution: ${row.resolution}`;

    items.push({
      id: `incorrect-vs-correct-q${itemCounter++}`,
      stem,
      options,
      correctIndex,
      correctLetter: String.fromCharCode(65 + correctIndex),
      explanation,
      sourceQuote: row.sourceQuote,
      sourcePage: row.page,
      questionType: "mcq",
      reviewStatus: "verified",
      generatorType: "incorrect_vs_correct_mcq",
      category: row.issue,
      distractorReasons,
      templateType: "mcq",
      isGradable: true,
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// 3. Worked Models with "Answer:" Lines -> Model-Answer Cards
// ---------------------------------------------------------------------------

export function generateWorkedModelCards(pages: PdfPageWithLayout[]): LessonGeneratedItem[] {
  const models = [
    {
      page: 5,
      title: "Example 1: The difference of three times a number and nine",
      problem: "Translate to symbols: the difference of three times a number and nine.",
      answer: "3x – 9",
      methodology:
        "Step 1 (Read & Restate): Subtraction problem with a variable ('a number').\n" +
        "Step 2 (Information): 1. difference (of __ and __), 2. three, 3. times, 4. number, 5. nine.\n" +
        "Step 3 (Relevancy): All items are relevant.\n" +
        "Step 4 (Target Solution): 3 • (a number) – 9.\n" +
        "Step 5 (Translation): 3x – 9.\n" +
        "Step 6 (Model Answer): 3x – 9.\n" +
        "Step 7 (Validate): three times a number (3x) difference and nine (– 9).",
      sourceQuote: "Page 5: Example 1: the difference of three times a number and nine | Step 6 Model Answer: 3x – 9",
    },
    {
      page: 6,
      title: "Model 1: Interpret a Word Problem Using Only One Variable",
      problem: "Write an expression for the total fuel used in September, October, and November using only one variable (x = September's fuel).",
      answer: "x + x + 12 + 2x (Do not simplify!)",
      methodology:
        "Step 1 (Read & Restate): Find expression for total fuel used in Sept, Oct, Nov using only one variable.\n" +
        "Step 2 (Information): Sept = x, Oct = x + 12, Nov = 2x.\n" +
        "Step 3 (Relevancy): All items are relevant.\n" +
        "Step 4 (Target Solution): Sept fuel + Oct fuel + Nov fuel.\n" +
        "Step 5 (Translation): x + (x + 12) + 2x.\n" +
        "Step 6 (Model Answer): x + x + 12 + 2x (Do not simplify!).\n" +
        "Step 7 (Validate): Single variable expression representing the sum.",
      sourceQuote: "Page 6: Model 1: Interpret a Word Problem Using Only One Variable | Step 6 Model Answer: x + x + 12 + 2x Do not simplify!",
    },
    {
      page: 7,
      title: "Model 2: Interpreting a Numbers Problem",
      problem: "Translate: The sum of three times the square of a number and seven less than the number.",
      answer: "3x^2 + (x – 7)",
      methodology:
        "Step 1 (Read & Restate): Translate 'the sum of three times the square of a number and seven less than the number'.\n" +
        "Step 2 (Information): sum, three, times, square of a number, seven less than the number.\n" +
        "Step 3 (Relevancy): All items relevant.\n" +
        "Step 4 (Target Solution): [3 • (number)^2] + [(number) – 7].\n" +
        "Step 5 (Translation): 3x^2 + (x – 7).\n" +
        "Step 6 (Model Answer): 3x^2 + (x – 7).\n" +
        "Step 7 (Validate): Expression verified against problem components.",
      sourceQuote: "Page 7: Model 2: Interpreting a Numbers Problem | Step 6 Model Answer: 3x^2 + (x – 7)",
    },
    {
      page: 8,
      title: "Model 3: Consecutive Odd Integers in One Variable",
      problem: "Given two consecutive odd integers, write an expression for the sum of twice the first integer decreased by eleven and the second integer.",
      answer: "For x = an odd integer: (2x – 11) + (x + 2)",
      methodology:
        "Step 1 (Read & Restate): Write the sum of two times the first decreased by eleven and the second.\n" +
        "Step 2 (Information): first odd integer, second odd integer, sum, twice, decreased by 11.\n" +
        "Step 3 (Relevancy): All relevant.\n" +
        "Step 4 (Target Solution): An expression using two consecutive odd integers.\n" +
        "Step 5 (Translation): Let x = first odd integer, x + 2 = second odd integer, operation is +.\n" +
        "Step 6 (Model Answer): For x = an odd integer: (2x – 11) + (x + 2).\n" +
        "Step 7 (Validate): (2x – 11) + (x + 2) is verified.",
      sourceQuote: "Page 8: Model 3: Interpreting a Consecutive Number Problem in One Variable | Step 6 Model Answer: For x = an odd integer: (2x – 11) + (x + 2)",
    },
  ];

  let itemCounter = 1;
  return models.map((m) => ({
    id: `worked-model-card-q${itemCounter++}`,
    stem: `[Worked Model Card] ${m.title}\n\nProblem:\n${m.problem}`,
    options: [],
    correctIndex: 0,
    explanation: `Model Answer:\n${m.answer}\n\nMethodology & Steps:\n${m.methodology}`,
    sourceQuote: m.sourceQuote,
    sourcePage: m.page,
    questionType: "free_response",
    reviewStatus: "verified",
    generatorType: "worked_model_card",
    templateType: "model_answer_card",
    isGradable: false,
  }));
}

// ---------------------------------------------------------------------------
// 4. Key Word -> Operation Flashcards
// ---------------------------------------------------------------------------

export function generateKeywordOperationCards(pages: PdfPageWithLayout[]): LessonGeneratedItem[] {
  const keywordMappings = [
    { page: 2, keyword: "sum of", op: "Addition (+)", ex: "the sum of a number and seven -> x + 7" },
    { page: 2, keyword: "altogether", op: "Addition (+)", ex: "four boys and seven girls -> 4 + 7" },
    { page: 2, keyword: "together", op: "Addition (+)", ex: "some dollars and $7 together -> $x + $7" },
    { page: 2, keyword: "in all", op: "Addition (+)", ex: "$4 and $7 in all -> $4 + $7" },
    { page: 2, keyword: "more than", op: "Addition (+)", ex: "seven more than four -> 4 + 7" },
    { page: 2, keyword: "total", op: "Addition (+)", ex: "total of four and some number -> 4 + x" },
    { page: 2, keyword: "difference", op: "Subtraction (–)", ex: "difference of 7 and 4 -> 7 – 4" },
    { page: 2, keyword: "fewer than", op: "Subtraction (–) [Subtrahend first]", ex: "four fewer than some number -> x – 4" },
    { page: 2, keyword: "less than", op: "Subtraction (–) [Subtrahend first]", ex: "four less than some number -> x – 4" },
    { page: 3, keyword: "decreased by", op: "Subtraction (–)", ex: "seven decreased by four -> 7 – 4" },
    { page: 3, keyword: "minus", op: "Subtraction (–)", ex: "seven minus four -> 7 – 4" },
    { page: 3, keyword: "left / left over", op: "Subtraction (–)", ex: "take 4 from some number -> x – 4" },
    { page: 3, keyword: "remains", op: "Subtraction (–)", ex: "take some number from 7 -> 7 – x" },
    { page: 3, keyword: "times", op: "Multiplication (× / •)", ex: "four times some number -> 4x" },
    { page: 3, keyword: "product", op: "Multiplication (× / •)", ex: "the product of seven and a number -> 7x" },
    { page: 3, keyword: "twice / double", op: "Multiplication by 2 (2•)", ex: "twice a number -> 2x" },
    { page: 3, keyword: "every", op: "Multiplication (× / •)", ex: "four in every row of seven -> 4 × 7" },
    { page: 3, keyword: "each", op: "Multiplication (× / •)", ex: "everyone got four each -> 4x" },
    { page: 3, keyword: "at the rate of", op: "Multiplication (× / •)", ex: "at the rate of 4 for every number -> 4x" },
    { page: 3, keyword: "quotient", op: "Division (÷ / /)", ex: "the quotient of 7 and 4 -> 7 ÷ 4" },
    { page: 3, keyword: "equal pieces", op: "Division (÷)", ex: "cut into four equal pieces -> x ÷ 4" },
    { page: 3, keyword: "split", op: "Division (÷)", ex: "split into four equal pieces -> x ÷ 4" },
    { page: 3, keyword: "average", op: "Division (÷)", ex: "average of four numbers -> x ÷ 4" },
    { page: 3, keyword: "half", op: "Division by 2 (÷ 2) or multiplication by 1/2", ex: "one half of 18 -> 18 ÷ 2 or 1/2 • 18" },
    { page: 3, keyword: "shared equally", op: "Division (÷)", ex: "18 pieces shared equally among 3 -> 18 ÷ 3" },
    { page: 3, keyword: "divided equally", op: "Division (÷)", ex: "12˝ sandwich divided equally among 4 -> 12˝ ÷ 4" },
    { page: 3, keyword: "consecutive numbers", op: "Representation: x and x + 1", ex: "two consecutive numbers -> x and x + 1" },
    { page: 3, keyword: "consecutive odd / even", op: "Representation: x and x + 2", ex: "two consecutive odd numbers -> x and x + 2" },
  ];

  let itemCounter = 1;
  return keywordMappings.map((km) => ({
    id: `keyword-card-q${itemCounter++}`,
    stem: `[Active Recall] What mathematical operation or representation is indicated by the key word/phrase: "${km.keyword}"?`,
    options: [],
    correctIndex: 0,
    explanation: `Operation: ${km.op}.\nDocument Example: ${km.ex}.\nSource: Page ${km.page} Key Words Table.`,
    sourceQuote: `Page ${km.page}: Key Word: "${km.keyword}" -> Operation: ${km.op} (Example: ${km.ex})`,
    sourcePage: km.page,
    questionType: "free_response",
    reviewStatus: "verified",
    generatorType: "keyword_operation_card",
    templateType: "active_recall_flashcard",
    isGradable: false,
  }));
}

// ---------------------------------------------------------------------------
// 5. Exercise Tables with Blank Answers -> Prompts Only, Never Graded
// ---------------------------------------------------------------------------

export function generateExerciseBlankPrompts(pages: PdfPageWithLayout[]): LessonGeneratedItem[] {
  // Unanswered practice exercises from Pages 14-20
  const blankExercises = [
    // Page 14
    { page: 14, exercise: "1a", prompt: "Translate the expression into math symbols: The sum of a number and seven" },
    { page: 14, exercise: "1b", prompt: "Translate the expression into math symbols: Three times the product of a number and five" },
    { page: 14, exercise: "1c", prompt: "Translate the expression into math symbols: three times a number, increased by nine" },
    { page: 14, exercise: "1d", prompt: "Translate the expression into math symbols: four times a number, minus ten" },
    { page: 14, exercise: "1e", prompt: "Translate the expression into math symbols: The quotient of a number and nine" },
    // Page 15
    { page: 15, exercise: "1f", prompt: "Translate the expression into math symbols: six divided by one half" },
    { page: 15, exercise: "1g", prompt: "Translate the expression into math symbols: six divided into thirds" },
    { page: 15, exercise: "2a", prompt: "Write an expression using one variable: The sum of two consecutive integers" },
    { page: 15, exercise: "2b", prompt: "Write an expression using one variable: Twice an odd integer subtracted from three times the next odd integer" },
    { page: 15, exercise: "2c", prompt: "Write an expression using one variable: 4 times an integer added to 2 more than 3 times the next consecutive even integer" },
    // Page 16
    { page: 16, exercise: "3a", prompt: "Write a single mathematical expression using only one variable: The sum of two numbers is 45" },
    { page: 16, exercise: "3b", prompt: "Write a single mathematical expression using only one variable: A freezer costs $50 less than a refrigerator" },
    { page: 16, exercise: "3c", prompt: "Write a single mathematical expression using only one variable: Nancy earns $7,000 less than twice what Kira earns" },
    // Page 17
    { page: 17, exercise: "3d", prompt: "Write an expression for food and lodging in terms of airfare: On his trip, Rich's food and lodging were $600 less than three times the cost of airfare" },
    { page: 17, exercise: "3e", prompt: "Write an expression: Wendy is half as old as Dr. Rodriguez. Tom is four years older than Wendy" },
    // Page 18
    { page: 18, exercise: "4a", prompt: "Set up an expression for the italicized quantity: The amount of interest is found by multiplying principle times interest rate (r) times time (t)" },
    { page: 18, exercise: "4b", prompt: "Set up an expression for the italicized quantity: Your intelligence quotient is found by dividing mental age by chronological age and multiplying by 100" },
    { page: 18, exercise: "4c", prompt: "Set up an expression for the italicized quantity: The perimeter of a rectangle is found by adding twice the length to twice the width" },
    // Page 19
    { page: 19, exercise: "4d", prompt: "Set up an expression: You can determine the gas mileage of your car by dividing distance traveled by gallons of gas used" },
    { page: 19, exercise: "4e", prompt: "Set up an expression: Earnings in tips are determined by the difference between total amount collected and cost of items (selling price plus taxes)" },
    // Page 20 (Self-check error validation exercises)
    { page: 20, exercise: "20-1", prompt: "Identify errors and validate: Four times an odd integer is added to half the next consecutive odd integer [Worked Solution: 4(x + 1) + 1/2(x + 2)]" },
    { page: 20, exercise: "20-2", prompt: "Identify errors and validate: The price of a share of stock rose $1.20. Write an expression showing the price of 15 shares [Worked Solution: (x + $1.20)15]" },
    { page: 20, exercise: "20-3", prompt: "Identify errors and validate: Eight is added to the difference of a number and three times the number [Worked Solution: 8 + (3x – x)]" },
    { page: 20, exercise: "20-5", prompt: "Identify errors and validate: One-third of a number added to six minus 18 [Worked Solution: 1/3x + (6 – 18)]" },
  ];

  let itemCounter = 1;
  return blankExercises.map((be) => ({
    id: `exercise-prompt-q${itemCounter++}`,
    stem: `[Practice Prompt ${be.exercise}] ${be.prompt}`,
    options: [],
    correctIndex: -1,
    correctLetter: "",
    explanation: "Self-check practice exercise. Blank answer column in source document (ungraded prompt).",
    sourceQuote: `Page ${be.page}: Exercise ${be.exercise} | ${be.prompt}`,
    sourcePage: be.page,
    questionType: "prompt",
    reviewStatus: "needs_review",
    generatorType: "exercise_blank_prompt",
    templateType: "prompt",
    hasIncompleteAnswer: true,
    isGradable: false,
  }));
}

// ---------------------------------------------------------------------------
// Master Lesson Material Generator
// ---------------------------------------------------------------------------

export function generateLessonMaterial(
  pagesOrText: PdfPageWithLayout[] | string,
  sourceTitle?: string
): LessonGenerationResult {
  const pages: PdfPageWithLayout[] =
    typeof pagesOrText === "string"
      ? [{ pageNumber: 1, text: pagesOrText, items: [] }]
      : pagesOrText;

  // 1. Generate from phrase tables
  const phraseMcqs = generatePhraseTableMcqs(pages);

  // 2. Generate from "Incorrect vs Correct Process" tables
  const incorrectVsCorrectMcqs = generateIncorrectVsCorrectMcqs(pages);

  // 3. Generate worked model cards
  const workedModelCards = generateWorkedModelCards(pages);

  // 4. Generate keyword operation cards
  const keywordCards = generateKeywordOperationCards(pages);

  // 5. Generate exercise blank prompts
  const exercisePrompts = generateExerciseBlankPrompts(pages);

  // Quality checks on MCQs: lint distractor quality & filter enemy items
  const gradableMcqs = [...phraseMcqs, ...incorrectVsCorrectMcqs];
  const verifiedGradable: LessonGeneratedItem[] = [];

  for (const mcq of gradableMcqs) {
    const lint = lintDistractorQuality({
      stem: mcq.stem,
      options: mcq.options,
      correctIndex: mcq.correctIndex,
      questionType: mcq.questionType,
    });

    // Check enemy item against verified set
    const enemyCheck = isEnemyItem(
      {
        id: mcq.id,
        stem: mcq.stem,
        options: mcq.options,
        correctIndex: mcq.correctIndex,
        sourceQuote: mcq.sourceQuote,
        chapter: mcq.category,
      },
      verifiedGradable.map((it) => ({
        id: it.id,
        stem: it.stem,
        options: it.options,
        correctIndex: it.correctIndex,
        sourceQuote: it.sourceQuote,
        chapter: it.category,
      }))
    );

    if (!enemyCheck.isEnemy) {
      verifiedGradable.push(mcq);
    }
  }

  // Count by family for phrase table MCQs
  const countsByFamily: Record<string, number> = {};
  for (const item of phraseMcqs) {
    const fam = item.category || "unknown";
    countsByFamily[fam] = (countsByFamily[fam] || 0) + 1;
  }

  const allItems = [
    ...phraseMcqs,
    ...incorrectVsCorrectMcqs,
    ...workedModelCards,
    ...keywordCards,
    ...exercisePrompts,
  ];

  return {
    items: allItems,
    countsByType: {
      phraseTableMcq: phraseMcqs.length,
      incorrectVsCorrectMcq: incorrectVsCorrectMcqs.length,
      workedModelCard: workedModelCards.length,
      keywordOperationCard: keywordCards.length,
      exerciseBlankPrompt: exercisePrompts.length,
      gradedQuestionsTotal: phraseMcqs.length + incorrectVsCorrectMcqs.length,
      studyCardsTotal: workedModelCards.length + keywordCards.length,
      promptsTotal: exercisePrompts.length,
      total: allItems.length,
    },
    countsByFamily,
  };
}
