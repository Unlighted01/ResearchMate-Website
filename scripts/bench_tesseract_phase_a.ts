/** Local Phase A timing probe. Reads ignored selection manifest; writes ignored OCR results. */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";

const corpusRoot = process.env.CORPUS_ROOT;
if (!corpusRoot) throw new Error("Set CORPUS_ROOT");
const benchRoot = path.join(os.tmpdir(), "researchmate-ocr-bench");
const require = createRequire(path.join(benchRoot, "benchmark.cjs"));
const { createWorker } = require("tesseract.js") as { createWorker: (...args: any[]) => Promise<any> };
const selected = JSON.parse(fs.readFileSync("reports/image_benchmark_selection.json", "utf8")) as Array<{
  index: number;
  relativePath: string;
  features: string[];
}>;

function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))];
}

async function main() {
  const loadStart = performance.now();
  const worker = await createWorker(["eng", "tgl"], 1, {
    langPath: benchRoot,
    cachePath: benchRoot,
    cacheMethod: "readOnly",
    gzip: false,
  });
  const modelLoadMs = Math.round(performance.now() - loadStart);
  const results = [];
  let peakRssMiB = 0;
  try {
    for (const variant of ["original", "preprocessed"] as const) {
      for (const sample of selected) {
        const image = variant === "original"
          ? path.join(corpusRoot!, sample.relativePath)
          : path.join(benchRoot, "preprocessed", `${String(sample.index).padStart(3, "0")}.png`);
        const start = performance.now();
        const sampler = setInterval(() => {
          peakRssMiB = Math.max(peakRssMiB, process.memoryUsage().rss / 1048576);
        }, 25);
        try {
          const { data } = await worker.recognize(image, {}, { text: true, tsv: true });
          results.push({
            index: sample.index,
            variant,
            features: sample.features,
            ms: Math.round(performance.now() - start),
            engineConfidence: Math.round(data.confidence),
            text: data.text,
            tsv: data.tsv,
          });
        } finally {
          clearInterval(sampler);
        }
      }
    }
  } finally {
    await worker.terminate();
  }
  const out = { engine: "tesseract.js 7.0.0", languages: "eng+tgl", modelLoadMs, peakRssMiB: Math.round(peakRssMiB), results };
  fs.writeFileSync("reports/ocr_benchmark_tesseract.json", JSON.stringify(out, null, 2));
  console.log("| Variant | Images | Median OCR ms | p95 OCR ms | Mean engine confidence | Peak process RSS MiB |");
  console.log("|---|---:|---:|---:|---:|---:|");
  for (const variant of ["original", "preprocessed"]) {
    const rows = results.filter((row) => row.variant === variant);
    const times = rows.map((row) => row.ms);
    const meanConfidence = Math.round(rows.reduce((sum, row) => sum + row.engineConfidence, 0) / rows.length);
    console.log(`| ${variant} | ${rows.length} | ${quantile(times, 0.5)} | ${quantile(times, 0.95)} | ${meanConfidence} | ${out.peakRssMiB} |`);
  }
  console.log(`Model load: ${modelLoadMs} ms (models already cached locally)`);
  console.log("Ground-truth word/key/digit accuracy: pending human labels; engine confidence is not accuracy.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
