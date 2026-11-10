// ============================================
// EXAM SEED & IMMUTABLE EXAM RECORD SERVICE
// Deterministic Mulberry32 PRNG and persistent ExamRecord storage.
// Supports reproducible seed-based exams and OMR Answer Key lookup.
// 100% Offline · Zero-Cost · Versioned (v: 1)
// ============================================

import { Question, generateUUID } from "./examService";
import { filterEnemyItems } from "./distractorQualityService";

export const EXAM_FORMAT_VERSION = 2;

export type ExamSectionType = "standard_mcq" | "true_false" | "matching_set" | "other";

export interface ExamSectionConfig {
  name: string;
  questionCount: number;
  /**
   * Per-section choice/bubble count for the answer sheet:
   * - default: 4 (A-D)
   * - true_false: 2 (A-B / True-False)
   * - matching_set: up to 8 (A-H bubbles)
   * - standard_mcq: capped at 5 (A-E)
   */
  choicesPerItem?: number;
  sectionType?: ExamSectionType;
}

export interface ExamRecordConfig {
  totalQuestions: number;
  choicesPerItem?: number; // Global default fallback (default 4, max 5 for standard MCQs)
  sections?: ExamSectionConfig[];
  paperSize?: "A4" | "Letter" | "Legal";
  formatVersion?: number;
}

/**
 * Resolves the choice/bubble count for a section according to the answer sheet specifications:
 * - Default: 4 (A-D)
 * - True / False: 2 (A-B)
 * - Matching sets: up to 8 (A-H)
 * - Normal MCQs: capped at 5 (A-E)
 */
export function resolveSectionChoicesPerItem(
  section?: Partial<ExamSectionConfig>,
  globalDefault: number = 4
): number {
  if (!section) return Math.min(Math.max(globalDefault, 2), 5);

  if (section.sectionType === "true_false") {
    return 2;
  }
  if (section.sectionType === "matching_set") {
    const requested = section.choicesPerItem || 8;
    return Math.min(Math.max(requested, 2), 8); // Up to 8 bubbles (A-H)
  }
  // Normal MCQs (default 4, capped at 5)
  const count = section.choicesPerItem ?? globalDefault;
  return Math.min(Math.max(count, 2), 5);
}

export interface SheetSectionLayoutPlan {
  name: string;
  questionCount: number;
  choicesPerItem: number; // 2, 4, 5, or up to 8
  bubbleLabels: string[]; // e.g. ["A", "B"] or ["A", "B", "C", "D"] or ["A", "B", "C", "D", "E", "F", "G", "H"]
  sectionType: ExamSectionType;
}

export interface SheetLayoutPlan {
  totalQuestions: number;
  sections: SheetSectionLayoutPlan[];
}

/**
 * Plans the answer sheet layout by reading the per-section choice count.
 * Conforms to answer sheet planning requirements without rendering DOM/PDF yet.
 */
export function computeSheetLayoutPlan(config: ExamRecordConfig): SheetLayoutPlan {
  const globalDefault = config.choicesPerItem ?? 4;
  const sections: SheetSectionLayoutPlan[] =
    config.sections && config.sections.length > 0
      ? config.sections.map((sec) => {
          const choices = resolveSectionChoicesPerItem(sec, globalDefault);
          const labels = Array.from({ length: choices }, (_, i) => String.fromCharCode(65 + i));
          return {
            name: sec.name,
            questionCount: sec.questionCount,
            choicesPerItem: choices,
            bubbleLabels: labels,
            sectionType: sec.sectionType || (choices === 2 ? "true_false" : choices > 5 ? "matching_set" : "standard_mcq"),
          };
        })
      : [
          {
            name: "General Questions",
            questionCount: config.totalQuestions,
            choicesPerItem: Math.min(Math.max(globalDefault, 2), 5),
            bubbleLabels: Array.from(
              { length: Math.min(Math.max(globalDefault, 2), 5) },
              (_, i) => String.fromCharCode(65 + i)
            ),
            sectionType: "standard_mcq",
          },
        ];

  return {
    totalQuestions: config.totalQuestions,
    sections,
  };
}

export interface QuestionPermutationRecord {
  questionId: string;
  // choiceOrder[newIndex] = originalIndex
  choiceOrder: number[];
  originalCorrectIndex: number;
  newCorrectIndex: number;
}

export interface ExamRecord {
  examId: string;
  formatVersion: number; // "v" in QR code
  seed: string;
  createdAt: number;
  config: ExamRecordConfig;
  orderedQuestionIds: string[];
  permutations: Record<string, QuestionPermutationRecord>;
  answerKey: number[]; // resolved newCorrectIndex for each question in order
}

const STORAGE_KEY = "researchmate_exam_records_v1";

// In-memory fallback
let recordsCache: Record<string, ExamRecord> | null = null;

function loadRecordsFromStorage(): Record<string, ExamRecord> {
  if (recordsCache !== null) return recordsCache;
  if (typeof localStorage === "undefined") {
    recordsCache = {};
    return recordsCache;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    recordsCache = raw ? JSON.parse(raw) : {};
    return recordsCache || {};
  } catch (err) {
    console.warn("Failed to load exam records from localStorage:", err);
    recordsCache = {};
    return recordsCache;
  }
}

function persistRecordsToStorage(records: Record<string, ExamRecord>): void {
  recordsCache = records;
  if (typeof localStorage === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn("Failed to save exam records to localStorage:", err);
  }
}

/**
 * 32-bit Mulberry32 Pseudo-Random Number Generator.
 * Deterministic and fast with 32-bit internal state.
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Converts any seed string into a stable 32-bit unsigned integer using FNV-1a.
 */
export function stringToSeed(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Generates a human-readable seed code (e.g. SEED-4821 or EXAM-9182).
 */
export function generateSeedCode(prefix: string = "SEED"): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}

/**
 * Deterministic Fisher-Yates shuffle using a provided PRNG.
 * Does not mutate the input array.
 */
export function seededShuffle<T>(array: readonly T[], rng: () => number): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Creates and stores an immutable ExamRecord, shuffling questions and choices
 * deterministically according to the seed and format version.
 */
export function createSeededExam(
  questions: Question[],
  config: ExamRecordConfig,
  seedString?: string,
  explicitExamId?: string
): {
  examRecord: ExamRecord;
  orderedQuestions: Question[];
} {
  const seed = seedString?.trim() || generateSeedCode("SEED");
  const examId = explicitExamId?.trim() || generateUUID();
  const rng = mulberry32(stringToSeed(seed));

  // 1. Deterministically shuffle candidate questions
  const shuffledQuestions = seededShuffle(questions, rng);
  // 2. Filter enemy items so no stem contains another selected item's answer or duplicate source quote
  const { selected: conflictFreeQuestions } = filterEnemyItems(shuffledQuestions, config.totalQuestions);
  const totalCount = Math.min(config.totalQuestions, conflictFreeQuestions.length);
  const selectedQuestions = conflictFreeQuestions.slice(0, totalCount);

  const orderedQuestionIds: string[] = [];
  const permutations: Record<string, QuestionPermutationRecord> = {};
  const answerKey: number[] = [];
  const finalQuestions: Question[] = [];

  // 2. Deterministically permute choices for each question, balancing correct-answer positions
  // Create an array of target slots evenly cycling 0, 1, ..., choiceCount - 1 across all questions
  const targetSlots: number[] = [];
  for (let i = 0; i < selectedQuestions.length; i++) {
    const choicesForQ = selectedQuestions[i].options.length || 4;
    targetSlots.push(i % choicesForQ);
  }
  // Deterministically shuffle the target slots using PRNG
  const balancedSlots = seededShuffle(targetSlots, rng);

  for (let qIdx = 0; qIdx < selectedQuestions.length; qIdx++) {
    const q = selectedQuestions[qIdx];
    orderedQuestionIds.push(q.id);

    const choiceCount = q.options.length;
    const targetCorrectSlot = balancedSlots[qIdx] % choiceCount;

    // Remaining distractor original indices
    const origDistractorIndices = Array.from({ length: choiceCount }, (_, i) => i)
      .filter((idx) => idx !== q.correctIndex);
    const shuffledDistractors = seededShuffle(origDistractorIndices, rng);

    // Assemble permutedIndices placing q.correctIndex at targetCorrectSlot
    const permutedIndices: number[] = new Array(choiceCount);
    permutedIndices[targetCorrectSlot] = q.correctIndex;
    let distIdx = 0;
    for (let slot = 0; slot < choiceCount; slot++) {
      if (slot !== targetCorrectSlot) {
        permutedIndices[slot] = shuffledDistractors[distIdx++];
      }
    }

    // Build permuted options
    const permutedOptions = permutedIndices.map((origIdx) => q.options[origIdx]);
    const validCorrectIndex = targetCorrectSlot;

    permutations[q.id] = {
      questionId: q.id,
      choiceOrder: permutedIndices,
      originalCorrectIndex: q.correctIndex,
      newCorrectIndex: validCorrectIndex,
    };

    answerKey.push(validCorrectIndex);

    finalQuestions.push({
      ...q,
      options: permutedOptions,
      correctIndex: validCorrectIndex,
    });
  }

  const examRecord: ExamRecord = {
    examId,
    formatVersion: config.formatVersion || EXAM_FORMAT_VERSION,
    seed,
    createdAt: Date.now(),
    config: {
      ...config,
      totalQuestions: totalCount,
    },
    orderedQuestionIds,
    permutations,
    answerKey,
  };

  saveExamRecord(examRecord);

  return {
    examRecord,
    orderedQuestions: finalQuestions,
  };
}

/**
 * Saves an immutable ExamRecord into local storage.
 */
export function saveExamRecord(record: ExamRecord): void {
  const records = loadRecordsFromStorage();
  records[record.examId] = record;
  persistRecordsToStorage(records);
}

/**
 * Retrieves an ExamRecord by its exact examId.
 * Used by the OMR scanner to find the answer key.
 */
export function getExamRecord(examId: string): ExamRecord | null {
  const records = loadRecordsFromStorage();
  return records[examId] || null;
}

/**
 * Retrieves an ExamRecord by its seed code.
 * Used when a student wants to retake or inspect a shared seed.
 */
export function getExamRecordBySeed(seed: string): ExamRecord | null {
  const records = loadRecordsFromStorage();
  const cleanSeed = seed.trim().toLowerCase();
  for (const record of Object.values(records)) {
    if (record.seed.trim().toLowerCase() === cleanSeed) {
      return record;
    }
  }
  return null;
}

/**
 * Lists all stored ExamRecords, sorted by most recent first.
 */
export function listExamRecords(): ExamRecord[] {
  const records = loadRecordsFromStorage();
  return Object.values(records).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Generates the OMR QR payload adhering to versioned format:
 * {"v":1,"e":"9482","s":"4821","p":1,"t":2}
 */
export function generateQrPayload(
  examId: string,
  seed: string,
  pageNumber: number,
  totalPages: number
): string {
  return JSON.stringify({
    v: EXAM_FORMAT_VERSION,
    e: examId,
    s: seed,
    p: pageNumber,
    t: totalPages,
  });
}

/**
 * Clears stored exam records (used for test isolation).
 */
export function clearExamRecords(): void {
  recordsCache = {};
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}
