import { describe, it, expect, vi } from "vitest";

vi.mock("../api/_utils/auth.js", () => ({
  authenticateUser: vi.fn(),
  deductCredit: vi.fn(),
  checkRateLimit: vi.fn().mockReturnValue(true),
  setCorsHeaders: vi.fn(),
  refundCredit: vi.fn(),
}));

import { getDocumentSystemInstruction } from "../api/chat";

describe("api/chat - Document-Scoped System Instruction", () => {
  it("injects document title and strict topic isolation rules", () => {
    const instruction = getDocumentSystemInstruction("501 Math Word Problems");
    expect(instruction).toContain('"501 Math Word Problems"');
    expect(instruction).toContain("STRICT DOCUMENT RELEVANCE REQUIREMENT");
    expect(instruction).toContain("ZERO-TOLERANCE FOR UNRELATED SUBJECTS");
    expect(instruction).toContain("AI Assistant");
  });

  it("instructs the assistant to decline unrelated subjects like English grammar in a math document", () => {
    const instruction = getDocumentSystemInstruction("501 Math Word Problems");
    expect(instruction).toContain("REFUSE TO ANSWER OR EXPLAIN THE UNRELATED TOPIC");
    expect(instruction).toContain("DO NOT say \"Hello! I can certainly help you");
    expect(instruction).toContain("This question is outside the scope of **501 Math Word Problems**");
    expect(instruction).toContain("AI Assistant");
  });

  it("preserves 4-step pedagogical derivation protocol for on-topic problems", () => {
    const instruction = getDocumentSystemInstruction("Calculus 1 Problem Set");
    expect(instruction).toContain("Step 1: [GIVEN & TARGET IDENTIFICATION]");
    expect(instruction).toContain("Step 2: [GOVERNING LAW & FORMULA]");
    expect(instruction).toContain("Step 3: [STEP-BY-STEP DERIVATION & WORK]");
    expect(instruction).toContain("Step 4: [FINAL RESULT & COMMON EXAM TRAPS]");
  });

  it("handles undefined or empty document title gracefully", () => {
    const instruction = getDocumentSystemInstruction("");
    expect(instruction).toContain("the active document");
    expect(instruction).toContain("This question is outside the scope of **this document**");
  });
});
