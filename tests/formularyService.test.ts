import { describe, it, expect } from "vitest";
import { findRelevantFormulary, ACADEMIC_FORMULARY } from "../src/services/formularyService";

describe("formularyService - Academic Micro-Formulary", () => {
  it("contains authoritative categories covering G11 to College 2nd-Year", () => {
    const categories = new Set(ACADEMIC_FORMULARY.map((e) => e.category));
    expect(categories.has("discrete_math")).toBe(true);
    expect(categories.has("calculus_ode")).toBe(true);
    expect(categories.has("physics_chem")).toBe(true);
    expect(categories.has("english_verbal")).toBe(true);
  });

  it("retrieves truth table and logic equivalence laws for discrete math queries", () => {
    const result = findRelevantFormulary("How to construct a truth table for implication?");
    expect(result.length).toBeGreaterThan(0);
    const combined = result.join(" ");
    expect(combined).toContain("Implication (P → Q)");
    expect(combined).toContain("Tautology");
  });

  it("retrieves De Morgan laws for set theory or logic queries", () => {
    const result = findRelevantFormulary("Explain De Morgan's laws and set union");
    expect(result.length).toBeGreaterThan(0);
    const combined = result.join(" ");
    expect(combined).toContain("De Morgan");
    expect(combined).toContain("Union (A ∪ B)");
  });

  it("retrieves ODE and calculus rules for differential equations queries", () => {
    const result = findRelevantFormulary("Find the integrating factor for this differential equation");
    expect(result.length).toBeGreaterThan(0);
    const combined = result.join(" ");
    expect(combined).toContain("Integrating Factor");
    expect(combined).toContain("1st-Order Linear ODE");
  });

  it("retrieves kinematics and fluid governing equations for physics queries", () => {
    const result = findRelevantFormulary("Calculate projectile acceleration and hydrostatic pressure");
    expect(result.length).toBeGreaterThan(0);
    const combined = result.join(" ");
    expect(combined).toContain("9.81");
    expect(combined).toContain("Kinematic Equations");
    expect(combined).toContain("Hydrostatic Pressure");
  });

  it("retrieves chemistry laws for gas and solution queries", () => {
    const result = findRelevantFormulary("Calculate the mole count and molarity using ideal gas law");
    expect(result.length).toBeGreaterThan(0);
    const combined = result.join(" ");
    expect(combined).toContain("Ideal Gas Law");
    expect(combined).toContain("Molarity");
  });

  it("retrieves subject-verb agreement and Filipino grammar rules", () => {
    const englishResult = findRelevantFormulary("What is the subject verb agreement rule for neither nor?");
    expect(englishResult.join(" ")).toContain("Neither/Nor");

    const filipinoResult = findRelevantFormulary("Wastong gamit ng ng at nang sa pangungusap");
    expect(filipinoResult.join(" ")).toContain("Nang");
    expect(filipinoResult.join(" ")).toContain("Ng");
  });

  it("caps matches to at most 10 rules to prevent LLM prompt bloat", () => {
    // Query hitting multiple keywords
    const broadQuery = "derivative integral ode kinematics fluid pressure mole grammar truth table set";
    const result = findRelevantFormulary(broadQuery);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it("returns empty array for unrelated or empty queries", () => {
    expect(findRelevantFormulary("")).toEqual([]);
    expect(findRelevantFormulary("random gibberish xyz abc 123")).toEqual([]);
    expect(findRelevantFormulary(null as any)).toEqual([]);
  });
});
