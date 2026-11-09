// ============================================
// PDF QUESTION IMPORTER - Zero-Cost Rule-Based Q&A Extractor
// Extracts full exam questions and answer keys directly from test-prep PDFs
// (e.g. 1001 Math Problems, 501 Math Word Problems, GRE/SAT review books, board exams)
// Supports ParserProfiles, frequency-based header/footer detection, and diagnostic audit
// $0 AI Cost · Instant Processing · 100% Deterministic Fidelity
// ============================================

import { Question, Flashcard, generateUUID } from "./examService";
import { sanitizeCurrencyAndMath } from "./examParser";
import { PdfLayoutItem, PdfPageWithLayout } from "./pdfService";
import { QuestionReviewStatus, StoredQuestion } from "./questionBankService";
import {
  lintDistractorQuality,
  generateNumericDistractors,
  generateSiblingTermDistractors,
  DistractorLintResult,
  classifyNumberContext,
  NumberSubtype,
  filterEnemyItems,
  isEnemyItem,
  assertNoStemLeaksOrOptionClashes,
  NUMBER_WORD_TO_DIGIT,
  DIGIT_TO_NUMBER_WORD,
} from "./distractorQualityService";

export type AnswerKeyLocation = "inline" | "end_of_chapter" | "end_of_book" | "separate_page";
export type ChoiceStyle = "letter_dot" | "letter_paren" | "paren_letter" | "bracket_letter" | "mixed";

export interface ParserProfile {
  id: string;
  name: string;
  description: string;
  headingPattern: RegExp;
  keyLocation: AnswerKeyLocation;
  choiceStyle: ChoiceStyle;
  expectedChoicesPerItem?: number;
  endMarkers: RegExp[];
}

export interface ProfileDetectionResult {
  profile: ParserProfile;
  confidence: number; // 0 - 100
  summary: string;
  detectedHeadingPattern?: string;
  detectedKeyLocation: AnswerKeyLocation;
  detectedChoiceStyle: ChoiceStyle;
  estimatedItemCount: number;
}

export interface ImporterThresholdConfig {
  minStemLengthStandard: number;
  minStemLengthMath: number;
  maxStemLength: number;
  minOptionsCount: number;
  maxOptionsCount: number;
  maxOptionLength: number;
  frequencyHeaderMinPages: number;
  frequencyHeaderRatio: number;
}

export const DEFAULT_IMPORTER_CONFIG: ImporterThresholdConfig = {
  minStemLengthStandard: 15,
  minStemLengthMath: 5,
  maxStemLength: 3000,
  minOptionsCount: 2,
  maxOptionsCount: 5,
  maxOptionLength: 500,
  frequencyHeaderMinPages: 3,
  frequencyHeaderRatio: 0.15,
};

export type QuestionType = "mcq" | "free_response";

export interface ParsedQaItem {
  id: string;
  number: number;
  stem: string;
  options: string[];
  correctLetter?: string; // 'a' | 'b' | 'c' | 'd' | 'e'
  correctIndex: number; // 0, 1, 2, 3, 4
  explanation: string;
  chapter?: string;
  pageNumber?: number;
  sourcePage?: number;
  sourceQuote?: string;
  questionType?: QuestionType;
  hasIncompleteAnswer?: boolean;
  isSuspicious?: boolean;
  suspiciousReasons?: string[];
  reviewStatus?: QuestionReviewStatus;
  templateType?: string;
}

export interface ParseTwoPassResult {
  items: ParsedQaItem[];
  missingQuestionNumbers: number[];
  chaptersDetected: string[];
  suspiciousCount: number;
  totalExpected?: number;
  profileUsed?: ParserProfile;
  repeatingHeadersStripped?: string[];
  isUnstructuredDocument?: boolean;
  notesRoute?: boolean;
  coverageSummary?: string;
  totalSupported?: number;
  flashcardCount?: number;
  mcqCount?: number;
  templateCounts?: Record<string, number>;
}

// ============================================
// PREDEFINED PARSER PROFILES
// ============================================

export const PROFILE_STANDARD_TWO_PASS: ParserProfile = {
  id: "standard_two_pass",
  name: "Standard Chapter Q&A (Two-Pass)",
  description: "Numbered chapters or sections with questions followed by chapter-end or section-end answers",
  headingPattern: /^(?:Chapter\s+(\d+|[IVXLCDM]+)|SECTION\s+(\d+|[IVXLCDM]+)|PART\s+(\d+|[IVXLCDM]+))\b[^\n]*/i,
  keyLocation: "end_of_chapter",
  choiceStyle: "letter_dot",
  expectedChoicesPerItem: 4,
  endMarkers: [/^(?:Answers\s+and\s+Explanations|Answers\s+&\s+Explanations|Answer\s+Explanations|Answers|Solutions|Answer\s+Key)\b/i],
};

export const PROFILE_FREE_RESPONSE: ParserProfile = {
  id: "free_response",
  name: "Free-Response Practice (End-of-Book Key)",
  description: "Numbered problem statements without multiple-choice options, followed by an answer key with numerical/text solutions",
  headingPattern: /^(?:Practice\s*[-–—]?\s*[\w\s]+|Exercise\s+(\d+|[IVXLCDM]+)|Section\s+(\d+|[IVXLCDM]+)|\d+\.\d+\b)[^\n]*/i,
  keyLocation: "end_of_book",
  choiceStyle: "mixed",
  expectedChoicesPerItem: 0,
  endMarkers: [/^(?:(?:\d+\.\d+\s+)?Answers\s*[-–—]?\s*[\w\s]+|Answer\s+Key)\b/i],
};

export const PROFILE_1001_MATH: ParserProfile = {
  id: "1001_math_problems",
  name: "1001 Math Problems (LearningExpress Style)",
  description: "Numbered sections and chapters with mixed letter-dot/paren choices and detailed answer explanations",
  headingPattern: /^(?:SECTION\s+(\d+):?\s*[A-Za-z\s\-]+|CHAPTER\s+(\d+):?\s*[A-Za-z\s\-]+|Set\s+(\d+))\b/i,
  keyLocation: "end_of_book",
  choiceStyle: "mixed",
  expectedChoicesPerItem: 4,
  endMarkers: [
    /^(?:Answers\s+and\s+Explanations|Answer\s+Explanations|Answers)\b/i,
    /^Set\s+\d+\s*\(Page\s+\d+\)/i,
  ],
};

export const PROFILE_INLINE_KEYS: ParserProfile = {
  id: "inline_answer_key",
  name: "Inline Answer Keys",
  description: "Each question statement and choices are immediately followed by an inline Answer key and Explanation",
  headingPattern: /^(?:Chapter\s+(\d+|[IVXLCDM]+)|SECTION\s+(\d+|[IVXLCDM]+)|Topic:\s+[\w\s]+)\b[^\n]*/i,
  keyLocation: "inline",
  choiceStyle: "letter_dot",
  expectedChoicesPerItem: 4,
  endMarkers: [],
};

export const PROFILE_PAREN_5_CHOICE: ParserProfile = {
  id: "paren_5_choice",
  name: "5-Choice Parenthesized (A-E)",
  description: "Items with choices (A) through (E) and condensed end-of-book answer grid",
  headingPattern: /^(?:Test\s+(\d+)|Section\s+(\d+)|Part\s+([A-Z]))\b[^\n]*/i,
  keyLocation: "end_of_book",
  choiceStyle: "paren_letter",
  expectedChoicesPerItem: 5,
  endMarkers: [/^(?:Answer\s+Key|Answers)\b/i],
};

export const PROFILE_CONDENSED_GRID: ParserProfile = {
  id: "condensed_grid",
  name: "Condensed Answer Grid (1. A  2. B  3. C)",
  description: "Standard questions with tabular or rapid sequence answer key",
  headingPattern: /^(?:Exam|Practice\s+Test|Chapter\s+(\d+))\b[^\n]*/i,
  keyLocation: "end_of_book",
  choiceStyle: "letter_dot",
  expectedChoicesPerItem: 4,
  endMarkers: [/^(?:Answers|Answer\s+Key)\b/i],
};

export const SAVED_PARSER_PROFILES: Record<string, ParserProfile> = {
  standard_two_pass: PROFILE_STANDARD_TWO_PASS,
  free_response: PROFILE_FREE_RESPONSE,
  "1001_math_problems": PROFILE_1001_MATH,
  inline_answer_key: PROFILE_INLINE_KEYS,
  paren_5_choice: PROFILE_PAREN_5_CHOICE,
  condensed_grid: PROFILE_CONDENSED_GRID,
};

// ============================================
// GENERIC PUBLISHER BOILERPLATE PATTERNS
// (Generic regex - no specific publisher names hardcoded)
// ============================================
const GENERIC_PUBLISHER_BOILERPLATE = [
  /(?:Library of Congress Cataloging-in-Publication Data|Cataloging-in-Publication Data)[\s\S]*?(?=\n\s*\n|\n\d+\.|$)/gi,
  /(?:^|\n)\s*ISBN[^\n]*(?=\n|$)/gi,
  /(?:^|\n)\s*(?:All rights reserved\.?|Printed in [A-Za-z\s]+|Manufactured in [A-Za-z\s]+|Printed on acid-free paper\.?|licensed under a Creative Commons|Attribution\s+\d+\.\d+\s+Unported|http:\/\/creativecommons\.org)\b[^\n]*/gi,
  /(?:^|\n)\s*(?:For more information (?:or to order|about)|Visit (?:us at )?www\.[\w\.\-]+\.\w+|Also available at your local bookstore|Prices subject to change without notice|To Order:\s*Call\s*[\d\-]+)\b[^\n]*/gi,
  /(?:^|\n)\s*(?:Achieve Test Success|Master the Basics|Give Yourself The [A-Za-z\s]+ Advantage)\b[\s\S]*?(?=\n\s*\n|\n\d+\.|$)/gi,
  /(?:^|\n)\s*(?:Copyright\s+(?:©|\(c\)|[0-9]{4})|©\s*[0-9]{4})\s+[\w\s,\.\-]+(?=\n|$)/gi,
  /(?:^|\n)\s*\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s*(?=\n|$)/g, // printing number lines
];

export const ENGLISH_NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
};

/**
 * Parses single or compound English number words: e.g. "forty-five" -> 45, "twenty-five" -> 25, "ten" -> 10.
 */
export function parseEnglishNumberWords(wordStr: string): number | null {
  if (!wordStr) return null;
  const cleaned = wordStr.trim().toLowerCase().replace(/\s+/g, "-");
  if (ENGLISH_NUMBER_WORDS[cleaned] !== undefined) {
    return ENGLISH_NUMBER_WORDS[cleaned];
  }

  const parts = cleaned.split(/[\-\s]+/);
  if (parts.length === 2) {
    const tens = ENGLISH_NUMBER_WORDS[parts[0]];
    const units = ENGLISH_NUMBER_WORDS[parts[1]];
    if (tens !== undefined && units !== undefined && tens >= 20 && units < 10) {
      return tens + units;
    }
  }

  return null;
}

/**
 * Strips page numbers and footnote numbers glued to words at page breaks or line ends:
 * e.g. "the 5present" -> "the present", "How 6many" -> "How many", "offense.27" -> "offense.".
 */
export function stripGluedPageNumbers(text: string): string {
  if (!text) return "";
  return text
    // Footnote digits glued after sentence punctuation following a word: "offense.27" -> "offense."
    .replace(/\b([a-zA-Z]{2,}[\.\?!])(\d{1,3})(?=\s*[\n\r]|\s+[A-Z]|$)/g, "$1")
    // "the5present" (glued with no spaces) -> "$1 $3"
    .replace(/\b([a-zA-Z]{2,})(\d{1,3})([a-zA-Z]{2,})\b/g, "$1 $3")
    // "the 5present" or "How 6many" -> "$1 $3" (digit glued to following word)
    .replace(/\b(the|how|in|find|of|at|to|a|an|from|with|by|as|is|are|was|were)\s+(\d{1,3})([a-zA-Z]{3,})\b/gi, "$1 $3");
}

/**
 * Trims stray leading list markers, bullets, and letter prefixes: e.g. "(g) ", "- ", "• ", "1. ", "(2) "
 */
export function trimStemPrefix(text: string): string {
  if (!text) return "";
  let res = text.trim();
  while (/^(?:[-–—•\*]|\([a-zA-Z0-9]+\)|\b[a-zA-Z0-9]+[\.\)])\s+/.test(res)) {
    res = res.replace(/^(?:[-–—•\*]|\([a-zA-Z0-9]+\)|\b[a-zA-Z0-9]+[\.\)])\s+/, "").trim();
  }
  return res;
}

/**
 * Consistency check for "word (numeral)" pairs:
 * Handles compound numbers ("forty-five" -> 45) and catches unclosed parentheses (e.g. "ten (100 working days").
 */
export function checkWordNumeralConsistency(
  word: string,
  numeral: number,
  isUnclosedParenthesis: boolean = false
): { isConsistent: boolean; reason?: string } {
  const normWord = (word || "").trim().toLowerCase();
  const expected = parseEnglishNumberWords(normWord);

  if (isUnclosedParenthesis) {
    if (expected !== null && expected !== numeral) {
      return {
        isConsistent: false,
        reason: `Number mismatch and unclosed parenthesis: word "${word}" (${expected}) disagrees with numeral (${numeral})`,
      };
    }
    return {
      isConsistent: false,
      reason: `Unclosed parenthesis in numeral expression: "${word} (${numeral}"`,
    };
  }

  if (expected === null) {
    // Preceding word is not a standard English number (e.g. "Co-Chairman (2)" or "months (6)") -> ignore
    return { isConsistent: true };
  }

  if (expected !== numeral) {
    return {
      isConsistent: false,
      reason: `Number mismatch: word "${word}" (${expected}) disagrees with numeral (${numeral})`,
    };
  }
  return { isConsistent: true };
}

/**
 * Returns true if a line should be excluded from candidate running headers/footers
 * because it contains legitimate pedagogical directions, numbered questions/steps, or full sentences.
 */
export function isExcludedFromHeaderFooter(line: string): boolean {
  if (!line || line.length < 2) return true;
  // 1. Instructions and pedagogical directions are real content, not running headers
  if (/^(?:Directions|Instructions|Notice|Note|Read\s+the|Choose\s+the|Select\s+the|Solve\s+the|Answer\s+the)\b/i.test(line)) {
    return true;
  }
  // 2. Numbered questions, steps, examples, or choices
  if (/^(?:(?:\d{1,4}|[a-eA-E])[\.\)\:]|Question\s+\d+|Problem\s+\d+|Step\s+\d+|Example\s+\d+)(?:\s+|$)/i.test(line)) {
    return true;
  }
  // 3. Full explanatory sentences ending in punctuation
  if (line.length > 25 && /[\.\?!]["']?$/.test(line.trim())) {
    return true;
  }
  return false;
}

/**
 * Compares multi-value or single-value answers order-insensitively,
 * handling commas, spaces, and punctuation: e.g. "6, 16" matches "16, 6" or "12,20" matches "12, 20".
 */
export function compareAnswersOrderInsensitive(ans1: string, ans2: string): boolean {
  if (!ans1 && !ans2) return true;
  if (!ans1 || !ans2) return false;

  const normalizeTokens = (s: string) =>
    s
      .toLowerCase()
      .split(/[,;\s]+/)
      .map((t) => t.trim().replace(/^[\(\[]|[\)\]\.]$/g, ""))
      .filter((t) => t.length > 0)
      .sort();

  const tokens1 = normalizeTokens(ans1);
  const tokens2 = normalizeTokens(ans2);

  if (tokens1.length !== tokens2.length) return false;
  return tokens1.every((t, i) => t === tokens2[i]);
}

/**
 * Normalizes a candidate line for frequency analysis:
 * Strips margin page numbers, en-dashes, and collapses whitespace.
 */
export function normalizeLineForFrequency(line: string): string {
  if (!line) return "";
  return line
    .replace(/^\s*\d{1,4}\s*[-–—|:]*\s*/, "") // strip leading page number
    .replace(/\s*[-–—|:]*\s*\d{1,4}\s*$/, "") // strip trailing page number
    .replace(/^[-–—\s]+|[-–—\s]+$/g, "") // strip leading/trailing dashes
    .trim()
    .toLowerCase();
}

/**
 * Frequency-based detection of repeating running headers and footers.
 * Analyzes lines across pages and identifies any line that repeats on >= N pages
 * or >= frequencyHeaderRatio of the document, completely independent of text content.
 */
export function findRepeatingHeadersAndFooters(
  pages: PdfPageWithLayout[] | string[],
  config: ImporterThresholdConfig = DEFAULT_IMPORTER_CONFIG
): Set<string> {
  const repeatingSet = new Set<string>();
  const pageCount = pages.length;
  if (pageCount < 2) return repeatingSet;

  const minPagesThreshold = Math.max(
    config.frequencyHeaderMinPages,
    Math.ceil(pageCount * config.frequencyHeaderRatio)
  );

  const linePageOccurrences = new Map<string, Set<number>>();

  for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
    const pageItem = pages[pageIdx];
    const rawText = typeof pageItem === "string" ? pageItem : pageItem.text || "";
    const lines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.length > 2);

    // Examine lines strictly at outer margins (first 2 lines and last 2 lines of the page)
    const topLines = lines.slice(0, 2);
    const bottomLines = lines.slice(Math.max(0, lines.length - 2));
    const candidateLines = Array.from(new Set([...topLines, ...bottomLines]));

    for (const line of candidateLines) {
      // Exclude pedagogical directions, numbered questions/steps, and full sentences
      if (isExcludedFromHeaderFooter(line)) continue;

      const norm = normalizeLineForFrequency(line);
      if (norm.length >= 3) {
        if (!linePageOccurrences.has(norm)) {
          linePageOccurrences.set(norm, new Set<number>());
        }
        linePageOccurrences.get(norm)!.add(pageIdx);
      }
    }
  }

  for (const [normLine, pageSet] of linePageOccurrences.entries()) {
    if (pageSet.size >= minPagesThreshold) {
      repeatingSet.add(normLine);
    }
  }

  return repeatingSet;
}

/**
 * Normalizes unicode ligatures, running headers, catalog text, and currency symbols.
 * Accepts an optional Set of frequency-detected repeating header strings.
 */
export function cleanPageText(rawText: string, repeatingHeaders?: Set<string>): string {
  if (!rawText) return "";

  let cleaned = rawText
    // Unicode ligatures
    .replace(/\uFB01/g, "fi")
    .replace(/\uFB02/g, "fl")
    .replace(/\uFB00/g, "ff")
    .replace(/\uFB03/g, "ffi")
    .replace(/\uFB04/g, "ffl")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    // Windows CRLF
    .replace(/\r\n/g, "\n")
    // Join line-end hyphenated words across line breaks (e.g. "forty-\nfive" -> "forty-five")
    .replace(/([a-zA-Z]+)-\s*[\r\n]+\s*([a-zA-Z]+)/g, "$1-$2");

  // Strip generic publisher and catalog boilerplate
  for (const pattern of GENERIC_PUBLISHER_BOILERPLATE) {
    cleaned = cleaned.replace(pattern, "\n");
  }

  // Strip generic page number lines
  cleaned = cleaned
    .replace(/(?:^|\n)\s*(?:Page\s+\d+(?:\s+of\s+\d+)?|\d+\s*\|\s*Page)\s*(?=\n|$)/gi, "\n")
    .replace(/(?:^|\n)\s*\d{1,3}\s*(?=\n\s*\[Page|\s*$)/g, "\n");

  // Strip generic running headers/footers with section names and page numbers
  cleaned = cleaned
    .replace(/(?:^|\n)\s*[-–—]\s*[A-Z\s]{3,}\s*[-–—]\s*(?:\n\s*\d{1,4})?\s*(?=\n|$)/gi, "\n")
    .replace(/(?:^|\n)\s*\d{1,4}\s*[-–—]\s*[A-Z\s]{3,}\s*[-–—]\s*(?=\n|$)/gi, "\n")
    .replace(/(?:^|\n)\s*[-–—]\s*(?:GEOMETRY|ALGEBRA|DECIMALS|FRACTIONS|PERCENTAGES|MISCELLANEOUS\s+MATH|ANSWERS|NOTES)[-–—\s]*(?=\n|$)/gi, "\n");

  // Strip glued page numbers and footnote numbers at breaks
  cleaned = stripGluedPageNumbers(cleaned);

  // If frequency-detected repeating headers are provided, strip matching lines
  if (repeatingHeaders && repeatingHeaders.size > 0) {
    const lines = cleaned.split("\n");
    const filteredLines = lines.filter((line) => {
      const norm = normalizeLineForFrequency(line);
      return !repeatingHeaders.has(norm);
    });
    cleaned = filteredLines.join("\n");
  }

  // Sanitize dollar signs to prevent KaTeX math collision
  return sanitizeCurrencyAndMath(cleaned);
}

/**
 * Strips residual catalog or running header artifacts from an individual string.
 */
export function sanitizeContentText(text: string, repeatingHeaders?: Set<string>): string {
  if (!text) return "";
  let res = text
    .replace(/\[Page\s+\d+\]/gi, "")
    .replace(/Library of Congress[\s\S]*/gi, "")
    .replace(/ISBN(?:-1[03])?:?\s*[\d\-X]+/gi, "")
    .replace(/All rights reserved[\s\S]*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (repeatingHeaders && repeatingHeaders.size > 0) {
    const lines = res.split("\n");
    res = lines
      .filter((l) => !repeatingHeaders.has(normalizeLineForFrequency(l)))
      .join("\n")
      .trim();
  }

  return res;
}

/**
 * Reconstructs stacked fractions from 2D text coordinates.
 */
export function reconstructStackedFractions(items: PdfLayoutItem[]): string {
  if (!items || items.length === 0) return "";

  // Sort items primarily by descending Y (top of page to bottom), then ascending X
  const sorted = [...items].sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > 3) return yDiff;
    return a.x - b.x;
  });

  const processed = new Set<number>();
  let result = "";

  for (let i = 0; i < sorted.length; i++) {
    if (processed.has(i)) continue;

    const current = sorted[i];
    const curStr = (current.str || "").trim();

    if (/^\d{1,3}$/.test(curStr) && i + 1 < sorted.length) {
      let foundDenominator = false;
      for (let j = i + 1; j < Math.min(i + 8, sorted.length); j++) {
        if (processed.has(j)) continue;
        const candidate = sorted[j];
        const candStr = (candidate.str || "").trim();

        const verticalGap = current.y - candidate.y;
        const xOverlap = Math.abs(current.x - candidate.x) < Math.max(current.width, candidate.width, 10);

        if (verticalGap > 2 && verticalGap < 20 && xOverlap && /^\d{1,3}$/.test(candStr)) {
          result += ` $\\frac{${curStr}}{${candStr}}$ `;
          processed.add(i);
          processed.add(j);
          foundDenominator = true;
          break;
        }
      }

      if (foundDenominator) continue;
    }

    processed.add(i);
    result += current.str + (current.hasEOL ? "\n" : " ");
  }

  return result
    .replace(/½/g, "$\\frac{1}{2}$")
    .replace(/⅓/g, "$\\frac{1}{3}$")
    .replace(/⅔/g, "$\\frac{2}{3}$")
    .replace(/¼/g, "$\\frac{1}{4}$")
    .replace(/¾/g, "$\\frac{3}{4}$")
    .replace(/⅕/g, "$\\frac{1}{5}$")
    .replace(/⅖/g, "$\\frac{2}{5}$")
    .replace(/⅗/g, "$\\frac{3}{5}$")
    .replace(/⅘/g, "$\\frac{4}{5}$")
    .replace(/⅙/g, "$\\frac{1}{6}$")
    .replace(/⅚/g, "$\\frac{5}{6}$")
    .replace(/⅛/g, "$\\frac{1}{8}$")
    .replace(/⅜/g, "$\\frac{3}{8}$")
    .replace(/⅝/g, "$\\frac{5}{8}$")
    .replace(/⅞/g, "$\\frac{7}{8}$");
}

/**
 * Detects if a document has high likelihood of being a structured Q&A exam review book.
 */
export function detectQaBookLikelihood(text: string): {
  isLikelyQa: boolean;
  estimatedQuestionCount: number;
  sampleConfidence: number;
} {
  if (!text || text.length < 100) {
    return { isLikelyQa: false, estimatedQuestionCount: 0, sampleConfidence: 0 };
  }

  const questionMatches = text.match(/(?:^|\n)\s*(\d{1,4})[\.\)]\s+[A-Z]/g) || [];
  const optionMatches = text.match(/(?:^|\n)\s*[a-eA-E][\.\)]\s+/g) || [];
  const answerSectionMatches = text.match(/(?:Answers|Answer Explanations|Solutions|Answer Key)/gi) || [];

  const estimatedQuestionCount = questionMatches.length;
  const optionDensity = optionMatches.length;

  const isLikelyQa =
    (estimatedQuestionCount >= 3 && optionDensity >= 4) ||
    (answerSectionMatches.length > 0 && estimatedQuestionCount >= 1) ||
    (estimatedQuestionCount >= 5);

  const sampleConfidence = Math.min(
    100,
    Math.round(estimatedQuestionCount * 2 + optionDensity * 1 + answerSectionMatches.length * 15)
  );

  return {
    isLikelyQa,
    estimatedQuestionCount,
    sampleConfidence,
  };
}

/**
 * Auto-detects the optimal ParserProfile for a document by sampling question styles,
 * answer key placements, and section heading formats.
 */
export function detectParserProfile(pagesOrText: PdfPageWithLayout[] | string): ProfileDetectionResult {
  let sampleText = "";
  if (Array.isArray(pagesOrText)) {
    // Sample first 15 pages and last 15 pages
    const samplePages = [
      ...pagesOrText.slice(0, 15),
      ...pagesOrText.slice(Math.max(0, pagesOrText.length - 15)),
    ];
    sampleText = samplePages.map((p) => (typeof p === "string" ? p : p.text || "")).join("\n");
  } else {
    sampleText = pagesOrText.slice(0, 50000);
  }

  // 1. Detect Choice Style
  const letterDotCount = (sampleText.match(/(?:^|\n|\s{2,})[a-eA-E]\.\s+/g) || []).length;
  const parenLetterCount = (sampleText.match(/(?:^|\n|\s{2,})\([a-eA-E]\)\s+/g) || []).length;
  const letterParenCount = (sampleText.match(/(?:^|\n|\s{2,})[a-eA-E]\)\s+/g) || []).length;
  const bracketLetterCount = (sampleText.match(/(?:^|\n|\s{2,})\[[a-eA-E]\]\s+/g) || []).length;

  let detectedChoiceStyle: ChoiceStyle = "letter_dot";
  let maxStyleCount = letterDotCount;

  if (parenLetterCount > maxStyleCount) {
    detectedChoiceStyle = "paren_letter";
    maxStyleCount = parenLetterCount;
  }
  if (letterParenCount > maxStyleCount) {
    detectedChoiceStyle = "letter_paren";
    maxStyleCount = letterParenCount;
  }
  if (bracketLetterCount > maxStyleCount) {
    detectedChoiceStyle = "bracket_letter";
    maxStyleCount = bracketLetterCount;
  }
  if (letterDotCount > 5 && letterParenCount > 5) {
    detectedChoiceStyle = "mixed";
  }

  // 2. Detect 5-choice prevalence
  const eChoiceCount = (sampleText.match(/(?:^|\n|\s+)(?:\([eE]\)|[eE][\.\)\]])\s+/g) || []).length;
  const questionNumberCount = (sampleText.match(/(?:^|\n)\s*\d{1,4}[\.\)]\s+/g) || []).length;
  const expectedChoicesPerItem = (eChoiceCount >= 2 || (eChoiceCount > 0 && eChoiceCount >= questionNumberCount * 0.3)) ? 5 : 4;

  // 3. Detect Answer Key Location
  const inlineAnswerMatches = (sampleText.match(/(?:^|\n)\s*(?:Answer|Ans|Correct Answer)\s*:\s*[a-eA-E]\b/gi) || []).length;
  const answerSectionMatches = (sampleText.match(/^(?:Answers\s+and\s+Explanations|Answers\s+&\s+Explanations|Answer\s+Explanations|Answers|Solutions|Answer\s+Key)\b/gim) || []).length;

  let detectedKeyLocation: AnswerKeyLocation = "end_of_chapter";
  if (inlineAnswerMatches >= 4) {
    detectedKeyLocation = "inline";
  } else if (answerSectionMatches === 1) {
    detectedKeyLocation = "end_of_book";
  } else if (answerSectionMatches > 1) {
    detectedKeyLocation = "end_of_chapter";
  }

  // 4. Detect Heading Pattern
  let headingPattern = PROFILE_STANDARD_TWO_PASS.headingPattern;
  let detectedHeading = "Chapter \\d+ / Section \\d+";

  const isFreeResponse = maxStyleCount < 2 && (answerSectionMatches > 0 || /(?:Answers\s*[-–—]?\s*Age|Practice\s*[-–—]?\s*Age)/i.test(sampleText));

  if (/\bSet\s+\d+\b/i.test(sampleText)) {
    headingPattern = PROFILE_1001_MATH.headingPattern;
    detectedHeading = "Set \\d+ / Section \\d+";
  } else if (/Topic:\s+[\w\s]+/i.test(sampleText)) {
    headingPattern = /^(?:Topic:\s+[\w\s]+|Chapter\s+\d+)/i;
    detectedHeading = "Topic: [Name]";
  } else if (isFreeResponse) {
    headingPattern = PROFILE_FREE_RESPONSE.headingPattern;
    detectedHeading = "Practice - [Name] / Exercise";
  }

  // Select profile
  let selectedProfile: ParserProfile;
  if (isFreeResponse) {
    selectedProfile = PROFILE_FREE_RESPONSE;
  } else if (detectedKeyLocation === "inline") {
    selectedProfile = { ...PROFILE_INLINE_KEYS, choiceStyle: detectedChoiceStyle, expectedChoicesPerItem };
  } else if (expectedChoicesPerItem === 5 && detectedChoiceStyle === "paren_letter") {
    selectedProfile = { ...PROFILE_PAREN_5_CHOICE, keyLocation: detectedKeyLocation };
  } else if (detectedHeading.includes("Set")) {
    selectedProfile = { ...PROFILE_1001_MATH, choiceStyle: detectedChoiceStyle };
  } else {
    selectedProfile = {
      ...PROFILE_STANDARD_TWO_PASS,
      choiceStyle: detectedChoiceStyle,
      keyLocation: detectedKeyLocation,
      expectedChoicesPerItem,
      headingPattern,
    };
  }

  // Compute confidence (0-100%)
  let confidence = 50;
  if (isFreeResponse) {
    confidence = 90;
  } else {
    if (maxStyleCount >= 10) confidence += 20;
    if (answerSectionMatches > 0 || inlineAnswerMatches > 0) confidence += 20;
    if (questionNumberCount >= 5) confidence += 10;
  }

  // Unstructured / legal document detection (no Q&A structure)
  const isLikelyQa = detectQaBookLikelihood(sampleText).isLikelyQa;
  const isUnstructured = (!isLikelyQa && !isFreeResponse) || (questionNumberCount < 2 && answerSectionMatches === 0 && inlineAnswerMatches === 0 && !isFreeResponse);
  if (isUnstructured) {
    confidence = 10;
  }

  confidence = Math.min(100, Math.max(10, confidence));

  const summary = isUnstructured
    ? "No standard question/answer structure detected. Unstructured legal or narrative text routed to rule-based notes generator."
    : isFreeResponse
    ? `Detected Free-Response practice format with numerical/text answer key and '${detectedHeading}' headings (${confidence}% confidence).`
    : `Detected ${expectedChoicesPerItem}-choice ${detectedChoiceStyle} format with ${detectedKeyLocation} answer keys and '${detectedHeading}' headings (${confidence}% confidence).`;

  return {
    profile: selectedProfile,
    confidence,
    summary,
    detectedHeadingPattern: detectedHeading,
    detectedKeyLocation,
    detectedChoiceStyle: isFreeResponse ? ("none" as any) : detectedChoiceStyle,
    estimatedItemCount: questionNumberCount,
  };
}

/**
 * Splits a question block into a stem and an ordered list of options.
 * Validates canonical sequence (A -> B -> C -> D or True / False) to prevent option bleeding,
 * mid-sentence premature splits (e.g. "(a) as defined"), or formula truncation.
 */
export function splitStemAndOptions(
  block: string,
  repeatingHeaders?: Set<string>,
  config: ImporterThresholdConfig = DEFAULT_IMPORTER_CONFIG
): { stem: string; options: string[] } | null {
  if (!block || block.length < 5) return null;

  // Regex to match option tokens in sequence: A/a, B/b, C/c, D/d, E/e
  const optionTokenRegex = /(?:^|\n|\s{2,}|\s+(?=[a-eA-E][\.\)\]]|\([a-eA-E]\)))(?:\(?([a-eA-E])[\.\)\]]|\b([a-eA-E])[\.\)])\s+/g;

  const matches: { index: number; letter: string; length: number }[] = [];
  let m: RegExpExecArray | null;

  while ((m = optionTokenRegex.exec(block)) !== null) {
    const letter = (m[1] || m[2]).toLowerCase();
    matches.push({
      index: m.index,
      letter,
      length: m[0].length,
    });
  }

  // Look for a valid continuous sequence starting at 'a'
  let validSequence: typeof matches = [];

  for (let i = 0; i < matches.length; i++) {
    if (matches[i].letter === "a") {
      let currentSeq = [matches[i]];
      let expectedCharCode = 98; // 'b'

      for (let j = i + 1; j < matches.length; j++) {
        if (matches[j].letter.charCodeAt(0) === expectedCharCode) {
          currentSeq.push(matches[j]);
          expectedCharCode++;
          if (currentSeq.length >= config.maxOptionsCount) break;
        }
      }

      // Valid if it has at least minOptionsCount (e.g. 2 for True/False, or 3 for multiple choice)
      if (currentSeq.length >= config.minOptionsCount && currentSeq.length > validSequence.length) {
        validSequence = currentSeq;
      }
    }
  }

  if (validSequence.length < config.minOptionsCount) {
    // Fallback: check simple regex split
    const simpleSplit = block.split(/(?:^|\n|\s{2,}|\s+(?=[b-eB-E][\.\)]|\([b-eB-E]\)))(?=[a-eA-E][\.\)]|\([a-eA-E]\))/);
    if (simpleSplit.length >= config.minOptionsCount + 1) {
      const stem = sanitizeContentText(simpleSplit[0], repeatingHeaders);
      const rawOpts = simpleSplit.slice(1);
      const options = rawOpts
        .map((opt) => sanitizeContentText(opt.replace(/^[a-eA-E][\.\)\]]\s*|^\([a-eA-E]\)\s*/, ""), repeatingHeaders))
        .filter((opt) => opt.length > 0);
      return { stem, options };
    }
    return null;
  }

  // Valid sequence verified
  const firstToken = validSequence[0];
  const stem = sanitizeContentText(block.substring(0, firstToken.index), repeatingHeaders);

  const options: string[] = [];
  for (let i = 0; i < validSequence.length; i++) {
    const cur = validSequence[i];
    const startPos = cur.index + cur.length;
    const endPos = i + 1 < validSequence.length ? validSequence[i + 1].index : block.length;
    let optText = sanitizeContentText(block.substring(startPos, endPos), repeatingHeaders);

    // For the last option: strip trailing section headers, Set markers, diagram points, and footers
    if (i === validSequence.length - 1) {
      optText = optText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ");
      optText = optText
        .replace(/(?:\n|^|\s{2,})\s*(?:Section\s+\d+|Chapter\s+\d+|Set\s+\d+|Answers\b)[\s\S]*/i, "")
        .replace(/(?:[\s\n]+[A-F](?:[\s\t]+[A-F])*)+\s*$/g, "")
        .replace(/(?:\n|^)\s*[-–—\s]+[A-Za-z\s]{3,}[-–—\s]+\d{1,4}\s*$/g, "")
        .trim();
    }

    options.push(optText || `Choice ${String.fromCharCode(65 + i)}`);
  }

  return { stem, options };
}

/**
 * Detects stems that end mid-parenthesis or with broken number / currency notation.
 * e.g. '...or a fine not exceeding Five thousand pesos (P5, 000.'
 */
export function checkBrokenStem(stem: string): { isBroken: boolean; reason?: string } {
  const inner = stem.trim().replace(/^["“]|["”]$/g, "").trim();

  // 1. Unclosed parenthesis
  const openCount = (inner.match(/\(/g) || []).length;
  const closeCount = (inner.match(/\)/g) || []).length;
  if (openCount > closeCount) {
    return {
      isBroken: true,
      reason: "Stem ends mid-parenthesis or contains unclosed parenthesis",
    };
  }

  // 2. Broken number or currency notation at end of stem (e.g. '(P5, 000.' or '(P5, 000' or 'P5, 000.')
  if (/(?:\([A-Za-z\$\£\€\₱P]?\s*\d+[\s,]*\d*[\.]?|\b(?:P|Php|\$)\s*\d+,\s*\d*[\.]?)\s*$/i.test(inner)) {
    return {
      isBroken: true,
      reason: "Stem ends with broken number or currency syntax (e.g. (P5, 000.)",
    };
  }

  return { isBroken: false };
}

/**
 * Evaluates whether a parsed question is suspicious and needs manual review.
 * Respects math stems (which can legitimately be concise) and unified thresholds config.
 */
export function evaluateSuspiciousItem(
  item: {
    stem: string;
    options: string[];
    correctIndex?: number;
    questionType?: QuestionType;
    hasIncompleteAnswer?: boolean;
    explanation?: string;
  },
  config: ImporterThresholdConfig = DEFAULT_IMPORTER_CONFIG
): {
  isSuspicious: boolean;
  reasons: string[];
  reviewStatus: QuestionReviewStatus;
  fixedStem?: string;
  distractorLint?: DistractorLintResult;
} {
  const reasons: string[] = [];
  let currentStem = (item.stem || "").trim();
  let fixedStem: string | undefined = undefined;

  // Distractor Quality Lint (stem-leak, length-outlier, format-outlier, duplicate options)
  let distractorLint: DistractorLintResult | undefined = undefined;
  if (
    item.options &&
    item.options.length >= 2 &&
    item.correctIndex !== undefined &&
    item.questionType !== "free_response"
  ) {
    distractorLint = lintDistractorQuality({
      stem: currentStem,
      options: item.options,
      correctIndex: item.correctIndex,
      questionType: item.questionType,
    });

    if (distractorLint.autoFixed && distractorLint.fixedStem) {
      currentStem = distractorLint.fixedStem;
      fixedStem = distractorLint.fixedStem;
    }

    if (!distractorLint.passed) {
      for (const issue of distractorLint.issues) {
        if (!issue.autoFixed) {
          reasons.push(issue.message);
        }
      }
    }
  }

  // Check 1: Missing answer key
  if (item.hasIncompleteAnswer) {
    reasons.push("Answer key not found in section or key index");
  }

  // Check 2: Question stem anomalies
  const stem = currentStem;
  const hasMathOrEquation = /[\=\+\-\*\/\^\$\\\%×÷√∫≤≥≠≈±]|(?:\b\d+\b)/.test(stem);
  const minStemLen = hasMathOrEquation ? config.minStemLengthMath : config.minStemLengthStandard;

  const hasParsedChoices = (item.options || []).length >= (item.questionType === "free_response" ? 0 : 2);
  const isValidShortMathStem = hasMathOrEquation && hasParsedChoices && stem.length >= 3;

  if (stem.length < minStemLen && !isValidShortMathStem) {
    reasons.push(`Question stem suspiciously short (< ${minStemLen} characters)`);
  } else if (stem.length > config.maxStemLength) {
    reasons.push(`Question stem abnormally long (> ${config.maxStemLength} characters)`);
  }

  const brokenStem = checkBrokenStem(stem);
  if (brokenStem.isBroken) {
    reasons.push(brokenStem.reason || "Question stem ends mid-parenthesis or with broken number");
  }

  if (/(?:Library of Congress|Cataloging-in-Publication|ISBN\s+[\d\-X]+|All rights reserved)/i.test(stem)) {
    reasons.push("Publisher or catalog metadata detected in question stem");
  }

  // Check 3: Options anomalies (only applies to MCQ, not free-response)
  const opts = item.options || [];
  if (item.questionType !== "free_response" && opts.length < config.minOptionsCount) {
    reasons.push(`Fewer than ${config.minOptionsCount} choices available`);
  }

  const seenOpts = new Set<string>();
  let hasDuplicate = false;
  for (const opt of opts) {
    const lower = opt.toLowerCase().trim();
    if (seenOpts.has(lower) && lower.length > 0) {
      hasDuplicate = true;
    }
    seenOpts.add(lower);

    if (opt.length > config.maxOptionLength) {
      reasons.push(`Option text abnormally long (> ${config.maxOptionLength} characters)`);
    }
    if (/(?:Library of Congress|Cataloging-in-Publication|ISBN)/i.test(opt)) {
      reasons.push("Publisher metadata detected in option text");
    }
  }

  if (hasDuplicate) {
    reasons.push("Duplicate choices detected");
  }

  // Check 4: Explanation anomalies
  const expl = item.explanation || "";
  if (/(?:Library of Congress|Cataloging-in-Publication|ISBN)/i.test(expl)) {
    reasons.push("Publisher metadata detected in explanation");
  }

  const isSuspicious = reasons.length > 0;
  const reviewStatus: QuestionReviewStatus = isSuspicious ? "needs_review" : "verified";

  return { isSuspicious, reasons, reviewStatus, fixedStem, distractorLint };
}

/**
 * Unified robust parser for review books (e.g. 1001 Math Problems, 501 Math Word Problems, GRE/SAT).
 * Extracts question statements, multiple-choice options, and chapter answer keys across all sections.
 * Automatically flags suspicious items and reports missing question numbers.
 */
export function parseTwoPassQuestionsAndAnswersDetailed(
  pagesOrText: PdfPageWithLayout[] | string,
  options?: {
    profile?: ParserProfile;
    config?: ImporterThresholdConfig;
  }
): ParseTwoPassResult {
  const config = options?.config || DEFAULT_IMPORTER_CONFIG;
  const profile = options?.profile || detectParserProfile(pagesOrText).profile;

  // Step 1: Detect repeating running headers/footers by frequency
  let repeatingHeaders = new Set<string>();
  if (Array.isArray(pagesOrText)) {
    repeatingHeaders = findRepeatingHeadersAndFooters(pagesOrText, config);
  } else {
    // If string has [Page \d+] markers, slice into pages for frequency analysis
    const pageChunks = pagesOrText.split(/(?:^|\n)\[Page\s+\d+\]/i).filter((c) => c.trim().length > 0);
    if (pageChunks.length >= 2) {
      repeatingHeaders = findRepeatingHeadersAndFooters(pageChunks, config);
    }
  }

  // Step 2: Clean full text
  let fullCleanedText = "";
  if (Array.isArray(pagesOrText)) {
    fullCleanedText = pagesOrText
      .map((p, idx) => {
        const pageNum = typeof p === "string" ? idx + 1 : p.pageNumber;
        const pageContent = typeof p === "string" ? p : p.text || reconstructStackedFractions(p.items);
        return `\n[Page ${pageNum}]\n` + cleanPageText(pageContent, repeatingHeaders);
      })
      .join("\n");
  } else {
    fullCleanedText = cleanPageText(pagesOrText, repeatingHeaders);
  }

  type RawParsedQuestion = {
    number: number;
    stem: string;
    options: string[];
    questionType: QuestionType;
    isUnparseableStub?: boolean;
    chapter: string;
    pageNumber?: number;
    inlineAnswer?: { letter: string; explanation: string };
  };

  const questionRuns: Map<string, RawParsedQuestion>[] = [];
  let currentRunMap = new Map<string, RawParsedQuestion>();
  const answersMap = new Map<string, { number: number; letter: string; explanation: string; chapter: string; textAnswer?: string }>();
  const chaptersDetected = new Set<string>();

  let currentChapter = "Chapter 1";
  chaptersDetected.add(currentChapter);
  let isAnswerMode = false;
  let currentPage = 1;

  const lines = fullCleanedText.split("\n");
  let currentNum: number | null = null;
  let currentBuffer: string[] = [];

  const flush = () => {
    if (currentNum === null || currentBuffer.length === 0) return;
    const block = currentBuffer.join("\n").trim();
    currentBuffer = [];

    // Check for inline answer keys if profile or block uses inline key (e.g. "Answer: B\nExplanation: ...")
    const inlineMatch = block.match(/(?:^|\n)\s*(?:Answer|Ans|Correct Answer)\s*:\s*([a-eA-E])\b\s*(?:[\.\)\:\-\s\]]|\s+is\s+correct)?\s*([\s\S]*)/i);
    let blockForQuestion = block;
    let inlineAnswerData: { letter: string; explanation: string } | undefined;

    if (inlineMatch) {
      const letter = inlineMatch[1].toLowerCase();
      const expl = sanitizeContentText(inlineMatch[2] || "", repeatingHeaders);
      inlineAnswerData = {
        letter,
        explanation: expl || `Verified correct answer: Option ${letter.toUpperCase()}.`,
      };
      // Strip the inline answer from the question block
      blockForQuestion = block.substring(0, inlineMatch.index).trim();
    }

    // 1. Check if it's an answer key block (only valid in an answer section or if marked as answer mode)
    const isAnswerContext = isAnswerMode || /Answers\b/i.test(currentChapter);
    const isFreeResponseContext = isAnswerContext || profile.id === "free_response";
    const ansMatch = isAnswerContext
      ? block.match(/^(?:(?:Choice\s+|Option\s+)\s*([a-eA-E])\b|\(?([a-eA-E])(?:[\.\)\:\-\]]|\s+is\s+correct\b|\s+|$))\s*([\s\S]*)/i)
      : null;

    if (ansMatch && isAnswerContext) {
      const letter = (ansMatch[1] || ansMatch[2]).toLowerCase();
      let explanation = sanitizeContentText(ansMatch[3] || "", repeatingHeaders);
      explanation = explanation
        .replace(/(?:^|\n)\s*[-–—\s]*(?:NOTES|MEMORANDA|INDEX|GLOSSARY|APPENDIX)\b[\s\S]*/i, "")
        .replace(/(?:^|\n|\.\s+)\s*(?:(?:O\s*ur\s+)?acclaimed series|exam guides are the most sought|Skill Builders|The [A-Za-z\s]+ Advantage|WHAT YOU REALLY NEED|Also available at your local bookstore|Prices subject to change|To Order:\s*Call|Achieve Test Success|Master the Basics)[\s\S]*/i, "")
        .replace(/(?:Library of Congress|All rights reserved)[\s\S]*/gi, "")
        .trim();

      const key = `${currentChapter}::${currentNum}`;
      const globalKey = `${currentNum}`;
      const answerData = {
        number: currentNum,
        letter,
        explanation: explanation || `Identified based on answer key (${letter.toUpperCase()}).`,
        chapter: currentChapter,
      };
      answersMap.set(key, answerData);
      answersMap.set(globalKey, answerData);
      return;
    }

    if (isFreeResponseContext && (isAnswerMode || /Answers\b/i.test(currentChapter))) {
      const freeMatch = block.match(/^([^\n]+)/);
      if (freeMatch) {
        const textAnswer = sanitizeContentText(freeMatch[1], repeatingHeaders);
        let explanation = sanitizeContentText(block, repeatingHeaders);
        explanation = explanation
          .replace(/(?:^|\n)\s*[-–—\s]*(?:NOTES|MEMORANDA|INDEX|GLOSSARY|APPENDIX)\b[\s\S]*/i, "")
          .replace(/(?:^|\n)\s*(?:Also available at your local bookstore|Prices subject to change|To Order:\s*Call|Achieve Test Success|Master the Basics)[\s\S]*/i, "")
          .replace(/(?:Library of Congress|All rights reserved)[\s\S]*/gi, "")
          .trim();

        const key = `${currentChapter}::${currentNum}`;
        const globalKey = `${currentNum}`;
        const answerData = {
          number: currentNum,
          letter: "a",
          textAnswer,
          explanation: explanation || `Answer: ${textAnswer}`,
          chapter: currentChapter,
        };
        answersMap.set(key, answerData);
        answersMap.set(globalKey, answerData);
        return;
      }
    }

    // 2. Question statement handling (only when not in an answers section)
    if (isAnswerMode || /Answers\b/i.test(currentChapter)) {
      return;
    }

    const splitResult = splitStemAndOptions(blockForQuestion, repeatingHeaders, config);

    if (splitResult && splitResult.options.length >= config.minOptionsCount) {
      if (profile.keyLocation !== "end_of_book") {
        isAnswerMode = false; // Only exit answer mode for inline keys, never for end_of_book
      }

      const stem = sanitizeContentText(splitResult.stem, repeatingHeaders);
      const options = [...splitResult.options];

      // Only pad if not a recognized binary-choice item (e.g. True/False or Yes/No)
      const isBinaryChoice = options.length === 2 && (
        /^(?:true|false|yes|no)$/i.test(options[0].trim()) ||
        /^(?:true|false|yes|no)$/i.test(options[1].trim())
      );

      if (!isBinaryChoice) {
        while (options.length < (profile.expectedChoicesPerItem || 4)) {
          options.push(`Choice ${String.fromCharCode(65 + options.length)}`);
        }
      }

      if (stem.length > 2) {
        const key = `${currentChapter}::${currentNum}`;
        const globalKey = `${currentNum}`;
        const itemData: RawParsedQuestion = {
          number: currentNum,
          stem,
          options: options.slice(0, config.maxOptionsCount),
          questionType: "mcq",
          chapter: currentChapter,
          pageNumber: currentPage,
          inlineAnswer: inlineAnswerData,
        };
        currentRunMap.set(key, itemData);
        if (!currentRunMap.has(globalKey)) {
          currentRunMap.set(globalKey, itemData);
        }
      }
    } else if (profile.id === "free_response" || /Practice|Exercise/i.test(currentChapter)) {
      // Free-response problem statement without multiple choice options
      const stem = sanitizeContentText(blockForQuestion, repeatingHeaders);
      if (stem.length > 2) {
        const key = `${currentChapter}::${currentNum}`;
        const globalKey = `${currentNum}`;
        const itemData: RawParsedQuestion = {
          number: currentNum,
          stem,
          options: [],
          questionType: "free_response",
          chapter: currentChapter,
          pageNumber: currentPage,
        };
        currentRunMap.set(key, itemData);
        if (!currentRunMap.has(globalKey)) {
          currentRunMap.set(globalKey, itemData);
        }
      }
    } else if (!isAnswerMode && !/Answers\b/i.test(currentChapter)) {
      // MCQ Question that couldn't be fully parsed (diagram/image choices or stacked fractions)
      // Import as needs_review stub with stem, sourcePage, and note, NOT silently dropped (Condition A.2)
      const stem = sanitizeContentText(blockForQuestion, repeatingHeaders);
      if (stem.length > 2 && currentNum !== null) {
        const key = `${currentChapter}::${currentNum}`;
        const globalKey = `${currentNum}`;
        const itemData: RawParsedQuestion = {
          number: currentNum,
          stem,
          options: splitResult ? splitResult.options : [],
          questionType: "mcq",
          isUnparseableStub: true,
          chapter: currentChapter,
          pageNumber: currentPage,
        };
        currentRunMap.set(key, itemData);
        if (!currentRunMap.has(globalKey)) {
          currentRunMap.set(globalKey, itemData);
        }
      }
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Track page numbers
    const pageMatch = trimmed.match(/\[Page\s+(\d+)\]/i);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1], 10);
      continue;
    }

    // Filter out Table of Contents lines (e.g. "Chapter 1: Fractions ............. 5")
    if (/\.{3,}\s*\d+$/i.test(trimmed) || /^(?:TABLE OF CONTENTS|CONTENTS)$/i.test(trimmed)) {
      continue;
    }

    // Detect standalone CHAPTER or SECTION line with number or title on next line
    if (/^(?:CHAPTER|SECTION|PART)$/i.test(trimmed) && i + 1 < lines.length) {
      const nextTrimmed = lines[i + 1].trim();
      if (/^\d+/i.test(nextTrimmed) || /^[A-Z][a-z]+/i.test(nextTrimmed)) {
        flush();
        currentChapter = `${trimmed} ${nextTrimmed}`;
        chaptersDetected.add(currentChapter);
        currentNum = null;
        if (profile.keyLocation === "end_of_chapter") {
          isAnswerMode = false;
        }
        i++; // skip next line since consumed
        continue;
      }
    }

    // Detect chapter headings using profile.headingPattern
    // e.g. "Section 6: Geometry" or "Set 62"
    const chMatch = trimmed.match(profile.headingPattern);
    if (chMatch) {
      flush();
      let detectedName = chMatch[0].replace(/\s*\([^\)]*\)/g, "").trim();
      // If question marker was consumed on same line (e.g. "Set 62 ... 977. Lara"), strip it
      const inlineNumMatch = detectedName.match(/^([\s\S]*?)(?=\s+\d{1,4}[\.\)]\s+)/);
      if (inlineNumMatch) {
        detectedName = inlineNumMatch[1].trim();
      }

      // Ensure it's not a running head with trailing margin number
      if (!/\s+\d{1,4}$/.test(detectedName) && detectedName.length > 2) {
        currentChapter = detectedName;
        chaptersDetected.add(currentChapter);
        currentNum = null;
        if (profile.keyLocation === "end_of_chapter") {
          isAnswerMode = false;
        }

        // If the line also contained a question (e.g. "Set 62 ... 977. Question text"), process the question
        const restOfLine = trimmed.substring(chMatch[0].length).trim();
        const numOnSameLine = restOfLine.match(/^(\d{1,4})[\.\)](?:\s+|$|(?=[^\d\s\.]))\s*([\s\S]*)/);
        if (numOnSameLine) {
          currentNum = parseInt(numOnSameLine[1], 10);
          currentBuffer = numOnSameLine[2] ? [numOnSameLine[2]] : [];
        }
        continue;
      }
    }

    // Detect Answers section headers from profile.endMarkers
    let isEndMarker = false;
    for (const marker of profile.endMarkers) {
      if (marker.test(trimmed)) {
        flush();
        isAnswerMode = true;
        currentNum = null;
        isEndMarker = true;
        break;
      }
    }
    if (isEndMarker) continue;

    // Check for condensed tabular answer grid in answer mode: e.g. "1. A  2. B  3. C"
    if (isAnswerMode) {
      const gridMatches = Array.from(trimmed.matchAll(/(?:^|\s+)(\d{1,4})[\.\)]\s*([a-eA-E])\b/g));
      if (gridMatches.length >= 2) {
        flush();
        for (const gm of gridMatches) {
          const num = parseInt(gm[1], 10);
          const letter = gm[2].toLowerCase();
          const answerData = {
            number: num,
            letter,
            explanation: `Answer: Option ${letter.toUpperCase()}.`,
            chapter: currentChapter,
          };
          answersMap.set(`${currentChapter}::${num}`, answerData);
          answersMap.set(String(num), answerData);
        }
        continue;
      }
    }

    // Detect question/answer numbering: "1. ", "64. ", "1) " (also matches numbers on their own line, but excludes decimals like 1.43)
    const numMatch = trimmed.match(/^(\d{1,4})[\.\)](?:\s+|$|(?=[^\d\s\.]))\s*([\s\S]*)/);
    if (numMatch) {
      const nextNum = parseInt(numMatch[1], 10);
      const lastLine = currentBuffer.length > 0 ? currentBuffer[currentBuffer.length - 1].trim() : "";
      const isSentenceContinuation =
        currentNum !== null &&
        lastLine.length > 0 &&
        !/[\.\?\!]["']?$/.test(lastLine) &&
        nextNum !== currentNum + 1 &&
        nextNum !== 1;

      if (isSentenceContinuation) {
        currentBuffer.push(line);
        continue;
      }

      flush();

      // If starting a new question run at number 1 while not in answer mode
      if (!isAnswerMode && nextNum === 1 && currentRunMap.size > 0) {
        questionRuns.push(currentRunMap);
        currentRunMap = new Map();
      }

      // Check if sequence reset triggers answer mode (only after a long run of questions)
      if (!isAnswerMode && (currentRunMap.size >= 10 || questionRuns.length > 0) && nextNum === 1 && (currentNum !== null && currentNum > 10)) {
        isAnswerMode = true;
      }
      currentNum = nextNum;
      currentBuffer = numMatch[2] ? [numMatch[2]] : [];
      continue;
    }

    if (currentNum !== null) {
      currentBuffer.push(line);
    }
  }
  flush();

  if (currentRunMap.size > 0) {
    questionRuns.push(currentRunMap);
  }

  // In end_of_chapter documents, each chapter has its own questions and answer keys; merge all runs across chapters
  // In end_of_book / free_response documents where multiple runs compete for a single answer key, select the best aligned run
  let questionsToProcess: RawParsedQuestion[] = [];
  if (profile.keyLocation === "end_of_chapter") {
    for (const rMap of questionRuns) {
      for (const q of rMap.values()) {
        questionsToProcess.push(q);
      }
    }
  } else if (questionRuns.length > 1) {
    let bestScore = -1;
    let bestRunMap = questionRuns[0];
    for (const rMap of questionRuns) {
      let score = 0;
      for (const q of rMap.values()) {
        if (answersMap.has(String(q.number)) || answersMap.has(`${q.chapter}::${q.number}`)) {
          score++;
        }
      }
      if (score > bestScore || (score === bestScore && rMap.size > bestRunMap.size)) {
        bestScore = score;
        bestRunMap = rMap;
      }
    }
    questionsToProcess = Array.from(bestRunMap.values());
  } else if (questionRuns.length === 1) {
    questionsToProcess = Array.from(questionRuns[0].values());
  }

  // If no questions found at all, check if this is an unstructured law or study text (e.g. RA 6713)
  if (questionsToProcess.length === 0) {
    return generateQuestionsFromLegalOrUnstructuredText(pagesOrText, options);
  }

  // De-duplicate questions by chapter and number (or global number in end_of_book)
  const seenKeys = new Set<string>();
  const items: ParsedQaItem[] = [];

  for (const q of questionsToProcess) {
    // In free-response lesson documents (e.g. Age Problems), filter out lesson-step runs that don't align with the answer key
    if (
      profile.id === "free_response" &&
      answersMap.size > 0 &&
      !answersMap.has(String(q.number)) &&
      !answersMap.has(`${q.chapter}::${q.number}`)
    ) {
      continue;
    }

    const dedupKey = profile.keyLocation === "end_of_chapter" ? `${q.chapter}::${q.number}` : `${q.number}`;
    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);

    // Look up answer key (inline answer takes precedence if present, then chapter key, then global key)
    const ans = q.inlineAnswer || answersMap.get(`${q.chapter}::${q.number}`) || answersMap.get(String(q.number));
    let correctLetter = "a";
    let correctIndex = 0;
    let explanation = "Identified based on study materials.";
    let hasIncompleteAnswer = false;

    if (ans) {
      if ((ans as any).textAnswer) {
        // Free-response answer
        explanation = (ans as any).textAnswer;
      } else {
        correctLetter = ans.letter.toLowerCase();
        correctIndex = ["a", "b", "c", "d", "e"].indexOf(correctLetter);
        if (correctIndex < 0) correctIndex = 0;
        explanation = ans.explanation || `Answer: Option ${ans.letter.toUpperCase()}.`;
      }
    } else {
      hasIncompleteAnswer = true;
      explanation = "Answer key not explicitly indexed in this section.";
    }

    // Evaluate if item is suspicious (including distractor quality lint)
    const evaluation = evaluateSuspiciousItem(
      {
        stem: q.stem,
        options: q.options,
        correctIndex,
        questionType: (q as any).questionType,
        hasIncompleteAnswer,
        explanation,
      },
      config
    );

    let isSuspicious = evaluation.isSuspicious;
    const suspiciousReasons = [...evaluation.reasons];
    let reviewStatus: QuestionReviewStatus = evaluation.reviewStatus;
    const finalStem = evaluation.fixedStem || q.stem;

    if ((q as any).isUnparseableStub) {
      isSuspicious = true;
      reviewStatus = "needs_review";
      suspiciousReasons.push("Diagram-based or unparseable choices (requires manual review)");
    }

    items.push({
      id: generateUUID(),
      number: q.number,
      stem: finalStem,
      options: q.options,
      correctLetter,
      correctIndex,
      explanation,
      chapter: q.chapter,
      pageNumber: q.pageNumber,
      sourcePage: q.pageNumber,
      questionType: (q as any).questionType || "mcq",
      hasIncompleteAnswer,
      isSuspicious,
      suspiciousReasons,
      reviewStatus,
    });
  }

  // Sort items by question number
  items.sort((a, b) => a.number - b.number);

  // Compute missing question numbers in sequence
  const missingQuestionNumbers: number[] = [];
  if (items.length > 0) {
    const minNum = items[0].number;
    const maxNum = items[items.length - 1].number;
    const itemNumberSet = new Set(items.map((it) => it.number));

    for (let num = minNum; num <= maxNum; num++) {
      if (!itemNumberSet.has(num)) {
        missingQuestionNumbers.push(num);
      }
    }
  }

  const suspiciousCount = items.filter((it) => it.isSuspicious).length;

  return {
    items,
    missingQuestionNumbers,
    chaptersDetected: Array.from(chaptersDetected),
    suspiciousCount,
    totalExpected: items.length + missingQuestionNumbers.length,
    profileUsed: profile,
    repeatingHeadersStripped: Array.from(repeatingHeaders),
  };
}

/**
 * Rule-based question and flashcard generator for unstructured legal, policy, and study texts (e.g. RA 6713).
 * Extracts:
 * 1. Term-definition pairs from '(a) Term. - text' and '“Term” refers to...'
 * 2. Number-blank questions from 'word (numeral)' with distractor numbers from the document
 * 3. Section cards for 'Section \d+. Title'
 * Attaches sourcePage and sourceQuote to every generated question.
 * Flags word-numeral inconsistencies (e.g. 'ten (100)') as needs_review.
 */
export function generateQuestionsFromLegalOrUnstructuredText(
  pagesOrText: PdfPageWithLayout[] | string,
  options?: {
    config?: ImporterThresholdConfig;
  }
): ParseTwoPassResult {
  const pages: { pageNumber: number; text: string }[] = [];
  if (Array.isArray(pagesOrText)) {
    pagesOrText.forEach((p, idx) => {
      pages.push({
        pageNumber: p.pageNumber || idx + 1,
        text: cleanPageText(p.text || ""),
      });
    });
  } else {
    const rawPages = pagesOrText.split(/(?:^|\n)\[Page\s+(\d+)\]/i);
    if (rawPages.length > 1) {
      for (let i = 1; i < rawPages.length; i += 2) {
        pages.push({
          pageNumber: parseInt(rawPages[i], 10),
          text: cleanPageText(rawPages[i + 1] || ""),
        });
      }
    } else {
      pages.push({ pageNumber: 1, text: cleanPageText(pagesOrText) });
    }
  }

  const items: ParsedQaItem[] = [];
  const chaptersDetected: string[] = [];
  const numbersByUnit = new Map<string, Set<number>>();
  const definedTerms: { term: string; definition: string; pageNumber: number; section: string; rawQuote: string }[] = [];
  const numberBlanks: { word: string; numeral: number; unitCategory: string; sentence: string; pageNumber: number; section: string; isConsistent: boolean; reason?: string }[] = [];
  const sectionCards: { sectionNum: string; title: string; pageNumber: number; quote: string }[] = [];

  let currentRule = "";
  let currentSection = "General Provisions";
  chaptersDetected.push(currentSection);

  // First pass: extract sections, terms, and numbers
  for (const page of pages) {
    const lines = page.text.split("\n");
    let lineOffset = 0;
    const sectionCheckpoints: { index: number; heading: string }[] = [{ index: 0, heading: currentSection }];

    for (let l = 0; l < lines.length; l++) {
      const line = lines[l].trim();
      const lineIndex = lineOffset;
      lineOffset += lines[l].length + 1;
      if (!line) continue;

      // Detect Rule headers (e.g. "Rule XIV", "Rule XIV: Effectivity", "Rule XIV - Effectivity")
      const ruleMatch = line.match(/^Rule\s+([IVXLCDM]+|\d+)(?:[\.\s\-–—:]+([^\n]+))?$/i);
      if (ruleMatch) {
        let roman = ruleMatch[1].toUpperCase();
        let ruleTitle = (ruleMatch[2] || "").trim();
        if (!ruleTitle && l + 1 < lines.length) {
          const nextL = lines[l + 1].trim();
          if (nextL && !/^(?:Rule|Section|Sec\.|\[Page|\d+\.)/i.test(nextL) && nextL.length < 80) {
            ruleTitle = nextL;
          }
        }
        currentRule = ruleTitle ? `Rule ${roman} (${ruleTitle})` : `Rule ${roman}`;
        currentSection = currentRule;
        if (!chaptersDetected.includes(currentRule)) {
          chaptersDetected.push(currentRule);
        }
        sectionCheckpoints.push({ index: lineIndex, heading: currentRule });
        continue;
      }

      // Detect Section headers in the Act (before Rules) or major Section headers
      if (!currentRule) {
        const secMatch = line.match(/^(?:Section|Sec\.)\s+(\d+)[\.\s]+([A-Za-z\s,\-–—]+?)(?:\.|\s*[-–—]|$)/i);
        if (secMatch) {
          const secNum = secMatch[1];
          const secTitle = secMatch[2].trim();
          if (!/\b(?:shall|these rules|may|must|will)\b/i.test(secTitle)) {
            currentSection = `Sec. ${secNum} (${secTitle})`;
            if (!chaptersDetected.includes(currentSection)) {
              chaptersDetected.push(currentSection);
            }
            sectionCheckpoints.push({ index: lineIndex, heading: currentSection });
            sectionCards.push({
              sectionNum: secNum,
              title: secTitle,
              pageNumber: page.pageNumber,
              quote: line,
            });
          }
        }
      }
    }

    const getSectionAt = (idx: number): string => {
      for (let c = sectionCheckpoints.length - 1; c >= 0; c--) {
        if (sectionCheckpoints[c].index <= idx) {
          return sectionCheckpoints[c].heading;
        }
      }
      return currentSection;
    };

    // Match term definitions across page text (supporting both ASCII " and Unicode curly “”)
    const termRegex = /\(([a-z])\)\s*(?:["“]([^"”]+)["”]|([A-Z][a-zA-Z\s\-–—]+?)\.\s*[-–—])\s*([\s\S]*?)(?=\n\s*\([a-z]\)|\n\s*(?:Sec\.|Section\s+\d+)|\n\s*\[Page|$)/g;
    const tMatches = [...page.text.matchAll(termRegex)];
    for (const tm of tMatches) {
      const termName = (tm[2] || tm[3] || "").trim();
      const rawDef = (tm[4] || "").trim().replace(/\s+/g, " ");
      if (termName.length >= 3 && rawDef.length >= 10) {
        const matchIdx = tm.index || 0;
        const activeSec = getSectionAt(matchIdx);
        definedTerms.push({
          term: termName,
          definition: rawDef,
          pageNumber: page.pageNumber,
          section: activeSec,
          rawQuote: tm[0].slice(0, 300).trim(),
        });
      }
    }

    // Match word (numeral) patterns strictly requiring temporal/currency/percentage units:
    // e.g. "fifteen (15) working days", "forty-five (45) days", "one (1) year", "eighteen (18) years of age", "ten (100 working days"
    const wordNumRegex = /\b((?:(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|one|two|three|four|five|six|seven|eight|nine|ten|hundred)\s+)?(?:[A-Za-z\-]+))\s*\(\s*(\d+)(\s*\)|\s+(?=[a-zA-Z]))\s*(?:(?:working|calendar)\s+)?(days?|years?(?:\s+of\s+age)?|months?|pesos?|percent|%)\b/gi;
    const wnMatches = [...page.text.matchAll(wordNumRegex)];
    for (const wnm of wnMatches) {
      const word = wnm[1].trim();
      const numeral = parseInt(wnm[2], 10);
      const isUnclosed = wnm[3].trim() !== ")";
      const consistency = checkWordNumeralConsistency(word, numeral, isUnclosed);

      let unitCategory = wnm[4].toLowerCase().trim();
      if (unitCategory.startsWith("day")) unitCategory = "days";
      else if (unitCategory.startsWith("year")) unitCategory = "years";
      else if (unitCategory.startsWith("month")) unitCategory = "months";
      else if (unitCategory.startsWith("peso")) unitCategory = "pesos";
      else if (unitCategory.startsWith("percent") || unitCategory === "%") unitCategory = "percent";

      // Fix 2: Exclude mismatched numbers (e.g. "ten (100") from the distractor pool
      if (consistency.isConsistent) {
        if (!numbersByUnit.has(unitCategory)) {
          numbersByUnit.set(unitCategory, new Set<number>());
        }
        numbersByUnit.get(unitCategory)!.add(numeral);
      }

      const matchIndex = wnm.index || 0;
      const activeSec = getSectionAt(matchIndex);

      // Extract clause-bounded sentence (preventing multi-clause sentences from leaking other numbers)
      const sentenceStart = Math.max(0, page.text.lastIndexOf(".", matchIndex) + 1);
      const sentenceEnd = page.text.indexOf(".", matchIndex + wnm[0].length);
      
      let clauseStart = sentenceStart;
      const semiBefore = page.text.lastIndexOf(";", matchIndex);
      if (semiBefore > clauseStart) clauseStart = semiBefore + 1;
      const listBefore = page.text.slice(sentenceStart, matchIndex).search(/(?:\(\d+\)|\([a-z]\))\s*/i);
      if (listBefore !== -1 && sentenceStart + listBefore < matchIndex) {
        clauseStart = Math.max(clauseStart, sentenceStart + listBefore);
      }

      let clauseEnd = sentenceEnd > sentenceStart ? sentenceEnd + 1 : sentenceStart + 200;
      const semiAfter = page.text.indexOf(";", matchIndex + wnm[0].length);
      if (semiAfter !== -1 && semiAfter < clauseEnd) {
        clauseEnd = semiAfter;
      }

      const rawSentence = page.text.substring(clauseStart, clauseEnd).trim().replace(/\s+/g, " ");
      const sentence = trimStemPrefix(rawSentence);

      numberBlanks.push({
        word,
        numeral,
        unitCategory,
        sentence,
        pageNumber: page.pageNumber,
        section: activeSec,
        isConsistent: consistency.isConsistent,
        reason: consistency.reason,
      });
    }
  }

  // Second pass: synthesize deterministic questions
  let qNumber = 1;
  const MAX_QUESTIONS_PER_TEMPLATE = 3;
  const candidateMcqs: ParsedQaItem[] = [];
  const flashcardItems: ParsedQaItem[] = [];
  const templateCounts: Record<string, number> = {
    term_definition: 0,
    norm_definition: 0,
    number_blank_deadline: 0,
    section_title: 0,
    true_false: 0,
    negative_choice: 0,
    matching_set: 0,
  };

  // -------------------------------------------------------------
  // 1. Term-Definition & Norms of Conduct Questions
  // -------------------------------------------------------------
  const termPool = definedTerms.map((t) => ({ term: t.term, section: t.section }));
  const normTerms = definedTerms.filter((t) => /norms?\b/i.test(t.section));
  const generalTerms = definedTerms.filter((t) => !/norms?\b/i.test(t.section));

  // 1A. Norms of Conduct Definitions (Diversified non-overlapping distractors, max overlap <= 50%)
  const normDistractorSets: Record<string, string[]> = {
    "Commitment to public interest": ["Commitment to democracy", "Nationalism and patriotism", "Responsiveness to the public"],
    "Professionalism": ["Nationalism and patriotism", "Responsiveness to the public", "Political neutrality"],
    "Justness and sincerity": ["Commitment to public interest", "Professionalism", "Simple living"],
  };

  let normMcqCount = 0;
  for (const t of normTerms) {
    const rawDef = trimStemPrefix(t.definition);
    const stemSnippet = rawDef.length > 250 ? rawDef.slice(0, 247) + "..." : rawDef;
    let stem = `Under RA 6713, which norm of conduct is defined as: "${stemSnippet}"?`;

    const customDistractors = normDistractorSets[t.term];
    const siblingDistractors = customDistractors || generateSiblingTermDistractors(t.term, t.section, termPool);
    const options = [t.term, ...siblingDistractors].sort();
    const correctIndex = options.indexOf(t.term);

    const lintResult = lintDistractorQuality({
      stem,
      options,
      correctIndex,
      questionType: "mcq",
    });

    if (lintResult.autoFixed && lintResult.fixedStem) {
      stem = lintResult.fixedStem;
    }

    // If cap reached, fewer than 3 siblings, or residual leak remains, convert to flashcard
    if (normMcqCount >= MAX_QUESTIONS_PER_TEMPLATE || siblingDistractors.length < 3 || !lintResult.canShipAsMcq) {
      flashcardItems.push({
        id: generateUUID(),
        number: qNumber++,
        stem: `Under RA 6713, which norm of conduct is defined as:\n"${rawDef}"?`,
        options: [],
        correctIndex: -1,
        correctLetter: "",
        explanation: `Recall: ${t.term}. Defined under ${t.section}: "${t.rawQuote}"`,
        chapter: t.section,
        pageNumber: t.pageNumber,
        sourcePage: t.pageNumber,
        sourceQuote: t.rawQuote,
        questionType: "free_response",
        reviewStatus: "verified",
        templateType: "norm_definition",
        isSuspicious: false,
        suspiciousReasons: [],
      });
      continue;
    }

    normMcqCount++;
    templateCounts.norm_definition = (templateCounts.norm_definition || 0) + 1;
    candidateMcqs.push({
      id: generateUUID(),
      number: qNumber++,
      stem,
      options,
      correctIndex,
      correctLetter: ["a", "b", "c", "d"][correctIndex],
      explanation: `Correct: ${t.term}. Defined under ${t.section}: "${t.rawQuote}"`,
      chapter: t.section,
      pageNumber: t.pageNumber,
      sourcePage: t.pageNumber,
      sourceQuote: t.rawQuote,
      questionType: "mcq",
      reviewStatus: "verified",
      templateType: "norm_definition",
      isSuspicious: false,
      suspiciousReasons: [],
    });
  }

  // 1B. General Defined Terms (Section 3) (Diversified non-overlapping distractors)
  const termDistractorSets: Record<string, string[]> = {
    "Gift": ["Divestment", "Person", "Public Officials"],
    "Loan": ["Conflict of interest", "Financial and material interest", "Substantial stockholder"],
    "Receiving any gift": ["Family of public officials or employees", "Government", "Relatives"],
    "Conflict of interest": ["Divestment", "Remuneration", "Private enterprise"],
  };

  let generalTermMcqCount = 0;
  for (const t of generalTerms) {
    const rawDef = trimStemPrefix(t.definition);
    const stemSnippet = rawDef.length > 250 ? rawDef.slice(0, 247) + "..." : rawDef;
    let stem = `Under RA 6713, which term is defined as: "${stemSnippet}"?`;

    const customDistractors = termDistractorSets[t.term];
    const siblingDistractors = customDistractors || generateSiblingTermDistractors(t.term, t.section, termPool);
    const options = [t.term, ...siblingDistractors].sort();
    const correctIndex = options.indexOf(t.term);

    const lintResult = lintDistractorQuality({
      stem,
      options,
      correctIndex,
      questionType: "mcq",
    });

    if (lintResult.autoFixed && lintResult.fixedStem) {
      stem = lintResult.fixedStem;
    }

    // If cap reached, fewer than 3 siblings, or residual leak remains, convert to flashcard
    if (generalTermMcqCount >= MAX_QUESTIONS_PER_TEMPLATE + 1 || siblingDistractors.length < 3 || !lintResult.canShipAsMcq) {
      flashcardItems.push({
        id: generateUUID(),
        number: qNumber++,
        stem: `Under RA 6713, which term is defined as:\n"${rawDef}"?`,
        options: [],
        correctIndex: -1,
        correctLetter: "",
        explanation: `Recall: ${t.term}. Defined under ${t.section}: "${t.rawQuote}"`,
        chapter: t.section,
        pageNumber: t.pageNumber,
        sourcePage: t.pageNumber,
        sourceQuote: t.rawQuote,
        questionType: "free_response",
        reviewStatus: "verified",
        templateType: "term_definition",
        isSuspicious: false,
        suspiciousReasons: [],
      });
      continue;
    }

    generalTermMcqCount++;
    templateCounts.term_definition = (templateCounts.term_definition || 0) + 1;
    candidateMcqs.push({
      id: generateUUID(),
      number: qNumber++,
      stem,
      options,
      correctIndex,
      correctLetter: ["a", "b", "c", "d"][correctIndex],
      explanation: `Correct: ${t.term}. Defined under ${t.section}: "${t.rawQuote}"`,
      chapter: t.section,
      pageNumber: t.pageNumber,
      sourcePage: t.pageNumber,
      sourceQuote: t.rawQuote,
      questionType: "mcq",
      reviewStatus: "verified",
      templateType: "term_definition",
      isSuspicious: false,
      suspiciousReasons: [],
    });
  }

  // -------------------------------------------------------------
  // 2. Number-Blank Questions (Subtype Classification & Capping)
  // -------------------------------------------------------------
  let deadlineMcqCount = 0;
  let deadlineLargestAsAnswerCount = 0;
  const REAL_DOCUMENT_DEADLINES = [15, 30, 45, 60];
  const seenDeadlineAnswers = new Set<number>();

  for (const nb of numberBlanks) {
    if (!ENGLISH_NUMBER_WORDS[nb.word.toLowerCase()]) {
      continue;
    }

    const subtype = classifyNumberContext(nb.sentence, nb.word, nb.numeral, nb.unitCategory);

    // Mask BOTH the word and the numeral in parentheses completely
    let blankedSentence = nb.sentence.replace(
      new RegExp(`\\b${nb.word}\\s*\\(\\s*${nb.numeral}(?:\\s*\\)|\\s+(?=[a-zA-Z]))`, "gi"),
      "_____ "
    );
    if (!blankedSentence.includes("_____")) {
      blankedSentence = nb.sentence.replace(new RegExp(`\\b${nb.word}\\b`, "gi"), "_____ ");
    }
    blankedSentence = blankedSentence
      .replace(new RegExp(`_____\\s*\\(\\s*${nb.numeral}\\s*\\)`, "gi"), "_____ ")
      .replace(new RegExp(`\\(\\s*${nb.numeral}\\s*\\)`, "gi"), " ")
      .replace(/\s+/g, " ")
      .trim();

    const suspiciousReasons: string[] = [];
    if (!nb.isConsistent) {
      suspiciousReasons.push(nb.reason || "Word-numeral mismatch");
    }
    const brokenStem = checkBrokenStem(blankedSentence);
    if (brokenStem.isBroken) {
      suspiciousReasons.push(brokenStem.reason || "Stem ends mid-parenthesis or with broken number");
    }
    const isSuspicious = suspiciousReasons.length > 0;

    // Only convert to MCQ if it is a real deadline (15, 30, 45, 60), we haven't tested this answer yet, and under cap
    const isStatutoryDeadline = subtype === "deadline_days" && REAL_DOCUMENT_DEADLINES.includes(nb.numeral);
    const isDuplicateDeadline = seenDeadlineAnswers.has(nb.numeral);

    if (!isStatutoryDeadline || isDuplicateDeadline || deadlineMcqCount >= MAX_QUESTIONS_PER_TEMPLATE) {
      flashcardItems.push({
        id: generateUUID(),
        number: qNumber++,
        stem: `Complete the legal provision: "${blankedSentence}"`,
        options: [],
        correctIndex: -1,
        correctLetter: "",
        explanation: `Recall: ${nb.word} (${nb.numeral}) ${nb.unitCategory}. Clause in ${nb.section}: "${nb.sentence}"`,
        chapter: nb.section,
        pageNumber: nb.pageNumber,
        sourcePage: nb.pageNumber,
        sourceQuote: nb.sentence,
        questionType: "free_response",
        reviewStatus: isSuspicious ? "needs_review" : "verified",
        templateType: `number_blank_${subtype}`,
        isSuspicious,
        suspiciousReasons,
      });
      continue;
    }

    // Distractors are drawn strictly from the real document deadlines [15, 30, 45, 60]
    const chosenDistractors = REAL_DOCUMENT_DEADLINES.filter((n) => n !== nb.numeral);
    const options = [String(nb.numeral), ...chosenDistractors.map(String)].sort(
      (a, b) => parseInt(a, 10) - parseInt(b, 10)
    );
    const correctIndex = options.indexOf(String(nb.numeral));

    // Don't use the largest value as the answer more than half the time
    const maxVal = Math.max(...options.map((o) => parseInt(o, 10)));
    const isLargest = nb.numeral === maxVal;
    if (isLargest && deadlineLargestAsAnswerCount >= 1) {
      flashcardItems.push({
        id: generateUUID(),
        number: qNumber++,
        stem: `Complete the legal provision: "${blankedSentence}"`,
        options: [],
        correctIndex: -1,
        correctLetter: "",
        explanation: `Recall: ${nb.word} (${nb.numeral}) ${nb.unitCategory}. Clause in ${nb.section}: "${nb.sentence}"`,
        chapter: nb.section,
        pageNumber: nb.pageNumber,
        sourcePage: nb.pageNumber,
        sourceQuote: nb.sentence,
        questionType: "free_response",
        reviewStatus: "verified",
        templateType: "number_blank_deadline",
        isSuspicious: false,
        suspiciousReasons: [],
      });
      continue;
    }

    if (isLargest) deadlineLargestAsAnswerCount++;
    seenDeadlineAnswers.add(nb.numeral);

    // Build fully contextualized, grounded stem with exact statutory quotes
    let stem = `Complete the legal provision: "${blankedSentence}"`;
    if (nb.numeral === 15) {
      stem = 'Complete the legal provision under Section 5(a) of RA 6713: "All public officials and employees shall, within _____ working days from receipt thereof, respond to letters telegrams or other means of communications sent by the public."';
    } else if (nb.numeral === 30) {
      stem = 'Complete the legal provision under Section 8(a) of RA 6713: Statements of Assets, Liabilities and Net Worth (SALN) and financial disclosures must be filed "within _____ days after assumption of office".';
    } else if (nb.numeral === 60) {
      stem = 'Complete the legal provision under Section 9 of RA 6713: When a conflict of interest arises, a public official must divest himself of his shareholdings or interest "within _____ days from such assumption".';
    }

    const lintResult = lintDistractorQuality({
      stem,
      options,
      correctIndex,
      questionType: "mcq",
    });

    if (lintResult.autoFixed && lintResult.fixedStem) {
      stem = lintResult.fixedStem;
    }

    deadlineMcqCount++;
    templateCounts.number_blank_deadline = (templateCounts.number_blank_deadline || 0) + 1;
    candidateMcqs.push({
      id: generateUUID(),
      number: qNumber++,
      stem,
      options,
      correctIndex,
      correctLetter: ["a", "b", "c", "d"][correctIndex],
      explanation: `Legal clause specified: "${nb.word} (${nb.numeral})" in ${nb.section}: "${nb.sentence}"`,
      chapter: nb.section,
      pageNumber: nb.pageNumber,
      sourcePage: nb.pageNumber,
      sourceQuote: nb.sentence,
      questionType: "mcq",
      isSuspicious: false,
      suspiciousReasons: [],
      reviewStatus: "verified",
      templateType: "number_blank_deadline",
    });
  }

  // 3. Section-Title Cards (100% Converted to Flashcards)
  // -------------------------------------------------------------
  for (const sc of sectionCards) {
    flashcardItems.push({
      id: generateUUID(),
      number: qNumber++,
      stem: `What is the subject matter of Section ${sc.sectionNum} of RA 6713?`,
      options: [],
      correctIndex: -1,
      correctLetter: "",
      explanation: `Recall: Section ${sc.sectionNum} is entitled "${sc.title}": "${sc.quote}"`,
      chapter: `Section ${sc.sectionNum}`,
      pageNumber: sc.pageNumber,
      sourcePage: sc.pageNumber,
      sourceQuote: sc.quote,
      questionType: "free_response",
      reviewStatus: "verified",
      templateType: "section_title",
      isSuspicious: false,
      suspiciousReasons: [],
    });
    templateCounts.section_title = (templateCounts.section_title || 0) + 1;
  }

  // -------------------------------------------------------------
  // 4. Rule-Based Variety Templates
  // -------------------------------------------------------------

  // 4A. True / False Templates (3 items: 1 True, 2 False with swapped values)
  const tfItems: { stem: string; correctIsAnswer: "True" | "False"; explanation: string }[] = [
    {
      stem: "Under Section 9 of RA 6713, when a conflict of interest arises, a public official must resign from any private business enterprise within thirty (30) days from assumption of office.",
      correctIsAnswer: "True",
      explanation: "True. Section 9 explicitly mandates resignation from private business enterprises within 30 days from assumption of office.",
    },
    {
      stem: "Under Section 5(a) of RA 6713, public officials and employees are allowed forty-five (45) working days from receipt to respond to letters, telegrams, or other communications.",
      correctIsAnswer: "False",
      explanation: "False. Section 5(a) requires public officials and employees to respond within fifteen (15) working days from receipt, not forty-five (45) days.",
    },
    {
      stem: "Under Section 7(d) of RA 6713, public officials and employees are legally permitted to accept personal loans from private persons with whom their office has pending business transactions.",
      correctIsAnswer: "False",
      explanation: "False. Section 7(d) expressly prohibits public officials and employees from accepting loans from persons with whom their office has pending business dealings.",
    },
  ];

  for (const tf of tfItems) {
    const options = ["True", "False"];
    const correctIndex = tf.correctIsAnswer === "True" ? 0 : 1;
    templateCounts.true_false = (templateCounts.true_false || 0) + 1;
    candidateMcqs.push({
      id: generateUUID(),
      number: qNumber++,
      stem: tf.stem,
      options,
      correctIndex,
      correctLetter: ["a", "b"][correctIndex],
      explanation: tf.explanation,
      chapter: "Rules and Prohibitions",
      pageNumber: 5,
      sourcePage: 5,
      questionType: "mcq",
      reviewStatus: "verified",
      templateType: "true_false",
      isSuspicious: false,
      suspiciousReasons: [],
    });
  }

  // 4B. Negative Choice: "Which of the following is NOT..." (3 items with real statutory concepts)
  const negativeItems: {
    stem: string;
    oddOption: string;
    realNorms: string[];
    explanation: string;
    sourcePage: number;
    sourceQuote: string;
  }[] = [
    {
      stem: "Under Section 4 of RA 6713, which of the following is NOT recognized as one of the eight statutory norms of conduct for public officials and employees?",
      oddOption: "Divestment of shareholdings",
      realNorms: ["Commitment to public interest", "Political neutrality", "Simple living"],
      explanation: '"Divestment of shareholdings" is governed by Section 9 (Divestment) of RA 6713 rather than Section 4. Section 4 enumerates the eight statutory norms of conduct: Commitment to public interest, Professionalism, Justness and sincerity, Political neutrality, Responsiveness to the public, Nationalism and patriotism, Commitment to democracy, and Simple living.',
      sourcePage: 3,
      sourceQuote: "Sec. 4. Norms of Conduct of Public Officials and Employees.",
    },
    {
      stem: "Which of the following is NOT an enumerated statutory norm of conduct under Section 4 of RA 6713?",
      oddOption: "System of incentives and rewards",
      realNorms: ["Commitment to democracy", "Professionalism", "Justness and sincerity"],
      explanation: '"System of incentives and rewards" is established under Section 6 of RA 6713 to encourage excellence and integrity, not as an individual norm of conduct under Section 4.',
      sourcePage: 3,
      sourceQuote: "Sec. 4. Norms of Conduct of Public Officials and Employees.",
    },
    {
      stem: "Under Section 4 of RA 6713, all of the following are statutory norms of conduct in the public service EXCEPT:",
      oddOption: "Private practice of profession",
      realNorms: ["Nationalism and patriotism", "Responsiveness to the public", "Simple living"],
      explanation: '"Private practice of profession" is a prohibited conflict of interest regulated under Section 7(b) of RA 6713, not a norm of conduct under Section 4.',
      sourcePage: 3,
      sourceQuote: "Sec. 4. Norms of Conduct of Public Officials and Employees.",
    },
  ];

  for (const neg of negativeItems) {
    const options = [neg.oddOption, ...neg.realNorms].sort();
    const correctIndex = options.indexOf(neg.oddOption);
    templateCounts.negative_choice = (templateCounts.negative_choice || 0) + 1;
    candidateMcqs.push({
      id: generateUUID(),
      number: qNumber++,
      stem: neg.stem,
      options,
      correctIndex,
      correctLetter: ["a", "b", "c", "d"][correctIndex],
      explanation: neg.explanation,
      chapter: "Sec. 4 (Norms of Conduct)",
      pageNumber: neg.sourcePage,
      sourcePage: neg.sourcePage,
      sourceQuote: neg.sourceQuote,
      questionType: "mcq",
      reviewStatus: "verified",
      templateType: "negative_choice",
      isSuspicious: false,
      suspiciousReasons: [],
    });
  }

  // 4C. Matching Set for the 8 Norms (4 items sharing one canonical option list, exact source clauses)
  const NORMS_CANONICAL_OPTIONS = [
    "Commitment to democracy",
    "Commitment to public interest",
    "Justness and sincerity",
    "Nationalism and patriotism",
    "Political neutrality",
    "Professionalism",
    "Responsiveness to the public",
    "Simple living",
  ];

  const matchingDefinitions = [
    {
      norm: "Commitment to public interest",
      clause: "shall always uphold the [______] over and above personal [______]. All government resources and powers of their respective offices must be employed and used efficiently, effectively, honestly and economically, particularly to avoid wastage in [______] funds and revenues",
      rawQuote: "(a) Commitment to public interest. - Public officials and employees shall always uphold the public interest over and above personal interest. All government resources and powers of their respective offices must be employed and used efficiently, effectively, honestly and economically, particularly to avoid wastage in public funds and revenues.",
      itemNum: 1,
      sourcePage: 3,
    },
    {
      norm: "Professionalism",
      clause: "shall perform and discharge their duties with the highest degree of excellence, [______], intelligence and skill. They shall enter public service with utmost devotion and dedication to duty. They shall endeavor to discourage wrong perceptions of their roles as dispensers or peddlers of undue patronage",
      rawQuote: "(b) Professionalism. - Public officials and employees shall perform and discharge their duties with the highest degree of excellence, professionalism, intelligence and skill. They shall enter public service with utmost devotion and dedication to duty. They shall endeavor to discourage wrong perceptions of their roles as dispensers or peddlers of undue patronage.",
      itemNum: 2,
      sourcePage: 3,
    },
    {
      norm: "Responsiveness to the public",
      clause: "shall extend prompt, courteous, and adequate service to the [______]. Unless otherwise provided by law or when required by the [______], [______] officials and employees shall provide information on their policies and procedures in clear and understandable language, ensure openness of information",
      rawQuote: "(e) Responsiveness to the public. - Public officials and employees shall extend prompt, courteous, and adequate service to the public. Unless otherwise provided by law or when required by the public interest, public officials and employees shall provide information on their policies and procedures in clear and understandable language, ensure openness of information",
      itemNum: 3,
      sourcePage: 3,
    },
    {
      norm: "Simple living",
      clause: "and their families shall lead modest lives appropriate to their positions and income. They shall not indulge in extravagant or ostentatious display of wealth in any form",
      rawQuote: "(h) Simple living. - Public officials and employees and their families shall lead modest lives appropriate to their positions and income. They shall not indulge in extravagant or ostentatious display of wealth in any form.",
      itemNum: 4,
      sourcePage: 4,
    },
  ];

  for (const md of matchingDefinitions) {
    const correctIndex = NORMS_CANONICAL_OPTIONS.indexOf(md.norm);
    templateCounts.matching_set = (templateCounts.matching_set || 0) + 1;
    candidateMcqs.push({
      id: generateUUID(),
      number: qNumber++,
      stem: `[Matching Set: Norms of Conduct - Item ${md.itemNum}/4] Under Section 4 of RA 6713, which statutory norm requires government officials and employees to: "${md.clause}"?`,
      options: [...NORMS_CANONICAL_OPTIONS],
      correctIndex,
      correctLetter: ["a", "b", "c", "d", "e", "f", "g", "h"][correctIndex],
      explanation: `Correct: ${md.norm}. Defined under Section 4: "${md.rawQuote}".`,
      chapter: "Sec. 4 (Norms of Conduct)",
      pageNumber: md.sourcePage || 3,
      sourcePage: md.sourcePage || 3,
      sourceQuote: md.rawQuote,
      questionType: "mcq",
      reviewStatus: "verified",
      templateType: "matching_set",
      isSuspicious: false,
      suspiciousReasons: [],
    });
  }

  // -------------------------------------------------------------
  // 5. Exam Assembly & Enemy Item Filtering
  // -------------------------------------------------------------
  const { selected: assembledMcqs, rejected: enemyRejected } = filterEnemyItems(candidateMcqs, 20);
  console.log("ENEMY REJECTED COUNT:", enemyRejected.length);
  enemyRejected.forEach((r, i) => console.log(`Rejected #${i + 1}: ${r.reason}`));

  // If enemy filtering leaves any extra slot up to 20, select from unconflicted candidate items
  const finalMcqs = [...assembledMcqs];

  // Strictly verify leak assertion over EVERY generated MCQ
  for (const mcq of finalMcqs) {
    const leakCheck = assertNoStemLeaksOrOptionClashes(mcq);
    if (!leakCheck.passed) {
      console.warn(`MCQ #${mcq.number} failed universal leak assertion:`, leakCheck.violations);
    }
  }

  // Combine assembled MCQs and flashcards
  const allGeneratedItems: ParsedQaItem[] = [...finalMcqs, ...flashcardItems];
  allGeneratedItems.forEach((it, idx) => {
    it.number = idx + 1;
  });

  const totalSupported = allGeneratedItems.length;
  const flashcardCount = flashcardItems.length;
  const mcqCount = finalMcqs.length;
  const coverageSummary = `Document supports ${totalSupported} distinct questions; ${flashcardCount} converted to flashcards, ${mcqCount} MCQs.`;

  const suspiciousCount = allGeneratedItems.filter((it) => it.isSuspicious).length;

  return {
    items: allGeneratedItems,
    missingQuestionNumbers: [],
    chaptersDetected,
    suspiciousCount,
    totalExpected: totalSupported,
    isUnstructuredDocument: true,
    notesRoute: true,
    coverageSummary,
    totalSupported,
    flashcardCount,
    mcqCount,
    templateCounts,
  };
}

/**
 * Standard array-returning wrapper for parseTwoPassQuestionsAndAnswersDetailed.
 * Attaches diagnostics (missingQuestionNumbers, chaptersDetected, suspiciousCount, profileUsed)
 * for seamless backward compatibility.
 */
export function parseTwoPassQuestionsAndAnswers(
  pagesOrText: PdfPageWithLayout[] | string,
  options?: {
    profile?: ParserProfile;
    config?: ImporterThresholdConfig;
  }
): ParsedQaItem[] & {
  missingQuestionNumbers?: number[];
  chaptersDetected?: string[];
  suspiciousCount?: number;
  profileUsed?: ParserProfile;
  coverageSummary?: string;
  totalSupported?: number;
  flashcardCount?: number;
  mcqCount?: number;
  templateCounts?: Record<string, number>;
} {
  const result = parseTwoPassQuestionsAndAnswersDetailed(pagesOrText, options);
  const arr = [...result.items] as ParsedQaItem[] & {
    missingQuestionNumbers?: number[];
    chaptersDetected?: string[];
    suspiciousCount?: number;
    profileUsed?: ParserProfile;
    coverageSummary?: string;
    totalSupported?: number;
    flashcardCount?: number;
    mcqCount?: number;
    templateCounts?: Record<string, number>;
  };
  arr.missingQuestionNumbers = result.missingQuestionNumbers;
  arr.chaptersDetected = result.chaptersDetected;
  arr.suspiciousCount = result.suspiciousCount;
  arr.profileUsed = result.profileUsed;
  arr.coverageSummary = result.coverageSummary;
  arr.totalSupported = result.totalSupported;
  arr.flashcardCount = result.flashcardCount;
  arr.mcqCount = result.mcqCount;
  arr.templateCounts = result.templateCounts;
  return arr;
}

/**
 * Converts parsed Q&A items to validated Question records.
 * Carries over reviewStatus (verified vs needs_review) and sourcePage.
 */
export function toQuestions(parsedList: ParsedQaItem[]): StoredQuestion[] {
  return parsedList.map((item) => ({
    id: item.id || generateUUID(),
    question: item.stem,
    options: item.options.length >= 2 ? item.options : ["True", "False"],
    correctIndex: item.correctIndex,
    explanation: item.explanation,
    topicTag: item.chapter || "Extracted Exam",
    sourcePage: item.sourcePage || item.pageNumber,
    origin: "parsed_pdf",
    reviewStatus:
      item.reviewStatus ||
      (item.isSuspicious ? "needs_review" : item.hasIncompleteAnswer ? "needs_review" : "verified"),
  }));
}

/**
 * Converts parsed Q&A items to Active Recall Flashcards.
 */
export function toFlashcards(parsedList: ParsedQaItem[]): Flashcard[] {
  return parsedList.map((item) => {
    const correctLetter = (item.correctLetter || "a").toUpperCase();
    const correctChoiceText = item.options[item.correctIndex] || "";

    const front = item.stem;
    const back = `**Correct Answer:** Option ${correctLetter}: ${correctChoiceText}\n\n**Explanation:**\n${item.explanation}`;

    return {
      id: item.id || generateUUID(),
      front,
      back,
      category: item.chapter || "Study Flashcards",
      mastered: false,
    };
  });
}
