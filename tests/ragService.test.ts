import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chunkText,
  cosineSimilarity,
  findTopKChunks,
  sampleEvenlyDistributedChunks,
  buildSynthesisContext,
  embedChunks,
  clearEmbeddingCache,
} from "../src/services/ragService";

describe("ragService - chunkText", () => {
  it("returns empty array for empty or whitespace text", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\t  ")).toEqual([]);
    expect(chunkText(null as any)).toEqual([]);
    expect(chunkText(undefined as any)).toEqual([]);
  });

  it("returns single chunk for text within chunkSize", () => {
    const text = "This is a short academic document summary.";
    const chunks = chunkText(text, 1500, 200);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual({
      chunkId: "chunk-0",
      text,
      index: 0,
    });
  });

  it("splits long text into multiple chunks on word boundaries", () => {
    // Generate text of words
    const words = Array.from({ length: 400 }, (_, i) => `word${i}`);
    const longText = words.join(" ");

    const chunks = chunkText(longText, 500, 100);
    expect(chunks.length).toBeGreaterThan(1);

    chunks.forEach((chunk, idx) => {
      expect(chunk.chunkId).toBe(`chunk-${idx}`);
      expect(chunk.index).toBe(idx);
      expect(chunk.text.length).toBeGreaterThan(0);
      // Ensure it does not cut a word in half (no trailing or leading partial word like "rd42")
      expect(chunk.text).toMatch(/^word\d+/);
      expect(chunk.text).toMatch(/word\d+$/);
    });
  });

  it("preserves continuous content across chunks without dropping sections", () => {
    const section1 = "First section describes machine learning methodology and datasets.";
    const section2 = "Second section evaluates attention mechanisms and transformers.";
    const section3 = "Third section concludes with empirical performance metrics.";
    const fullText = `${section1}\n\n${section2}\n\n${section3}`;

    const chunks = chunkText(fullText, 80, 20);
    expect(chunks.length).toBeGreaterThan(1);

    const allChunkTexts = chunks.map((c) => c.text).join(" ");
    expect(allChunkTexts).toContain("methodology");
    expect(allChunkTexts).toContain("attention");
    expect(allChunkTexts).toContain("empirical");
  });
});

describe("ragService - cosineSimilarity", () => {
  it("returns 1.0 for identical vectors", () => {
    const vec = [0.2, 0.5, 0.8];
    const sim = cosineSimilarity(vec, vec);
    expect(sim).toBeCloseTo(1.0, 5);
  });

  it("returns 0.0 for orthogonal vectors", () => {
    const vecA = [1, 0, 0];
    const vecB = [0, 1, 0];
    const sim = cosineSimilarity(vecA, vecB);
    expect(sim).toBeCloseTo(0.0, 5);
  });

  it("returns -1.0 for opposite vectors", () => {
    const vecA = [1, 2, 3];
    const vecB = [-1, -2, -3];
    const sim = cosineSimilarity(vecA, vecB);
    expect(sim).toBeCloseTo(-1.0, 5);
  });

  it("safely handles empty or zero vectors without NaN", () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBe(0);
  });
});

describe("ragService - findTopKChunks", () => {
  it("returns empty array when given no chunks", () => {
    expect(findTopKChunks([1, 0], [])).toEqual([]);
  });

  it("ranks chunks by cosine similarity descending", () => {
    const query = [1, 0, 0];
    const chunks = [
      { text: "chunk orthogonal", embedding: [0, 1, 0] },
      { text: "chunk high match", embedding: [0.95, 0.1, 0] },
      { text: "chunk medium match", embedding: [0.6, 0.4, 0] },
      { text: "chunk low match", embedding: [0.1, 0.9, 0] },
    ];

    const top2 = findTopKChunks(query, chunks, 2);
    expect(top2).toHaveLength(2);
    expect(top2[0].text).toBe("chunk high match");
    expect(top2[1].text).toBe("chunk medium match");
  });

  it("returns all chunks if topK is greater than chunks length", () => {
    const query = [1, 0];
    const chunks = [
      { text: "chunk A", embedding: [0.8, 0.2] },
      { text: "chunk B", embedding: [0.9, 0.1] },
    ];

    const result = findTopKChunks(query, chunks, 10);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("chunk B");
  });
});

describe("ragService - sampleEvenlyDistributedChunks", () => {
  it("returns all chunks if count >= chunks.length", () => {
    const chunks = ["A", "B", "C"];
    expect(sampleEvenlyDistributedChunks(chunks, 5)).toEqual(["A", "B", "C"]);
    expect(sampleEvenlyDistributedChunks(chunks, 3)).toEqual(["A", "B", "C"]);
  });

  it("samples beginning, middle, and end of document", () => {
    const chunks = Array.from({ length: 11 }, (_, i) => `chunk-${i}`); // 0 to 10
    const sampled = sampleEvenlyDistributedChunks(chunks, 3);
    expect(sampled).toEqual(["chunk-0", "chunk-5", "chunk-10"]);
  });

  it("handles count = 1 by selecting the center chunk", () => {
    const chunks = ["chunk-0", "chunk-1", "chunk-2"];
    expect(sampleEvenlyDistributedChunks(chunks, 1)).toEqual(["chunk-1"]);
  });

  it("handles empty array or invalid count gracefully", () => {
    expect(sampleEvenlyDistributedChunks([], 5)).toEqual([]);
    expect(sampleEvenlyDistributedChunks(["A", "B"], 0)).toEqual([]);
  });
});

describe("ragService - embedChunks and cache", () => {
  beforeEach(() => {
    clearEmbeddingCache();
  });

  it("embeds chunks and populates cache", async () => {
    const chunks = [
      { chunkId: "c1", text: "Quantum computing algorithms", index: 0 },
      { chunkId: "c2", text: "Photosynthesis light reactions", index: 1 },
    ];

    const embedded = await embedChunks(chunks);
    expect(embedded).toHaveLength(2);
    expect(embedded[0].embedding).toBeDefined();
    expect(embedded[0].embedding.length).toBeGreaterThan(0);
    expect(embedded[1].embedding).toBeDefined();
    expect(embedded[1].embedding.length).toBeGreaterThan(0);

    // Call again to verify cache hit
    const secondCall = await embedChunks(chunks);
    expect(secondCall[0].embedding).toEqual(embedded[0].embedding);
  });
});

describe("ragService - buildSynthesisContext", () => {
  const mockItems = [
    {
      sourceTitle: "Thermodynamics 101",
      text: "Entropy always increases in isolated systems. Energy conservation is the first law. Absolute zero cannot be reached.",
    },
    {
      sourceTitle: "Deep Learning Foundations",
      text: "Transformers utilize self-attention mechanisms. Backpropagation computes gradients through the chain rule. Overfitting is mitigated by dropout and regularization.",
    },
  ];

  it("retrieves relevant chunks for specific topic via vector similarity", async () => {
    const context = await buildSynthesisContext(mockItems, "Self-attention transformer architecture", 2);
    expect(context).toContain("Deep Learning Foundations");
    expect(context).toContain("attention");
    expect(context).toContain("[Source:");
  });

  it("samples evenly across materials when no topic is specified", async () => {
    const context = await buildSynthesisContext(mockItems, "", 4);
    expect(context).toContain("[Source:");
    expect(context).toContain("Section");
    expect(context.length).toBeGreaterThan(50);
  });

  it("returns empty string if no items have text", async () => {
    const context = await buildSynthesisContext([], "Physics");
    expect(context).toBe("");
  });
});
