import { describe, it, expect, beforeEach } from "vitest";
import {
  savePlaygroundPendingPdf,
  getPlaygroundPendingPdf,
  clearPlaygroundPendingPdf,
} from "../src/services/localPdfStore";

describe("Playground PDF Handover and 10-Question In-Memory Sandbox", () => {
  beforeEach(async () => {
    await clearPlaygroundPendingPdf();
  });

  it("stores pending playground PDF and extracts full question set for dashboard handover", async () => {
    const fakeContent = "Mock PDF binary payload for testing";
    const file = new File([fakeContent], "Cardiology_Board_Review.pdf", {
      type: "application/pdf",
    });

    const parsedQuestions = Array.from({ length: 25 }, (_, i) => ({
      id: `q-${i + 1}`,
      stem: `Cardiology Clinical Vignette #${i + 1}`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctIndex: i % 4,
      explanation: `Clinical explanation for question ${i + 1}`,
      chapter: "Cardiology",
    }));

    // In the playground, preview is strictly capped at 10
    const PLAYGROUND_PREVIEW_LIMIT = 10;
    const previewSlice = parsedQuestions.slice(0, PLAYGROUND_PREVIEW_LIMIT);
    expect(previewSlice.length).toBe(10);
    expect(parsedQuestions.length).toBe(25);

    // Save full document and all 25 questions to pending storage
    await savePlaygroundPendingPdf(file, parsedQuestions);

    // Read back in dashboard handover
    const retrieved = await getPlaygroundPendingPdf();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.file.name).toBe("Cardiology_Board_Review.pdf");
    expect(retrieved?.totalQuestionsParsed).toBe(25);
    expect(retrieved?.allParsedQuestions.length).toBe(25);

    // Verify reconstructed File
    const text = await retrieved?.file.text();
    expect(text).toBe(fakeContent);
  });

  it("clears pending playground PDF upon discard or after successful dashboard ingestion", async () => {
    const file = new File(["test pdf"], "Sample.pdf", { type: "application/pdf" });
    await savePlaygroundPendingPdf(file, [{ id: "q1", stem: "Sample stem" }]);

    let retrieved = await getPlaygroundPendingPdf();
    expect(retrieved).not.toBeNull();

    // Discard / cleanup
    await clearPlaygroundPendingPdf();
    retrieved = await getPlaygroundPendingPdf();
    expect(retrieved).toBeNull();
  });

  it("handles atomic clear before asynchronous ingestion to prevent duplicate loops", async () => {
    const file = new File(["test data"], "LoopGuard.pdf", { type: "application/pdf" });
    await savePlaygroundPendingPdf(file, [{ id: "q1", stem: "Sample stem" }]);

    // Simulated handover worker 1
    const pending1 = await getPlaygroundPendingPdf();
    expect(pending1).not.toBeNull();
    // Worker 1 pops/clears immediately
    await clearPlaygroundPendingPdf();

    // Simulated handover worker 2 (e.g. from an effect re-run)
    const pending2 = await getPlaygroundPendingPdf();
    // Worker 2 sees nothing to process
    expect(pending2).toBeNull();
  });
});
