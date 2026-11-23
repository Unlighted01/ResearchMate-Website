import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({extract:vi.fn(),get:vi.fn(),asset:vi.fn(),update:vi.fn()}));
vi.mock("../src/services/pdfService",()=>({extractPdfContent:m.extract}));
vi.mock("../src/services/localOcrStore",()=>({getLocalImage:m.asset}));
vi.mock("../src/services/storageService",()=>({getItemById:m.get,updateItem:m.update}));
import { queuePdfTextExtraction, getPdfTextProgress } from "../src/services/pdfTextQueue";
beforeEach(()=>{vi.resetAllMocks();m.get.mockResolvedValue({localPdfHash:"hash",tags:["pdf","pdf-text-pending","user-tag"]});m.asset.mockResolvedValue({blob:new Blob(["test"]),name:"test.pdf"});m.extract.mockResolvedValue({text:"[Page 1]\nTrusted source text",pageCount:1,processedPageCount:1,pendingOcrPages:[]});});
it("queues once and preserves extracted text and user tags without OCR or summary",async()=>{
  const first=queuePdfTextExtraction("once");
  expect(queuePdfTextExtraction("once")).toBe(first);
  await first;
  expect(m.extract).toHaveBeenCalledTimes(1);
  expect(m.extract.mock.calls[0][1]).toMatchObject({maxOcrPages:0,generateSummary:false,renderCover:false});
  expect(m.update).toHaveBeenCalledWith("once",{text:"[Page 1]\nTrusted source text",tags:["pdf","user-tag"]});
});
it("keeps pending original retryable after failure then completes",async()=>{
  m.extract.mockRejectedValueOnce(new Error("bad page"));
  await queuePdfTextExtraction("retry");
  expect(getPdfTextProgress("retry")?.status).toBe("error");
  expect(m.update).not.toHaveBeenCalled();
  await queuePdfTextExtraction("retry");
  expect(getPdfTextProgress("retry")?.status).toBe("complete");
});
it("does not resurrect a deleted material",async()=>{
  m.get.mockResolvedValueOnce({localPdfHash:"hash",tags:["pdf-text-pending"]}).mockResolvedValueOnce(null);
  await queuePdfTextExtraction("deleted");
  expect(m.update).not.toHaveBeenCalled();
});
it("marks scanned pages pending instead of inventing text",async()=>{
  m.extract.mockResolvedValue({text:"",pageCount:156,processedPageCount:156,pendingOcrPages:[1,2]});
  await queuePdfTextExtraction("scan");
  expect(m.update.mock.calls[0][1]).toMatchObject({text:"",tags:expect.arrayContaining(["ocr-required","partial-ocr","needs-review"])});
});
it("does not open a second document while the first is reading",async()=>{
  let release!: (value: unknown) => void;
  m.extract.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
  const first=queuePdfTextExtraction("serial-first");
  const second=queuePdfTextExtraction("serial-second");
  await vi.waitFor(()=>expect(m.extract).toHaveBeenCalledTimes(1));
  expect(getPdfTextProgress("serial-second")?.status).toBe("queued");
  release({text:"source",pageCount:1,processedPageCount:1,pendingOcrPages:[]});
  await Promise.all([first,second]);
  expect(m.extract).toHaveBeenCalledTimes(2);
});
