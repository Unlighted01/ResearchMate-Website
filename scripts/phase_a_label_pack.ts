/** Read-only Phase A labeling pack. All generated crops and transcripts go to OS temp, never the repo. */
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const corpusRoot = process.env.CORPUS_ROOT;
if (!corpusRoot) throw new Error("Set CORPUS_ROOT");
const outRoot = path.join(os.tmpdir(), "researchmate-ocr-phase-a");
const benchmarkRoot = path.join(os.tmpdir(), "researchmate-ocr-bench");
const requireBench = createRequire(path.join(benchmarkRoot, "package.json"));
const { createWorker } = requireBench("tesseract.js") as { createWorker: (...args: any[]) => Promise<any> };
const inventory = JSON.parse(readFileSync("reports/image_inventory.json", "utf8"));

const samples = [
  { id: "01", inventoryIndex: 37, feature: "Past Exams PT.1, tall numeric MCQs" },
  { id: "02", inventoryIndex: 63, feature: "Past Exams PT.1, English MCQ with answer" },
  { id: "03", inventoryIndex: 78, feature: "Past Exams PT.2, math and fractions" },
  { id: "04", inventoryIndex: 98, feature: "Statements and Conclusions, colored key" },
  { id: "05", inventoryIndex: 24, feature: "MUST READ, handwritten fraction table" },
  { id: "06", inventoryIndex: 9, feature: "Vocabulary list" },
  { id: "07", inventoryIndex: 16, feature: "Key Words algebra table" },
  { id: "08", inventoryIndex: 21, feature: "Math Formulas, diagram table" },
  { id: "09", inventoryIndex: 88, feature: "Embedded answer/key labels" },
  { id: "10", inventoryIndex: 70, feature: "Tagalog MCQs" },
].map((sample) => ({ ...sample, relativePath: inventory.rows[sample.inventoryIndex].path }));

const cropScript = String.raw`
from PIL import Image, ImageOps, ImageEnhance, ImageDraw
import json, os, sys
root, out, payload = sys.argv[1:]
samples = json.loads(payload)
for sample in samples:
    src = os.path.join(root, sample['relativePath'])
    image = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
    width, height = image.size
    sample_dir = os.path.join(out, 'regions', sample['id'])
    os.makedirs(sample_dir, exist_ok=True)
    image.save(os.path.join(sample_dir, 'full.jpg'), quality=92)
    for name, start, end in [('top', 0, 1/3), ('middle', 1/3, 2/3), ('bottom', 2/3, 1)]:
        crop = image.crop((0, round(height*start), width, round(height*end)))
        crop.save(os.path.join(sample_dir, name+'.jpg'), quality=95)
    gray = ImageOps.grayscale(image)
    if width < 1000:
        target = 1000
        gray = gray.resize((target, round(height*target/width)), Image.Resampling.LANCZOS)
    gray = ImageOps.autocontrast(gray)
    pre_dir = os.path.join(out, 'preprocessed')
    os.makedirs(pre_dir, exist_ok=True)
    gray.save(os.path.join(pre_dir, sample['id']+'.png'))
`;

mkdirSync(outRoot, { recursive: true });
const crop = spawnSync("python", ["-c", cropScript, corpusRoot, outRoot, JSON.stringify(samples)], { encoding: "utf8", maxBuffer: 1024 * 1024 });
if (crop.status !== 0) throw new Error(crop.stderr || `crop exit ${crop.status}`);
mkdirSync(path.join(outRoot, "ground_truth"), { recursive: true });
mkdirSync(path.join(outRoot, "ocr_output"), { recursive: true });
writeFileSync(path.join(outRoot, "samples.json"), JSON.stringify(samples, null, 2));

let truthIndex = "# Human ground truth — images only\n\nDo not consult OCR output while transcribing. Copy the visible text exactly, including punctuation, letters, and digits. Mark unreadable spans `[illegible]`.\n\n";
let ocrIndex = "# Machine OCR output — separate from human labels\n\n";
for (const sample of samples) {
  const name = `${sample.id}.md`;
  truthIndex += `- [${sample.id}: ${sample.feature}](ground_truth/${name})\n`;
  ocrIndex += `- [${sample.id}: ${sample.feature}](ocr_output/${name})\n`;
  const rel = `../regions/${sample.id}`;
  const template = `# ${sample.id}: ${sample.feature}\n\nSource: ${sample.relativePath}\n\n## Top (0–33% height)\n\n![Top region](${rel}/top.jpg)\n\nVisible text (transcribe exactly):\n\n\n\n## Middle (33–67% height)\n\n![Middle region](${rel}/middle.jpg)\n\nVisible text (transcribe exactly):\n\n\n\n## Bottom (67–100% height)\n\n![Bottom region](${rel}/bottom.jpg)\n\nVisible text (transcribe exactly):\n\n\n\n## Every visible answer/key entry\n\nWrite one question number and letter/value per line. Use none if absent.\n\n\n\n## Every visible digit and question number\n\nInclude fractions, decimals, percentages, option values, and numbering in reading order.\n\n\n\n## Notes on illegible regions\n\n\n`;
  writeFileSync(path.join(outRoot, "ground_truth", name), template);
}
writeFileSync(path.join(outRoot, "ground_truth_index.md"), truthIndex);
writeFileSync(path.join(outRoot, "ocr_output_index.md"), ocrIndex);

const worker = await createWorker(["eng", "tgl"], 1, {
  langPath: benchmarkRoot, cachePath: benchmarkRoot, cacheMethod: "readOnly", gzip: false,
});
const results = [];
try {
  for (const variant of ["original", "preprocessed"] as const) {
    for (const sample of samples) {
      const image = variant === "original"
        ? path.join(corpusRoot, sample.relativePath)
        : path.join(outRoot, "preprocessed", `${sample.id}.png`);
      const start = performance.now();
      const { data } = await worker.recognize(image, {}, { text: true, tsv: true });
      const ms = Math.round(performance.now() - start);
      results.push({ id: sample.id, variant, ms, confidence: Math.round(data.confidence), text: data.text, tsv: data.tsv });
      writeFileSync(path.join(outRoot, "ocr_output", `${sample.id}_${variant}.txt`), data.text);
    }
  }
} finally {
  await worker.terminate();
}
for (const sample of samples) {
  const original = results.find((result) => result.id === sample.id && result.variant === "original")!;
  const preprocessed = results.find((result) => result.id === sample.id && result.variant === "preprocessed")!;
  writeFileSync(path.join(outRoot, "ocr_output", `${sample.id}.md`),
    `# ${sample.id}: ${sample.feature}\n\nSource: ${sample.relativePath}\n\n## Original OCR\n\n\`\`\`text\n${original.text}\n\`\`\`\n\n## Preprocessed OCR\n\n\`\`\`text\n${preprocessed.text}\n\`\`\`\n`);
}
writeFileSync(path.join(outRoot, "ocr_results.json"), JSON.stringify(results, null, 2));
console.log(`Human-label index: ${path.join(outRoot, "ground_truth_index.md")}`);
console.log(`Separate OCR index: ${path.join(outRoot, "ocr_output_index.md")}`);
console.log("| ID | Feature | Original ms | Preprocessed ms | Original confidence | Preprocessed confidence |");
console.log("|---|---|---:|---:|---:|---:|");
for (const sample of samples) {
  const original = results.find((result) => result.id === sample.id && result.variant === "original")!;
  const preprocessed = results.find((result) => result.id === sample.id && result.variant === "preprocessed")!;
  console.log(`| ${sample.id} | ${sample.feature} | ${original.ms} | ${preprocessed.ms} | ${original.confidence} | ${preprocessed.confidence} |`);
}
