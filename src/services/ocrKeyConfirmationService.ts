import { getLocalAttempts, saveLocalAttempts, type Question } from "./examService";
import { confirmOcrKey, hasValidKeyConfirmation, type KeyConfirmation } from "./keyProvenance";

export function markAttemptsWithEarlierKey(question: Question): void {
  if (!hasValidKeyConfirmation(question)) return;
  saveLocalAttempts(getLocalAttempts().map((attempt) => {
    const usedEarlierKey = attempt.questions_snapshot.some((snapshot) =>
      snapshot.id === question.id && snapshot.correctIndex === question.correctIndex);
    return usedEarlierKey ? { ...attempt, gradedWithEarlierKey: true } : attempt;
  }));
}

/** Changes a confirmed local key without mutating prior attempt scores or snapshots. */
export function changeConfirmedOcrKey(
  question: Question,
  correctIndex: number,
  confirmation: KeyConfirmation,
): Question {
  if (!hasValidKeyConfirmation(question)) throw new Error("The existing key is not confirmed.");
  const changed = correctIndex !== question.correctIndex;
  const updated = confirmOcrKey({ ...question, correctIndex, sourcePage: confirmation.page, sourceCrop: { ...confirmation.crop } }, confirmation);

  if (changed) {
    markAttemptsWithEarlierKey(question);
  }

  return updated;
}
