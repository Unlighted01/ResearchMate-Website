import { parseTwoPassQuestionsAndAnswersDetailed } from "./pdfQuestionImporter";
import { importQuestionsToBank } from "./questionImportService";
import { initQuestionBank, getUserQuestions, updateQuestion, type StoredQuestion } from "./questionBankService";
import { confirmOcrKey, type SourceCrop } from "./keyProvenance";
import { changeConfirmedOcrKey } from "./ocrKeyConfirmationService";
import { hasValidKeyConfirmation } from "./keyProvenance";
import { pdfOcrPages, type PdfOcrJob } from "./pdfLocalOcrService";
import { getGradableQuestions } from "./examQuestionPolicy";
import { saveExam } from "./examService";

export async function createReviewedPdfExam(sourceHash: string, name: string) {
  await initQuestionBank();
  const questions = getGradableQuestions(pdfOcrDrafts(sourceHash));
  if (!questions.length) throw new Error("Confirm at least one question against its original key before starting an exam.");
  return saveExam({ title: `${name} — reviewed questions`, source_document_title: name, questions, visibility: "private" });
}

export function pdfOcrDrafts(hash: string): StoredQuestion[] {
  return getUserQuestions().filter((question) => question.origin === "ocr_import" && question.sourceHash === hash);
}

export async function createPdfOcrDrafts(job: PdfOcrJob) {
  const snapshot = { ...job, completedPages: [...job.completedPages] };
  await initQuestionBank();
  const pages = await pdfOcrPages(snapshot);
  if (!pages.length) throw new Error("OCR at least one page before extracting review drafts.");
  const parsed = parseTwoPassQuestionsAndAnswersDetailed(pages.map((page) => ({ pageNumber: page.pageNumber, text: page.text, items: [], extractionMethod: "ocr" as const })));
  if (!parsed.items.length) throw new Error("No structured questions were detected. Review the OCR text as notes; no questions or keys were invented.");
  const result = await importQuestionsToBank({ sourceFile: job.name, origin: "ocr_import", rawQuestions: parsed.items.map((item) => ({
    ...item, sourcePage: item.sourcePage || item.pageNumber, sourceHash: job.sourceHash,
    keyProvenance: "none", keyConfirmation: undefined, reviewStatus: "needs_review",
  })) });
  return { ...result, sourcePages: pages.map(page => page.pageNumber), totalPages: snapshot.pageCount };
}

/** Explicit entry-by-entry confirmation. No bulk key promotion or regrading. */
export function confirmPdfOcrDraft(input: {
  id: string; sourceHash: string; page: number; crop: SourceCrop; correctIndex: number; reviewedQuestion: boolean;
}): StoredQuestion {
  const current = pdfOcrDrafts(input.sourceHash).find((question) => question.id === input.id);
  if (!current) throw new Error("This question does not belong to the selected PDF.");
  if (!input.reviewedQuestion) throw new Error("Check the question, choices, and explanation against the PDF first.");
  if (!current.question.trim() || !current.explanation?.trim() || /^Answer key not explicitly indexed/i.test(current.explanation) || current.options.length < 2 ||
    new Set(current.options.map((option) => option.trim().toLowerCase())).size !== current.options.length ||
    current.options.some((option) => !option.trim() || /^Choice [A-E]$/.test(option))) {
    throw new Error("Edit the question and complete its choices and explanation before confirming its key.");
  }
  const candidate = { ...current, sourcePage: input.page, sourceCrop: { ...input.crop }, correctIndex: input.correctIndex };
  const record = { value: String.fromCharCode(65 + input.correctIndex), sourceHash: input.sourceHash, page: input.page, crop: { ...input.crop }, time: new Date().toISOString() };
  const confirmed = hasValidKeyConfirmation(current)
    ? { ...changeConfirmedOcrKey(current, input.correctIndex, record), sourcePage: input.page, sourceCrop: { ...input.crop } }
    : confirmOcrKey(candidate, record);
  // Validate again when a changed confirmation also used a new key region.
  if (!hasValidKeyConfirmation(confirmed)) throw new Error("The key confirmation does not match its source region.");
  const updated: StoredQuestion = { ...confirmed, questionType: "mcq", isGradable: true, reviewStatus: "verified", suspiciousReasons: [] };
  updateQuestion(current.id, updated);
  return updated;
}
