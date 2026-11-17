export interface GeneratedFlashcardCandidate {
  front: string;
  back: string;
  category?: string;
  sourceQuote?: string;
}

export type StudyOutputRoute = "reference_only" | "ocr_required" | "exam_or_quiz" | "flashcards" | "review_prompts" | "concept_generation";

export function recommendStudyOutput(input: {
  hasReadableText: boolean;
  isReferenceOnly?: boolean;
  verifiedQuestions: number;
  verifiedCards: number;
  ungradedPrompts: number;
}): StudyOutputRoute {
  if (input.isReferenceOnly) return "reference_only";
  if (!input.hasReadableText) return "ocr_required";
  if (input.verifiedQuestions > 0) return "exam_or_quiz";
  if (input.verifiedCards > 0) return "flashcards";
  if (input.ungradedPrompts > 0) return "review_prompts";
  return "concept_generation";
}

/** Source quotes are a first check; human review still establishes answer correctness. */
export function selectGroundedFlashcards<T extends GeneratedFlashcardCandidate>(
  candidates: T[],
  sourceText: string,
): T[] {
  const normalizedSource = sourceText.toLowerCase().replace(/\s+/g, " ");
  return candidates.filter((candidate) => {
    if (typeof candidate.front !== "string" || !candidate.front.trim()) return false;
    if (typeof candidate.back !== "string" || !candidate.back.trim()) return false;
    const quote = typeof candidate.sourceQuote === "string" ? candidate.sourceQuote.trim() : "";
    return quote.length >= 10 && normalizedSource.includes(quote.toLowerCase().replace(/\s+/g, " "));
  });
}
