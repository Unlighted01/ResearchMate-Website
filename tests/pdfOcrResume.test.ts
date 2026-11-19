import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";

const mocks = vi.hoisted(() => ({ runOcr: vi.fn() }));

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  GlobalWorkerOptions: {},
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 3,
      getPage: async () => ({
        getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
        getTextContent: async () => ({ items: [] }),
        render: () => ({ promise: Promise.resolve() }),
      }),
    }),
  }),
}));
vi.mock("../src/services/ocrService", () => ({ runOcr: mocks.runOcr }));
vi.mock("../src/services/geminiService", () => ({ generateSummary: async () => "" }));
vi.mock("../src/services/ragService", () => ({ createRepresentativeSnippet: (text: string) => text }));

import { extractPdfContent } from "../src/services/pdfService";

describe("scanned PDF OCR continuation", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", webcrypto);
    vi.stubGlobal("document", {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({}),
        toDataURL: () => "data:image/jpeg;base64,/9j/",
      }),
    });
    mocks.runOcr.mockReset();
    mocks.runOcr.mockResolvedValue({ ocrText: "Source text transcribed from scanned page." });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("OCRs only remaining pages on the next matching upload", async () => {
    const pdf = new File(["synthetic scanned PDF"], "scan.pdf", { type: "application/pdf" });
    const first = await extractPdfContent(pdf, { maxOcrPages: 2 });
    expect(mocks.runOcr).toHaveBeenCalledTimes(2);
    expect(first.pendingOcrPages).toEqual([3]);
    expect(first.sourceFingerprint).toBeTruthy();

    const second = await extractPdfContent(pdf, {
      maxOcrPages: 2,
      resume: { text: first.text, fingerprint: first.sourceFingerprint! },
    });
    expect(mocks.runOcr).toHaveBeenCalledTimes(3);
    expect(second.pendingOcrPages).toEqual([]);
    expect(second.text.match(/^\[Page \d+\]/gm)).toHaveLength(3);
  }, 10_000);

  it("rejects another PDF before making any OCR calls", async () => {
    const other = new File(["different contents"], "scan.pdf", { type: "application/pdf" });
    await expect(extractPdfContent(other, {
      resume: { text: "[Page 1]\nSource text", fingerprint: "wrong" },
    })).rejects.toThrow(/different PDF/i);
    expect(mocks.runOcr).not.toHaveBeenCalled();
  });

  it("records blank scans and continues past them without retrying", async () => {
    mocks.runOcr
      .mockResolvedValueOnce({ ocrText: "", ocrConfidence: 0 })
      .mockResolvedValueOnce({ ocrText: "", ocrConfidence: 0 })
      .mockResolvedValueOnce({ ocrText: "Page three source text" });
    const pdf = new File(["scanned PDF with blank front matter"], "scan.pdf", { type: "application/pdf" });
    const first = await extractPdfContent(pdf, { maxOcrPages: 2 });
    expect(first.blankOcrPages).toEqual([1, 2]);
    expect(first.pendingOcrPages).toEqual([3]);
    const second = await extractPdfContent(pdf, {
      maxOcrPages: 15,
      resume: { text: first.text, fingerprint: first.sourceFingerprint!, blankPages: first.blankOcrPages },
    });
    expect(mocks.runOcr).toHaveBeenCalledTimes(3);
    expect(second.blankOcrPages).toEqual([1, 2]);
    expect(second.pendingOcrPages).toEqual([]);
    expect(second.text).toContain("[Page 3]\nPage three source text");
  }, 10_000);
});
