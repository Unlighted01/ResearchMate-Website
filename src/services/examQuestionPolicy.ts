import type { Flashcard, Question } from "./examService";
import { hasTrustedKey } from "./keyProvenance";

/** Only complete, reviewed questions may contribute to a scored answer key. */
export function getGradableQuestions(questions: Question[]): Question[] {
  return questions.filter((question) => {
    if (question.reviewStatus === "needs_review" || question.reviewStatus === "flagged") return false;
    if (!question.question.trim()) return false;
    if (!Array.isArray(question.options) || question.options.length < 2) return false;
    if (question.options.some((option) => !option.trim() || /^\[?option [a-h]\]?$/i.test(option.trim()))) return false;
    if (question.options.every((option) => /^[a-h]$/i.test(option.trim()))) return false;
    if (!hasTrustedKey(question)) return false;
    return Number.isInteger(question.correctIndex) &&
      question.correctIndex >= 0 && question.correctIndex < question.options.length;
  });
}

function assertRightsRecorded(item: { publicationRights?: "original" | "licensed"; rightsEvidence?: string }): void {
  if (!item.publicationRights) throw new Error("Publication rights have not been recorded for every item.");
  if (item.publicationRights === "licensed" && !item.rightsEvidence?.trim()) {
    throw new Error("Licensed items require rights evidence before publication.");
  }
}

export function assertPublicExamReady(questions: Question[], visibility?: "private" | "unlisted" | "public"): void {
  if (!visibility || visibility === "private") return;
  if (questions.length === 0 || getGradableQuestions(questions).length !== questions.length ||
      questions.some((question) => question.reviewStatus !== "verified" || !question.explanation.trim())) {
    throw new Error("Every question must have a reviewed answer before publication.");
  }
  questions.forEach(assertRightsRecorded);
}

export function assertPublicFlashcardsReady(cards: Flashcard[], visibility?: "private" | "unlisted" | "public"): void {
  if (!visibility || visibility === "private") return;
  if (cards.length === 0 || cards.some((card) =>
    card.reviewStatus !== "verified" || !card.front.trim() || !card.back.trim()
  )) {
    throw new Error("Every flashcard must have a reviewed answer before publication.");
  }
  cards.forEach(assertRightsRecorded);
}
