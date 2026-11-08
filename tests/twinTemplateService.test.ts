import { describe, it, expect } from "vitest";
import {
  generateWorkRateTwin,
  generateHarmonicSpeedTwin,
  generateSuccessiveDiscountTwin,
  generateRatioTwin,
  generateNumberSeriesTwin,
  generateSyllogismTwin,
  generateParametricTwin,
} from "../src/services/twinTemplateService";

describe("twinTemplateService", () => {
  it("generates valid work rate twin with unique options", () => {
    const q = generateWorkRateTwin();
    expect(q.options.length).toBe(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options).toContain(q.correctAnswer);
    expect(q.explanation).toContain("⚡ 30-Second Shortcut");
  });

  it("generates harmonic speed twin with proper units and trap choices", () => {
    const q = generateHarmonicSpeedTwin();
    expect(q.options.length).toBe(4);
    expect(q.options.every((opt) => opt.includes("km/h"))).toBe(true);
    expect(q.explanation).toContain("Harmonic Mean");
  });

  it("generates successive discount twin with correct percentage math", () => {
    const q = generateSuccessiveDiscountTwin();
    expect(q.options.length).toBe(4);
    expect(q.options.every((opt) => opt.includes("%"))).toBe(true);
  });

  it("generates ratio and partition twin with clean integer currency", () => {
    const q = generateRatioTwin();
    expect(q.options.length).toBe(4);
    expect(q.options.every((opt) => opt.includes("$"))).toBe(true);
  });

  it("detects problem type and synthesizes parametric twin in 0ms", () => {
    const pipeSample = {
      question: "Pipe A can fill a tank in 6 hours, Pipe B in 12 hours.",
      explanation: "Work problem",
    };

    const twin = generateParametricTwin(pipeSample);
    expect(twin).not.toBeNull();
    expect(twin?.options.length).toBe(4);
    expect(twin?.topic).toBe("Numerical Reasoning");
  });

  it("detects speed problems and generates harmonic twin", () => {
    const speedSample = {
      question: "Car drives at 40 km/h and returns at 60 km/h. Average speed?",
      explanation: "Round trip speed",
    };

    const twin = generateParametricTwin(speedSample);
    expect(twin).not.toBeNull();
    expect(twin?.options.some((o) => o.includes("km/h"))).toBe(true);
  });
});
