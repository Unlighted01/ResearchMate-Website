import { describe, it, expect, vi } from "vitest";

vi.mock("../api/_utils/auth.js", () => ({
  authenticateUser: vi.fn(),
  deductCredit: vi.fn(),
  checkRateLimit: vi.fn().mockReturnValue(true),
  setCorsHeaders: vi.fn(),
  refundCredit: vi.fn(),
}));

import { findRelevantFormulary, ACADEMIC_FORMULARY } from "../src/services/formularyService";
import { getDocumentSystemInstruction } from "../api/chat";

describe("mathShortcuts - Competitive Exam & Numerical Reasoning Shortcuts", () => {
  it("contains the exam_numerical category in ACADEMIC_FORMULARY", () => {
    const categories = new Set(ACADEMIC_FORMULARY.map((e) => e.category));
    expect(categories.has("exam_numerical")).toBe(true);
  });

  it("retrieves the two-worker joint rate shortcut formula (T = AB / (A+B))", () => {
    const rules = findRelevantFormulary("If worker A does a job in 4 days and worker B in 6 days, how long together?");
    expect(rules.length).toBeGreaterThan(0);
    const text = rules.join(" ");
    expect(text).toContain("T = (A * B) / (A + B)");
  });

  it("retrieves man-days inverse variation formula (M1*D1 = M2*D2)", () => {
    const rules = findRelevantFormulary("If 5 men can build a wall in 6 days, how many days for 3 workers?");
    expect(rules.length).toBeGreaterThan(0);
    const text = rules.join(" ");
    expect(text).toContain("M₁ * D₁ * H₁ = M₂ * D₂ * H₂");
    expect(text).toContain("Inverse Variation");
  });

  it("retrieves consecutive discounts shortcut formula (d1 + d2 - d1*d2/100)", () => {
    const rules = findRelevantFormulary("Find the single equivalent discount for consecutive discounts of 20% and 10%");
    expect(rules.length).toBeGreaterThan(0);
    const text = rules.join(" ");
    expect(text).toContain("d₁ + d₂ - (d₁ * d₂) / 100");
  });

  it("retrieves round-trip average speed harmonic mean formula", () => {
    const rules = findRelevantFormulary("A car travels at 60 km/h and returns at 40 km/h. What is the average speed?");
    expect(rules.length).toBeGreaterThan(0);
    const text = rules.join(" ");
    expect(text).toContain("(2 * v₁ * v₂) / (v₁ + v₂)");
    expect(text).toContain("NEVER arithmetic mean");
  });

  it("retrieves alligation cross shortcut for mixture concentration problems", () => {
    const rules = findRelevantFormulary("How to mix 20% acid solution with 50% acid solution to make 30% mixture?");
    expect(rules.length).toBeGreaterThan(0);
    const text = rules.join(" ");
    expect(text).toContain("Alligation Cross Shortcut");
  });

  it("retrieves age difference invariance property", () => {
    const rules = findRelevantFormulary("Father is 30 years older than son. In 5 years father will be twice as old");
    expect(rules.length).toBeGreaterThan(0);
    const text = rules.join(" ");
    expect(text).toContain("Age Difference Invariance");
  });

  it("ensures getDocumentSystemInstruction explicitly commands 30-second optimal exam shortcuts", () => {
    const instruction = getDocumentSystemInstruction("CSC Numerical Reasoning Reviewer");
    expect(instruction).toContain("PRIORITIZE OPTIMAL & FASTEST EXAM METHODS");
    expect(instruction).toContain("30-Second Exam Shortcut");
    expect(instruction).toContain("Step 1: [GIVEN & TARGET IDENTIFICATION]");
    expect(instruction).toContain("Step 2: [GOVERNING LAW & FORMULA]");
    expect(instruction).toContain("Step 3: [STEP-BY-STEP DERIVATION & WORK]");
    expect(instruction).toContain("Step 4: [FINAL RESULT & COMMON EXAM TRAPS]");
  });
});
