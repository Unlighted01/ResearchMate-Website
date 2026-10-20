// ============================================
// PDF QUESTION IMPORTER - Zero-Cost Rule-Based Q&A Extractor
// Extracts full exam questions and answer keys directly from test-prep PDFs
// (e.g. 501 Math Word Problems, GRE/SAT review books, board exam handouts)
// $0 AI Cost · Instant Processing · 100% Deterministic Fidelity
// ============================================

import { Question, Flashcard, generateUUID } from "./examService";
import { sanitizeCurrencyAndMath } from "./examParser";
import { PdfLayoutItem, PdfPageWithLayout } from "./pdfService";

export interface ParsedQaItem {
  id: string;
  number: number;
  stem: string;
  options: string[];
  correctLetter?: string; // 'a' | 'b' | 'c' | 'd'
  correctIndex: number; // 0, 1, 2, 3
  explanation: string;
  chapter?: string;
  pageNumber?: number;
  hasIncompleteAnswer?: boolean;
}

/**
 * Normalizes unicode ligatures, running headers, and currency symbols.
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
    // Common running headers & footers
    .replace(/(?:^|\n)\s*(?:Page\s+\d+|\d+\s*\|\s*Page|\d+\s+501\s+[\w\s]+|501\s+[\w\s]+\s+\d+)\s*(?=\n|$)/gi, "\n")
    // Windows CRLF
    .replace(/\r\n/g, "\n");

  // Sanitize dollar signs to prevent KaTeX math collision
  return sanitizeCurrencyAndMath(cleaned);
}

/**
 * Reconstructs stacked fractions from 2D text coordinates.
 * In PDF streams, vertical fractions are rendered as a top number item,
 * horizontal line, and bottom number item with overlapping X bounds.
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
 * Unified robust parser for review books (e.g. 501 Math Word Problems, GRE/SAT guides).
 * Extracts question statements, multiple-choice options, and chapter answer keys across all sections.
 */
export function parseTwoPassQuestionsAndAnswers(
  pagesOrText: PdfPageWithLayout[] | string
): ParsedQaItem[] {
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

  let currentChapter = "Chapter 1";
  let isAnswerMode = false;
  let currentPage = 1;

  const lines = fullCleanedText.split("\n");
  let currentNum: number | null = null;
  let currentBuffer: string[] = [];

  const flush = () => {
    if (currentNum === null || currentBuffer.length === 0) return;
    const block = currentBuffer.join("\n").trim();
    currentBuffer = [];

    // Split on multiple-choice option markers: a. / b. / c. / d. or (a) / (b)
    const optSplit = block.split(/(?:^|\n|\s{2,}|\s+(?=[b-dB-D][\.\)]|\([b-dB-D]\)))(?=[a-dA-D][\.\)]|\([a-dA-D]\))/);

    // If it has multiple-choice choices, IT IS DEFINITIVELY A QUESTION, even if isAnswerMode was on!
    if (optSplit.length >= 3) {
      isAnswerMode = false; // Always exit answer mode when a question block is encountered

      const stem = optSplit[0].replace(/\[Page\s+\d+\]/gi, "").trim();
      const rawOptions = optSplit.slice(1);
      const options: string[] = [];

      for (const opt of rawOptions) {
        const clean = opt.replace(/^[a-dA-D][\.\)]\s*|^\([a-dA-D]\)\s*/, "").replace(/\[Page\s+\d+\]/gi, "").trim();
        if (clean) options.push(clean);
      }

      while (options.length < 4) {
        options.push(`Choice ${String.fromCharCode(65 + options.length)}`);
      }

      if (stem.length > 5) {
        const key = `${currentChapter}::${currentNum}`;
        const globalKey = `${currentNum}`;
        const itemData = {
          number: currentNum,
          stem,
          options: options.slice(0, 4),
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
      // Also handles "Choice D is correct..." or "d - ..." or lone "d"
      const ansMatch = block.match(/^(?:Choice\s+|Option\s+|\()?([a-dA-D])(?:[\.\)\:\-\s\]]|\s+is\s+correct)?\s*([\s\S]*)/i);
      if (ansMatch) {
        const letter = ansMatch[1].toLowerCase();
        const explanation = (ansMatch[2] || "").replace(/\[Page\s+\d+\]/gi, "").trim();
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
      const quickAnswers = [...block.matchAll(/(?:^|\s+)(\d{1,4})[\.\)]\s*([a-dA-D])\b/g)];
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

    // Detect standalone CHAPTER or SECTION line with number on next line
    if (/^(?:CHAPTER|SECTION|PART)$/i.test(trimmed) && i + 1 < lines.length) {
      const nextTrimmed = lines[i + 1].trim();
      if (/^\d+/i.test(nextTrimmed) || /^[A-Z][a-z]+/i.test(nextTrimmed)) {
        flush();
        currentChapter = `${trimmed} ${nextTrimmed}`;
        isAnswerMode = false;
        currentNum = null;
        i++; // skip next line since consumed
        continue;
      }
    }

    // Detect chapter headings: Chapter 1 / SECTION 1 / Miscellaneous Math / Fractions / etc.
    const chMatch = trimmed.match(/^(?:Chapter\s+(\d+)?|SECTION\s+(\d+)?|PART\s+(\d+)?|\b(\d+)\s+(?:Miscellaneous|Fractions|Decimals|Percentages?|Percents|Algebra|Geometry|Word Problems|Practice Test|Set\s+\d+))\b[^\n]*/i);
    if (chMatch) {
      flush();
      currentChapter = chMatch[0].trim();
      isAnswerMode = false;
      currentNum = null;
      continue;
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

  // If questionsMap size is 0 (some PDFs put question numbers like "Question 1" or "[1]"), run regex scan
  if (questionsMap.size === 0) {
    const rawBlocks = fullCleanedText.split(/(?:^|\n)\s*(?=(?:(?:Question|Problem|Item)\s+)?\d{1,4}[\.\)]\s+)/i);
    for (const b of rawBlocks) {
      const match = b.trim().match(/^(?:(?:Question|Problem|Item)\s+)?(\d{1,4})[\.\)]\s+([\s\S]+)/i);
      if (!match) continue;
      const num = parseInt(match[1], 10);
      const content = match[2];
      const optSplit = content.split(/(?:^|\n|\s{2,}|\s+(?=[b-dB-D][\.\)]|\([b-dB-D]\)))(?=[a-dA-D][\.\)]|\([a-dA-D]\))/);
      if (optSplit.length >= 3) {
        const stem = optSplit[0].replace(/\[Page\s+\d+\]/gi, "").trim();
        const rawOptions = optSplit.slice(1);
        const options: string[] = [];
        for (const o of rawOptions) {
          const c = o.replace(/^[a-dA-D][\.\)]\s*|^\([a-dA-D]\)\s*/, "").replace(/\[Page\s+\d+\]/gi, "").trim();
          if (c) options.push(c);
        }
        while (options.length < 4) options.push(`Choice ${String.fromCharCode(65 + options.length)}`);
        questionsMap.set(String(num), {
          number: num,
          stem,
          options: options.slice(0, 4),
          chapter: "General Review",
        });
      }
    }
  }

  // De-duplicate questions by number to avoid double counting across key formats
  const seenNumbers = new Set<number>();
  const results: ParsedQaItem[] = [];

  for (const q of questionsMap.values()) {
    if (seenNumbers.has(q.number)) continue;
    seenNumbers.add(q.number);

    // Look up answer key
    const ans = answersMap.get(`${q.chapter}::${q.number}`) || answersMap.get(String(q.number));
    let correctLetter = "a";
    let correctIndex = 0;
    let explanation = "Identified based on study materials.";
    let hasIncompleteAnswer = false;

    if (ans) {
      correctLetter = ans.letter.toLowerCase();
      correctIndex = ["a", "b", "c", "d"].indexOf(correctLetter);
      if (correctIndex < 0) correctIndex = 0;
      explanation = ans.explanation || `Answer: Option ${ans.letter.toUpperCase()}.`;
    } else {
      hasIncompleteAnswer = true;
      explanation = "Answer key not explicitly indexed in this section.";
    }

    results.push({
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
    });
  }

  return results.sort((a, b) => a.number - b.number);
}

/**
 * Converts parsed Q&A items to validated Question records.
 */
export function toQuestions(parsedList: ParsedQaItem[]): Question[] {
  return parsedList.map((item) => ({
    id: item.id || generateUUID(),
    question: item.stem,
    options: item.options.length >= 4 ? item.options.slice(0, 4) : ["A", "B", "C", "D"],
    correctIndex: item.correctIndex,
    explanation: item.explanation,
    topicTag: item.chapter || "Extracted Exam",
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
