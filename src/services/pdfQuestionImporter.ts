// ============================================
// PDF QUESTION IMPORTER - Zero-Cost Rule-Based Q&A Extractor
// Extracts full exam questions and answer keys directly from test-prep PDFs
// (e.g. 1001 Math Problems, 501 Math Word Problems, GRE/SAT review books, board exams)
// $0 AI Cost · Instant Processing · 100% Deterministic Fidelity
// ============================================

import { Question, Flashcard, generateUUID } from "./examService";
import { sanitizeCurrencyAndMath } from "./examParser";
import { PdfLayoutItem, PdfPageWithLayout } from "./pdfService";
import { QuestionReviewStatus, StoredQuestion } from "./questionBankService";

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
  hasIncompleteAnswer?: boolean;
  isSuspicious?: boolean;
  suspiciousReasons?: string[];
  reviewStatus?: QuestionReviewStatus;
}

export interface ParseTwoPassResult {
  items: ParsedQaItem[];
  missingQuestionNumbers: number[];
  chaptersDetected: string[];
  suspiciousCount: number;
  totalExpected?: number;
}

/**
 * Publisher catalog, copyright, and distributor boilerplate patterns
 * commonly found in review books (e.g. LearningExpress, McGraw-Hill, Barron's).
 */
const CATALOG_BOILERPLATE_PATTERNS = [
  /Library of Congress Cataloging-in-Publication Data[\s\S]*?(?:ISBN[\s\d\-X]+|\d{4}|\n\n)/gi,
  /(?:^|\n)\s*(?:ISBN(?:-1[03])?:?\s*[\d\-X]+|ISBN\s+[\d\-X]+)\s*(?=\n|$)/gi,
  /(?:^|\n)\s*(?:All rights reserved\.?|Printed in the United States of America\.?|Manufactured in the United States\.?|Printed on acid-free paper\.?)\b[^\n]*/gi,
  /(?:^|\n)\s*(?:For more information (?:or to order|about)|Visit (?:us at )?www\.[\w\.\-]+\.\w+)\b[^\n]*/gi,
  /(?:^|\n)\s*(?:Copyright\s+(?:©|\(c\)|[0-9]{4})|©\s*[0-9]{4})\s+[\w\s,\.\-]+(?=\n|$)/gi,
  /(?:^|\n)\s*(?:LearningExpress\s+(?:1001|501|Review|Team|LLC)|Learning\s*Express,\s*LLC)\b[^\n]*/gi,
  /(?:^|\n)\s*\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s*(?=\n|$)/g, // printing number lines like 9 8 7 6 5 4 3 2 1
];

/**
 * Common running header and footer patterns that repeat on every page
 * (e.g. "12   1001 MATH PROBLEMS", "501 Math Word Problems   13", "Page 14 of 250").
 */
const RUNNING_HEADER_PATTERNS = [
  // Page number lines
  /(?:^|\n)\s*(?:Page\s+\d+(?:\s+of\s+\d+)?|\d+\s*\|\s*Page)\s*(?=\n|$)/gi,
  // Book titles with or without page margins (e.g. "1001 Math Problems", "501 Math Word Problems", "GRE Review")
  /(?:^|\n)\s*(?:\d{1,4}\s+)?(?:1001|501|GMAT|GRE|SAT|CSC|MCAT|ACT|NCLEX|LSAT|GED)\s+[A-Za-z\s\-]+(?:\s+\d{1,4})?\s*(?=\n|$)/gi,
  // Margin numbers flanking headers: e.g. "42   SECTION 1" or "SECTION 1   43"
  /(?:^|\n)\s*\d{1,4}\s+(?:CHAPTER|SECTION|PART|PRACTICE\s+TEST)\s+[\w\s\-]+\s*(?=\n|$)/gi,
  /(?:^|\n)\s*(?:CHAPTER|SECTION|PART|PRACTICE\s+TEST)\s+[\w\s\-]+\s+\d{1,4}\s*(?=\n|$)/gi,
];

/**
 * Normalizes unicode ligatures, running headers, catalog text, and currency symbols.
 */
export function cleanPageText(rawText: string): string {
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
    .replace(/\r\n/g, "\n");

  // Strip publisher and catalog boilerplate
  for (const pattern of CATALOG_BOILERPLATE_PATTERNS) {
    cleaned = cleaned.replace(pattern, "\n");
  }

  // Strip running headers and footers
  for (const pattern of RUNNING_HEADER_PATTERNS) {
    cleaned = cleaned.replace(pattern, "\n");
  }

  // Sanitize dollar signs to prevent KaTeX math collision
  return sanitizeCurrencyAndMath(cleaned);
}

/**
 * Strips residual catalog or running header artifacts from an individual string.
 */
export function sanitizeContentText(text: string): string {
  if (!text) return "";
  let res = text
    .replace(/\[Page\s+\d+\]/gi, "")
    .replace(/(?:^|\n)\s*(?:\d{1,4}\s+)?(?:1001|501|GMAT|GRE|SAT|CSC)\s+[A-Za-z\s\-]+(?:\s+\d{1,4})?\s*(?=\n|$)/gi, "\n")
    .replace(/Library of Congress[\s\S]*/gi, "")
    .replace(/ISBN(?:-1[03])?:?\s*[\d\-X]+/gi, "")
    .replace(/All rights reserved[\s\S]*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
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

    // Check if item is a lone digit or small number that could be a numerator
    if (/^\d{1,3}$/.test(curStr) && i + 1 < sorted.length) {
      // Look for a denominator directly below current item with overlapping X
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

  // Replace unicode fractions as well
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

  // Count question markers: e.g. "1. ", "2. ", "3. " at start of lines
  const questionMatches = text.match(/(?:^|\n)\s*(\d{1,4})[\.\)]\s+[A-Z]/g) || [];
  // Count option markers: e.g. "a. ", "b. ", "c. ", "d. "
  const optionMatches = text.match(/(?:^|\n)\s*[a-dA-D][\.\)]\s+/g) || [];
  // Count answer key markers: e.g. "Answers", "1. b.", "2. c."
  const answerSectionMatches = text.match(/(?:Answers|Answer Explanations|Solutions|Answer Key)/gi) || [];

  const estimatedQuestionCount = questionMatches.length;
  const optionDensity = optionMatches.length;

  const isLikelyQa =
    (estimatedQuestionCount >= 3 && optionDensity >= 8) ||
    (answerSectionMatches.length > 0 && estimatedQuestionCount >= 2) ||
    (estimatedQuestionCount >= 5);

  const sampleConfidence = Math.min(
    100,
    Math.round((estimatedQuestionCount * 2 + optionDensity * 1 + answerSectionMatches.length * 15))
  );

  return {
    isLikelyQa,
    estimatedQuestionCount,
    sampleConfidence,
  };
}

/**
 * Splits a question block into a stem and an ordered list of options.
 * Validates canonical sequence (A -> B -> C -> D) to prevent option bleeding,
 * mid-sentence premature splits (e.g. "(a) as defined"), or formula truncation.
 */
export function splitStemAndOptions(block: string): { stem: string; options: string[] } | null {
  if (!block || block.length < 5) return null;

  // Regex to match option tokens in sequence: A/a, B/b, C/c, D/d, E/e
  // Matches tokens either at start of line, or preceded by whitespace / punctuation.
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

  if (matches.length < 2) return null;

  // Look for a valid continuous sequence starting at 'a'
  let startIdx = -1;
  let validSequence: typeof matches = [];

  for (let i = 0; i < matches.length; i++) {
    if (matches[i].letter === "a") {
      let currentSeq = [matches[i]];
      let expectedCharCode = 98; // 'b'

      for (let j = i + 1; j < matches.length; j++) {
        if (matches[j].letter.charCodeAt(0) === expectedCharCode) {
          currentSeq.push(matches[j]);
          expectedCharCode++;
          if (currentSeq.length >= 5) break; // max A-E
        }
      }

      // Valid if it has at least A, B, and C (or A, B, C, D)
      if (currentSeq.length >= 3 && currentSeq.length > validSequence.length) {
        validSequence = currentSeq;
        startIdx = i;
      }
    }
  }

  if (validSequence.length < 2) {
    // Fallback: check simple regex split if strict sequence wasn't found
    const simpleSplit = block.split(/(?:^|\n|\s{2,}|\s+(?=[b-eB-E][\.\)]|\([b-eB-E]\)))(?=[a-eA-E][\.\)]|\([a-eA-E]\))/);
    if (simpleSplit.length >= 3) {
      const stem = sanitizeContentText(simpleSplit[0]);
      const rawOpts = simpleSplit.slice(1);
      const options = rawOpts
        .map((opt) => sanitizeContentText(opt.replace(/^[a-eA-E][\.\)\]]\s*|^\([a-eA-E]\)\s*/, "")))
        .filter((opt) => opt.length > 0);
      return { stem, options };
    }
    return null;
  }

  // We have a verified sequence of option tokens
  const firstToken = validSequence[0];
  const stem = sanitizeContentText(block.substring(0, firstToken.index));

  const options: string[] = [];
  for (let i = 0; i < validSequence.length; i++) {
    const cur = validSequence[i];
    const startPos = cur.index + cur.length;
    const endPos = i + 1 < validSequence.length ? validSequence[i + 1].index : block.length;
    const optText = sanitizeContentText(block.substring(startPos, endPos));
    if (optText) {
      options.push(optText);
    }
  }

  return { stem, options };
}

/**
 * Evaluates whether a parsed question is suspicious and needs manual review.
 */
export function evaluateSuspiciousItem(
  item: {
    stem: string;
    options: string[];
    hasIncompleteAnswer?: boolean;
    explanation?: string;
  }
): { isSuspicious: boolean; reasons: string[]; reviewStatus: QuestionReviewStatus } {
  const reasons: string[] = [];

  // Check 1: Missing answer key
  if (item.hasIncompleteAnswer) {
    reasons.push("Answer key not found in section or key index");
  }

  // Check 2: Question stem anomalies
  const stem = item.stem || "";
  if (stem.length < 15) {
    reasons.push("Question stem suspiciously short (< 15 characters)");
  } else if (stem.length > 2500) {
    reasons.push("Question stem abnormally long (> 2500 characters)");
  }

  if (/(?:Library of Congress|Cataloging-in-Publication|ISBN\s+[\d\-X]+|All rights reserved)/i.test(stem)) {
    reasons.push("Publisher or catalog metadata detected in question stem");
  }

  if (/(?:1001|501)\s+Math\s+Problems/i.test(stem)) {
    reasons.push("Running book header leaked into question stem");
  }

  // Check 3: Options anomalies
  const opts = item.options || [];
  if (opts.length < 2) {
    reasons.push("Fewer than 2 choices available");
  }

  const seenOpts = new Set<string>();
  let hasDuplicate = false;
  for (const opt of opts) {
    const lower = opt.toLowerCase().trim();
    if (seenOpts.has(lower) && lower.length > 0) {
      hasDuplicate = true;
    }
    seenOpts.add(lower);

    if (opt.length > 500) {
      reasons.push("Option text abnormally long (> 500 characters)");
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

  return { isSuspicious, reasons, reviewStatus };
}

/**
 * Unified robust parser for review books (e.g. 1001 Math Problems, 501 Math Word Problems, GRE/SAT).
 * Extracts question statements, multiple-choice options, and chapter answer keys across all sections.
 * Automatically flags suspicious items and reports missing question numbers.
 */
export function parseTwoPassQuestionsAndAnswersDetailed(
  pagesOrText: PdfPageWithLayout[] | string
): ParseTwoPassResult {
  let fullCleanedText = "";

  if (Array.isArray(pagesOrText)) {
    fullCleanedText = pagesOrText
      .map((p) => `\n[Page ${p.pageNumber}]\n` + cleanPageText(p.text || reconstructStackedFractions(p.items)))
      .join("\n");
  } else {
    fullCleanedText = cleanPageText(pagesOrText);
  }

  const questionsMap = new Map<string, { number: number; stem: string; options: string[]; chapter: string; pageNumber?: number }>();
  const answersMap = new Map<string, { number: number; letter: string; explanation: string; chapter: string }>();
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

    // Attempt to split into stem and options
    const splitResult = splitStemAndOptions(block);

    // If it has multiple-choice choices, IT IS DEFINITIVELY A QUESTION, even if isAnswerMode was on!
    if (splitResult && splitResult.options.length >= 2) {
      isAnswerMode = false; // Always exit answer mode when a true question block is encountered

      const stem = sanitizeContentText(splitResult.stem);
      const options = [...splitResult.options];

      while (options.length < 4) {
        options.push(`Choice ${String.fromCharCode(65 + options.length)}`);
      }

      if (stem.length > 3) {
        const key = `${currentChapter}::${currentNum}`;
        const globalKey = `${currentNum}`;
        const itemData = {
          number: currentNum,
          stem,
          options: options.slice(0, 5),
          chapter: currentChapter,
          pageNumber: currentPage,
        };
        questionsMap.set(key, itemData);
        if (!questionsMap.has(globalKey)) {
          questionsMap.set(globalKey, itemData);
        }
      }
    } else {
      // Check if it's an answer key: e.g. "d. Work backwards to find..." or "[d] ..." or "d) ..."
      const ansMatch = block.match(/^(?:Choice\s+|Option\s+|\()?([a-eA-E])(?:[\.\)\:\-\s\]]|\s+is\s+correct)?\s*([\s\S]*)/i);
      if (ansMatch) {
        const letter = ansMatch[1].toLowerCase();
        let explanation = sanitizeContentText(ansMatch[2] || "");
        // Clean out any trailing catalog text at the end of explanations
        explanation = explanation.replace(/(?:LearningExpress|Library of Congress|All rights reserved)[\s\S]*/gi, "").trim();

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
      }

      // Also check if block contains a sequence of quick answers like "1. a  2. b  3. c"
      const quickAnswers = [...block.matchAll(/(?:^|\s+)(\d{1,4})[\.\)]\s*([a-eA-E])\b/g)];
      if (quickAnswers.length > 1) {
        for (const qa of quickAnswers) {
          const qNum = parseInt(qa[1], 10);
          const qLetter = qa[2].toLowerCase();
          const qData = {
            number: qNum,
            letter: qLetter,
            explanation: `Verified correct answer: Option ${qLetter.toUpperCase()}.`,
            chapter: currentChapter,
          };
          answersMap.set(`${currentChapter}::${qNum}`, qData);
          answersMap.set(String(qNum), qData);
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
        // If we were in answer mode, entering a new chapter under answers continues answer mode
        currentNum = null;
        i++; // skip next line since consumed
        continue;
      }
    }

    // Detect chapter headings: Chapter 1 / SECTION 1 / Miscellaneous Math / Fractions / etc.
    const chMatch = trimmed.match(/^(?:Chapter\s+(\d+)?|SECTION\s+(\d+)?|PART\s+(\d+)?|\b(\d+)\s+(?:Miscellaneous|Fractions|Decimals|Percentages?|Percents|Algebra|Geometry|Word Problems|Practice Test|Set\s+\d+))\b[^\n]*/i);
    if (chMatch) {
      flush();
      const detectedName = chMatch[0].trim();
      // Ensure it's not a running head with trailing margin number
      if (!/\s+\d{1,4}$/.test(detectedName)) {
        currentChapter = detectedName;
        chaptersDetected.add(currentChapter);
        currentNum = null;
        continue;
      }
    }

    // Detect Answers section headers
    if (/^(?:Answers\s+and\s+Explanations|Answers\s+&\s+Explanations|Answer\s+Explanations|Answers|Solutions|Answer\s+Key)\b/i.test(trimmed)) {
      flush();
      isAnswerMode = true;
      currentNum = null;
      continue;
    }

    // Detect question/answer numbering: "1. ", "64. ", "1) "
    const numMatch = trimmed.match(/^(\d{1,4})[\.\)]\s+([\s\S]*)/);
    if (numMatch) {
      flush();
      currentNum = parseInt(numMatch[1], 10);
      currentBuffer = [numMatch[2]];
      continue;
    }

    if (currentNum !== null) {
      currentBuffer.push(line);
    }
  }
  flush();

  // De-duplicate questions by number
  const seenNumbers = new Set<number>();
  const items: ParsedQaItem[] = [];
  const numbersList: number[] = [];

  for (const q of questionsMap.values()) {
    if (seenNumbers.has(q.number)) continue;
    seenNumbers.add(q.number);
    numbersList.push(q.number);

    // Look up answer key
    const ans = answersMap.get(`${q.chapter}::${q.number}`) || answersMap.get(String(q.number));
    let correctLetter = "a";
    let correctIndex = 0;
    let explanation = "Identified based on study materials.";
    let hasIncompleteAnswer = false;

    if (ans) {
      correctLetter = ans.letter.toLowerCase();
      correctIndex = ["a", "b", "c", "d", "e"].indexOf(correctLetter);
      if (correctIndex < 0) correctIndex = 0;
      explanation = ans.explanation || `Answer: Option ${ans.letter.toUpperCase()}.`;
    } else {
      hasIncompleteAnswer = true;
      explanation = "Answer key not explicitly indexed in this section.";
    }

    // Evaluate if item is suspicious
    const evaluation = evaluateSuspiciousItem({
      stem: q.stem,
      options: q.options,
      hasIncompleteAnswer,
      explanation,
    });

    items.push({
      id: generateUUID(),
      number: q.number,
      stem: q.stem,
      options: q.options,
      correctLetter,
      correctIndex,
      explanation,
      chapter: q.chapter,
      pageNumber: q.pageNumber,
      hasIncompleteAnswer,
      isSuspicious: evaluation.isSuspicious,
      suspiciousReasons: evaluation.reasons,
      reviewStatus: evaluation.reviewStatus,
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
  };
}

/**
 * Standard array-returning wrapper for parseTwoPassQuestionsAndAnswersDetailed.
 * Attaches missingQuestionNumbers, chaptersDetected, and suspiciousCount to the array
 * for seamless backward compatibility with existing components and tests.
 */
export function parseTwoPassQuestionsAndAnswers(
  pagesOrText: PdfPageWithLayout[] | string
): ParsedQaItem[] & { missingQuestionNumbers?: number[]; chaptersDetected?: string[]; suspiciousCount?: number } {
  const result = parseTwoPassQuestionsAndAnswersDetailed(pagesOrText);
  const arr = [...result.items] as ParsedQaItem[] & {
    missingQuestionNumbers?: number[];
    chaptersDetected?: string[];
    suspiciousCount?: number;
  };
  arr.missingQuestionNumbers = result.missingQuestionNumbers;
  arr.chaptersDetected = result.chaptersDetected;
  arr.suspiciousCount = result.suspiciousCount;
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
    options: item.options.length >= 4 ? item.options.slice(0, 5) : item.options,
    correctIndex: item.correctIndex,
    explanation: item.explanation,
    topicTag: item.chapter || "Extracted Exam",
    sourcePage: item.pageNumber,
    origin: "parsed_pdf",
    reviewStatus: item.reviewStatus || (item.isSuspicious ? "needs_review" : (item.hasIncompleteAnswer ? "needs_review" : "verified")),
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
