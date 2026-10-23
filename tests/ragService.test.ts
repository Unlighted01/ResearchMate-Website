import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chunkText,
  cosineSimilarity,
  findTopKChunks,
  findTopKChunksHybrid,
  extractTargetQuestionNumber,
  chunkMatchesProblemNumber,
  sampleEvenlyDistributedChunks,
  buildSynthesisContext,
  buildChatContext,
  embedChunks,
  clearEmbeddingCache,
  pinpointProblemAndSolution,
  chunkMatchesProblemSolution,
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

  it("snaps chunk boundary before a new numbered problem to keep problem statements intact", () => {
    const p1 = "1. Solve the linear equation: 3x + 12 = 45 and find x.";
    const p2 = "2. Evaluate the definite integral of f(x) = 3x^2 + 2x - 5 from x=0 to x=4.";
    const fullDoc = `${p1}\n\n${p2}`;

    // Size 70 reaches into the beginning of p2, but searchWindow snaps before '\n\n2. '
    const chunks = chunkText(fullDoc, 70, 15);
    expect(chunks.length).toBeGreaterThan(1);

    // Chunk 0 must end at p1 without cutting into p2's header
    expect(chunks[0].text).toContain("1. Solve the linear equation");
    expect(chunks[0].text).not.toContain("2. Evaluate");

    // Chunk 1 must begin with p2
    expect(chunks[1].text).toMatch(/^2\.\s+Evaluate/);
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

describe("ragService - extractTargetQuestionNumber", () => {
  it("extracts question numbers from varied user query formats", () => {
    expect(extractTargetQuestionNumber("answer number 6")).toBe("6");
    expect(extractTargetQuestionNumber("solve problem 14")).toBe("14");
    expect(extractTargetQuestionNumber("can you do #8 for me")).toBe("8");
    expect(extractTargetQuestionNumber("explain question 3b")).toBe("3b");
    expect(extractTargetQuestionNumber("exercise 2")).toBe("2");
    expect(extractTargetQuestionNumber("calculate item 100")).toBe("100");
    expect(extractTargetQuestionNumber("no. 5")).toBe("5");
    expect(extractTargetQuestionNumber("solve 7")).toBe("7");
  });

  it("returns null when no question number is requested", () => {
    expect(extractTargetQuestionNumber("summarize the introduction")).toBeNull();
    expect(extractTargetQuestionNumber("what are the main themes of this paper?")).toBeNull();
    expect(extractTargetQuestionNumber("")).toBeNull();
  });
});

describe("ragService - chunkMatchesProblemNumber", () => {
  it("matches standard numbered list format for target problem", () => {
    expect(chunkMatchesProblemNumber("6. Evaluate the expression: 10 + 2 * (8 - 3)", "6")).toBe(true);
    expect(chunkMatchesProblemNumber("Page 8\n\n6) If a train leaves Chicago...", "6")).toBe(true);
    expect(chunkMatchesProblemNumber("Problem 6: Calculate the velocity.", "6")).toBe(true);
    expect(chunkMatchesProblemNumber("Question #6 is about fractions.", "6")).toBe(true);
  });

  it("does not falsely match numbers that merely contain the digit", () => {
    // Problem 62 must NOT trigger a match for problem 6
    expect(chunkMatchesProblemNumber("62. What is the value of x?", "6")).toBe(false);
    expect(chunkMatchesProblemNumber("16. Which number is greater?", "6")).toBe(false);
    expect(chunkMatchesProblemNumber("The total is 600 items in inventory.", "6")).toBe(false);
  });
});

describe("ragService - findTopKChunksHybrid", () => {
  it("prioritizes chunk containing exact question number over chunks with filler words", () => {
    const query = "answer number 6";

    // Simulate the user scenario:
    // Chunks 62 and 63 repeat "answer" and "number" multiple times.
    // Chunk 6 has the actual problem 6 without repeating filler words.
    const chunks = [
      {
        chunkId: "c-toc",
        index: 0,
        text: "Table of Contents. Section 1: Miscellaneous Math. Section 2: Fractions.",
      },
      {
        chunkId: "c-p6",
        index: 1,
        text: "Section 1: Miscellaneous Math\n\n6. Evaluate the expression: 10 + 2 * (8 - 3)\n(a) 20\n(b) 15\n(c) 25\n(d) 30",
      },
      {
        chunkId: "c-p62",
        index: 5,
        text: "62. Which number is the correct answer to problem 62? The answer number must be a whole number.",
      },
      {
        chunkId: "c-p63",
        index: 6,
        text: "63. State your answer as a rational number. Find the number and check your answer carefully.",
      },
    ];

    const results = findTopKChunksHybrid(query, [], chunks, 2);
    expect(results).toHaveLength(2);
    // Problem 6 chunk MUST be rank #1
    expect(results[0].chunkId).toBe("c-p6");
    expect(results[0].text).toContain("6. Evaluate the expression");
  });

  it("extracts pageNumber from page headers during chunking", () => {
    const pagedDoc = `[Page 1]
Introduction to Calculus and Limits.

[Page 2]
Derivatives and tangent line definitions.

[Page 42]
64. If a train leaves at 2:00 PM traveling at 60 mph, calculate arrival time.`;

    const chunks = chunkText(pagedDoc, 1500, 200);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[0].text).toContain("Limits");
  });

  it("builds high-fidelity chat context with exact problem extraction and page attribution (NotebookLM style)", async () => {
    const sampleItems = [
      {
        sourceTitle: "501 Math Word Problems.pdf",
        text: `[Page 1]
Table of Contents and Welcome Notes.

[Page 42]
Chapter 2: Fractions

64. Lori ran 5 1/2 miles Monday, 6 1/4 miles Tuesday, 4 1/2 miles Wednesday, and 2 3/4 miles on Thursday. What is the average number of miles Lori ran?
a. 5
b. 4 1/2
c. 4
d. 4 3/4

Answers and Explanations
64. d. Add total miles = 19. Average = 19 / 4 = 4 3/4.`,
      },
    ];

    const result = await buildChatContext("solve question 64 and explain", sampleItems);
    expect(result.matchedProblemNumber).toBe("64");
    expect(result.retrievedChunkCount).toBeGreaterThan(0);
    expect(result.contextText).toContain("64. Lori ran");
    expect(result.contextText).toContain("501 Math Word Problems.pdf");
    expect(result.contextText).toContain("<sources_manifest count=\"1\">");
    expect(result.contextText).toContain("<source_excerpt doc_id=\"doc-1\"");
  });

  it("builds multi-source context with XML manifest and proportional non-interleaved document excerpts", async () => {
    const multiItems = [
      {
        sourceTitle: "Calculus_Volume_1.pdf",
        text: `[Page 1]
Limits and continuity of single-variable functions.
[Page 12]
The derivative is the instantaneous rate of change: f'(x) = lim (f(x+h) - f(x))/h.`,
      },
      {
        sourceTitle: "Organic_Chemistry_Notes.pdf",
        text: `[Page 1]
Introduction to alkanes, alkenes, and alkynes nomenclature.
[Page 8]
Electrophilic addition reactions across carbon-carbon double bonds.`,
      },
    ];

    const result = await buildChatContext("compare derivatives and alkenes", multiItems);

    expect(result.retrievedChunkCount).toBeGreaterThanOrEqual(2);
    // Manifest must list both documents
    expect(result.contextText).toContain("<sources_manifest count=\"2\">");
    expect(result.contextText).toContain("<source id=\"doc-1\" title=\"Calculus_Volume_1.pdf\"");
    expect(result.contextText).toContain("<source id=\"doc-2\" title=\"Organic_Chemistry_Notes.pdf\"");

    // Excerpts must be tagged with explicit doc_id
    expect(result.contextText).toContain("<source_excerpt doc_id=\"doc-1\" title=\"Calculus_Volume_1.pdf\"");
    expect(result.contextText).toContain("<source_excerpt doc_id=\"doc-2\" title=\"Organic_Chemistry_Notes.pdf\"");

    // Document contents must be present
    expect(result.contextText).toContain("Limits and continuity");
    expect(result.contextText).toContain("alkanes, alkenes");
  });

  it("builds synthesis context with structured source tags for mock exams and flashcards", async () => {
    const items = [
      {
        sourceTitle: "Physics_Mechanics.pdf",
        text: "Newton's laws of motion govern macroscopic mechanical systems.",
      },
    ];

    const synthesis = await buildSynthesisContext(items, "Newton's Laws", 4);
    expect(synthesis).toContain("<sources_manifest count=\"1\">");
    expect(synthesis).toContain("<source_excerpt doc_id=\"doc-1\" title=\"Physics_Mechanics.pdf\"");
    expect(synthesis).toContain("Newton's laws of motion");
  });

  it("extracts target problem number from user prompts accurately", () => {
    expect(extractTargetQuestionNumber("can you help me answer number 3?")).toBe("3");
    expect(extractTargetQuestionNumber("answer number 3")).toBe("3");
    expect(extractTargetQuestionNumber("solve #64")).toBe("64");
    expect(extractTargetQuestionNumber("please explain problem 14")).toBe("14");
    expect(extractTargetQuestionNumber("exercise 2b solution")).toBe("2b");
  });

  it("pinpoints both question prompt and solution from a simulated textbook corpus", () => {
    const textbookCorpus = `
[Page 1]
1001 Math Problems, Second Edition
Copyright 2004 LearningExpress, LLC.

[Page 5]
Chapter 1: Miscellaneous Math
1. A bakery sells 45 cakes in the morning and 35 cakes in the afternoon. How many cakes are sold?
2. If x + 5 = 12, what is the value of 2x?
3. A train travels 300 miles in 4 hours. At the same constant rate of speed, how far will it travel in 6 hours?
a. 400 miles
b. 450 miles
c. 500 miles
d. 600 miles
4. What is 25% of 160?

[Page 180]
Chapter 1: Solutions and Answers
1. (b) 45 + 35 = 80 total cakes sold.
2. (c) Subtract 5 from both sides to find x = 7, so 2x = 14.
3. (b) To find the rate of speed, divide distance by time: 300 miles / 4 hours = 75 mph. Multiply speed by 6 hours: 75 mph * 6 hours = 450 miles.
4. (a) 0.25 * 160 = 40.
    `.trim();

    const result = pinpointProblemAndSolution(textbookCorpus, "3");
    expect(result.problemNumber).toBe("3");
    expect(result.questionExcerpt).toBeTruthy();
    expect(result.questionExcerpt).toContain("train travels 300 miles in 4 hours");
    expect(result.solutionExcerpt).toBeTruthy();
    expect(result.solutionExcerpt).toContain("75 mph * 6 hours = 450 miles");
  });

  it("injects pinned problem match block into buildChatContext when problem query is issued", async () => {
    // Generate a long book corpus (> 45000 chars) to trigger chunking & pinpointing
    let longBook = `[Page 1]\nTitle: 1001 Math Problems\n\n[Page 5]\n3. A train travels 300 miles in 4 hours. How far does it go in 6 hours?\n\n[Page 180]\n3. (b) Speed is 75 mph. 75 * 6 = 450 miles.\n\n`;
    for (let i = 10; i <= 200; i++) {
      longBook += `[Page ${i}]\nChapter ${i} details general algebraic mechanics and computational exercises.\n` + "x ".repeat(300) + "\n\n";
    }

    const items = [
      {
        sourceTitle: "1001 Math Problems.pdf",
        text: longBook,
      },
    ];

    const res = await buildChatContext("can you help me answer number 3?", items);
    expect(res.matchedProblemNumber).toBe("3");
    expect(res.contextText).toContain("<pinned_problem_match problem_number=\"3\"");
    expect(res.contextText).toContain("train travels 300 miles in 4 hours");
    expect(res.contextText).toContain("Speed is 75 mph");
  });
});
