import { describe, expect, it } from "vitest";
import { applyResumedOcrText, assemblePdfSourceText, assertSamePdfFingerprint, hydrateOcrPages, planOcrPages, type PdfPageWithLayout } from "../src/services/pdfService";

const page = (pageNumber: number, text: string): PdfPageWithLayout => ({
  pageNumber,
  text,
  items: [],
});

describe("PDF source routing", () => {
  it("sends a scanned document to OCR and reports capped pages explicitly", () => {
    const pages = Array.from({ length: 20 }, (_, index) => page(index + 1, ""));
    expect(planOcrPages(pages, 15)).toEqual({
      selected: Array.from({ length: 15 }, (_, index) => index + 1),
      pending: [16, 17, 18, 19, 20],
    });
  });

  it("never uses a document label as source evidence when extraction is empty", () => {
    expect(assemblePdfSourceText([page(1, "")])).toBe("");
    expect(assemblePdfSourceText([page(1, "Verified note"), page(2, "")])).toBe("[Page 1]\nVerified note");
  });

  it("keeps OCR provenance and reports unreadable pages without inventing text", async () => {
    const pages = [page(1, ""), page(2, "")];
    await hydrateOcrPages(pages, [1, 2], async (pageNumber) => {
      if (pageNumber === 2) throw new Error("OCR unavailable");
      return { text: "Photographed note", confidence: 91 };
    });
    expect(pages[0]).toMatchObject({ text: "Photographed note", extractionMethod: "ocr", ocrConfidence: 91 });
    expect(pages[1]).toMatchObject({ text: "", extractionMethod: "unreadable", extractionError: "OCR unavailable" });
    expect(assemblePdfSourceText(pages)).toBe("[Page 1]\nPhotographed note");
  });

  it("continues a 20-page scan without repeating the first 15 OCR calls", () => {
    const pages = Array.from({ length: 20 }, (_, index) => page(index + 1, ""));
    const existing = Array.from({ length: 15 }, (_, index) => `[Page ${index + 1}]\nOCR text for ${index + 1}`).join("\n\n");
    applyResumedOcrText(pages, existing);
    expect(planOcrPages(pages, 15)).toEqual({ selected: [16, 17, 18, 19, 20], pending: [] });
    expect(assemblePdfSourceText(pages).match(/\[Page 1\]/g)).toHaveLength(1);
    expect(pages[0].extractionMethod).toBe("ocr");
  });

  it("rejects a different PDF before merging old OCR text", () => {
    expect(() => assertSamePdfFingerprint("expected", "different")).toThrow(/different PDF/i);
    expect(() => assertSamePdfFingerprint("same", "same")).not.toThrow();
  });
});
