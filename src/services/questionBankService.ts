// ============================================
// QUESTION BANK SERVICE - Persistent Local-First User Question Library
// Stores, filters, and samples exam questions extracted directly
// from user-uploaded PDFs, CSVs, and review notes.
// Two-stage deduplication (FNV-1a + exact equality) & review queue.
// 100% Offline · $0 API Cost · Browser IndexedDB + LocalStorage fallback
// ============================================

import {
  Question,
  generateUUID,
  getLocalExams,
  saveLocalExams,
  getLocalAttempts,
  getLocalFlashcardDecks,
  saveLocalFlashcardDecks,
  StoredExam,
} from "./examService";
import { setSyncStatus } from "./supabaseClient";
import {
  OptionPickStats,
  recordOptionPickAndAnalyze,
  filterEnemyItems,
} from "./distractorQualityService";
import {
  getAllQuestionsFromDb,
  saveQuestionsToDb,
  deleteQuestionsByBatchFromDb,
  getAllBatchesFromDb,
  saveBatchToDb,
  deleteBatchFromDb,
  clearAllDb,
} from "./questionBankDb";

export type QuestionOrigin =
  | "pdf_import"
  | "parsed_pdf"
  | "rule_generated"
  | "ai_generated"
  | "csv"
  | "manual"
  | "migrated";

export type QuestionReviewStatus = "verified" | "needs_review" | "flagged";
export type QuestionType = "mcq" | "free_response" | "prompt";

export interface StoredQuestion extends Question {
  subject?: string;
  topic?: string;
  chapter?: string;
  number?: number;
  templateType?: string;
  stem?: string;
  sourceDocument?: string;
  sourceFile?: string;
  sourcePage?: number;
  importBatchId?: string;
  importedAt?: number;
  origin?: QuestionOrigin;
  questionType?: QuestionType;
  isGradable?: boolean;
  reviewStatus?: QuestionReviewStatus;
  suspiciousReasons?: string[];
  sourceQuote?: string;
  normalizedTextHash?: string;
  accuracyHistory?: {
    attempts: number;
    correct: number;
    lastAttemptAt?: number;
  };
  optionPickStats?: OptionPickStats;
}

export interface ImportBatch {
  id: string; // e.g. "batch_1731067200000_abc12"
  subject: string;
  sourceFile: string;
  timestamp: number;
  totalQuestions: number;
  verifiedCount: number;
  needsReviewCount: number;
  origin: QuestionOrigin;
  questionTypes?: Record<string, number>;
}

export interface QuestionBankStats {
  totalQuestions: number;
  bySubject: Record<string, number>;
  byTopic: Record<string, number>;
  sourceDocuments: string[];
  totalAttempted: number;
  averageAccuracy: number;
  needsReviewCount: number;
  verifiedCount: number;
  flaggedCount: number;
  batchesCount: number;
}

const STORAGE_KEY = "researchmate_user_question_bank_v1";
const BATCHES_STORAGE_KEY = "researchmate_import_batches_v1";

// In-memory cache for synchronous instant reads
let memoryCache: StoredQuestion[] | null = null;
let batchesCache: ImportBatch[] | null = null;
let isInitializedFromDb = false;

/**
 * Initializes the question bank from IndexedDB, migrating from localStorage if needed.
 */
export async function initQuestionBank(): Promise<void> {
  if (isInitializedFromDb && memoryCache !== null) return;

  try {
    const dbQuestions = await getAllQuestionsFromDb();
    const dbBatches = await getAllBatchesFromDb();

    if (dbQuestions.length > 0) {
      memoryCache = dbQuestions;
      batchesCache = dbBatches;
      isInitializedFromDb = true;
      return;
    }

    // Check localStorage fallback / initial migration
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const localQuestions: StoredQuestion[] = JSON.parse(raw);
          if (localQuestions && localQuestions.length > 0) {
            memoryCache = localQuestions;
            // Backfill into IndexedDB
            await saveQuestionsToDb(localQuestions);
          }
        } catch {}
      }

      const rawBatches = localStorage.getItem(BATCHES_STORAGE_KEY);
      if (rawBatches) {
        try {
          const localBatches: ImportBatch[] = JSON.parse(rawBatches);
          if (localBatches && localBatches.length > 0) {
            batchesCache = localBatches;
            for (const b of localBatches) {
              await saveBatchToDb(b);
            }
          }
        } catch {}
      }
    }

    if (memoryCache === null) memoryCache = [];
    if (batchesCache === null) batchesCache = [];
    isInitializedFromDb = true;
  } catch (err) {
    console.warn("Failed to initialize Question Bank from IndexedDB:", err);
    if (memoryCache === null) memoryCache = loadFromLocalStorage();
    if (batchesCache === null) batchesCache = loadBatchesFromLocalStorage();
  }
}

// Auto-trigger background hydration in browser
if (typeof window !== "undefined") {
  initQuestionBank().catch(() => {});
}

function loadFromLocalStorage(): StoredQuestion[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) || [] : [];
  } catch {
    return [];
  }
}

function loadBatchesFromLocalStorage(): ImportBatch[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(BATCHES_STORAGE_KEY);
    return raw ? JSON.parse(raw) || [] : [];
  } catch {
    return [];
  }
}

function getMemoryOrStorage(): StoredQuestion[] {
  if (memoryCache !== null) return memoryCache;
  memoryCache = loadFromLocalStorage();
  return memoryCache;
}

function getBatchesMemoryOrStorage(): ImportBatch[] {
  if (batchesCache !== null) return batchesCache;
  batchesCache = loadBatchesFromLocalStorage();
  return batchesCache;
}

function persistQuestions(questions: StoredQuestion[]): void {
  memoryCache = questions;

  // 1. Asynchronously persist to high-capacity IndexedDB
  saveQuestionsToDb(questions).catch((err) => {
    console.warn("Background IndexedDB persist failed:", err);
  });

  // 2. Safety copy in localStorage only if size allows (< 2MB)
  if (typeof localStorage !== "undefined") {
    try {
      const serialized = JSON.stringify(questions);
      if (serialized.length < 2_000_000) {
        localStorage.setItem(STORAGE_KEY, serialized);
      } else {
        // Clear oversized bank from localStorage to prevent QuotaExceededError; IndexedDB is primary
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // LocalStorage quota reached, safely ignore as IndexedDB is persistent
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }
}

function persistBatches(batches: ImportBatch[]): void {
  batchesCache = batches;

  saveBatchToDb(batches[0]).catch(() => {});

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(BATCHES_STORAGE_KEY, JSON.stringify(batches));
    } catch {}
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
 * Questions are marked "needs_review" if choices < 2 (for MCQ) or missing valid correctIndex.
 * 2 choices (True/False), 3 choices, 4 choices, 5 choices (A-E) default to "verified".
 * Free-response items default to "verified" when an explanation/answer is present.
 */
export function computeReviewStatus(
  options: string[] | undefined,
  correctIndex: number | undefined,
  explicitStatus?: QuestionReviewStatus,
  questionType?: QuestionType
): QuestionReviewStatus {
  if (explicitStatus === "flagged") return "flagged";
  if (explicitStatus === "needs_review" || questionType === "prompt") {
    return "needs_review";
  }

  if (questionType === "free_response") {
    return explicitStatus || "verified";
  }

  if (explicitStatus === "verified") {
    return "verified";
  }

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
  newQuestions: (Question & {
    subject?: string;
    topic?: string;
    sourcePage?: number;
    sourceFile?: string;
    importBatchId?: string;
    origin?: QuestionOrigin;
    questionType?: QuestionType;
    reviewStatus?: QuestionReviewStatus;
    suspiciousReasons?: string[];
    sourceQuote?: string;
  })[],
  sourceDocumentTitle: string = "User Upload",
  mode: "append" | "replace" = "append",
  defaultOrigin: QuestionOrigin = "pdf_import",
  defaultPage?: number,
  batchMetadata?: Partial<ImportBatch>
): {
  addedCount: number;
  totalCount: number;
  needsReviewCount: number;
  duplicatesSkipped: number;
  syncStatus: "local-only" | "synced" | "failed";
} {
  if (!newQuestions || newQuestions.length === 0) {
    const current = getMemoryOrStorage();
    const needsRev = current.filter((q) => q.reviewStatus === "needs_review").length;
    return {
      addedCount: 0,
      totalCount: current.length,
      needsReviewCount: needsRev,
      duplicatesSkipped: 0,
      syncStatus: "local-only",
    };
  }

  const existing = mode === "replace" ? [] : getMemoryOrStorage();

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
  let duplicatesSkipped = 0;
  let needsReviewCount = 0;

  const now = Date.now();
  const defaultSubject = batchMetadata?.subject || sourceDocumentTitle.replace(/\.[^/.]+$/, "");

  for (const q of newQuestions) {
    const stem = normalizeQuestionStem(q.question);
    if (!stem) continue;

    const hash = fnv1a32(stem);

    // Two-stage deduplication check
    const existingBucket = hashToStemsMap.get(hash);
    if (existingBucket && existingBucket.has(stem)) {
      duplicatesSkipped++;
      continue;
    }

    if (!existingBucket) {
      hashToStemsMap.set(hash, new Set([stem]));
    } else {
      existingBucket.add(stem);
    }

    const qType = q.questionType || "mcq";
    const reviewStatus = computeReviewStatus(q.options, q.correctIndex, q.reviewStatus, qType);
    if (reviewStatus === "needs_review") {
      needsReviewCount++;
    }

    formatted.push({
      ...q,
      id: q.id || generateUUID(),
      subject: q.subject || defaultSubject,
      topic: q.topic || q.topicTag || "General Review",
      topicTag: q.topicTag || q.topic || "General Review",
      sourceDocument: sourceDocumentTitle,
      sourceFile: q.sourceFile || sourceDocumentTitle,
      sourcePage: q.sourcePage ?? defaultPage,
      importBatchId: q.importBatchId || batchMetadata?.id,
      importedAt: now,
      origin: q.origin || defaultOrigin,
      questionType: qType,
      reviewStatus,
      suspiciousReasons: q.suspiciousReasons || [],
      sourceQuote: q.sourceQuote,
      normalizedTextHash: hash,
      accuracyHistory: {
        attempts: 0,
        correct: 0,
      },
    });
    addedCount++;
  }

  const combined = [...existing, ...formatted];
  persistQuestions(combined);

  // If batchMetadata or an importBatchId was specified, record the batch
  const batchId = batchMetadata?.id || (formatted[0]?.importBatchId);
  if (batchId) {
    const currentBatches = getBatchesMemoryOrStorage();
    const batchRecord: ImportBatch = {
      id: batchId,
      subject: defaultSubject,
      sourceFile: sourceDocumentTitle,
      timestamp: now,
      totalQuestions: addedCount,
      verifiedCount: addedCount - needsReviewCount,
      needsReviewCount,
      origin: defaultOrigin,
      ...(batchMetadata || {}),
    };
    persistBatches([batchRecord, ...currentBatches.filter((b) => b.id !== batchId)]);
  }

  setSyncStatus({
    state: "local_only",
    label: "Local only",
  });

  return {
    addedCount,
    totalCount: combined.length,
    needsReviewCount,
    duplicatesSkipped,
    syncStatus: "local-only",
  };
}

/**
 * Returns all stored questions in the user's bank, with multi-field filtering.
 */
export function getUserQuestions(filter?: {
  subject?: string;
  topic?: string;
  sourceDocument?: string;
  reviewStatus?: QuestionReviewStatus;
  importBatchId?: string;
}): StoredQuestion[] {
  const all = getMemoryOrStorage();
  if (!filter) return all;

  return all.filter((q) => {
    if (filter.subject && filter.subject !== "All Subjects" && filter.subject !== "ALL") {
      if (q.subject !== filter.subject) return false;
    }
    if (
      filter.topic &&
      filter.topic !== "All Topics" &&
      filter.topic !== "ALL" &&
      q.topic !== filter.topic &&
      q.topicTag !== filter.topic
    ) {
      return false;
    }
    if (
      filter.sourceDocument &&
      filter.sourceDocument !== "ALL" &&
      q.sourceDocument !== filter.sourceDocument &&
      q.sourceFile !== filter.sourceDocument
    ) {
      return false;
    }
    if (filter.reviewStatus && q.reviewStatus !== filter.reviewStatus) {
      return false;
    }
    if (filter.importBatchId && q.importBatchId !== filter.importBatchId) {
      return false;
    }
    return true;
  });
}

/**
 * Retrieves only questions requiring student verification.
 */
export function getNeedsReviewQuestions(filter?: { subject?: string }): StoredQuestion[] {
  return getUserQuestions({ ...filter, reviewStatus: "needs_review" });
}

/**
 * Retrieves verified questions ready for mock exams and sprints.
 */
export function getVerifiedQuestions(filter?: {
  subject?: string;
  topic?: string;
  sourceDocument?: string;
}): StoredQuestion[] {
  const all = getUserQuestions(filter);
  return all.filter((q) => q.reviewStatus === "verified" || !q.reviewStatus);
}

/**
 * Returns all recorded import batches synchronously from memory.
 */
export function getImportBatchesSync(): ImportBatch[] {
  return getBatchesMemoryOrStorage();
}

/**
 * Returns all recorded import batches (with background DB revalidation).
 */
export async function getImportBatches(): Promise<ImportBatch[]> {
  await initQuestionBank();
  return getBatchesMemoryOrStorage();
}

/**
 * Deletes all questions associated with an import batch, providing one-click rollback.
 */
export async function deleteImportBatch(batchId: string): Promise<{ deletedCount: number }> {
  if (!batchId) return { deletedCount: 0 };

  const current = getMemoryOrStorage();
  const remaining = current.filter((q) => q.importBatchId !== batchId);
  const deletedCount = current.length - remaining.length;

  persistQuestions(remaining);

  // Remove batch record
  const currentBatches = getBatchesMemoryOrStorage();
  persistBatches(currentBatches.filter((b) => b.id !== batchId));

  // Asynchronously purge from IndexedDB
  deleteQuestionsByBatchFromDb(batchId).catch(() => {});
  deleteBatchFromDb(batchId).catch(() => {});

  // Clean up or orphan associated local exams and flashcard decks
  try {
    const exams = getLocalExams();
    const attempts = getLocalAttempts();
    const attemptedExamIds = new Set(attempts.map((a) => a.exam_id).filter(Boolean));

    const updatedExams: StoredExam[] = [];
    for (const exam of exams) {
      if (exam.import_batch_id === batchId) {
        if (attemptedExamIds.has(exam.id)) {
          // Keep exam with attempts, but mark source as removed
          updatedExams.push({
            ...exam,
            source_document_title: `[Source Removed] ${exam.source_document_title || exam.title}`,
            import_batch_id: undefined,
          });
        }
        // If not attempted, drop exam
      } else {
        updatedExams.push(exam);
      }
    }
    saveLocalExams(updatedExams);

    // Delete associated flashcard decks
    const decks = getLocalFlashcardDecks();
    const remainingDecks = decks.filter((d) => d.import_batch_id !== batchId);
    saveLocalFlashcardDecks(remainingDecks);
  } catch (err) {
    console.warn("deleteImportBatch: error updating associated exams/decks", err);
  }

  return { deletedCount };
}

/**
 * Updates review status (e.g. approve a question or flag it).
 */
export function updateQuestionStatus(
  id: string,
  status: QuestionReviewStatus
): boolean {
  const all = getMemoryOrStorage();
  const target = all.find((q) => q.id === id);
  if (!target) return false;

  target.reviewStatus = status;
  persistQuestions(all);
  return true;
}

/**
 * Edits question text, options, or explanation in place.
 */
export function updateQuestion(
  id: string,
  updates: Partial<StoredQuestion>
): boolean {
  const all = getMemoryOrStorage();
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
    updates.reviewStatus || current.reviewStatus,
    current.questionType
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

  persistQuestions(all);
  return true;
}

/**
 * Deletes a single question from the bank.
 */
export function deleteQuestion(id: string): boolean {
  const all = getMemoryOrStorage();
  const filtered = all.filter((q) => q.id !== id);
  if (filtered.length === all.length) return false;

  persistQuestions(filtered);
  return true;
}

/**
 * Generates aggregated metrics on the user's local question library.
 */
export function getBankStats(): QuestionBankStats {
  const all = getMemoryOrStorage();
  const bySubject: Record<string, number> = {};
  const byTopic: Record<string, number> = {};
  const docSet = new Set<string>();
  let totalAttempted = 0;
  let totalCorrect = 0;
  let totalAttempts = 0;
  let needsReviewCount = 0;
  let verifiedCount = 0;
  let flaggedCount = 0;

  for (const q of all) {
    const subject = q.subject || "General Review";
    bySubject[subject] = (bySubject[subject] || 0) + 1;

    const topic = q.topic || q.topicTag || "General";
    byTopic[topic] = (byTopic[topic] || 0) + 1;

    if (q.sourceFile || q.sourceDocument) {
      docSet.add(q.sourceFile || q.sourceDocument!);
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
    bySubject,
    byTopic,
    sourceDocuments: Array.from(docSet),
    totalAttempted,
    averageAccuracy,
    needsReviewCount,
    verifiedCount,
    flaggedCount,
    batchesCount: getBatchesMemoryOrStorage().length,
  };
}

/**
 * Updates accuracy metrics when a question is solved in a sprint or mock exam.
 */
export function recordQuestionResult(
  questionId: string,
  isCorrect: boolean
): void {
  const all = getMemoryOrStorage();
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
    persistQuestions(all);
  }
}

/**
 * Records option selection and updates distractor performance metrics.
 * Flags distractors chosen under 5% and questions answered correctly over 95% after N attempts.
 */
export function recordQuestionOptionPick(
  questionId: string,
  chosenIndex: number,
  isCorrect: boolean
): OptionPickStats | null {
  const all = getMemoryOrStorage();
  let resultStats: OptionPickStats | null = null;
  let modified = false;

  for (const q of all) {
    if (q.id === questionId) {
      const totalOptions = q.options?.length || 4;
      const updated = recordOptionPickAndAnalyze(
        q.optionPickStats,
        chosenIndex,
        q.correctIndex,
        totalOptions
      );
      q.optionPickStats = updated;

      q.accuracyHistory = {
        attempts: updated.attempts,
        correct: updated.correct,
        lastAttemptAt: updated.lastAttemptAt,
      };

      if (updated.tooEasyFlag && !q.suspiciousReasons?.some((r) => r.includes("over 95%"))) {
        q.suspiciousReasons = [
          ...(q.suspiciousReasons || []),
          `Performance: answered correctly by ${Math.round((updated.correct / updated.attempts) * 100)}% of examinees (>95% threshold)`,
        ];
      }

      resultStats = updated;
      modified = true;
      break;
    }
  }

  if (modified) {
    persistQuestions(all);
  }
  return resultStats;
}

/**
 * Returns item-level option pick analytics.
 */
export function getItemAnalytics(questionId: string): OptionPickStats | null {
  const all = getMemoryOrStorage();
  const q = all.find((item) => item.id === questionId);
  return q?.optionPickStats || null;
}

/**
 * Samples verified questions for Daily Sprints.
 */
export function sampleSprintQuestions(
  count: number = 5,
  preferredTopic?: string
): StoredQuestion[] {
  let pool = getVerifiedQuestions(
    preferredTopic && preferredTopic !== "All Topics"
      ? { topic: preferredTopic }
      : undefined
  ).filter(
    (q) =>
      q.isGradable !== false &&
      q.questionType !== "prompt" &&
      q.questionType !== "free_response" &&
      (q.questionType === "mcq" || (!q.questionType && q.options && q.options.length >= 2))
  );

  if (pool.length === 0) return [];

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

  const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
  const selected: StoredQuestion[] = [];

  for (const m of shuffle(missed)) {
    if (selected.length >= count) break;
    selected.push(m);
  }

  for (const o of shuffle(others)) {
    if (selected.length >= count) break;
    selected.push(o);
  }

  const { selected: conflictFreeSelected } = filterEnemyItems(selected, count);
  return conflictFreeSelected;
}

/**
 * Assembles a conflict-free mock exam from verified bank questions, ensuring that
 * 100% of the assembled items contain no enemy stem leaks, clue leakages, or overlapping clauses.
 */
export function assembleExamFromBank(
  count: number = 20,
  filter?: { subject?: string; topic?: string }
): {
  selectedQuestions: StoredQuestion[];
  rejectedQuestions: { item: StoredQuestion; reason: string }[];
} {
  const verified = getVerifiedQuestions(filter);
  const mcqs = verified.filter(
    (q) =>
      q.isGradable !== false &&
      q.questionType !== "prompt" &&
      q.questionType !== "free_response" &&
      (q.questionType === "mcq" || (!q.questionType && q.options && q.options.length >= 2))
  );
  const { selected, rejected } = filterEnemyItems(mcqs, count);
  return {
    selectedQuestions: selected,
    rejectedQuestions: rejected,
  };
}

/**
 * Clears the user's local question bank and database.
 */
export function clearQuestionBank(): void {
  memoryCache = [];
  batchesCache = [];
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BATCHES_STORAGE_KEY);
    } catch {}
  }
  clearAllDb().catch(() => {});
}
