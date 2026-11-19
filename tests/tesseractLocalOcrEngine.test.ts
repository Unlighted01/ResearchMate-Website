import { afterEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ createWorker: vi.fn() }));
vi.mock("tesseract.js", () => ({ createWorker: mock.createWorker, OEM: { LSTM_ONLY: 1 } }));
import { TesseractLocalOcrEngine } from "../src/services/tesseractLocalOcrEngine";
afterEach(() => vi.clearAllMocks());
it("surfaces startup errors rather than leaving initialization pending", async () => {
  mock.createWorker.mockImplementation((_lang, _mode, options) => {
    queueMicrotask(() => options.errorHandler("model download failed"));
    return new Promise(() => {});
  });
  const engine = new TesseractLocalOcrEngine();
  await expect(engine.initialize("eng")).rejects.toThrow(/model download failed/);
  await engine.dispose();
});
it("terminates a worker that finishes loading after disposal", async () => {
  let finish: (worker: any) => void;
  mock.createWorker.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const engine = new TesseractLocalOcrEngine();
  const result = engine.initialize("eng");
  await vi.waitFor(() => expect(mock.createWorker).toHaveBeenCalled());
  await engine.dispose();
  const terminate = vi.fn(async () => {}); finish!({ terminate });
  await expect(result).rejects.toThrow(/cancelled/);
  expect(terminate).toHaveBeenCalledTimes(1);
});
