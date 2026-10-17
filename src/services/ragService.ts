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
}

export interface EmbeddedChunk extends DocumentChunk {
  embedding: number[];
}

export interface SynthesisSourceItem {
  id?: string;
  sourceTitle?: string;
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

  if (normalized.length <= effectiveChunkSize) {
    return [
      {
        chunkId: "chunk-0",
        text: normalized,
        index: 0,
      },
    ];
  }

  const chunks: DocumentChunk[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < normalized.length) {
    let end = Math.min(start + effectiveChunkSize, normalized.length);

    if (end < normalized.length) {
      // Look backwards from `end` for a whitespace boundary (newline, space, tab)
      const searchWindowStart = Math.max(start + effectiveOverlap, end - 250);
      const windowStr = normalized.slice(searchWindowStart, end);
      const match = windowStr.match(/\s+[^\s]*$/);

      if (match && match.index !== undefined) {
        end = searchWindowStart + match.index;
      }
    }

    const chunkContent = normalized.slice(start, end).trim();
    if (chunkContent.length > 0) {
      chunks.push({
        chunkId: `chunk-${chunkIndex}`,
        text: chunkContent,
        index: chunkIndex,
      });
      chunkIndex++;
    }

    if (end >= normalized.length) {
      break;
    }

    // Advance start: step back by effectiveOverlap to maintain context continuity
    let nextStart = end - effectiveOverlap;
    if (nextStart <= start) {
      nextStart = end;
    } else {
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
      const topChunks = findTopKChunks(queryEmb, embedded, targetChunkCount);

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
