import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing
vi.mock("../src/services/geminiService", () => ({
  generateAiResponse: vi.fn(),
}));
vi.mock("../src/services/ragService", () => ({
  buildSynthesisContext: vi.fn().mockResolvedValue("Sample grounding context"),
}));
vi.mock("../src/services/formularyService", () => ({
  findRelevantFormulary: vi.fn().mockReturnValue([]),
}));
vi.mock("../src/services/supabaseClient", () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  },
  isAuthenticated: vi.fn().mockResolvedValue(false),
  getCurrentUser: vi.fn().mockResolvedValue(null),
  setSyncStatus: vi.fn(),
  executeWithBackoff: vi.fn().mockImplementation(async (action) => {
    try {
      const data = await action();
      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  }),
}));

import {
  partitionExamSections,
  generateExamInBatches,
  extractJsonQuestions,
  repairJsonString,
  ExamSectionConfig,
  BatchProgress,
} from "../src/services/examService";
import { generateAiResponse } from "../src/services/geminiService";

describe("Phase 4: Multi-Batch Exam Generation & Slicing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("partitions a 50-question midterm into slices of max 20 items", () => {
    const sections: ExamSectionConfig[] = [
      { name: "Midterm Exam", questionCount: 50, mode: "grounded" },
    ];
    const slices = partitionExamSections(sections, 20);
    expect(slices.length).toBe(3);
    expect(slices[0].count).toBe(20);
    expect(slices[1].count).toBe(20);
    expect(slices[2].count).toBe(10);
    expect(slices.reduce((acc, s) => acc + s.count, 0)).toBe(50);
  });

  it("partitions a 160-item full-scale comprehensive simulation into discrete batches", () => {
    const fullMockSections: ExamSectionConfig[] = [
      { name: "Foundational Concepts & Principles", questionCount: 40, mode: "grounded" },
      { name: "Core Methodology & Applications", questionCount: 40, mode: "grounded" },
      { name: "Advanced Analysis & Scenarios", questionCount: 40, mode: "grounded" },
      { name: "Comprehensive Diagnostics & Synthesis", questionCount: 40, mode: "grounded" },
    ];

    const slices = partitionExamSections(fullMockSections, 20);
    expect(slices.length).toBe(8); // 40->(20,20) * 4 = 8 slices of 20 items
    expect(slices.reduce((acc, s) => acc + s.count, 0)).toBe(160);
    slices.forEach((s) => expect(s.count).toBeLessThanOrEqual(20));
  });

  it("fires progressive onProgress event with isFirstBatchReady = true after batch 1", async () => {
    const mockBatchJson = JSON.stringify([
      {
        question: "What is $1 + 1$?",
        options: ["1", "2", "3", "4"],
        correctIndex: 1,
        explanation: "Simple addition",
        topicTag: "Math",
      },
      {
        question: "What is $2 + 2$?",
        options: ["1", "2", "3", "4"],
        correctIndex: 3,
        explanation: "Simple addition",
        topicTag: "Math",
      },
    ]);

    (generateAiResponse as any).mockResolvedValue(mockBatchJson);

    const progressEvents: BatchProgress[] = [];
    const sections: ExamSectionConfig[] = [
      { name: "Section A", questionCount: 2, mode: "grounded" },
    ];

    const questions = await generateExamInBatches(
      [],
      sections,
      "mixed",
      (p) => progressEvents.push(p)
    );

    expect(questions.length).toBe(2);
    expect(progressEvents.length).toBe(1);
    expect(progressEvents[0].isFirstBatchReady).toBe(true);
    expect(progressEvents[0].completedQuestions).toBe(2);
    expect(progressEvents[0].totalQuestions).toBe(2);
  });

  it("retries a batch if AI returns invalid JSON instead of aborting the entire run", async () => {
    const validJson = JSON.stringify([
      {
        question: "Recovered question",
        options: ["A", "B", "C", "D"],
        correctIndex: 0,
        explanation: "Recovered rationale",
        topicTag: "Science",
      },
    ]);

    // First attempt fails with malformed string, second attempt succeeds
    (generateAiResponse as any)
      .mockResolvedValueOnce("MALFORMED JSON {{{")
      .mockResolvedValueOnce(validJson);

    const sections: ExamSectionConfig[] = [
      { name: "Science", questionCount: 1, mode: "grounded" },
    ];

    const questions = await generateExamInBatches([], sections);
    expect(questions.length).toBe(1);
    expect(questions[0].question).toBe("Recovered question");
  });

  it("retries an AI item with no answer key instead of assigning option A", async () => {
    (generateAiResponse as any)
      .mockResolvedValueOnce(JSON.stringify([{ question: "Unkeyed item", options: ["One", "Two", "Three", "Four"], explanation: "Missing answer" }]))
      .mockResolvedValueOnce(JSON.stringify([{ question: "Incomplete choices", options: ["One"], correctIndex: 0, explanation: "Missing choices" }]))
      .mockResolvedValueOnce(JSON.stringify([{ question: "Verified shape", options: ["One", "Two", "Three", "Four"], correctIndex: 1, explanation: "Two is supported" }]));

    const questions = await generateExamInBatches([], [{ name: "Safety", questionCount: 1, mode: "grounded" }]);
    expect(questions).toHaveLength(1);
    expect(questions[0].question).toBe("Verified shape");
    expect(questions[0].correctIndex).toBe(1);
    expect(questions[0].reviewStatus).toBe("needs_review");
    expect(generateAiResponse).toHaveBeenCalledTimes(3);
  });

  it("refuses source-grounded generation when the selected material has no readable text", async () => {
    await expect(generateExamInBatches(
      [{ text: "", ocrText: "", aiSummary: "" } as any],
      [{ name: "Scanned notes", questionCount: 5, mode: "grounded" }]
    )).rejects.toThrow(/readable source text/i);
    expect(generateAiResponse).not.toHaveBeenCalled();
  });

  it("extracts and repairs JSON containing unescaped LaTeX math formulas", () => {
    // Single backslashes in math formulas like \sqrt, \int, \frac, \times, \pm
    const rawAiMathOutput = `Here are your questions:
\`\`\`json
[
  {
    "question": "Evaluate the definite integral $\\int_0^1 x dx$ and find $\\sqrt{16} + \\frac{1}{2}$.",
    "options": ["$\\frac{9}{2}$", "$\\pm 4$", "$\\alpha + 1$", "$10\\text{ m/s}$"],
    "correctIndex": 0,
    "explanation": "Because $\\int_0^1 x dx = \\frac{1}{2}$ and $\\sqrt{16} = 4$, the sum is $4 + \\frac{1}{2} = \\frac{9}{2}$.",
    "topicTag": "Calculus"
  }
]
\`\`\``;

    const parsed = extractJsonQuestions(rawAiMathOutput);
    expect(parsed).not.toBeNull();
    expect(parsed?.length).toBe(1);
    expect(parsed![0].question).toContain("\\int_0^1");
    expect(parsed![0].options[0]).toContain("\\frac{9}{2}");
    expect(parsed![0].correctIndex).toBe(0);
  });

  it("strips <thought> and <think> reasoning tags and parses wrapped object arrays", () => {
    const rawThoughtOutput = `<thought>
I need to generate 1 question about algebra.
Let's make sure the options are balanced:
[ { "draft": true } ]
</thought>
\`\`\`json
{
  "questions": [
    {
      "question": "What is the slope of $y = 3x + 5$?",
      "options": ["3", "-3", "5", "1/3"],
      "correctIndex": 0,
      "explanation": "In slope-intercept form $y = mx + b$, the coefficient of $x$ is 3.",
      "topicTag": "Algebra"
    }
  ]
}
\`\`\``;

    const parsed = extractJsonQuestions(rawThoughtOutput);
    expect(parsed).not.toBeNull();
    expect(parsed?.length).toBe(1);
    expect(parsed![0].question).toBe("What is the slope of $y = 3x + 5$?");
    expect(parsed![0].options).toEqual(["3", "-3", "5", "1/3"]);
  });

  it("salvages completed question objects from truncated JSON outputs", () => {
    const truncatedOutput = `[
  {
    "question": "Question 1: What is $2 + 2$?",
    "options": ["4", "3", "5", "6"],
    "correctIndex": 0,
    "explanation": "Basic addition."
  },
  {
    "question": "Question 2: What is $3 \\times 3$?",
    "options": ["9", "6", "8", "12"],
    "correctIndex": 0,
    "explanation": "Basic multiplication."
  },
  {
    "question": "Question 3: Incomplete question statement`;

    const parsed = extractJsonQuestions(truncatedOutput);
    expect(parsed).not.toBeNull();
    expect(parsed?.length).toBe(2);
    expect(parsed![0].question).toContain("Question 1");
    expect(parsed![1].question).toContain("Question 2");
  });

  it("repairs raw unescaped newlines and tabs inside JSON string literals", () => {
    // Literal multiline string with unescaped newline and tab inside JSON property values
    const rawWithNewlines = `[
  {
    "question": "Line 1
Line 2 with \ttab?",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "Multi-line
step by step derivation."
  }
]`;

    const parsed = extractJsonQuestions(rawWithNewlines);
    expect(parsed).not.toBeNull();
    expect(parsed?.length).toBe(1);
    expect(parsed![0].question).toContain("Line 1");
    expect(parsed![0].explanation).toContain("Multi-line");
  });

  it("immediately halts and throws when AbortSignal is cancelled", async () => {
    const controller = new AbortController();
    controller.abort();

    const sections: ExamSectionConfig[] = [
      { name: "Biology", questionCount: 5, mode: "grounded" },
    ];

    await expect(
      generateExamInBatches([], sections, "mixed", undefined, controller.signal)
    ).rejects.toThrow(/aborted/i);
  });
});
