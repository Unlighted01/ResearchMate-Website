// ============================================
// QUESTION BANK SERVICE - Persistent Local-First User Question Library
// Stores, filters, and samples exam questions extracted directly
// from user-uploaded PDFs, CSVs, and review notes.
// 100% Offline · $0 API Cost · Browser LocalStorage / IndexedDB
// ============================================

import { Question, generateUUID } from "./examService";

export interface StoredQuestion extends Question {
  sourceDocument?: string;
  importedAt?: number;
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
 * Saves or appends extracted questions into the user's permanent bank.
 * Automatically deduplicates identical question stems.
 */
export function saveQuestionsToBank(
  newQuestions: Question[],
  sourceDocumentTitle: string = "User Upload",
  mode: "append" | "replace" = "append"
): { addedCount: number; totalCount: number } {
  if (!newQuestions || newQuestions.length === 0) {
    const current = loadFromStorage();
    return { addedCount: 0, totalCount: current.length };
  }

  const existing = mode === "replace" ? [] : loadFromStorage();
  const existingStems = new Set(
    existing.map((q) => q.question.trim().toLowerCase())
  );

  const formatted: StoredQuestion[] = [];
  let addedCount = 0;

  for (const q of newQuestions) {
    const cleanStem = (q.question || "").trim().toLowerCase();
    if (!cleanStem || existingStems.has(cleanStem)) continue;

    existingStems.add(cleanStem);
    formatted.push({
      ...q,
      id: q.id || generateUUID(),
      sourceDocument: sourceDocumentTitle,
      importedAt: Date.now(),
      accuracyHistory: {
        attempts: 0,
        correct: 0,
      },
    });
    addedCount++;
  }

  const combined = [...existing, ...formatted];
  persistToStorage(combined);
  return { addedCount, totalCount: combined.length };
}

/**
 * Returns all stored questions in the user's bank, with optional topic filtering.
 */
export function getUserQuestions(filter?: {
  topic?: string;
  sourceDocument?: string;
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
    return true;
  });
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

  for (const q of all) {
    const topic = q.topicTag || "General";
    byTopic[topic] = (byTopic[topic] || 0) + 1;

    if (q.sourceDocument) {
      docSet.add(q.sourceDocument);
    }

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
 * Intelligently samples questions for Daily Sprints:
 * Prioritizes:
 * 1. Previously missed questions (< 80% accuracy)
 * 2. Unattempted questions
 * 3. General random draw
 */
export function sampleSprintQuestions(
  count: number = 5,
  preferredTopic?: string
): StoredQuestion[] {
  let pool = getUserQuestions(
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

  // 1. Take missed questions first (up to count)
  for (const m of shuffle(missed)) {
    if (selected.length >= count) break;
    selected.push(m);
  }

  // 2. Fill remaining slots with others
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
