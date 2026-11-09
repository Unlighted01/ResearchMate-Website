// ============================================
// DISTRACTOR QUALITY SERVICE
// Multi-pass linting, outlier detection, and high-craft distractor generation.
// Enforces psychometric exam standards: no stem leaks, balanced length/format,
// realistic wrong-path traps, and eliminates lazy distractors.
// 100% Offline · $0 API Cost · Browser & Node Compatible
// ============================================

export interface DistractorQualityConfig {
  /** Ratio of correct option length to average distractor length before flagging as outlier (default: 2.0) */
  lengthOutlierRatio: number;
  /** Minimum character length of a word to be considered a content word for stem leak checks (default: 4) */
  minContentWordLength: number;
  /** Token / string similarity ratio to flag duplicate or near-duplicate options (default: 0.85) */
  nearDuplicateThreshold: number;
  /** Automatically mask leaked terms in the question stem with a blank (default: true) */
  autoFixStemLeak: boolean;
  /** Minimum attempts before calculating item-level distractor performance flags (default: 10) */
  minAttemptsForItemStats: number;
  /** Distractor pick rate below which a distractor is deemed ineffective (default: 0.05 = 5%) */
  ineffectiveDistractorThreshold: number;
  /** Accuracy rate above which an item is flagged as too easy (default: 0.95 = 95%) */
  tooEasyAccuracyThreshold: number;
}

export const DEFAULT_DISTRACTOR_CONFIG: DistractorQualityConfig = {
  lengthOutlierRatio: 2.0,
  minContentWordLength: 4,
  nearDuplicateThreshold: 0.85,
  autoFixStemLeak: true,
  minAttemptsForItemStats: 10,
  ineffectiveDistractorThreshold: 0.05,
  tooEasyAccuracyThreshold: 0.95,
};

// Common English grammatical stopwords and generic exam framing
export const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "also", "am", "an", "and", "any", "are", "aren't",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "can't",
  "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
  "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he",
  "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is", "isn't", "it",
  "it's", "its", "itself", "just", "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off",
  "on", "once", "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should",
  "so", "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these",
  "they", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "were",
  "weren't", "what", "when", "where", "which", "while", "who", "whom", "why", "with", "would", "wouldn't", "you",
  "your", "yours", "yourself", "yourselves",
  // Common generic exam instructions (domain nouns like "public" or "officials" are NOT excluded)
  "which", "following", "defined", "under", "term", "section", "rule", "provision", "stated", "act",
  "refers", "means", "shall", "order"
]);

export const NUMBER_WORD_TO_DIGIT: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, "forty-five": 45, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000,
};

export const DIGIT_TO_NUMBER_WORD: Record<number, string> = {
  0: "zero", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
  11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen", 15: "fifteen", 16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen",
  20: "twenty", 30: "thirty", 45: "forty-five", 50: "fifty", 60: "sixty", 70: "seventy", 80: "eighty", 90: "ninety",
  100: "hundred", 1000: "thousand", 5000: "five thousand", 25000: "twenty-five thousand",
};

export const ABSOLUTE_WORDS = ["always", "never", "only", "exclusively", "solely", "impossible"];

export type DistractorRuleType =
  | "stem-leak"
  | "length-outlier"
  | "format-outlier"
  | "all-none-above"
  | "absolute-word"
  | "duplicate-option";

export interface DistractorLintIssue {
  rule: DistractorRuleType;
  message: string;
  autoFixed?: boolean;
  fixedStem?: string;
  leakedWord?: string;
}

export interface DistractorLintResult {
  passed: boolean;
  canShipAsMcq: boolean;
  autoFixed: boolean;
  fixedStem?: string;
  issues: DistractorLintIssue[];
  reasons: string[];
}

/**
 * Normalizes text for comparison (strips markdown, math wrappers, and extra whitespace).
 */
export function normalizeOptionText(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/[$*_`~]/g, "")
    .replace(/[^\w\s.%-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ParsedNumericOption {
  value: number;
  unit: string;
}

/**
 * Parses numeric options like "15 days", "25 %", "₱5,000", "$60 km/h",
 * or phrased numeric options like "Under 18 years of age", "Within 15 days".
 */
export function parseNumericOption(text: string): ParsedNumericOption | null {
  const norm = normalizeOptionText(text);

  // 1. Leading number: "$ 15.5", "15 days", "25 %"
  const leadingMatch = norm.match(/^[\$€£₱]?\s*(\d+(?:\.\d+)?)\s*(.*)$/i);
  if (leadingMatch) {
    const val = parseFloat(leadingMatch[1]);
    if (!isNaN(val)) {
      return {
        value: val,
        unit: (leadingMatch[2] || "").trim().toLowerCase(),
      };
    }
  }

  // 2. Embedded numeric quantity within template: "under 18 years of age"
  const embeddedMatch = norm.match(/^(.*?)\b(\d+(?:\.\d+)?)\b\s*(.*)$/i);
  if (embeddedMatch) {
    const val = parseFloat(embeddedMatch[2]);
    if (!isNaN(val)) {
      const template = `${(embeddedMatch[1] || "").trim()} ___ ${(embeddedMatch[3] || "").trim()}`.toLowerCase();
      return {
        value: val,
        unit: template,
      };
    }
  }

  return null;
}

/**
 * Compares two options for duplicate detection.
 * If both options are numeric with distinct numbers (e.g. "15 days" vs "25 days"),
 * they are mathematically distinct and return 0.0 similarity.
 */
export function compareOptionDuplicateSimilarity(optA: string, optB: string): number {
  const normA = normalizeOptionText(optA);
  const normB = normalizeOptionText(optB);
  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const numA = parseNumericOption(optA);
  const numB = parseNumericOption(optB);

  if (numA && numB) {
    // If the numbers are mathematically different, they are definitely distinct options!
    if (Math.abs(numA.value - numB.value) > 1e-6) {
      return 0.0;
    }
    // Same number: compare units (e.g. "15 days" vs "15 working days")
    if (numA.unit === numB.unit) return 1.0;
    return computeStringSimilarity(numA.unit, numB.unit);
  }

  return computeStringSimilarity(normA, normB);
}

/**
 * Morphological stemmer: strips common inflections (plurals, -ing, -ed)
 * and derivational suffixes (-tion, -ism, -ity, -ment, -ness, -al, -ly)
 * to compare lexical roots.
 */
export function stemWord(word: string): string {
  let s = word.toLowerCase().trim().replace(/[^a-z]/g, "");
  if (s.length <= 3) return s;

  // Plurals and third-person singular
  if (s.endsWith("ies") && s.length > 4) {
    s = s.slice(0, -3) + "y";
  } else if (s.endsWith("sses")) {
    s = s.slice(0, -2);
  } else if (s.endsWith("s") && !s.endsWith("ss") && !s.endsWith("us") && !s.endsWith("is") && s.length > 3) {
    s = s.slice(0, -1);
  }

  // -ing and -ed
  if (s.endsWith("ing") && s.length > 5) {
    s = s.slice(0, -3);
  } else if (s.endsWith("ed") && s.length > 4) {
    s = s.slice(0, -2);
  }

  // Common derivational suffixes: -tional, -tion, -sion, -ity, -ism, -ness, -ment, -al, -ly, -cratic, -cracy, -ic
  if (s.endsWith("cratic") && s.length > 7) {
    s = s.slice(0, -2); // democratic -> democrat
  } else if (s.endsWith("cracy") && s.length > 6) {
    s = s.slice(0, -1) + "t"; // democracy -> democrat
  }
  if (s.endsWith("tional") && s.length > 7) {
    s = s.slice(0, -4);
  }
  if ((s.endsWith("tion") || s.endsWith("sion")) && s.length > 5) {
    s = s.slice(0, -3);
  } else if (s.endsWith("ism") && s.length > 5) {
    s = s.slice(0, -3);
    if (s.endsWith("al") && s.length > 5) s = s.slice(0, -2);
  } else if (s.endsWith("ity") && s.length > 5) {
    s = s.slice(0, -3);
  } else if (s.endsWith("ness") && s.length > 6) {
    s = s.slice(0, -4);
  } else if (s.endsWith("ment") && s.length > 6) {
    s = s.slice(0, -4);
  } else if (s.endsWith("ly") && s.length > 4) {
    s = s.slice(0, -2);
  } else if (s.endsWith("al") && s.length > 5 && !s.endsWith("cial") && !s.endsWith("tial")) {
    s = s.slice(0, -2);
  } else if (s.endsWith("ic") && s.length > 5) {
    s = s.slice(0, -2);
  }

  // Strip silent terminal 'e' for length > 4 so root matches -ing/-ed forms (e.g. receive vs receiving -> receiv)
  if (s.endsWith("e") && s.length > 4) {
    s = s.slice(0, -1);
  }

  return s;
}

/**
 * Computes Levenshtein and token similarity between two strings (0.0 to 1.0).
 */
export function computeStringSimilarity(a: string, b: string): number {
  const s1 = a.trim().toLowerCase();
  const s2 = b.trim().toLowerCase();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);

  // Single-row dynamic programming for character Levenshtein
  const row = Array.from({ length: len2 + 1 }, (_, i) => i);
  for (let i = 1; i <= len1; i++) {
    let prev = i;
    for (let j = 1; j <= len2; j++) {
      const val = s1[i - 1] === s2[j - 1] ? row[j - 1] : Math.min(row[j - 1], prev, row[j]) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[len2] = prev;
  }
  const charSim = Math.max(0, 1 - row[len2] / (maxLen || 1));

  // Word token containment & Jaccard similarity
  const words1 = new Set(s1.split(/\s+/).filter(Boolean));
  const words2 = new Set(s2.split(/\s+/).filter(Boolean));
  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }
  const minWordCount = Math.min(words1.size, words2.size);
  const tokenContainment = minWordCount > 0 ? intersection / minWordCount : 0;
  const tokenJaccard = (words1.size + words2.size - intersection) > 0
    ? intersection / (words1.size + words2.size - intersection)
    : 0;

  // High token containment with close length (e.g. "15 working days" vs "15 days")
  if (tokenContainment >= 1.0 && Math.abs(words1.size - words2.size) <= 1) {
    return Math.max(charSim, 0.88);
  }

  return Math.max(charSim, tokenJaccard);
}

/**
 * Extracts meaningful content words from an option string.
 */
export function extractContentWords(text: string, minLength: number = 4): string[] {
  const norm = normalizeOptionText(text);
  const words = norm.split(/\s+/).filter((w) => w.length >= minLength && !STOPWORDS.has(w) && !/^\d+$/.test(w));
  return Array.from(new Set(words));
}

/**
 * Lints a multiple-choice question against quality criteria.
 * Detects stem leaks, length/format outliers, absolute words, and duplicates.
 */
export function lintDistractorQuality(
  item: {
    stem: string;
    options: string[];
    correctIndex: number;
    questionType?: string;
  },
  config: Partial<DistractorQualityConfig> = {}
): DistractorLintResult {
  const cfg: DistractorQualityConfig = { ...DEFAULT_DISTRACTOR_CONFIG, ...config };
  const issues: DistractorLintIssue[] = [];
  let autoFixed = false;
  let currentStem = item.stem;

  // Skip non-MCQ questions
  if (item.questionType === "free_response" || !item.options || item.options.length < 2) {
    return { passed: true, canShipAsMcq: true, autoFixed: false, issues: [], reasons: [] };
  }

  const correctIdx = item.correctIndex >= 0 && item.correctIndex < item.options.length ? item.correctIndex : 0;
  const correctOpt = item.options[correctIdx] || "";
  const distractorOpts = item.options.filter((_, idx) => idx !== correctIdx);

  // -------------------------------------------------------------
  // 1. DUPLICATE OR NEAR-DUPLICATE OPTIONS
  // Compares numeric options mathematically (25 days !== 15 days),
  // and textual options via Levenshtein/token containment.
  // -------------------------------------------------------------
  for (let i = 0; i < item.options.length; i++) {
    for (let j = i + 1; j < item.options.length; j++) {
      const optA = item.options[i];
      const optB = item.options[j];
      const normA = normalizeOptionText(optA);
      const normB = normalizeOptionText(optB);

      if (normA === normB) {
        issues.push({
          rule: "duplicate-option",
          message: `Duplicate option detected: "${optA}" and "${optB}"`,
        });
      } else {
        const sim = compareOptionDuplicateSimilarity(optA, optB);
        if (sim >= cfg.nearDuplicateThreshold) {
          issues.push({
            rule: "duplicate-option",
            message: `Near-duplicate option detected (${Math.round(sim * 100)}% similar): "${optA}" vs "${optB}"`,
          });
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 2. STEM-LEAK CHECK & AUTO-FIX
  // Content words of the correct option (stemmed) appearing in the stem
  // but NOT shared across distractors as common units/formatting.
  // -------------------------------------------------------------
  const rawCorrectWords = normalizeOptionText(correctOpt)
    .split(/\s+/)
    .filter((w) => /[a-z]/i.test(w) && w.length >= 3 && !STOPWORDS.has(w) && !/^\d+([.,]\d+)?%?$/.test(w));

  // Extract all words from the stem
  const stemWords = currentStem.toLowerCase().split(/[^a-z0-9]+/);
  const stemStems = stemWords.map(stemWord).filter((w) => w.length >= 2);

  // Identify any leaked content words from the correct answer
  const candidateLeakedWords: string[] = [];
  for (const cw of rawCorrectWords) {
    const sTarget = stemWord(cw);
    if (sTarget.length < 2) continue;
    if (stemStems.includes(sTarget) || stemWords.includes(cw.toLowerCase())) {
      candidateLeakedWords.push(cw);
    }
  }

  // A word is a leak ONLY if it is not a shared unit/format suffix present across distractors
  const leakedTargetWords = candidateLeakedWords.filter((cw) => {
    const sTarget = stemWord(cw);
    const inDistractorCount = distractorOpts.filter((d) => {
      const dRoots = normalizeOptionText(d).split(/\s+/).map(stemWord);
      return dRoots.includes(sTarget);
    }).length;
    // If 2 or more distractors (or all distractors) have this word, it's a shared unit (e.g. "loaves", "miles"), not a leak
    return inDistractorCount < Math.max(2, distractorOpts.length);
  });

  // Check whole phrase leak (e.g. "Commitment to public interest")
  const normCorrect = normalizeOptionText(correctOpt);
  const normStem = currentStem.toLowerCase();
  let leakedPhrase: string | null = null;
  if (normCorrect.length >= 5 && !STOPWORDS.has(normCorrect)) {
    const phraseRegex = new RegExp(`\\b${escapeRegExp(normCorrect)}\\b`, "i");
    if (phraseRegex.test(normStem)) {
      const inAllDistractors = distractorOpts.every((d) => normalizeOptionText(d).includes(normCorrect));
      if (!inAllDistractors) {
        leakedPhrase = normCorrect;
      }
    }
  }

  // Also check digit or number word leaks from correct option or any distractor appearing in fill-in-the-blank stems
  const isFillInTheBlank = /_{2,}|\[_+\]|complete the|fill in/i.test(currentStem);
  const optionNumbersToMask: number[] = [];
  if (isFillInTheBlank) {
    for (const opt of item.options) {
      const parsedNum = parseNumericOption(opt);
      if (parsedNum && parsedNum.value > 0 && parsedNum.value < 100000) {
        optionNumbersToMask.push(parsedNum.value);
      }
    }
  }

  const numCorrect = parseNumericOption(correctOpt);
  let digitLeak: number | null = null;
  if (numCorrect && numCorrect.value > 0) {
    const digitStr = String(numCorrect.value);
    if (numCorrect.value < 1000) {
      const blankParenRegex = new RegExp(`(?:_____|blank)\\s*\\(\\s*${digitStr}\\s*\\)|\\(\\s*${digitStr}\\s*\\)\\s*(?:working|calendar)?\\s*${escapeRegExp(numCorrect.unit)}`, "i");
      if (blankParenRegex.test(currentStem)) {
        digitLeak = numCorrect.value;
      }
    }
  }

  let residualLeak = false;

  if (leakedPhrase || leakedTargetWords.length > 0 || digitLeak !== null || optionNumbersToMask.length > 0) {
    const primaryLeak = leakedPhrase || leakedTargetWords[0] || (digitLeak !== null ? String(digitLeak) : "");
    if (cfg.autoFixStemLeak) {
      let workingStem = currentStem;

      // 1. Mask parenthesized digit leak e.g. "_____ (18)" -> "_____ "
      if (digitLeak !== null) {
        const digitStr = String(digitLeak);
        workingStem = workingStem
          .replace(new RegExp(`_____\\s*\\(\\s*${digitStr}\\s*\\)`, "gi"), "_____ ")
          .replace(new RegExp(`\\(${digitStr}\\)`, "gi"), " ");
      }

      // 2. Mask whole phrase if leaked
      if (leakedPhrase) {
        workingStem = workingStem.replace(new RegExp(`\\b${escapeRegExp(leakedPhrase)}\\b`, "gi"), "[______]");
      }

      // 3. Mask individual leaked content words and their morphological forms
      for (const w of leakedTargetWords) {
        const root = stemWord(w);
        if (root.length < 3) continue;
        const wordRegex = new RegExp(`\\b${escapeRegExp(root)}[a-z]*\\b`, "gi");
        workingStem = workingStem.replace(wordRegex, "[______]");
      }

      // 4. MASK LEFTOVER PARTNER WORDS (e.g. "public" in "public [______]" or "[______] interest")
      for (const w of rawCorrectWords) {
        const root = stemWord(w);
        if (root.length < 3) continue;
        const adjacentBefore = new RegExp(`\\b${escapeRegExp(root)}[a-z]*\\s+\\[______\\]`, "gi");
        const adjacentAfter = new RegExp(`\\[______\\]\\s+\\b${escapeRegExp(root)}[a-z]*\\b`, "gi");
        workingStem = workingStem.replace(adjacentBefore, "[______]").replace(adjacentAfter, "[______]");
      }

      // 5. Mask option numbers appearing outside the blank (e.g. "within thirty (30) days" -> "within [______] days")
      for (const numVal of optionNumbersToMask) {
        const numStr = String(numVal);
        // Mask parenthesized numeral "(30)"
        workingStem = workingStem.replace(new RegExp(`\\(\\s*${numStr}\\s*\\)`, "gi"), " ");
        // Mask word form "thirty" or "one-year"
        const wordRep = DIGIT_TO_NUMBER_WORD[numVal];
        if (wordRep) {
          workingStem = workingStem.replace(new RegExp(`\\b${escapeRegExp(wordRep)}(?:-year|-day|\\s+year|\\s+day)?\\b`, "gi"), "[______]");
        }
        // Mask standalone digits outside section citations
        const optDigitRegex = new RegExp(`(?<!(?:Sec(?:tion)?\\.?\\s*|Rule\\s+|19|20))\\b${numStr}\\b(?!\\s*%)`, "gi");
        workingStem = workingStem.replace(optDigitRegex, "[______]");
      }

      // Collapse multiple consecutive blanks: "[______] [______]" -> "[______]"
      workingStem = workingStem.replace(/(?:\[______\]\s*)+\[______\]/g, "[______]");
      workingStem = workingStem.replace(/(?:_____\s*\[______\]|\[______\]\s*_____)/g, "[______]");
      workingStem = workingStem.replace(/\s+/g, " ").trim();

      // 6. Verify if any content word or option number still leaks after masking
      const postWords = workingStem.toLowerCase().split(/[^\w]+/);
      const postStems = postWords.map(stemWord);
      const remainingLeaks = rawCorrectWords.filter((cw) => postStems.includes(stemWord(cw)));

      if (remainingLeaks.length === 0 && workingStem !== currentStem) {
        currentStem = workingStem;
        autoFixed = true;
        issues.push({
          rule: "stem-leak",
          message: `Stem-leak detected for "${primaryLeak}": automatically masked in stem with [______]`,
          autoFixed: true,
          fixedStem: currentStem,
          leakedWord: primaryLeak,
        });
      } else if (remainingLeaks.length > 0) {
        residualLeak = true;
        issues.push({
          rule: "stem-leak",
          message: `Residual stem-leak: content word "${remainingLeaks[0] || primaryLeak}" from correct option cannot be masked without corrupting stem`,
          autoFixed: false,
          leakedWord: remainingLeaks[0] || primaryLeak,
        });
      }
    } else {
      residualLeak = true;
      issues.push({
        rule: "stem-leak",
        message: `Stem-leak: content word "${primaryLeak}" from correct option appears in question stem`,
        autoFixed: false,
        leakedWord: primaryLeak,
      });
    }
  }

  // -------------------------------------------------------------
  // 3. LENGTH OUTLIER DETECTION
  // Correct option is uniquely the longest or shortest by more than set ratio
  // -------------------------------------------------------------
  const correctLen = correctOpt.trim().length;
  const distLens = distractorOpts.map((d) => d.trim().length);
  const avgDistLen = distLens.reduce((sum, l) => sum + l, 0) / (distLens.length || 1);

  if (avgDistLen > 0) {
    const isUniqueLongest = correctLen > Math.max(...distLens);
    const isUniqueShortest = correctLen < Math.min(...distLens);

    if (isUniqueLongest && correctLen / avgDistLen >= cfg.lengthOutlierRatio && correctLen - avgDistLen >= 15) {
      issues.push({
        rule: "length-outlier",
        message: `Length outlier: correct option is uniquely longest (${correctLen} chars vs ${Math.round(avgDistLen)} avg distractors, ratio ${(correctLen / avgDistLen).toFixed(2)})`,
      });
    } else if (isUniqueShortest && avgDistLen / correctLen >= cfg.lengthOutlierRatio && avgDistLen >= 20) {
      issues.push({
        rule: "length-outlier",
        message: `Length outlier: correct option is uniquely shortest (${correctLen} chars vs ${Math.round(avgDistLen)} avg distractors, ratio ${(avgDistLen / correctLen).toFixed(2)})`,
      });
    }
  }

  // -------------------------------------------------------------
  // 4. FORMAT OUTLIER DETECTION
  // Differences in punctuation, numeric vs text, or full sentence vs single token
  // -------------------------------------------------------------
  const correctEndsPeriod = /\.\s*$/.test(correctOpt.trim());
  const distEndsPeriod = distractorOpts.map((d) => /\.\s*$/.test(d.trim()));
  const allDistNoPeriod = distEndsPeriod.every((b) => !b);
  const allDistHasPeriod = distEndsPeriod.every((b) => b);

  if (correctEndsPeriod && allDistNoPeriod && distractorOpts.length >= 3) {
    issues.push({
      rule: "format-outlier",
      message: "Format outlier: correct option ends with period while all distractors do not",
    });
  } else if (!correctEndsPeriod && allDistHasPeriod && distractorOpts.length >= 3) {
    issues.push({
      rule: "format-outlier",
      message: "Format outlier: correct option lacks ending period while all distractors have one",
    });
  }

  // Numeric vs Text format disparity
  const isCorrectNumeric = /^[\d.,\s$%/\-:]+$/.test(correctOpt.trim());
  const distNumericCount = distractorOpts.filter((d) => /^[\d.,\s$%/\-:]+$/.test(d.trim())).length;
  if (!isCorrectNumeric && distNumericCount === distractorOpts.length && distractorOpts.length >= 3) {
    issues.push({
      rule: "format-outlier",
      message: "Format outlier: correct option is verbal text while all distractors are purely numeric",
    });
  } else if (isCorrectNumeric && distNumericCount === 0 && distractorOpts.length >= 3) {
    issues.push({
      rule: "format-outlier",
      message: "Format outlier: correct option is purely numeric while all distractors are verbal text",
    });
  }

  // -------------------------------------------------------------
  // 5. "ALL / NONE OF THE ABOVE"
  // -------------------------------------------------------------
  for (const opt of item.options) {
    const match = opt.match(/\b(all|none)\s+of\s+the\s+above\b/i);
    if (match) {
      issues.push({
        rule: "all-none-above",
        message: `Avoid lazy meta-choice "${match[0]}" in option: "${opt}"`,
      });
    }
  }

  // -------------------------------------------------------------
  // 6. ABSOLUTE WORDS APPEARING ONLY IN DISTRACTORS
  // (e.g. "always", "never", "only", "exclusively")
  // -------------------------------------------------------------
  for (const word of ABSOLUTE_WORDS) {
    const wordRegex = new RegExp(`\\b${word}\\b`, "i");
    const inCorrect = wordRegex.test(correctOpt);
    if (!inCorrect) {
      for (const dist of distractorOpts) {
        if (wordRegex.test(dist)) {
          issues.push({
            rule: "absolute-word",
            message: `Absolute qualifier "${word}" found in distractor "${dist}" (allows easy test-taking elimination)`,
          });
          break;
        }
      }
    }
  }

  // Compile final results
  const unfixedIssues = issues.filter((iss) => !iss.autoFixed);
  const reasons = issues.map((iss) => iss.message);
  const canShipAsMcq = !residualLeak && unfixedIssues.every((iss) => iss.rule !== "all-none-above");

  return {
    passed: unfixedIssues.length === 0,
    canShipAsMcq,
    autoFixed,
    fixedStem: autoFixed ? currentStem : undefined,
    issues,
    reasons,
  };
}

/**
 * Escapes special regex characters in a search string.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================
// RULE-BASED DISTRACTOR GENERATORS
// ============================================

/**
 * Generates 3 plausible numeric distractors for numbers:
 * Decimal shifts (10x, 0.1x), +/- 10-25%, and swapped digits.
 * All distractors preserve the unit and formatting. Never random filler.
 */
export function generateNumericDistractors(
  numeral: number,
  unit: string = ""
): { distractors: string[]; formattedCorrect: string } {
  const candidates = new Set<number>();

  if (numeral > 0) {
    // 1. Percentage / near shifts (+/- 10% to 25%)
    const p10Up = Math.round(numeral * 1.1);
    const p10Down = Math.round(numeral * 0.9);
    const p20Up = Math.round(numeral * 1.2);
    const p25Up = Math.round(numeral * 1.25);
    const p25Down = Math.round(numeral * 0.75);
    const p15Down = Math.round(numeral * 0.85);

    [p10Up, p10Down, p20Up, p25Up, p25Down, p15Down].forEach((n) => {
      if (n > 0 && n !== numeral) candidates.add(n);
    });

    // 2. Swapped digits for 2-digit numbers (e.g. 15 -> 51, 45 -> 54, 25 -> 52, 30 -> 3)
    if (numeral >= 10 && numeral <= 99) {
      const str = String(numeral);
      const swapped = parseInt(str[1] + str[0], 10);
      if (swapped > 0 && swapped !== numeral) candidates.add(swapped);
    }

    // 3. Decimal shifts (e.g. 5 -> 50, 10 -> 100, 30 -> 300 or 3)
    if (numeral < 50) candidates.add(numeral * 10);
    if (numeral >= 20 && numeral % 10 === 0) candidates.add(Math.round(numeral / 10));

    // 4. Standard offsets (+/- 5 or +/- 2)
    if (numeral > 5) candidates.add(numeral - 5);
    candidates.add(numeral + 5);
    if (numeral > 2) candidates.add(numeral - 2);
    candidates.add(numeral + 2);
  }

  // Remove original and pick the 3 closest candidates
  const candidateArray = Array.from(candidates)
    .filter((n) => n !== numeral && n > 0)
    .sort((a, b) => Math.abs(a - numeral) - Math.abs(b - numeral));

  const chosen = candidateArray.slice(0, 3);
  const uSuffix = unit ? ` ${unit}` : "";

  return {
    distractors: chosen.map((n) => `${n}${uSuffix}`),
    formattedCorrect: `${numeral}${uSuffix}`,
  };
}

/**
 * Classifies a legal or document term into a semantic domain
 * to ensure distractors are semantically close siblings (e.g. gifts with gifts,
 * norms with norms, roles with roles), never mismatched entities.
 */
export function getTermSemanticCategory(term: string, section: string = ""): string {
  const norm = normalizeOptionText(term);
  const sec = section.toLowerCase();

  // 1. Norms of conduct under Section 4 / Rule V
  if (
    sec.includes("norm") ||
    /commitment to public interest|professionalism|justness and sincerity|political neutrality|responsiveness to the public|nationalism and patriotism|commitment to democracy|simple living/i.test(norm)
  ) {
    return "norm_of_conduct";
  }

  // 2. Gifts, loans, assets, financial interests (Section 3)
  if (/gift|loan|divestment|stockholder|remuneration|interest|property|asset|liability/i.test(norm)) {
    return "gift_finance";
  }

  // 3. Persons, officials, family, relatives (Section 3)
  if (/public official|employee|family|relative|appointive|elective|personnel|officer/i.test(norm)) {
    return "personnel_roles";
  }

  // 4. Government, agencies, state bodies
  if (/government|state|agency|department|office|commission|bureau/i.test(norm)) {
    return "government_entities";
  }

  return `sec_${normalizeOptionText(section).slice(0, 20)}`;
}

/**
 * Generates sibling term distractors that are semantically close to the correct term
 * (same semantic category, similar word count and length).
 * Returns an empty array if fewer than 3 close siblings exist (never random filler).
 */
export function generateSiblingTermDistractors(
  targetTerm: string,
  targetSection: string,
  allTerms: { term: string; section: string }[]
): string[] {
  const normTarget = normalizeOptionText(targetTerm);
  const targetCategory = getTermSemanticCategory(targetTerm, targetSection);
  const targetWordCount = normTarget.split(/\s+/).length;
  const targetLen = normTarget.length;

  // Filter candidates strictly belonging to the SAME semantic category
  const candidates = allTerms
    .filter((t) => {
      const normCand = normalizeOptionText(t.term);
      if (normCand === normTarget) return false;
      const candCategory = getTermSemanticCategory(t.term, t.section);
      return candCategory === targetCategory;
    })
    .map((t) => t.term);

  const uniqueCandidates = Array.from(new Set(candidates));

  // Score candidates by similarity in word count and character length
  const scored = uniqueCandidates.map((cand) => {
    const candNorm = normalizeOptionText(cand);
    const candWordCount = candNorm.split(/\s+/).length;
    const candLen = candNorm.length;
    const wordDiff = Math.abs(candWordCount - targetWordCount);
    const lenDiff = Math.abs(candLen - targetLen);
    return {
      term: cand,
      wordDiff,
      lenDiff,
      score: wordDiff * 10 + lenDiff,
    };
  });

  // Sort by closest word count and length
  scored.sort((a, b) => a.score - b.score);

  // Filter to reasonably close siblings: word count difference <= 2, length ratio <= 4.5 or length difference <= 15
  const closeSiblings = scored.filter(
    (item) =>
      item.wordDiff <= 2 &&
      (Math.max(item.term.length, targetLen) / Math.max(1, Math.min(item.term.length, targetLen)) <= 4.5 ||
        Math.abs(item.term.length - targetLen) <= 15)
  );

  // If fewer than 3 close siblings exist in the same category, return empty array
  // (caller will skip question or convert to recall flashcard)
  if (closeSiblings.length < 3) {
    return [];
  }

  return closeSiblings.slice(0, 3).map((item) => item.term);
}

// ============================================
// OPTION PICK STATS & ITEM PERFORMANCE
// ============================================

export interface OptionPickStats {
  attempts: number;
  correct: number;
  lastAttemptAt?: number;
  pickCounts: Record<number, number>; // optionIndex -> count
  lowPickDistractors?: number[]; // indices of distractors chosen < 5% after N attempts
  tooEasyFlag?: boolean; // questions answered correctly > 95% after N attempts
}

/**
 * Updates option pick counts and checks for ineffective distractors (<5%) or too-easy questions (>95%).
 */
export function recordOptionPickAndAnalyze(
  currentStats: OptionPickStats | undefined,
  chosenIndex: number,
  correctIndex: number,
  totalOptions: number,
  config: Partial<DistractorQualityConfig> = {}
): OptionPickStats {
  const cfg = { ...DEFAULT_DISTRACTOR_CONFIG, ...config };
  const stats: OptionPickStats = currentStats
    ? {
        ...currentStats,
        attempts: currentStats.attempts + 1,
        correct: currentStats.correct + (chosenIndex === correctIndex ? 1 : 0),
        pickCounts: { ...currentStats.pickCounts },
      }
    : {
        attempts: 1,
        correct: chosenIndex === correctIndex ? 1 : 0,
        pickCounts: {},
      };

  stats.pickCounts[chosenIndex] = (stats.pickCounts[chosenIndex] || 0) + 1;
  stats.lastAttemptAt = Date.now();

  // Evaluate flags once minimum attempts reached
  if (stats.attempts >= cfg.minAttemptsForItemStats) {
    const accuracy = stats.correct / stats.attempts;
    stats.tooEasyFlag = accuracy > cfg.tooEasyAccuracyThreshold;

    const lowPicks: number[] = [];
    for (let i = 0; i < totalOptions; i++) {
      if (i !== correctIndex) {
        const count = stats.pickCounts[i] || 0;
        const rate = count / stats.attempts;
        if (rate < cfg.ineffectiveDistractorThreshold) {
          lowPicks.push(i);
        }
      }
    }
    stats.lowPickDistractors = lowPicks;
  }

  return stats;
}

/**
 * Records an option pick resolving the displayed slot back to the ORIGINAL choice index
 * via the choice permutation (choiceOrder[newIndex] = originalIndex).
 * Ensures longitudinal distractor telemetry tracks the underlying option across permuted exams.
 */
export function recordOptionPickWithPermutation(
  currentStats: OptionPickStats | undefined,
  chosenDisplayIndex: number,
  choiceOrder: number[] | undefined,
  originalCorrectIndex: number,
  totalOptions: number,
  config: Partial<DistractorQualityConfig> = {}
): OptionPickStats {
  const origChosenIndex =
    choiceOrder && choiceOrder[chosenDisplayIndex] !== undefined
      ? choiceOrder[chosenDisplayIndex]
      : chosenDisplayIndex;

  return recordOptionPickAndAnalyze(
    currentStats,
    origChosenIndex,
    originalCorrectIndex,
    totalOptions,
    config
  );
}

// ============================================
// NUMBER CONTEXT SUBTYPES
// ============================================

export type NumberSubtype =
  | "age"
  | "deadline_days"
  | "deadline_months"
  | "penalty_imprisonment_years"
  | "penalty_fine_amount"
  | "prohibition_bar_years"
  | "general_count";

/**
 * Classifies a number in legal text by its semantic context:
 * age, deadline in days, penalty term, fine amount, or prohibition bar.
 */
export function classifyNumberContext(
  sentence: string,
  word: string,
  numeral: number,
  unit: string
): NumberSubtype {
  const norm = (sentence || "").toLowerCase();
  const u = (unit || "").toLowerCase();

  // 1. Age: "years of age", "unmarried children under eighteen"
  if (/age\b|years?\s+of\s+age|children\s+under|spouses\s+and\s+unmarried/i.test(norm)) {
    return "age";
  }

  // 2. Deadlines in days
  if (u.startsWith("day")) {
    return "deadline_days";
  }

  // 3. Deadlines in months
  if (u.startsWith("month") && !/imprisonment|sentence|penal/i.test(norm)) {
    return "deadline_months";
  }

  // 4. Penalty imprisonment
  if (/imprisonment|prison|jail|sentence|punishable\s+with/i.test(norm) && (u.startsWith("year") || u.startsWith("month"))) {
    return "penalty_imprisonment_years";
  }

  // 5. Prohibition bar after resignation
  if (/prohibition|continue\s+to\s+apply|after\s+resignation|revolving\s+door/i.test(norm) && u.startsWith("year")) {
    return "prohibition_bar_years";
  }

  // 6. Fine amounts
  if (u.startsWith("peso") || /fine|penalty|amount\s+not\s+to\s+exceed/i.test(norm)) {
    return "penalty_fine_amount";
  }

  return "general_count";
}

// ============================================
// EXAM-ASSEMBLY ENEMY ITEM CHECK
// ============================================

export interface EnemyItemCheckResult {
  isEnemy: boolean;
  reason?: string;
  conflictingQuestionId?: string;
}

/**
 * Rejects an exam question if:
 * 1. Its option set overlaps another selected question's set by more than 50% (unless explicitly part of a matching set).
 * 2. Its stem contains another selected question's answer term (e.g. Q4 defines "substantial stockholder" which appears in Q5 stem).
 * 3. Another selected question's stem contains the candidate's answer term.
 */
export function isEnemyItem(
  candidate: { id?: string; stem: string; options: string[]; correctIndex: number; templateType?: string },
  selectedSet: { id?: string; stem: string; options: string[]; correctIndex: number; templateType?: string }[]
): EnemyItemCheckResult {
  if (!selectedSet || selectedSet.length === 0) {
    return { isEnemy: false };
  }

  const isMatchingSet = candidate.templateType === "matching_set";
  const isCandidateTf = candidate.templateType === "true_false";

  const candNormOptions = (candidate.options || []).map(normalizeOptionText).filter(Boolean);
  const candCorrectOpt = candidate.options[candidate.correctIndex] || "";
  const candCorrectNorm = normalizeOptionText(candCorrectOpt);
  const candStemLower = (candidate.stem || "").toLowerCase();

  for (const existing of selectedSet) {
    const isExistingTf = existing.templateType === "true_false";
    // 1. Option Set Overlap Check (> 50%)
    // Exclude matching sets (which share an 8-item option list) and true/false sets (which share ["True", "False"])
    const isCandNb = candidate.templateType === "number_blank_deadline";
    const isExistNb = existing.templateType === "number_blank_deadline";
    if (!isMatchingSet && existing.templateType !== "matching_set" && !(isCandidateTf && isExistingTf) && !(isCandNb && isExistNb)) {
      const existNormOptions = (existing.options || []).map(normalizeOptionText).filter(Boolean);
      if (candNormOptions.length >= 2 && existNormOptions.length >= 2) {
        const existSet = new Set(existNormOptions);
        let intersection = 0;
        for (const opt of candNormOptions) {
          if (existSet.has(opt)) intersection++;
        }
        const minLen = Math.min(candNormOptions.length, existNormOptions.length);
        const overlapRatio = intersection / minLen;
        if (overlapRatio > 0.5) {
          return {
            isEnemy: true,
            reason: `Option set overlaps by ${Math.round(overlapRatio * 100)}% (> 50%) with selected question "${existing.stem.slice(0, 50)}..."`,
            conflictingQuestionId: existing.id,
          };
        }
      }
    }

    // 2. Answer clue leakage check:
    // Does candidate stem contain existing question's answer term?
    const existCorrectOpt = existing.options[existing.correctIndex] || "";
    const existCorrectNorm = normalizeOptionText(existCorrectOpt);
    const isExistTfLabel = existCorrectNorm === "true" || existCorrectNorm === "false";
    const isCandTfLabel = candCorrectNorm === "true" || candCorrectNorm === "false";

    if (!isExistTfLabel && existCorrectNorm.length >= 4 && !STOPWORDS.has(existCorrectNorm)) {
      const wholePhraseRegex = new RegExp(`\\b${escapeRegExp(existCorrectNorm)}\\b`, "i");
      if (wholePhraseRegex.test(candStemLower)) {
        return {
          isEnemy: true,
          reason: `Candidate stem contains the answer term "${existCorrectOpt}" of previously selected question "${existing.stem.slice(0, 50)}..."`,
          conflictingQuestionId: existing.id,
        };
      }
    }

    // Does existing question's stem contain candidate's answer term?
    if (!isCandTfLabel && candCorrectNorm.length >= 4 && !STOPWORDS.has(candCorrectNorm)) {
      const wholePhraseRegex = new RegExp(`\\b${escapeRegExp(candCorrectNorm)}\\b`, "i");
      if (wholePhraseRegex.test((existing.stem || "").toLowerCase())) {
        return {
          isEnemy: true,
          reason: `Selected question "${existing.stem.slice(0, 50)}..." stem contains candidate's answer term "${candCorrectOpt}"`,
          conflictingQuestionId: existing.id,
        };
      }
    }
  }

  return { isEnemy: false };
}

/**
 * Filters a pool of candidate questions for exam assembly, dropping enemy items.
 */
export function filterEnemyItems<T extends { id?: string; stem: string; options: string[]; correctIndex: number; templateType?: string }>(
  pool: T[],
  targetCount: number = pool.length
): { selected: T[]; rejected: { item: T; reason: string }[] } {
  const selected: T[] = [];
  const rejected: { item: T; reason: string }[] = [];

  for (const item of pool) {
    if (selected.length >= targetCount) break;
    const enemyCheck = isEnemyItem(item, selected);
    if (enemyCheck.isEnemy) {
      rejected.push({ item, reason: enemyCheck.reason || "Enemy item conflict" });
    } else {
      selected.push(item);
    }
  }

  return { selected, rejected };
}

// ============================================
// UNIVERSAL LEAK & OPTION CLASH ASSERTION
// ============================================

export interface ItemLeakCheckResult {
  passed: boolean;
  violations: string[];
}

/**
 * Strictly verifies that for an MCQ:
 * 1. No stemmed content word of the correct answer appears in the stem.
 * 2. No number equal to an option appears elsewhere in the stem outside masked blanks.
 */
export function assertNoStemLeaksOrOptionClashes(item: {
  stem: string;
  options: string[];
  correctIndex: number;
  questionType?: string;
}): ItemLeakCheckResult {
  const violations: string[] = [];
  if (item.questionType === "free_response" || !item.options || item.options.length < 2) {
    return { passed: true, violations: [] };
  }

  const correctOpt = item.options[item.correctIndex] || "";
  const stem = (item.stem || "").trim();

  // Strip masked blanks from stem so [______] or _____ aren't evaluated as words
  const cleanStem = stem
    .replace(/\[_+\]/g, " ")
    .replace(/_{2,}/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();

  const stemWords = cleanStem.split(/\s+/).filter(Boolean);
  const stemRoots = stemWords.map(stemWord);

  const correctNorm = normalizeOptionText(correctOpt).toLowerCase().trim();

  // 1. Check whole answer phrase
  if (correctNorm.length >= 4 && !STOPWORDS.has(correctNorm)) {
    const wholePhraseRegex = new RegExp(`\\b${escapeRegExp(correctNorm)}\\b`, "i");
    if (wholePhraseRegex.test(cleanStem)) {
      violations.push(`Stem contains whole answer phrase "${correctNorm}" from correct answer "${correctOpt}"`);
    }
  }

  // 2. Check multi-word sub-phrases from the answer (e.g. "public interest", "any gift")
  const optWords = correctOpt.toLowerCase().split(/\s+/).filter(Boolean);
  if (optWords.length >= 2) {
    for (let len = optWords.length - 1; len >= 2; len--) {
      for (let start = 0; start <= optWords.length - len; start++) {
        const subSlice = optWords.slice(start, start + len);
        const hasContentWord = subSlice.some((w) => w.length >= 3 && !STOPWORDS.has(w));
        if (!hasContentWord) continue;
        const subPhrase = subSlice.join(" ");
        if (subPhrase.length >= 4 && !STOPWORDS.has(subPhrase)) {
          const subPhraseRegex = new RegExp(`\\b${escapeRegExp(subPhrase)}\\b`, "i");
          if (subPhraseRegex.test(cleanStem)) {
            const inAllDistractors = item.options.every((o) => o.toLowerCase().includes(subPhrase));
            if (!inAllDistractors) {
              violations.push(`Stem contains answer phrase "${subPhrase}" from correct answer "${correctOpt}"`);
            }
          }
        }
      }
    }
  }

  // 3. Check individual content words of correct answer
  const correctWords = correctNorm.split(/\s+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  const distractorOpts = item.options.filter((_, idx) => idx !== item.correctIndex);

  for (const cw of correctWords) {
    const root = stemWord(cw);
    if (root.length < 3) continue;

    // If all distractors share this root (e.g., common unit/context), it's not an answer leak
    const inDistractorCount = distractorOpts.filter((d) => {
      const dRoots = normalizeOptionText(d).split(/\s+/).map(stemWord);
      return dRoots.includes(root);
    }).length;
    if (inDistractorCount >= Math.max(2, distractorOpts.length)) {
      continue;
    }

    if (stemRoots.includes(root) || stemWords.includes(cw)) {
      violations.push(`Stem leaks content root "${root}" from correct answer "${correctOpt}"`);
    }
  }

  // 4. Check if any option number appears elsewhere in fill-in-the-blank stems
  const isFillBlank = /_{2,}|\[_+\]|complete the|fill in/i.test(stem);
  if (isFillBlank) {
    for (const opt of item.options) {
      const parsedNum = parseNumericOption(opt);
      if (parsedNum && parsedNum.value > 0) {
        const numStr = String(parsedNum.value);
        // Standalone digits outside section citations and calendar years
        const digitRegex = new RegExp(`(?<!(?:sec(?:tion)?\\.?\\s*|rule\\s+|19|20))\\b${numStr}\\b(?!\\s*%)`, "i");
        if (digitRegex.test(cleanStem)) {
          violations.push(`Stem contains option number "${numStr}" (from option "${opt}")`);
        }
        // Word representation (e.g. "thirty" or "one")
        const wordRep = DIGIT_TO_NUMBER_WORD[parsedNum.value];
        if (wordRep && wordRep.length >= 3) {
          const wordRegex = new RegExp(`\\b${wordRep}\\b`, "i");
          if (wordRegex.test(cleanStem)) {
            violations.push(`Stem contains word representation "${wordRep}" of option "${opt}"`);
          }
        }
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

// ============================================
// SOURCE GROUNDING VERIFICATION
// ============================================

export interface SourceGroundingResult {
  grounded: boolean;
  missingFragments: string[];
}

/**
 * Strictly verifies that after removing masks ([______] or _____),
 * every quoted stem fragment of length >= 10 is an exact substring of the source page text.
 */
export function assertStemGroundedInSourcePage(
  item: { stem: string; sourcePage?: number; pageNumber?: number; templateType?: string },
  sourcePageText: string
): SourceGroundingResult {
  if (!sourcePageText) {
    return { grounded: false, missingFragments: ["Source page text missing"] };
  }

  // Extract the quoted content inside "..."
  const quoteMatch = item.stem.match(/"([^"]+)"/);
  if (!quoteMatch) {
    // If stem has no quotes (e.g. true/false statement), consider grounded
    return { grounded: true, missingFragments: [] };
  }

  const rawQuote = quoteMatch[1];
  // Replace masks [______] or _____ with a delimiter
  const unmasked = rawQuote
    .replace(/\[_+\]/g, "|||MASK|||")
    .replace(/_{2,}/g, "|||MASK|||");

  // Split into fragments by MASK
  const fragments = unmasked
    .split("|||MASK|||")
    .map((f) =>
      f
        .replace(/\.{2,}/g, " ")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((f) => f.length >= 10);

  const normPage = sourcePageText
    .replace(/\r\n/g, "\n")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();

  const missingFragments: string[] = [];
  for (const frag of fragments) {
    const normFrag = frag.toLowerCase();
    if (!normPage.includes(normFrag)) {
      missingFragments.push(frag);
    }
  }

  return {
    grounded: missingFragments.length === 0,
    missingFragments,
  };
}
