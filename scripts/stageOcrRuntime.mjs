import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const runtime = join(root, "public", "ocr", "7.0.0");
const worker = require.resolve("tesseract.js/dist/worker.min.js");
const tesseractRequire = createRequire(require.resolve("tesseract.js/package.json"));
const coreRoot = dirname(tesseractRequire.resolve("tesseract.js-core/package.json"));

mkdirSync(join(runtime, "core"), { recursive: true });
copyFileSync(worker, join(runtime, "worker.min.js"));
for (const file of [
  "tesseract-core-lstm.wasm.js",
  "tesseract-core-lstm.wasm",
  "tesseract-core-simd-lstm.wasm.js",
  "tesseract-core-simd-lstm.wasm",
  "tesseract-core-relaxedsimd-lstm.wasm.js",
  "tesseract-core-relaxedsimd-lstm.wasm",
]) {
  copyFileSync(join(coreRoot, file), join(runtime, "core", file));
}
