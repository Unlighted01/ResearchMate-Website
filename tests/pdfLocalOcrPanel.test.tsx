// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ run: vi.fn(), pause: vi.fn(), completed: false }));
vi.mock("../src/services/pdfLocalOcrService", () => ({
  loadPdfOcrJob: async () => ({ id: "job", sourceHash: "a".repeat(64), name: "scan.pdf", language: "eng", dpi: 144, pageCount: mocks.completed ? 156 : 0, completedPages: mocks.completed ? Array.from({ length: 156 }, (_, i) => i + 1) : [], status: mocks.completed ? "completed" : "ready", updatedAt: "now" }),
  PdfLocalOcrTask: class { run = mocks.run; pause = mocks.pause; },
  pdfOcrPageKey: () => "page",
}));
vi.mock("../src/services/pdfOcrReviewService", () => ({ pdfOcrDrafts: () => [], createPdfOcrDrafts: vi.fn(), confirmPdfOcrDraft: vi.fn() }));
vi.mock("../src/services/localOcrStore", () => ({ getLocalImage: vi.fn(), getLocalOcrPage: vi.fn() }));
vi.mock("../src/services/pdfOcrRenderer", () => ({ openPdfOcrRenderer: vi.fn() }));
vi.mock("../src/services/questionBankService", () => ({ initQuestionBank: async () => {}, updateQuestion: vi.fn() }));
import { PdfLocalOcrPanel } from "../src/components/App/Dashboard/PdfLocalOcrPanel";
afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); mocks.completed = false; });
it("shows completion rather than offering to resume a finished PDF", async () => {
  mocks.completed = true;
  render(<PdfLocalOcrPanel sourceHash={"a".repeat(64)} name="scan.pdf" />);
  const complete = await screen.findByRole("button", { name: "Local OCR complete" });
  expect(complete.hasAttribute("disabled")).toBe(true);
  expect(mocks.run).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Start reviewed PDF exam" }).hasAttribute("disabled")).toBe(true);
});
it("requires Start and download consent; declining leaves the job paused", async () => {
  mocks.run.mockImplementation(async (job, options) => {
    expect(options.concurrency).toBe(1);
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
it("uses two workers only when explicitly selected and locks the setting while running", async () => {
  let finish!: (value: unknown) => void;
  mocks.run.mockImplementation((job, options) => {
    expect(options.concurrency).toBe(2);
    return new Promise(resolve => { finish = () => resolve({...job, status: "paused"}); });
  });
  render(<PdfLocalOcrPanel sourceHash={"a".repeat(64)} name="scan.pdf" />);
  await waitFor(() => expect(screen.getByRole("button", {name:"Start local OCR"}).hasAttribute("disabled")).toBe(false));
  const speed = screen.getByRole("combobox", {name:"OCR speed"}) as HTMLSelectElement;
  expect(speed.value).toBe("1");
  expect(mocks.run).not.toHaveBeenCalled();
  fireEvent.change(speed, {target:{value:"2"}});
  fireEvent.click(screen.getByRole("button", {name:"Start local OCR"}));
  await screen.findByRole("button", {name:"Pause OCR"});
  expect(speed.disabled).toBe(true);
  finish(undefined);
  await screen.findByRole("button", {name:"Resume local OCR"});
  expect(speed.disabled).toBe(false);
});
it("allows review and draft extraction from saved pages while OCR is running", async () => {
  let finish!: (value: unknown) => void;
  mocks.run.mockImplementation((job, options) => {
    options.onProgress({phase:"recognizing",job:{...job,pageCount:156,completedPages:[1],status:"running"}});
    return new Promise(resolve => { finish = resolve; });
  });
  render(<PdfLocalOcrPanel sourceHash={"a".repeat(64)} name="scan.pdf" />);
  await waitFor(() => expect(screen.getByRole("button",{name:"Start local OCR"}).hasAttribute("disabled")).toBe(false));
  fireEvent.click(screen.getByRole("button",{name:"Start local OCR"}));
  await screen.findByRole("button",{name:"Pause OCR"});
  expect(screen.getByRole("button",{name:"Review page"}).hasAttribute("disabled")).toBe(false);
  expect(screen.getByRole("button",{name:"Extract ungraded question drafts"}).hasAttribute("disabled")).toBe(false);
  expect(screen.getByText(/0 eligible for grading/)).toBeTruthy();
  finish({pageCount:156,completedPages:[1],status:"paused"});
  await screen.findByRole("button",{name:"Resume local OCR"});
});
