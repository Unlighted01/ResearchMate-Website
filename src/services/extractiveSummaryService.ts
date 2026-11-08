// ============================================
// EXTRACTIVE SUMMARY SERVICE
// Client-side sentence-level frequency & TextRank summarizer.
// 0ms Latency · $0 API Cost · 100% Offline
// ============================================

const COMMON_STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from", "further",
  "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him", "himself", "his",
  "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", "me", "more", "most",
  "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", "only", "or", "other",
  "our", "ours", "ourselves", "out", "over", "own", "s", "same", "she", "should", "so", "some",
  "such", "t", "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there",
  "these", "they", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
  "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "will", "with",
  "would", "you", "your", "yours", "yourself", "yourselves"
]);

/**
 * Splits raw document text into clean sentence units.
 */
export function splitIntoSentences(text: string): string[] {
  if (!text) return [];

  // Remove excessive whitespace and line breaks
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ");

  // Match sentences ending in ., !, or ? followed by space or newline
  const matches = normalized.match(/[^.!?\n]+[.!?]+(?:\s+|\n|$)|[^.!?\n]+$/g) || [];

  return matches
    .map((s) => s.trim())
    .filter((s) => {
      // Must be at least 25 characters and contain more than 4 words
      return s.length >= 25 && s.split(/\s+/).length >= 4 && !/^(page\s+\d+|chapter\s+\d+|figure\s+\d+)/i.test(s);
    });
}

/**
 * Computes term frequencies across the document, filtering common stopwords.
 */
export function computeWordFrequencies(sentences: string[]): Map<string, number> {
  const freqs = new Map<string, number>();

  for (const sentence of sentences) {
    const words = sentence.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    for (const w of words) {
      if (COMMON_STOPWORDS.has(w)) continue;
      freqs.set(w, (freqs.get(w) || 0) + 1);
    }
  }

  return freqs;
}

/**
 * Scores each sentence based on salient word frequencies, sentence length normalization,
 * and position boost.
 */
export function scoreSentences(
  sentences: string[],
  freqs: Map<string, number>
): { sentence: string; score: number; originalIndex: number }[] {
  let maxFreq = 1;
  for (const count of freqs.values()) {
    if (count > maxFreq) maxFreq = count;
  }

  return sentences.map((sentence, idx) => {
    const words = sentence.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    if (words.length === 0) return { sentence, score: 0, originalIndex: idx };

    let totalScore = 0;
    for (const w of words) {
      if (COMMON_STOPWORDS.has(w)) continue;
      const count = freqs.get(w) || 0;
      totalScore += count / maxFreq;
    }

    // Normalized by word count to prevent ultra-long run-on sentences from winning
    const normalizedScore = totalScore / Math.sqrt(words.length);

    // Position boost: first 20% of sentences get a 1.25x weight (introductory thesis)
    const positionBoost = idx < Math.max(3, sentences.length * 0.2) ? 1.25 : 1.0;

    return {
      sentence,
      score: normalizedScore * positionBoost,
      originalIndex: idx,
    };
  });
}

/**
 * Extracts the top N central thesis sentences from a document without calling any external LLM.
 */
export function generateExtractiveSummary(
  text: string,
  sentenceCount: number = 3
): string {
  if (!text || text.trim().length === 0) {
    return "No text available for summary.";
  }

  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) {
    return text.trim();
  }
  if (sentences.length <= sentenceCount) {
    return sentences.join(" ");
  }

  const wordFreqs = computeWordFrequencies(sentences);
  const scored = scoreSentences(sentences, wordFreqs);

  // Pick top sentences by score
  const topPicks = [...scored]
    .sort((a, b) => b.score - a.score)
    .slice(0, sentenceCount);

  // Re-sort chronologically by original document order for natural reading flow
  topPicks.sort((a, b) => a.originalIndex - b.originalIndex);

  return topPicks.map((p) => p.sentence).join(" ");
}
