// Produces local counts/timings only. Never opens the source PDF or prints OCR text.
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const result = JSON.parse(readFileSync(process.argv[2] || ".tmp/pdf-ocr-full/results.json", "utf8"));
assert.equal(result.completion?.pages, 156);
assert.equal(result.restoredComplete?.pages, 156);
assert.equal(result.offline.status, "completed");
assert.equal(result.completion.allFair, true);
assert.equal(result.forbiddenRequests, 0);
const phases = [["Initial online batch", result.first], ["Resume after reload", result.resumed], ["Offline completion", result.offline]];
const calls = phases.flatMap(([, phase]) => phase.recognitionTimes);
assert.equal(calls.length, 156);
assert.deepEqual(calls.map((call) => call.page), Array.from({ length: 156 }, (_, i) => i + 1));
const table = (head, rows) => ["| " + head.join(" | ") + " |", "|" + head.map(() => "---").join("|") + "|", ...rows.map((row) => "| " + row.join(" | ") + " |")].join("\n");
const timings = table(["Phase", "New pages", "Saved total", "Wall time (ms)", "Max timer delay (ms)"], phases.map(([name, phase]) => [name, phase.newlyProcessed, phase.saved, phase.elapsedMs, phase.maxDelayMs]));
const memory = result.memory.samples.filter((sample) => sample.osMemory);
assert.ok(memory.length > 2, "Insufficient actual process memory samples");
const peak = (key) => Math.max(...memory.map((sample) => sample.osMemory[key]));
const size = (bytes) => `${bytes} bytes (${(bytes / 1048576).toFixed(3)} MiB)`;
const done = memory.filter((sample) => sample.phase === "completed").at(-1);
const memoryTable = table(["Memory measurement", "Result"], [
  ["Chrome process memory samples", memory.length],
  ["Sampling errors", result.memory.errors.length],
  ["Baseline sum of working sets", size(memory[0].osMemory.workingSetBytes)],
  ["Peak sampled sum of working sets", size(peak("workingSetBytes"))],
  ["Baseline private bytes", size(memory[0].osMemory.privateBytes)],
  ["Peak sampled private bytes (committed)", size(peak("privateBytes"))],
  ["Post-completion private bytes", done ? size(done.osMemory.privateBytes) : "unavailable"],
  ["Peak sampled JS heap across attached contexts", size(Math.max(...memory.map((sample) => sample.contextJsHeapBytes)))],
  ["Peak sampled backing storage across attached contexts", size(Math.max(...memory.map((sample) => sample.contextBackingStorageBytes)))],
]);
const durations = calls.map((call) => call.ms).sort((a, b) => a - b);
const totalPhaseMs = phases.reduce((sum, [, phase]) => sum + phase.elapsedMs, 0);
const checks = table(["Check", "Result"], [
  ["OCR phase wall times summed", `${totalPhaseMs} ms`],
  ["Workflow wall time including reload/checkpoint overhead", `${result.workflowElapsedMs} ms`],
  ["Recognition request/response min / mean / p95 / max", `${durations[0]} / ${(durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)} / ${durations[Math.ceil(durations.length * 0.95) - 1]} / ${durations.at(-1)} ms`],
  ["Unique successful recognition calls", calls.filter((call) => call.ok).length],
  ["Saved results surviving offline reload", result.restoredComplete.pages],
  ["Normalized word boxes validated", result.completion.words],
  ["OCR text characters", result.completion.textChars],
  ["Empty OCR pages", result.completion.blankPages.length ? result.completion.blankPages.join(", ") : "none"],
  ["Reported page confidence min / max (uncalibrated)", `${Math.min(...result.completion.pageConfidences.map((page) => page.confidence))} / ${Math.max(...result.completion.pageConfidences.map((page) => page.confidence))}`],
  ["Model downloads", result.modelRequests],
  ["AI/API or external requests", result.forbiddenRequests],
  ["Browser exceptions", result.browserErrors],
]);
const config = table(["Configuration", "Value"], [["Chrome", result.environment.chrome], ["CPU", result.environment.cpu.trim()], ["Rasterization", `${result.environment.dpi} DPI`], ["Language", result.environment.language], ["Source", result.source?.file || "MSA"], ["Source SHA-256", result.source?.sourceHash || "not recorded"]]);
const report = `# Full MSA OCR workflow benchmark\n\n${config}\n\n${timings}\n\n${checks}\n\n${memoryTable}\n\nWall times cover the real panel's workflow, including cache validation and benchmark polling. Recognition times cover Tesseract worker request/response, excluding PDF rasterization. First-download traffic uses loopback hosting, not a mobile connection.\n\nMemory uses a fresh isolated headless Chrome profile. Working sets can double-count shared pages; private bytes measure committed allocations, not resident RAM. Sampling is requested every two seconds and may miss short spikes. JS heap and backing-store counters must not be added to OS memory totals.\n\nRemaining gaps: transcription/key/digit accuracy needs checked labels; DPI and FAIR thresholds remain uncalibrated; Android and the complete signed-in production app were not measured. All OCR pages remain local FAIR material with unconfirmed keys.\n`;
writeFileSync("reports/pdf_ocr_full_summary.md", report);
console.log(timings + "\n\n" + checks + "\n\n" + memoryTable);
