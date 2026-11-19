// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ run: vi.fn(), pause: vi.fn() }));
vi.mock("../src/services/pdfLocalOcrService", () => ({
  loadPdfOcrJob: async () => ({ id: "job", sourceHash: "a".repeat(64), name: "scan.pdf", language: "eng", dpi: 144, pageCount: 0, completedPages: [], status: "ready", updatedAt: "now" }),
  PdfLocalOcrTask: class { run = mocks.run; pause = mocks.pause; },
  pdfOcrPageKey: () => "page",
}));
vi.mock("../src/services/pdfOcrReviewService", () => ({ pdfOcrDrafts: () => [], createPdfOcrDrafts: vi.fn(), confirmPdfOcrDraft: vi.fn() }));
vi.mock("../src/services/localOcrStore", () => ({ getLocalImage: vi.fn(), getLocalOcrPage: vi.fn() }));
vi.mock("../src/services/pdfOcrRenderer", () => ({ openPdfOcrRenderer: vi.fn() }));
vi.mock("../src/services/questionBankService", () => ({ initQuestionBank: async () => {}, updateQuestion: vi.fn() }));
import { PdfLocalOcrPanel } from "../src/components/App/Dashboard/PdfLocalOcrPanel";
afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); });
it("requires Start and download consent; declining leaves the job paused", async () => {
  mocks.run.mockImplementation(async (job, options) => {
    const accepted = await options.confirmDownload({ language: "eng", version: "test", estimatedMiB: 4.24 });
    expect(accepted).toBe(false);
    return { ...job, status: "paused" };
  });
  render(<PdfLocalOcrPanel sourceHash={"a".repeat(64)} name="scan.pdf" />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Start local OCR" }).hasAttribute("disabled")).toBe(false));
  expect(mocks.run).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Start local OCR" }));
  await screen.findByRole("dialog", { name: "Download OCR model" });
  expect(screen.getByText(/4.24 MiB/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Not now" }));
  await screen.findByRole("button", { name: "Resume local OCR" });
  expect(mocks.run).toHaveBeenCalledTimes(1);
});
