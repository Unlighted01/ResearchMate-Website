// ============================================
// QUESTION BANK SERVICE - Persistent Local-First User Question Library
// Stores, filters, and samples exam questions extracted directly
// from user-uploaded PDFs, CSVs, and review notes.
// Two-stage deduplication (FNV-1a + exact equality) & review queue.
// 100% Offline · $0 API Cost · Browser LocalStorage / IndexedDB
// ============================================

import { Question, generateUUID } from "./examService";

export type QuestionOrigin =
  | "parsed_pdf"
  | "rule_generated"
  | "ai_generated"
  | "csv"
  | "manual";

export type QuestionReviewStatus = "verified" | "needs_review" | "flagged";

export interface StoredQuestion extends Question {
  sourceDocument?: string;
  sourceFile?: string;
  sourcePage?: number;
  importedAt?: number;
  origin?: QuestionOrigin;
  reviewStatus?: QuestionReviewStatus;
  normalizedTextHash?: string;
  accuracyHistory?: {
    attempts: number;
    correct: number;
    lastAttemptAt?: number;
  };
}

export interface QuestionBankStats {
  totalQuestions: number;
  byTopic: Record<string, number>;
  sourceDocuments: string[];
  totalAttempted: number;
  averageAccuracy: number;
  needsReviewCount: number;
  verifiedCount: number;
  flaggedCount: number;
}

const STORAGE_KEY = "researchmate_user_question_bank_v1";

// In-memory cache for fast access
let memoryCache: StoredQuestion[] | null = null;

function loadFromStorage(): StoredQuestion[] {
  if (memoryCache !== null) return memoryCache;
  if (typeof localStorage === "undefined") {
    memoryCache = [];
    return memoryCache;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memoryCache = [];
      return memoryCache;
    }
    memoryCache = JSON.parse(raw);
    return memoryCache || [];
  } catch (err) {
    console.warn("Failed to load user question bank from localStorage:", err);
    memoryCache = [];
    return memoryCache;
  }
}

function persistToStorage(questions: StoredQuestion[]): void {
  memoryCache = questions;
  if (typeof localStorage === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
  } catch (err) {
    console.warn("Failed to save user question bank to localStorage:", err);
  }
}

/**
 * Normalizes question text for stem comparison (lowercase, alphanumeric only, whitespace collapsed).
 */
export function normalizeQuestionStem(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * 32-bit FNV-1a Hash for fast O(1) duplicate lookup.
 */
export function fnv1a32(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Hashes normalized question text.
 */
export function hashNormalizedText(text: string): string {
  return fnv1a32(normalizeQuestionStem(text));
}

/**
 * Hard validity rule:
 * Questions are marked "needs_review" ONLY IF choices < 2 or missing valid correctIndex.
 * 2 choices (True/False), 3 choices, or 5 choices (A-E) default to "verified".
 */
export function computeReviewStatus(
  options: string[] | undefined,
  correctIndex: number | undefined,
  explicitStatus?: QuestionReviewStatus
): QuestionReviewStatus {
  if (explicitStatus === "flagged") return "flagged";
  if (
    !options ||
    options.length < 2 ||
    typeof correctIndex !== "number" ||
    correctIndex < 0 ||
    correctIndex >= options.length
  ) {
    return "needs_review";
  }
  return explicitStatus || "verified";
}

/**
 * Saves or appends extracted questions into the user's permanent bank.
 * Two-stage deduplication: FNV-1a hash lookup + full normalized string comparison on collision.
 */
export function saveQuestionsToBank(
  newQuestions: (Question & { sourcePage?: number; origin?: QuestionOrigin; reviewStatus?: QuestionReviewStatus })[],
  sourceDocumentTitle: string = "User Upload",
  mode: "append" | "replace" = "append",
  defaultOrigin: QuestionOrigin = "parsed_pdf",
  defaultPage?: number
): { addedCount: number; totalCount: number; needsReviewCount: number } {
  if (!newQuestions || newQuestions.length === 0) {
    const current = loadFromStorage();
    const needsRev = current.filter((q) => q.reviewStatus === "needs_review").length;
    return { addedCount: 0, totalCount: current.length, needsReviewCount: needsRev };
  }

  const existing = mode === "replace" ? [] : loadFromStorage();

  // Stage 1 & 2: Hash bucket -> normalized stem set
  const hashToStemsMap = new Map<string, Set<string>>();
  for (const eq of existing) {
    const stem = normalizeQuestionStem(eq.question);
    const hash = eq.normalizedTextHash || fnv1a32(stem);
    if (!hashToStemsMap.has(hash)) {
      hashToStemsMap.set(hash, new Set());
    }
    hashToStemsMap.get(hash)!.add(stem);
  }

  const formatted: StoredQuestion[] = [];
  let addedCount = 0;
  let needsReviewCount = 0;

  for (const q of newQuestions) {
    const stem = normalizeQuestionStem(q.question);
    if (!stem) continue;

    const hash = fnv1a32(stem);

    // Two-stage deduplication check
    const existingBucket = hashToStemsMap.get(hash);
    if (existingBucket && existingBucket.has(stem)) {
      // Exact duplicate collision found -> skip
      continue;
    }

    if (!existingBucket) {
      hashToStemsMap.set(hash, new Set([stem]));
    } else {
      existingBucket.add(stem);
    }

    const reviewStatus = computeReviewStatus(q.options, q.correctIndex, q.reviewStatus);
    if (reviewStatus === "needs_review") {
      needsReviewCount++;
    }

    formatted.push({
      ...q,
      id: q.id || generateUUID(),
      sourceDocument: sourceDocumentTitle,
      sourceFile: sourceDocumentTitle,
      sourcePage: q.sourcePage || defaultPage,
      importedAt: Date.now(),
      origin: q.origin || defaultOrigin,
      reviewStatus,
      normalizedTextHash: hash,
      accuracyHistory: {
        attempts: 0,
        correct: 0,
      },
    });
    addedCount++;
  }

  const combined = [...existing, ...formatted];
  persistToStorage(combined);
  return { addedCount, totalCount: combined.length, needsReviewCount };
}

/**
 * Returns all stored questions in the user's bank, with optional topic filtering.
 */
export function getUserQuestions(filter?: {
  topic?: string;
  sourceDocument?: string;
  reviewStatus?: QuestionReviewStatus;
}): StoredQuestion[] {
  const all = loadFromStorage();
  if (!filter) return all;

  return all.filter((q) => {
    if (
      filter.topic &&
      filter.topic !== "All Topics" &&
      filter.topic !== "ALL" &&
      q.topicTag !== filter.topic
    ) {
      return false;
    }
    if (
      filter.sourceDocument &&
      filter.sourceDocument !== "ALL" &&
      q.sourceDocument !== filter.sourceDocument
    ) {
      return false;
    }
    if (filter.reviewStatus && q.reviewStatus !== filter.reviewStatus) {
      return false;
    }
    return true;
  });
}

/**
 * Retrieves only questions requiring student verification (< 2 choices or missing key).
 */
export function getNeedsReviewQuestions(): StoredQuestion[] {
  return getUserQuestions({ reviewStatus: "needs_review" });
}

/**
 * Retrieves verified questions ready for mock exams and sprints.
 */
export function getVerifiedQuestions(filter?: {
  topic?: string;
  sourceDocument?: string;
}): StoredQuestion[] {
  const all = getUserQuestions(filter);
  // Default to verified items, excluding flagged and needs_review
  return all.filter((q) => q.reviewStatus === "verified" || !q.reviewStatus);
}

/**
 * Updates review status (e.g. approve a question or flag it).
 */
export function updateQuestionStatus(
  id: string,
  status: QuestionReviewStatus
): boolean {
  const all = loadFromStorage();
  const target = all.find((q) => q.id === id);
  if (!target) return false;

  target.reviewStatus = status;
  persistToStorage(all);
  return true;
}

/**
 * Edits question text, options, or explanation in place.
 */
export function updateQuestion(
  id: string,
  updates: Partial<StoredQuestion>
): boolean {
  const all = loadFromStorage();
  const idx = all.findIndex((q) => q.id === id);
  if (idx === -1) return false;

  const current = all[idx];
  const updatedStem = updates.question !== undefined ? updates.question : current.question;
  const updatedOptions = updates.options !== undefined ? updates.options : current.options;
  const updatedCorrectIdx = updates.correctIndex !== undefined ? updates.correctIndex : current.correctIndex;

  const newHash = hashNormalizedText(updatedStem);
  const newReviewStatus = computeReviewStatus(
    updatedOptions,
    updatedCorrectIdx,
    updates.reviewStatus || current.reviewStatus
  );

  all[idx] = {
    ...current,
    ...updates,
    question: updatedStem,
    options: updatedOptions,
    correctIndex: updatedCorrectIdx,
    normalizedTextHash: newHash,
    reviewStatus: newReviewStatus,
  };

  persistToStorage(all);
  return true;
}

/**
 * Deletes a question from the bank.
 */
export function deleteQuestion(id: string): boolean {
  const all = loadFromStorage();
  const filtered = all.filter((q) => q.id !== id);
  if (filtered.length === all.length) return false;

  persistToStorage(filtered);
  return true;
}

/**
 * Generates aggregated metrics on the user's local question library.
 */
export function getBankStats(): QuestionBankStats {
  const all = loadFromStorage();
  const byTopic: Record<string, number> = {};
  const docSet = new Set<string>();
  let totalAttempted = 0;
  let totalCorrect = 0;
  let totalAttempts = 0;
  let needsReviewCount = 0;
  let verifiedCount = 0;
  let flaggedCount = 0;

  for (const q of all) {
    const topic = q.topicTag || "General";
    byTopic[topic] = (byTopic[topic] || 0) + 1;

    if (q.sourceDocument) {
      docSet.add(q.sourceDocument);
    }

    if (q.reviewStatus === "needs_review") needsReviewCount++;
    else if (q.reviewStatus === "flagged") flaggedCount++;
    else verifiedCount++;

    if (q.accuracyHistory && q.accuracyHistory.attempts > 0) {
      totalAttempted++;
      totalAttempts += q.accuracyHistory.attempts;
      totalCorrect += q.accuracyHistory.correct;
    }
  }

  const averageAccuracy =
    totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  return {
    totalQuestions: all.length,
    byTopic,
    sourceDocuments: Array.from(docSet),
    totalAttempted,
    averageAccuracy,
    needsReviewCount,
    verifiedCount,
    flaggedCount,
  };
}

/**
 * Updates accuracy metrics when a question is solved in a sprint or mock exam.
 */
export function recordQuestionResult(
  questionId: string,
  isCorrect: boolean
): void {
  const all = loadFromStorage();
  let modified = false;

  for (const q of all) {
    if (q.id === questionId) {
      const history = q.accuracyHistory || { attempts: 0, correct: 0 };
      history.attempts += 1;
      if (isCorrect) history.correct += 1;
      history.lastAttemptAt = Date.now();
      q.accuracyHistory = history;
      modified = true;
      break;
    }
  }

  if (modified) {
    persistToStorage(all);
  }
}

/**
 * Intelligently samples verified questions for Daily Sprints:
 * Prioritizes:
 * 1. Previously missed questions (< 80% accuracy)
 * 2. Unattempted questions
 */
export function sampleSprintQuestions(
  count: number = 5,
  preferredTopic?: string
): StoredQuestion[] {
  // Use verified questions for daily sprints
  let pool = getVerifiedQuestions(
    preferredTopic && preferredTopic !== "All Topics"
      ? { topic: preferredTopic }
      : undefined
  );

  if (pool.length === 0) return [];

  // Separate missed (< 80% accuracy) from unattempted/passed
  const missed: StoredQuestion[] = [];
  const others: StoredQuestion[] = [];

  for (const q of pool) {
    const hist = q.accuracyHistory;
    if (hist && hist.attempts > 0 && hist.correct / hist.attempts < 0.8) {
      missed.push(q);
    } else {
      others.push(q);
    }
  }

  // Shuffle array helper
  const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

  const selected: StoredQuestion[] = [];

  // 1. Take missed questions first
  for (const m of shuffle(missed)) {
    if (selected.length >= count) break;
    selected.push(m);
  }

  // 2. Fill remaining slots with unattempted/passed
  for (const o of shuffle(others)) {
    if (selected.length >= count) break;
    selected.push(o);
  }

  return selected;
}

/**
 * Clears the user's local question bank.
 */
export function clearQuestionBank(): void {
  memoryCache = [];
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}
