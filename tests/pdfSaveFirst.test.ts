import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ extract:vi.fn(), save:vi.fn(), add:vi.fn(), queue:vi.fn() }));
vi.mock("../src/services/pdfService", () => ({ extractPdfContent:mocks.extract }));
vi.mock("../src/services/localOcrStore", () => ({ saveLocalImage:mocks.save }));
vi.mock("../src/services/storageService", () => ({ addLocalItem:mocks.add }));
vi.mock("../src/services/pdfTextQueue", () => ({ queuePdfTextExtraction:mocks.queue }));
import { importPdfFile } from "../src/services/importService";
beforeEach(() => { vi.clearAllMocks(); mocks.save.mockResolvedValue({ hash:"a".repeat(64) }); mocks.add.mockImplementation(item => ({...item,id:"local_test"})); });
it("returns a durable original without waiting for text extraction", async () => {
  mocks.extract.mockImplementation(() => new Promise(() => {}));
  mocks.queue.mockImplementation(() => new Promise(() => {}));
  const item = await importPdfFile(new File(["synthetic"],"test.pdf"));
  expect(item.text).toBe("");
  expect(item.tags).toContain("pdf-text-pending");
  expect(item.storageScope).toBe("local");
  expect(item.localPdfHash).toBe("a".repeat(64));
  expect(mocks.extract).not.toHaveBeenCalled();
  expect(mocks.queue).toHaveBeenCalledWith("local_test");
}, 300);
it("does not publish an item when saving its original fails", async () => {
  mocks.save.mockRejectedValue(new Error("quota"));
  await expect(importPdfFile(new File(["synthetic"],"test.pdf"))).rejects.toThrow("quota");
  expect(mocks.add).not.toHaveBeenCalled();
  expect(mocks.queue).not.toHaveBeenCalled();
});
