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
import {
  generateUUID,
  getLocalExams,
  deleteExam,
  saveExam,
  getExamAttempts,
  getLocalFlashcardDecks,
  deleteFlashcardDeck,
} from "./examService";

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
  gradableCount: number;
  promptCount: number;
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
 * Formats: "X questions will be added under subject Y, Z need review",
 * or for ungradable study materials: "Lesson material, 0 gradable questions".
 */
export function computeImportPreview(
  rawQuestions: RawImportQuestionItem[],
  subject?: string,
  sourceFile: string = "Reviewer Document"
): ImportPreviewSummary {
  const chosenSubject = (subject && subject.trim()) || sanitizeDefaultSubject(sourceFile);
  const total = rawQuestions.length;

  let needsReviewCount = 0;
  let promptCount = 0;
  let gradableCount = 0;

  for (const q of rawQuestions) {
    const qType = q.questionType || "mcq";
    const status = computeReviewStatus(q.options, q.correctIndex, q.reviewStatus, qType);
    if (status === "needs_review") {
      needsReviewCount++;
    }
    if (qType === "prompt" || (typeof q.correctIndex === "number" && q.correctIndex < 0)) {
      promptCount++;
    } else if (status === "verified" || (!q.reviewStatus && typeof q.correctIndex === "number" && q.correctIndex >= 0)) {
      gradableCount++;
    }
  }

  const verifiedCount = total - needsReviewCount;

  let summaryText = "";
  if (gradableCount === 0 && total > 0) {
    summaryText = `Lesson material, 0 gradable questions (${promptCount} practice prompt${promptCount === 1 ? "" : "s"})`;
  } else {
    const reviewClause = needsReviewCount > 0 ? `, ${needsReviewCount} need review` : "";
    summaryText = `${total} question${total === 1 ? "" : "s"} will be added under subject '${chosenSubject}'${reviewClause}`;
  }

  return {
    total,
    verifiedCount,
    needsReviewCount,
    gradableCount,
    promptCount,
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
 * One-click rollback: deletes all questions imported in a specific batch,
 * removes associated practice set exam (or marks "source removed" if attempts exist),
 * and deletes associated flashcard decks.
 */
export async function deleteImportBatch(
  batchId: string
): Promise<{ deletedCount: number; deletedExams?: number; deletedDecks?: number }> {
  // 1. Delete questions & batch from question bank
  const bankResult = await deleteBankBatch(batchId);

  // 2. Delete or dissociate exams associated with this batch
  let deletedExams = 0;
  try {
    const exams = getLocalExams();
    for (const exam of exams) {
      if (exam.import_batch_id === batchId || (exam as any).importBatchId === batchId) {
        const attempts = await getExamAttempts(exam.id);
        if (attempts && attempts.length > 0) {
          // Keep exam with attempts, mark "source removed"
          if (!exam.title.includes("(source removed)")) {
            await saveExam({
              ...exam,
              title: `${exam.title} (source removed)`,
              source_document_title: `${exam.source_document_title || "Document"} (source removed)`,
            });
          }
        } else {
          await deleteExam(exam.id);
          deletedExams++;
        }
      }
    }
  } catch (err) {
    console.warn("Failed to cleanup batch exams:", err);
  }

  // 3. Delete flashcard decks associated with this batch
  let deletedDecks = 0;
  try {
    const decks = getLocalFlashcardDecks();
    for (const deck of decks) {
      if (deck.import_batch_id === batchId || (deck as any).importBatchId === batchId) {
        await deleteFlashcardDeck(deck.id);
        deletedDecks++;
      }
    }
  } catch (err) {
    console.warn("Failed to cleanup batch flashcard decks:", err);
  }

  return {
    deletedCount: bankResult.deletedCount,
    deletedExams,
    deletedDecks,
  };
}

/**
 * Fetches all questions belonging to a specific batch.
 */
export function getQuestionsByBatchId(batchId: string): StoredQuestion[] {
  return getUserQuestions({ importBatchId: batchId });
}
