import { describe, expect, it, vi } from "vitest";
import { importImageFile } from "../src/services/importService";
import { addLocalItem, addItem } from "../src/services/storageService";
import { runOcr } from "../src/services/ocrService";

vi.mock("../src/services/localOcrStore", () => ({
  saveLocalImage: vi.fn(async () => ({ hash: "a".repeat(64) })),
  getLocalOcrPage: vi.fn(),
}));
vi.mock("../src/services/storageService", () => ({
  addLocalItem: vi.fn(() => ({ id: "local-1" })),
  addItem: vi.fn(),
  updateItem: vi.fn(),
}));
vi.mock("../src/services/ocrService", () => ({ runOcr: vi.fn() }));

describe("default image intake", () => {
  it("keeps the image local without an OCR API or AI request while B1 is off", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await importImageFile(new File(["image"], "sample.png", { type: "image/png" }));
    expect(addLocalItem).toHaveBeenCalledWith(expect.objectContaining({
      sourceTitle: "sample",
      localAssetHash: "a".repeat(64),
      storageScope: "local",
      text: "Image awaiting OCR review",
    }));
    expect(addItem).not.toHaveBeenCalled();
    expect(runOcr).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
