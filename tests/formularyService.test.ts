import { describe, it, expect } from "vitest";
import { findRelevantFormulary, inferDocumentDomain, inferQueryDomain, checkDomainCompatibility, ACADEMIC_FORMULARY } from "../src/services/formularyService";

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

  it("infers academic domains accurately from title and sample text", () => {
    expect(inferDocumentDomain("501 Math Word Problems", "Chapter 1: Arithmetic and Fractions")).toBe("math");
    expect(inferDocumentDomain("Calculus Early Transcendentals", "Derivatives and integrals")).toBe("math");
    expect(inferDocumentDomain("English Grammar and Sentence Structure", "Subject verb agreement")).toBe("verbal");
    expect(inferDocumentDomain("University Physics: Mechanics", "Newton laws of motion")).toBe("science");
    expect(inferDocumentDomain("General Overview", "Random mixed notes")).toBe("general");
  });

  it("prevents cross-subject contamination when domainFilter is applied", () => {
    // When inside a Math document, asking for sentence/grammar rules must NOT return English rules
    const offTopicResult = findRelevantFormulary("how can i properly construct a sentence?", "math");
    expect(offTopicResult).toEqual([]);

    // When inside a Verbal document, sentence query returns English rules
    const onTopicResult = findRelevantFormulary("how can i properly construct a sentence with modifier?", "verbal");
    expect(onTopicResult.length).toBeGreaterThan(0);
    expect(onTopicResult.join(" ")).toContain("Modifier");

    // When inside a Verbal document, calculus query must NOT return math rules
    const mathInVerbal = findRelevantFormulary("derivative chain rule", "verbal");
    expect(mathInVerbal).toEqual([]);
  });

  it("infers query domains accurately", () => {
    expect(inferQueryDomain("how can i properly construct a sentence?")).toBe("verbal");
    expect(inferQueryDomain("explain subject-verb agreement")).toBe("verbal");
    expect(inferQueryDomain("calculate the derivative of sin(x)")).toBe("math");
    expect(inferQueryDomain("solve problem 6 equation")).toBe("math");
    expect(inferQueryDomain("hello who are you")).toBeNull();
  });

  it("strictly detects domain incompatibility and provides clear refusal with redirection", () => {
    // Math PDF + Verbal Query -> REFUSED
    const mathVsVerbal = checkDomainCompatibility("math", "how can i properly construct a sentence?", "501 Math Word Problems");
    expect(mathVsVerbal.isCompatible).toBe(false);
    expect(mathVsVerbal.refusalMessage).toContain("outside the scope of **501 Math Word Problems**");
    expect(mathVsVerbal.refusalMessage).toContain("AI Assistant");

    // Math PDF + Math Query with word 'construct' -> ALLOWED (must not false-positive)
    const mathConstruct = checkDomainCompatibility("math", "how do i construct the equation for problem 3?", "501 Math Word Problems");
    expect(mathConstruct.isCompatible).toBe(true);

    // Math PDF + Math Query -> ALLOWED
    const mathNormal = checkDomainCompatibility("math", "answer number 6 for me", "501 Math Word Problems");
    expect(mathNormal.isCompatible).toBe(true);

    // Verbal PDF + Math Query -> REFUSED
    const verbalVsMath = checkDomainCompatibility("verbal", "calculate the derivative of 3x^2", "English Grammar Guide");
    expect(verbalVsMath.isCompatible).toBe(false);
    expect(verbalVsMath.refusalMessage).toContain("outside the scope of **English Grammar Guide**");
    expect(verbalVsMath.refusalMessage).toContain("AI Assistant");
  });
});
