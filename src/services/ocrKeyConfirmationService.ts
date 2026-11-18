import { getLocalAttempts, saveLocalAttempts, type Question } from "./examService";
import { confirmOcrKey, hasValidKeyConfirmation, type KeyConfirmation } from "./keyProvenance";

/** Changes a confirmed local key without mutating prior attempt scores or snapshots. */
export function changeConfirmedOcrKey(
  question: Question,
  correctIndex: number,
  confirmation: KeyConfirmation,
): Question {
  if (!hasValidKeyConfirmation(question)) throw new Error("The existing key is not confirmed.");
  const changed = correctIndex !== question.correctIndex;
  const updated = confirmOcrKey({ ...question, correctIndex }, confirmation);

  if (changed) {
    const attempts = getLocalAttempts();
    saveLocalAttempts(attempts.map((attempt) => {
      const usedEarlierKey = attempt.questions_snapshot.some((snapshot) =>
        snapshot.id === question.id && snapshot.correctIndex === question.correctIndex);
      return usedEarlierKey ? { ...attempt, gradedWithEarlierKey: true } : attempt;
    }));
  }

  return updated;
}
