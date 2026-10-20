// ============================================
// EXAM PARSER - Universal Academic Question Importer
// Supports RFC 4180 CSV via PapaParse & Robust Plain Text Parsing
// Handles Multi-Line Stems, Varied Option Syntax & KaTeX Currency Escaping
// ============================================

import Papa from "papaparse";
import { Question, generateUUID } from "./examService";

export interface ParsedQuestionItem {
  question: Question;
  isValid: boolean;
  warnings: string[];
}

export interface ParseResult {
  items: ParsedQuestionItem[];
  validCount: number;
  warningCount: number;
  totalParsed: number;
}

/**
 * Escapes currency dollar signs (e.g. "$50", "$ 100", "$1.50")
 * so they do not collide with KaTeX LaTeX math equation delimiters ($...$).
 */
export function sanitizeCurrencyAndMath(rawText: string): string {
  if (!rawText) return "";

  // Replace lone currency signs like $50 or $ 100 with \$50 so KaTeX ignores them
  // A currency pattern is $ followed immediately by a digit or a space+digit, without math symbols
  return rawText.replace(/(?<!\\)\$(?=\s*\d+)/g, "\\$");
}

/**
 * Normalizes an answer letter or index to a 0-based number (0 for A, 1 for B, 2 for C, 3 for D).
 */
export function normalizeAnswerIndex(ansRaw: string | number): number {
  if (typeof ansRaw === "number") {
    if (ansRaw >= 0 && ansRaw <= 3) return ansRaw;
    if (ansRaw >= 1 && ansRaw <= 4) return ansRaw - 1;
  }

  const str = String(ansRaw).trim().toUpperCase();
  // Strip out "ANSWER:", "ANS:", "OPTION", etc.
  const clean = str.replace(/^(?:ANSWER|ANS|KEY|CORRECT|OPTION)[\s:.\-\)]*/i, "").trim();

  if (clean.startsWith("A") || clean === "1") return 0;
  if (clean.startsWith("B") || clean === "2") return 1;
  if (clean.startsWith("C") || clean === "3") return 2;
  if (clean.startsWith("D") || clean === "4") return 3;
  if (clean.startsWith("E") || clean === "5") return 4;

  return 0; // fallback to A
}

/**
 * Parses raw text containing questions (e.g. pasted from Word, past exams, or handouts).
 */
export function parsePlainTextQuestions(rawText: string, defaultTopic = "General"): ParseResult {
  const text = rawText.replace(/\r\n/g, "\n");
  const lines = text.split("\n");

  const rawBlocks: string[][] = [];
  let currentBlock: string[] = [];

  // Match question numbering like: "1. ", "1) ", "[1] ", "Q1. ", "Question 1:", "Problem 1."
  const questionStartRegex = /^(?:(?:Q|Question|Problem|Item|No\.?)?\s*#?\s*\d+[\.\)\:\-\]]|\(\d+\))\s+/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isNewQuestion = questionStartRegex.test(line.trim());

    if (isNewQuestion && currentBlock.length > 0) {
      rawBlocks.push(currentBlock);
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    rawBlocks.push(currentBlock);
  }

  const parsedItems: ParsedQuestionItem[] = [];

  for (const block of rawBlocks) {
    const blockText = block.join("\n").trim();
    if (!blockText) continue;

    const warnings: string[] = [];
    let stemLines: string[] = [];
    const options: string[] = [];
    let correctIndex = -1;
    let explanation = "";
    let topicTag = defaultTopic;

    // Regex patterns for options: A. / A) / (A) / [A] / a. / a) / (a) / *B)
    const optionRegex = /^(?:\*\s*)?(?:[A-Ea-e][\.\)\:\-\]]|\([A-Ea-e]\)|\[[A-Ea-e]\])\s+/;
    const answerRegex = /^(?:Answer|Ans|Key|Correct(?:\s+Answer)?)\s*[:\-\)]\s*([A-Ea-e1-5])/i;
    const explanationRegex = /^(?:Explanation|Rationale|Solution|Note)\s*[:\-\)]\s*(.+)/i;
    const topicRegex = /^(?:Topic|Category|Subject|Tag)\s*[:\-\)]\s*(.+)/i;

    let parsingState: "stem" | "options" | "meta" = "stem";

    for (let i = 0; i < block.length; i++) {
      const line = block[i].trim();
      if (!line) continue;

      if (answerRegex.test(line)) {
        const match = line.match(answerRegex);
        if (match) {
          correctIndex = normalizeAnswerIndex(match[1]);
        }
        parsingState = "meta";
        continue;
      }

      if (explanationRegex.test(line)) {
        const match = line.match(explanationRegex);
        explanation = match ? match[1].trim() : "";
        parsingState = "meta";
        continue;
      }

      if (topicRegex.test(line)) {
        const match = line.match(topicRegex);
        if (match) topicTag = match[1].trim();
        parsingState = "meta";
        continue;
      }

      if (optionRegex.test(line)) {
        parsingState = "options";
        // Check if option was marked with asterisk as correct: e.g. "* B) Option text"
        if (/^\*\s*/.test(line)) {
          correctIndex = options.length;
        }
        const optText = line.replace(/^(?:\*\s*)?(?:[A-Ea-e][\.\)\:\-\]]|\([A-Ea-e]\)|\[[A-Ea-e]\])\s+/, "").trim();
        options.push(optText);
        continue;
      }

      if (parsingState === "stem") {
        stemLines.push(line);
      } else if (parsingState === "options" && options.length > 0) {
        // Multi-line option continuation
        options[options.length - 1] += " " + line;
      } else if (parsingState === "meta" && explanation) {
        // Multi-line explanation continuation
        explanation += " " + line;
      }
    }

    // Clean up Question Stem: strip leading numbering like "1. ", "Question 2: "
    let questionStem = stemLines.join(" ").replace(questionStartRegex, "").trim();

    // Check Warnings
    if (!questionStem) {
      warnings.push("Missing question statement.");
    }

    if (options.length === 0) {
      warnings.push("No multiple-choice options found.");
    } else if (options.length !== 4) {
      warnings.push(`Expected 4 options, found ${options.length}.`);
    }

    if (correctIndex === -1) {
      warnings.push("No correct answer key specified (defaulted to A).");
      correctIndex = 0;
    }

    if (!explanation) {
      explanation = "Identified based on study materials and standard syllabus rules.";
    }

    // Pad or trim options to exactly 4 choices if possible
    while (options.length < 4) {
      options.push(`[Option ${String.fromCharCode(65 + options.length)} not provided]`);
    }

    const finalQuestion: Question = {
      id: generateUUID(),
      question: sanitizeCurrencyAndMath(questionStem),
      options: options.slice(0, 4).map((opt) => sanitizeCurrencyAndMath(opt)),
      correctIndex: Math.min(Math.max(correctIndex, 0), 3),
      explanation: sanitizeCurrencyAndMath(explanation),
      topicTag: topicTag || defaultTopic,
    };

    parsedItems.push({
      question: finalQuestion,
      isValid: Boolean(questionStem && options.length >= 2),
      warnings,
    });
  }

  const validCount = parsedItems.filter((i) => i.isValid).length;
  const warningCount = parsedItems.filter((i) => i.warnings.length > 0).length;

  return {
    items: parsedItems,
    validCount,
    warningCount,
    totalParsed: parsedItems.length,
  };
}

/**
 * Parses CSV formatted question sheets using PapaParse.
 * Expected columns (case-insensitive):
 * Question, Option A, Option B, Option C, Option D, Answer, Explanation, Topic
 */
export function parseCsvQuestions(csvContent: string, defaultTopic = "General"): ParseResult {
  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: "greedy",
  });

  const parsedItems: ParsedQuestionItem[] = [];

  for (const row of result.data) {
    const warnings: string[] = [];

    // Helper to find column regardless of case or whitespace
    const getVal = (possibleKeys: string[]): string => {
      const entry = Object.entries(row).find(([k]) =>
        possibleKeys.includes(k.trim().toLowerCase())
      );
      return entry ? entry[1]?.trim() || "" : "";
    };

    const questionStem = getVal(["question", "stem", "prompt", "q", "question text", "problem"]);
    const optA = getVal(["option a", "option_a", "optiona", "a", "choice a", "choice 1"]);
    const optB = getVal(["option b", "option_b", "optionb", "b", "choice b", "choice 2"]);
    const optC = getVal(["option c", "option_c", "optionc", "c", "choice c", "choice 3"]);
    const optD = getVal(["option d", "option_d", "optiond", "d", "choice d", "choice 4"]);

    const ansRaw = getVal(["answer", "ans", "correct", "key", "correct answer", "correct_answer"]);
    const explanation = getVal(["explanation", "rationale", "solution", "derivation"]) ||
      "Identified based on study materials and standard syllabus rules.";
    const topicTag = getVal(["topic", "category", "subject", "tag"]) || defaultTopic;

    const options = [optA, optB, optC, optD].filter(Boolean);

    if (!questionStem) {
      warnings.push("Missing question statement.");
    }
    if (options.length < 4) {
      warnings.push(`Expected 4 options, found ${options.length}.`);
    }

    const correctIndex = normalizeAnswerIndex(ansRaw);

    while (options.length < 4) {
      options.push(`[Option ${String.fromCharCode(65 + options.length)} not provided]`);
    }

    const question: Question = {
      id: generateUUID(),
      question: sanitizeCurrencyAndMath(questionStem),
      options: options.slice(0, 4).map((o) => sanitizeCurrencyAndMath(o)),
      correctIndex: Math.min(Math.max(correctIndex, 0), 3),
      explanation: sanitizeCurrencyAndMath(explanation),
      topicTag,
    };

    parsedItems.push({
      question,
      isValid: Boolean(questionStem && options.length >= 2),
      warnings,
    });
  }

  const validCount = parsedItems.filter((i) => i.isValid).length;
  const warningCount = parsedItems.filter((i) => i.warnings.length > 0).length;

  return {
    items: parsedItems,
    validCount,
    warningCount,
    totalParsed: parsedItems.length,
  };
}
