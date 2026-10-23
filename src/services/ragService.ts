// ============================================
// ragService.ts - Client-Side Retrieval Augmented Generation
// ============================================

import { generateEmbedding, generateEmbeddings } from "./geminiService";

// ============================================
// PART 1: INTERFACES & TYPES
// ============================================

export interface DocumentChunk {
  chunkId: string;
  text: string;
  index: number;
  sourceTitle?: string;
  pageNumber?: number;
}

export interface EmbeddedChunk extends DocumentChunk {
  embedding: number[];
}

export interface SynthesisSourceItem {
  id?: string;
  sourceTitle?: string;
  pageNumber?: number;
  text?: string;
  aiSummary?: string;
  ocrText?: string;
}

// In-memory cache of chunk embeddings to eliminate redundant network calls
const chunkEmbeddingCache = new Map<string, number[]>();

export function clearEmbeddingCache(): void {
  chunkEmbeddingCache.clear();
}

// ============================================
// PART 2: TEXT CHUNKING (WORD BOUNDARY AWARE)
// ============================================

/**
 * Slices document text on word boundaries into an array of chunks with metadata.
 *
 * @param text The full document text string to chunk
 * @param chunkSize Target maximum character length per chunk (default: 1500)
 * @param overlap Target character overlap between consecutive chunks (default: 200)
 * @returns Array of DocumentChunk objects with chunkId, text, and index
 */
export function chunkText(
  text: string,
  chunkSize = 1500,
  overlap = 200,
): DocumentChunk[] {
  if (!text || typeof text !== "string") return [];
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  // Enforce reasonable bounds
  const effectiveChunkSize = Math.max(100, chunkSize);
  const effectiveOverlap = Math.max(0, Math.min(overlap, Math.floor(effectiveChunkSize / 2)));

  // Track page markers if present (e.g. "[Page 1]", "[Page 42]")
  const pageRegex = /\[Page\s+(\d+)\]/gi;
  const pageMarkers: { pos: number; page: number }[] = [];
  let pMatch: RegExpExecArray | null;
  while ((pMatch = pageRegex.exec(normalized)) !== null) {
    pageMarkers.push({ pos: pMatch.index, page: parseInt(pMatch[1], 10) });
  }

  const getPageForPos = (pos: number): number | undefined => {
    if (pageMarkers.length === 0) return undefined;
    let curr: number | undefined = undefined;
    for (const m of pageMarkers) {
      if (m.pos <= pos) curr = m.page;
      else break;
    }
    return curr ?? pageMarkers[0].page;
  };

  if (normalized.length <= effectiveChunkSize) {
    const single: DocumentChunk = {
      chunkId: "chunk-0",
      text: normalized,
      index: 0,
    };
    const pageNum = getPageForPos(0);
    if (pageNum !== undefined) single.pageNumber = pageNum;
    return [single];
  }

  const chunks: DocumentChunk[] = [];
  let start = 0;
  let chunkIndex = 0;



  while (start < normalized.length) {
    let end = Math.min(start + effectiveChunkSize, normalized.length);
    let snappedToProblem = false;

    if (end < normalized.length) {
      // Look backwards from `end` for a natural problem, paragraph, or sentence boundary
      const searchWindowStart = Math.max(start + effectiveOverlap, end - 300);
      const windowStr = normalized.slice(searchWindowStart, end);

      // Priority 1: Check for problem or exercise item header (e.g. "\n6. ", "\nProblem 4:", "\nQuestion 5)")
      // If a new problem starts inside the search window, cut right before it so the problem stays intact in the next chunk.
      const problemBoundaryMatch = windowStr.match(/\n+(?=(?:(?:Problem|Question|Item|Exercise|Task|Q\.?)\s*#?\s*\d+|\d{1,3}[\.\)]\s+))/i);

      // Priority 2: Check for double newline (paragraph boundary)
      const paragraphBreakMatch = windowStr.match(/\n\s*\n+[^\n]*$/);

      // Priority 3: Check for single newline
      const lineBreakMatch = windowStr.match(/\n[^\n]*$/);

      // Priority 4: Standard whitespace word boundary
      const wordBreakMatch = windowStr.match(/\s+[^\s]*$/);

      if (problemBoundaryMatch && problemBoundaryMatch.index !== undefined && problemBoundaryMatch.index > 0) {
        end = searchWindowStart + problemBoundaryMatch.index;
        snappedToProblem = true;
      } else if (paragraphBreakMatch && paragraphBreakMatch.index !== undefined && paragraphBreakMatch.index > 0) {
        end = searchWindowStart + paragraphBreakMatch.index;
      } else if (lineBreakMatch && lineBreakMatch.index !== undefined && lineBreakMatch.index > 0) {
        end = searchWindowStart + lineBreakMatch.index;
      } else if (wordBreakMatch && wordBreakMatch.index !== undefined) {
        end = searchWindowStart + wordBreakMatch.index;
      }
    }

    const chunkContent = normalized.slice(start, end).trim();
    if (chunkContent.length > 0) {
      const pageNum = getPageForPos(start);
      const chunk: DocumentChunk = {
        chunkId: `chunk-${chunkIndex}`,
        text: chunkContent,
        index: chunkIndex,
      };
      if (pageNum !== undefined) chunk.pageNumber = pageNum;
      chunks.push(chunk);
      chunkIndex++;
    }

    if (end >= normalized.length) {
      break;
    }

    // Advance start: if cleanly snapped to a problem boundary, start next chunk directly at the problem.
    // Otherwise step back by effectiveOverlap to maintain context continuity.
    let nextStart = snappedToProblem ? end : end - effectiveOverlap;
    if (nextStart <= start) {
      nextStart = end;
    } else if (!snappedToProblem) {
      // Snap nextStart forward to the beginning of the next word to avoid starting mid-word
      while (nextStart < end && !/\s/.test(normalized[nextStart - 1] || " ")) {
        nextStart++;
      }
    }

    // Skip leading whitespace for clean chunk start
    while (nextStart < normalized.length && /\s/.test(normalized[nextStart])) {
      nextStart++;
    }

    // Safety guard to ensure strict forward progression
    start = nextStart > start ? nextStart : end;
  }

  return chunks;
}

// ============================================
// PART 3: VECTOR MATH & COSINE SIMILARITY
// ============================================

/**
 * Computes cosine similarity between two numeric vectors.
 * Returns 1 for identical direction, 0 for orthogonal, -1 for opposite.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const len = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Finds top-K most relevant chunks using cosine similarity against the query embedding.
 */
export function findTopKChunks<T extends { text: string; embedding: number[] }>(
  queryEmbedding: number[],
  chunks: T[],
  topK = 4,
): T[] {
  if (!chunks || chunks.length === 0) return [];
  if (!queryEmbedding || queryEmbedding.length === 0) {
    return chunks.slice(0, Math.max(1, topK));
  }

  const scored = chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  // Sort descending by similarity score
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, Math.max(1, topK)).map((item) => item.chunk);
}

const COMMON_RETRIEVAL_STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "up", "about", "into", "through", "after", "is", "am", "are", "was",
  "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "can",
  "could", "shall", "should", "will", "would", "may", "might", "must", "it", "its",
  "this", "that", "these", "those", "i", "you", "he", "she", "we", "they", "me",
  "him", "her", "us", "them", "my", "your", "his", "their", "what", "which", "who",
  "whom", "whose", "where", "when", "why", "how", "all", "any", "both", "each",
  "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own",
  "same", "so", "than", "too", "very", "just", "now", "answer", "solve", "question",
  "problem", "number", "exercise", "please", "help"
]);

/**
 * Extracts target question, problem, or exercise identifier from a user prompt.
 * e.g. "answer number 6" -> "6", "solve problem 14" -> "14", "#3" -> "3", "exercise 2b" -> "2b".
 */
export function extractTargetQuestionNumber(query: string): string | null {
  if (!query || typeof query !== "string") return null;
  const normalized = query.trim().toLowerCase();

  // Explicit labels like "number 6", "problem 6", "question 6", "exercise 6", "#6", "item 6", "no. 6"
  const match = normalized.match(
    /\b(?:problem|question|exercise|number|item|no\.?|task)\s*#?\s*([0-9]+[a-z]?)\b/i
  ) || normalized.match(/(?:^|\s)#([0-9]+[a-z]?)\b/i);

  if (match) return match[1];

  // Action commands like "answer 6", "solve 6", "do 6"
  const actionMatch = normalized.match(/\b(?:answer|solve|do|calculate|explain)\s+([0-9]+[a-z]?)\b/i);
  if (actionMatch) return actionMatch[1];

  return null;
}

/**
 * Checks whether a chunk contains the target problem header or number.
 * Uses strict boundary matching to avoid false positives (e.g. "6" must NOT match "62" or "16").
 */
export function chunkMatchesProblemNumber(chunkText: string, problemNum: string): boolean {
  if (!chunkText || !problemNum) return false;
  const escaped = problemNum.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

  const patterns = [
    // Standard numbered lists: "6. ", "6) ", "[6] ", or "\n6. "
    new RegExp(`(?:^|[\\r\\n\\s])\\[?${escaped}[\\)\\.\\]:]\\s+`, "i"),
    // Explicit keywords: "Problem 6", "Question 6", "Exercise 6", "#6", "No. 6"
    new RegExp(`\\b(?:problem|question|exercise|item|number|no\\.?|#)\\s*#?\\s*${escaped}\\b`, "i"),
  ];

  return patterns.some((regex) => regex.test(chunkText));
}

/**
 * Hybrid retrieval combining semantic vector similarity with exact question/problem number
 * matching and keyword boosting. Ensures specific question lookups (e.g. "answer number 6")
 * reliably reach the AI's context.
 */
export function findTopKChunksHybrid<T extends DocumentChunk & { embedding?: number[] }>(
  query: string,
  queryEmbedding: number[],
  chunks: T[],
  topK = 4,
): T[] {
  if (!chunks || chunks.length === 0) return [];
  const targetNum = extractTargetQuestionNumber(query);

  const scored = chunks.map((chunk, idx) => {
    let score = 0;

    // 1. Semantic Cosine Similarity (if vectors available)
    if (queryEmbedding && queryEmbedding.length > 0 && chunk.embedding && chunk.embedding.length > 0) {
      score = cosineSimilarity(queryEmbedding, chunk.embedding);
    }

    // 2. Exact Question / Problem Number Match
    if (targetNum && chunkMatchesProblemNumber(chunk.text, targetNum)) {
      score += 2.5; // High priority boost to guarantee top ranking
    }

    // 3. Problem Continuation: if the previous chunk matched the problem, give this one a boost
    if (targetNum && idx > 0 && chunkMatchesProblemNumber(chunks[idx - 1].text, targetNum)) {
      score += 0.9;
    }

    // 4. Keyword token overlap (discounting stopwords)
    const cleanQuery = query.toLowerCase().replace(/[^\w\s]/g, " ").trim();
    const queryTokens = cleanQuery.split(/\s+/).filter((t) => t.length > 1 && !COMMON_RETRIEVAL_STOPWORDS.has(t));
    if (queryTokens.length > 0) {
      const lowerChunk = chunk.text.toLowerCase();
      let matchCount = 0;
      for (const token of queryTokens) {
        if (lowerChunk.includes(token)) matchCount++;
      }
      score += (matchCount / queryTokens.length) * 0.5;
    }

    return { chunk, score };
  });

  // Sort descending by hybrid relevance score
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, Math.max(1, topK)).map((item) => item.chunk);
}

// ============================================
// PART 4: CHUNK EMBEDDING & CACHING
// ============================================

/**
 * Generates embeddings for an array of document chunks, leveraging an in-memory cache.
 */
export async function embedChunks(chunks: DocumentChunk[]): Promise<EmbeddedChunk[]> {
  if (!chunks || chunks.length === 0) return [];

  const missingIndices: number[] = [];
  const missingTexts: string[] = [];

  const results: EmbeddedChunk[] = chunks.map((chunk, i) => {
    const cached = chunkEmbeddingCache.get(chunk.text);
    if (cached) {
      return { ...chunk, embedding: cached };
    }
    missingIndices.push(i);
    missingTexts.push(chunk.text);
    return { ...chunk, embedding: [] };
  });

  if (missingTexts.length > 0) {
    try {
      const generated = await generateEmbeddings(missingTexts);
      missingIndices.forEach((chunkIdx, listIdx) => {
        const emb = generated[listIdx] || [];
        chunkEmbeddingCache.set(chunks[chunkIdx].text, emb);
        results[chunkIdx].embedding = emb;
      });
    } catch (err) {
      console.warn("Batch embedding error, falling back to individual embeddings:", err);
      for (let j = 0; j < missingIndices.length; j++) {
        const chunkIdx = missingIndices[j];
        try {
          const single = await generateEmbedding(chunks[chunkIdx].text);
          chunkEmbeddingCache.set(chunks[chunkIdx].text, single);
          results[chunkIdx].embedding = single;
        } catch {
          results[chunkIdx].embedding = [];
        }
      }
    }
  }

  return results;
}

// ============================================
// PART 5: SYNTHESIS SAMPLING (BEGINNING, MIDDLE, END)
// ============================================

/**
 * Samples evenly distributed chunks across the entire sequence so content from
 * the beginning, middle, and end is proportionally represented without truncation.
 */
export function sampleEvenlyDistributedChunks<T>(chunks: T[], count = 5): T[] {
  if (!chunks || chunks.length === 0) return [];
  if (count <= 0) return [];
  if (chunks.length <= count) return [...chunks];
  if (count === 1) return [chunks[Math.floor(chunks.length / 2)]];

  const result: T[] = [];
  const selectedIndices = new Set<number>();

  for (let i = 0; i < count; i++) {
    const index = Math.round((i * (chunks.length - 1)) / (count - 1));
    if (!selectedIndices.has(index)) {
      selectedIndices.add(index);
      result.push(chunks[index]);
    }
  }

  return result;
}

/**
 * Builds high-yield context for Mock Exam and Flashcard synthesis:
 * - If a specific topic is requested: uses vector RAG to find the top most relevant chunks across the library.
 * - For general synthesis: samples evenly distributed chunks across the entire material (beginning, middle, and end).
 */
export async function buildSynthesisContext(
  items: SynthesisSourceItem[],
  topic?: string,
  targetChunkCount = 6,
): Promise<string> {
  if (!items || items.length === 0) return "";

  const trimmedTopic = (topic || "").trim();
  const isSpecificTopic = Boolean(trimmedTopic);

  // 1. Chunk all available items
  const allChunks: DocumentChunk[] = [];
  for (const item of items) {
    const title = item.sourceTitle || "Course Material";
    const bodyText = (item.text || item.ocrText || item.aiSummary || "").trim();
    if (!bodyText) continue;

    const itemChunks = chunkText(bodyText, 1500, 200).map((c) => ({
      ...c,
      sourceTitle: title,
    }));
    allChunks.push(...itemChunks);
  }

  if (allChunks.length === 0) return "";

  // 2. Specific Topic: Retrieve top-K most relevant chunks using vector embeddings
  if (isSpecificTopic) {
    try {
      const queryEmb = await generateEmbedding(trimmedTopic);
      const embedded = await embedChunks(allChunks);
      const topChunks = findTopKChunksHybrid(trimmedTopic, queryEmb, embedded, targetChunkCount);

      if (topChunks.length > 0) {
        return topChunks
          .map(
            (c) =>
              `[Source: "${c.sourceTitle}" • Section ${c.index + 1}]\n${c.text}`,
          )
          .join("\n\n");
      }
    } catch (err) {
      console.warn("Topic RAG synthesis retrieval failed, falling back to distributed chunks:", err);
    }
  }

  // 3. General Synthesis: Sample evenly distributed chunks covering beginning, middle, and end
  const sampledChunks = sampleEvenlyDistributedChunks(allChunks, targetChunkCount);

  return sampledChunks
    .map(
      (c) =>
        `[Source: "${c.sourceTitle}" • Section ${c.index + 1}]\n${c.text}`,
    )
    .join("\n\n");
}

// ============================================
// PART 6: NOTEBOOKLM-STYLE CHAT RETRIEVAL
// ============================================

export interface ChatContextResult {
  contextText: string;
  retrievedChunkCount: number;
  matchedProblemNumber: string | null;
  primarySourceTitle?: string;
}

/**
 * Builds high-fidelity, page-anchored context for AI Chat (NotebookLM style).
 * Replaces the naive 500-char starvation snippet with intelligent hybrid retrieval
 * across full PDF documents (up to 35,000 characters).
 */
export async function buildChatContext(
  query: string,
  allItems: SynthesisSourceItem[],
  targetItems: SynthesisSourceItem[] = [],
  options: {
    maxChars?: number;
    topK?: number;
  } = {}
): Promise<ChatContextResult> {
  const maxChars = options.maxChars ?? 35000;
  const topK = options.topK ?? 12;
  const targetProblem = extractTargetQuestionNumber(query);

  const scopeItems = targetItems.length > 0 ? targetItems : allItems;
  if (!scopeItems || scopeItems.length === 0) {
    return {
      contextText: "No document context available.",
      retrievedChunkCount: 0,
      matchedProblemNumber: targetProblem,
    };
  }

  // 1. If only 1 document is in scope and it fits completely within maxChars, pass entire full text!
  if (scopeItems.length === 1) {
    const single = scopeItems[0];
    const fullText = (single.text || single.ocrText || single.aiSummary || "").trim();
    if (fullText.length > 0 && fullText.length <= maxChars) {
      return {
        contextText: `[DOCUMENT: "${single.sourceTitle || "Course Material"}" • Complete Text Ingested]\n${fullText}`,
        retrievedChunkCount: 1,
        matchedProblemNumber: targetProblem,
        primarySourceTitle: single.sourceTitle,
      };
    }
  }

  // 2. Multi-document or large document (> maxChars): run hybrid page-aware chunk retrieval
  const allChunks: DocumentChunk[] = [];
  for (const item of scopeItems) {
    const title = item.sourceTitle || "Course Material";
    const body = (item.text || item.ocrText || item.aiSummary || "").trim();
    if (!body) continue;

    const chunks = chunkText(body, 1500, 200).map((c) => ({
      ...c,
      sourceTitle: title,
    }));
    allChunks.push(...chunks);
  }

  if (allChunks.length === 0) {
    return {
      contextText: "No document excerpts could be extracted.",
      retrievedChunkCount: 0,
      matchedProblemNumber: targetProblem,
    };
  }

  // Embed and perform hybrid retrieval
  let rankedChunks: DocumentChunk[] = [];
  try {
    const queryEmb = await generateEmbedding(query);
    const embedded = await embedChunks(allChunks);
    rankedChunks = findTopKChunksHybrid(query, queryEmb, embedded, topK);
  } catch (err) {
    console.warn("Vector embedding retrieval fallback to keyword scoring:", err);
    rankedChunks = findTopKChunksHybrid(query, [], allChunks, topK);
  }

  // If a specific problem number was matched, also include the consecutive chunk
  // to ensure options / multi-step solutions are never chopped off
  if (targetProblem && rankedChunks.length > 0) {
    const matchedChunk = rankedChunks[0];
    const originalIdx = allChunks.findIndex(
      (c) => c.sourceTitle === matchedChunk.sourceTitle && c.index === matchedChunk.index
    );
    if (originalIdx >= 0 && originalIdx + 1 < allChunks.length) {
      const nextChunk = allChunks[originalIdx + 1];
      if (!rankedChunks.some((r) => r.chunkId === nextChunk.chunkId)) {
        rankedChunks.splice(1, 0, nextChunk);
      }
    }
  }

  // Assemble the context corpus with explicit page numbers and document titles
  let currentLength = 0;
  const contextParts: string[] = [];

  for (const chunk of rankedChunks) {
    const pageBadge = chunk.pageNumber ? ` • Page ${chunk.pageNumber}` : "";
    const header = `[Source: "${chunk.sourceTitle}"${pageBadge} • Excerpt ${chunk.index + 1}]`;
    const block = `${header}\n${chunk.text}`;

    if (currentLength + block.length > maxChars && contextParts.length > 0) {
      break;
    }
    contextParts.push(block);
    currentLength += block.length;
  }

  return {
    contextText: contextParts.join("\n\n---\n\n"),
    retrievedChunkCount: contextParts.length,
    matchedProblemNumber: targetProblem,
    primarySourceTitle: scopeItems[0]?.sourceTitle,
  };
}
