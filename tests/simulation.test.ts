import { describe, it, expect } from "vitest";
import { runSimulations } from "./simulationRunner";

describe("Empirical Simulation: AI Hallucination & PDF Extraction Audit", () => {
  it("runs the full multi-document hallucination & PDF summary simulation probe", async () => {
    const success = await runSimulations();
    expect(success).toBe(true);
  });
});
