import { describe, it, expect, vi } from "vitest";

vi.mock("../api/_utils/auth.js", () => ({
  authenticateUser: vi.fn(),
  deductCredit: vi.fn(),
  checkRateLimit: vi.fn().mockReturnValue(true),
  setCorsHeaders: vi.fn(),
  refundCredit: vi.fn(),
}));

import { buildChatContext, SynthesisSourceItem } from "../src/services/ragService";

describe("sourceGrounding - NotebookLM Style Multi-PDF & Single-PDF Grounding", () => {
  const mockLibrary: SynthesisSourceItem[] = [
    {
      id: "doc-math",
      sourceTitle: "CSC_Numerical_Reviewer.pdf",
      text: "[Page 1]\nWork Problem: Pipe A takes 3 hours, Pipe B takes 6 hours. Together they take 2 hours.",
    },
    {
      id: "doc-ethics",
      sourceTitle: "RA_6713_Ethics.pdf",
      text: "[Page 1]\nSection 4: Norms of Conduct of Public Officials and Employees including Simple Living.",
    },
    {
      id: "doc-const",
      sourceTitle: "1987_Constitution.pdf",
      text: "[Page 1]\nArticle III: Bill of Rights. Due process of law and equal protection.",
    },
  ];

  it("isolates context strictly to 1 document when only 1 source is checked (Single-Doc Grounding)", async () => {
    const selectedIds = new Set(["doc-math"]);
    const activeSources = mockLibrary.filter((item) => selectedIds.has(item.id!));

    expect(activeSources).toHaveLength(1);
    expect(activeSources[0].sourceTitle).toBe("CSC_Numerical_Reviewer.pdf");

    const result = await buildChatContext(
      "How long do Pipe A and Pipe B take together?",
      activeSources,
      activeSources,
      { maxChars: 15000, topK: 5 }
    );

    // Verify context contains only CSC_Numerical_Reviewer and none of the Ethics or Constitution text
    expect(result.contextText).toContain("CSC_Numerical_Reviewer.pdf");
    expect(result.contextText).toContain("Pipe A takes 3 hours");
    expect(result.contextText).not.toContain("RA_6713");
    expect(result.contextText).not.toContain("Norms of Conduct");
    expect(result.contextText).not.toContain("1987_Constitution");
  });

  it("allocates balanced context across multiple checked documents without unselected leakage", async () => {
    // User checks Math and Ethics, but leaves Constitution unchecked
    const selectedIds = new Set(["doc-math", "doc-ethics"]);
    const activeSources = mockLibrary.filter((item) => selectedIds.has(item.id!));

    expect(activeSources).toHaveLength(2);

    const result = await buildChatContext(
      "Compare problem solving and ethical conduct",
      activeSources,
      activeSources,
      { maxChars: 15000, topK: 6 }
    );

    // Verify context contains both checked sources
    expect(result.contextText).toContain("CSC_Numerical_Reviewer.pdf");
    expect(result.contextText).toContain("RA_6713_Ethics.pdf");

    // Verify completely unselected Constitution is NOT present
    expect(result.contextText).not.toContain("1987_Constitution.pdf");
    expect(result.contextText).not.toContain("Bill of Rights");
  });

  it("handles zero checked sources by returning clear fallback without scooping unselected items", async () => {
    const selectedIds = new Set<string>();
    const activeSources = mockLibrary.filter((item) => selectedIds.has(item.id!));

    expect(activeSources).toHaveLength(0);

    const result = await buildChatContext(
      "General question",
      activeSources,
      activeSources
    );

    expect(result.retrievedChunkCount).toBe(0);
    expect(result.contextText).toContain("No document context available");
  });
});
