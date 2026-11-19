import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ summary: vi.fn(), ocr: vi.fn(), destroy: vi.fn(), text: vi.fn(), render: vi.fn(),
  save: vi.fn(), add: vi.fn(), local: vi.fn() }));
vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({ GlobalWorkerOptions: {}, getDocument: () => ({
  destroy: mocks.destroy,
  promise: Promise.resolve({ numPages: 2, getPage: async () => ({
    getViewport: () => ({ width: 600, height: 800 }), getTextContent: mocks.text,
    render: mocks.render, cleanup: vi.fn(),
  }) }),
}) }));
vi.mock("../src/services/geminiService", () => ({ generateSummary: mocks.summary }));
vi.mock("../src/services/ocrService", () => ({ runOcr: mocks.ocr }));
vi.mock("../src/services/ragService", () => ({ createRepresentativeSnippet: (text: string) => text }));
vi.mock("../src/services/localOcrStore", () => ({ saveLocalImage: mocks.save }));
vi.mock("../src/services/storageService", () => ({ addItem: mocks.add, addLocalItem: mocks.local }));
import { extractPdfContent } from "../src/services/pdfService";
import { importPdfFile } from "../src/services/importService";
beforeEach(() => {
  vi.stubGlobal("crypto", undefined);
  vi.clearAllMocks(); mocks.summary.mockResolvedValue("summary"); mocks.destroy.mockResolvedValue(undefined);
  mocks.text.mockResolvedValue({ items: [{ str: "A complete source paragraph with enough selectable text to use for study.", hasEOL: true }] });
  vi.stubGlobal("document", { createElement: () => { throw new Error("Default intake must not rasterize pages"); } });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const file = () => new File(["test"], "large.pdf", { type: "application/pdf" });
it("saves selectable source text without waiting on summary, OCR, or cover rendering", async () => {
  const result = await extractPdfContent(file());
  expect(result.text).toContain("[Page 2]");
  expect(mocks.summary).not.toHaveBeenCalled();
  expect(mocks.ocr).not.toHaveBeenCalled();
  expect(mocks.render).not.toHaveBeenCalled();
  expect(mocks.destroy).toHaveBeenCalledTimes(1);
});
it("leaves scans pending without automatic OCR", async () => {
  mocks.text.mockResolvedValue({ items: [] });
  const result = await extractPdfContent(file());
  expect(result.pendingOcrPages).toEqual([1, 2]);
  expect(mocks.ocr).not.toHaveBeenCalled();
});
it("retains a scanned original locally as OCR-required without inventing source text", async () => {
  mocks.text.mockResolvedValue({ items: [] });
  mocks.save.mockResolvedValue({ hash: "a".repeat(64) });
  mocks.local.mockImplementation((item) => item);
  const item = await importPdfFile(file());
  expect(item.text).toBe("");
  expect(item.localPdfHash).toBe("a".repeat(64));
  expect(item.tags).toContain("ocr-required");
  expect(item.storageScope).toBe("local");
  expect(mocks.add).not.toHaveBeenCalled();
});
it("terminates a stalled page and reports a bounded error instead of saving incomplete text", async () => {
  vi.useFakeTimers(); mocks.text.mockImplementation(() => new Promise(() => {}));
  const assertion = expect(extractPdfContent(file())).rejects.toThrow(/timed out.*page 1/i);
  await vi.advanceTimersByTimeAsync(16000);
  await assertion;
  expect(mocks.destroy).toHaveBeenCalledTimes(1);
});
