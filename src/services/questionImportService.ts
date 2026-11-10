// ============================================
// QUESTION IMPORT SERVICE - Unified Question Ingestion Engine
// Single entry point for Dashboard, Document Studio, and Study & Review.
// Writes exclusively to the Question Bank with full provenance tracking:
// - subject (user-chosen, default: source file name)
// - topic (chapter/section from the parser)
// - sourceFile & sourcePage
// - importBatchId & one-click rollback
// - origin & questionType (mcq | free_response)
// 100% Offline · $0 API Cost · Browser IndexedDB
// ============================================

import {
  saveQuestionsToBank,
  getImportBatchesSync as getBankBatchesSync,
  getImportBatches as getBankBatches,
  deleteImportBatch as deleteBankBatch,
  getUserQuestions,
  computeReviewStatus,
  StoredQuestion,
  ImportBatch,
  QuestionOrigin,
  QuestionReviewStatus,
  QuestionType,
} from "./questionBankService";
import { generateUUID } from "./examService";

export interface RawImportQuestionItem {
  id?: string;
  stem?: string;
  question?: string;
  options?: string[];
  correctIndex?: number;
  correctLetter?: string;
  explanation?: string;
  chapter?: string;
  topic?: string;
  topicTag?: string;
  questionType?: QuestionType;
  sourcePage?: number;
  sourceQuote?: string;
  reviewStatus?: QuestionReviewStatus;
  suspiciousReasons?: string[];
  number?: number;
  templateType?: string;
}

export interface QuestionImportParams {
  rawQuestions: RawImportQuestionItem[];
  subject?: string;
  sourceFile: string;
  origin?: QuestionOrigin;
  defaultPage?: number;
}

export interface QuestionImportResult {
  batchId: string;
  batch: ImportBatch;
  importedCount: number;
  duplicatesSkipped: number;
  needsReviewCount: number;
  verifiedCount: number;
  totalBankCount: number;
}

export interface ImportPreviewSummary {
  total: number;
  verifiedCount: number;
  needsReviewCount: number;
  subject: string;
  sourceFile: string;
  summaryText: string;
}

/**
 * Derives a clean default subject from a source file name.
 * e.g. "1001 Math Problems.pdf" -> "1001 Math Problems"
 * e.g. "Age_Problems.pdf" -> "Age Problems"
 */
export function sanitizeDefaultSubject(fileName: string): string {
  if (!fileName) return "General Review";
  const base = fileName.replace(/\.[^/.]+$/, "").trim();
  const cleaned = base.replace(/[_\-]+/g, " ").trim();
  return cleaned || "General Review";
}

/**
 * Computes a preview summary before committing an import to the bank.
 * Formats: "X questions will be added under subject Y, Z need review".
 */
export function computeImportPreview(
  rawQuestions: RawImportQuestionItem[],
  subject?: string,
  sourceFile: string = "Reviewer Document"
): ImportPreviewSummary {
  const chosenSubject = (subject && subject.trim()) || sanitizeDefaultSubject(sourceFile);
  const total = rawQuestions.length;

  let needsReviewCount = 0;
  for (const q of rawQuestions) {
    const qType = q.questionType || "mcq";
    const status = computeReviewStatus(q.options, q.correctIndex, q.reviewStatus, qType);
    if (status === "needs_review") {
      needsReviewCount++;
    }
  }

  const verifiedCount = total - needsReviewCount;
  const reviewClause = needsReviewCount > 0 ? `, ${needsReviewCount} need review` : "";
  const summaryText = `${total} question${total === 1 ? "" : "s"} will be added under subject '${chosenSubject}'${reviewClause}`;

  return {
    total,
    verifiedCount,
    needsReviewCount,
    subject: chosenSubject,
    sourceFile,
    summaryText,
  };
}

/**
 * Unified entry point to import questions into the Question Bank.
 * Automatically generates a batch ID, assigns subject vs. topic,
 * enforces origin & questionType, and enables one-click rollback.
 */
export async function importQuestionsToBank(
  params: QuestionImportParams
): Promise<QuestionImportResult> {
  const { rawQuestions, sourceFile, defaultPage } = params;
  const subject = (params.subject && params.subject.trim()) || sanitizeDefaultSubject(sourceFile);
  const origin: QuestionOrigin = params.origin || "pdf_import";

  const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();

  // Track question types in batch
  const questionTypeCounts: Record<string, number> = { mcq: 0, free_response: 0 };

  const formattedQuestions = rawQuestions.map((item, idx) => {
    const stem = (item.stem || item.question || "").trim();
    const options = Array.isArray(item.options) ? item.options : [];
    const qType: QuestionType = item.questionType || "mcq";
    
    questionTypeCounts[qType] = (questionTypeCounts[qType] || 0) + 1;

    // Distinct separation: subject = user-chosen, topic = chapter/section from parser
    const topic = (item.chapter || item.topic || item.topicTag || "General Review").trim();

    return {
      id: item.id || generateUUID(),
      question: stem,
      stem,
      options,
      correctIndex: typeof item.correctIndex === "number" ? item.correctIndex : 0,
      correctLetter: item.correctLetter,
      explanation: item.explanation || "",
      subject,
      topic,
      topicTag: topic,
      chapter: item.chapter || topic,
      number: item.number,
      templateType: item.templateType,
      sourceFile,
      sourceDocument: sourceFile,
      sourcePage: item.sourcePage ?? defaultPage,
      importBatchId: batchId,
      importedAt: now,
      origin,
      questionType: qType,
      reviewStatus: item.reviewStatus,
      suspiciousReasons: item.suspiciousReasons || [],
      sourceQuote: item.sourceQuote,
    };
  });

  const batchMetadata: Partial<ImportBatch> = {
    id: batchId,
    subject,
    sourceFile,
    origin,
    questionTypes: questionTypeCounts,
  };

  const { addedCount, totalCount, needsReviewCount, duplicatesSkipped } = saveQuestionsToBank(
    formattedQuestions,
    sourceFile,
    "append",
    origin,
    defaultPage,
    batchMetadata
  );

  const batchRecord: ImportBatch = {
    id: batchId,
    subject,
    sourceFile,
    timestamp: now,
    totalQuestions: addedCount,
    verifiedCount: addedCount - needsReviewCount,
    needsReviewCount,
    origin,
    questionTypes: questionTypeCounts,
  };

  return {
    batchId,
    batch: batchRecord,
    importedCount: addedCount,
    duplicatesSkipped,
    needsReviewCount,
    verifiedCount: addedCount - needsReviewCount,
    totalBankCount: totalCount,
  };
}

/**
 * Returns all recorded import batches for one-click rollback.
 */
export async function getImportBatches(): Promise<ImportBatch[]> {
  return getBankBatches();
}

/**
 * Returns import batches synchronously from memory.
 */
export function getImportBatchesSync(): ImportBatch[] {
  return getBankBatchesSync();
}

/**
 * One-click rollback: deletes all questions imported in a specific batch.
 */
export async function deleteImportBatch(
  batchId: string
): Promise<{ deletedCount: number }> {
  return deleteBankBatch(batchId);
}

/**
 * Fetches all questions belonging to a specific batch.
 */
export function getQuestionsByBatchId(batchId: string): StoredQuestion[] {
  return getUserQuestions({ importBatchId: batchId });
}
