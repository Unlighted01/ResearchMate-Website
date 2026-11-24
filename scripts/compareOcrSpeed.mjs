// Results contain hashes and measurements only; never include source page text.
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const read = async workers => JSON.parse(await readFile(`.tmp/ocr-speed/workers-${workers}.json`, "utf8"));
const before = await read(1);
const after = await read(2);
const initial = await readFile(".tmp/ocr-speed/workers-2-initial.json", "utf8").then(JSON.parse).catch(error => {
  if (error.code === "ENOENT") return undefined;
  throw error;
});
const emptyText = createHash("sha256").update(JSON.stringify("")).digest("hex");
assert.equal(before.sourceHash, after.sourceHash);
assert.equal(before.browser, after.browser);
assert.equal(before.pages, 156);
assert.equal(after.pages, 156);
const differences = field => before.hashes.filter(page => after.hashes.find(other => other.page === page.page)?.[field] !== page[field]).map(page => page.page);
console.log("| Measurement | One worker | Two workers |");
console.log("|---|---:|---:|");
for (const [label, a, b] of [
  ["Pages processed", before.pages, after.pages],
  ["Pages with nonempty OCR text", before.hashes.filter(p => p.text !== emptyText).length, after.hashes.filter(p => p.text !== emptyText).length],
  ["Total OCR workflow (seconds)", before.elapsedMs / 1000, after.elapsedMs / 1000],
  ["Summed recognition time (seconds)", before.recognitionMs / 1000, after.recognitionMs / 1000],
  ["Peak Chrome working set (MiB)", before.peakWorkingSetMiB.toFixed(2), after.peakWorkingSetMiB.toFixed(2)],
  ["Peak Chrome private memory (MiB)", before.peakPrivateMiB.toFixed(2), after.peakPrivateMiB.toFixed(2)],
  ["Maximum main-thread timer delay (ms)", before.maxDelayMs, after.maxDelayMs],
  ["Draft questions", before.drafts, after.drafts],
  ["Gradable without confirmation", before.gradable, after.gradable],
  ["External or AI requests", before.forbiddenRequests, after.forbiddenRequests],
  ["Browser errors", before.browserErrors, after.browserErrors],
  ["Memory sampling errors", before.memoryErrors.length, after.memoryErrors.length],
]) console.log(`| ${label} | ${a} | ${b} |`);
const changes = {text: differences("text"), words: differences("words"), confidence: differences("confidence"), keys: before.keysHash !== after.keysHash};
console.log(JSON.stringify({wallTimeReductionPercent: (100 * (1 - after.elapsedMs / before.elapsedMs)).toFixed(2), changes}, null, 2));
assert.deepEqual(changes, {text: [], words: [], confidence: [], keys: false}, "OCR outputs changed; human accuracy review required");
for (const run of [before, after]) {
  assert.equal(run.gradable, 0);
  assert.equal(run.allFair, true);
  assert.equal(run.forbiddenRequests, 0);
  assert.equal(run.browserErrors, 0);
  assert.deepEqual(run.memoryErrors, []);
}
if (initial) {
  assert.equal(initial.sourceHash, before.sourceHash);
  assert.deepEqual(initial.hashes, before.hashes);
  assert.equal(initial.keysHash, before.keysHash);
  console.log("\n| Measurement | One worker | Two workers, initial | Two workers, verification |");
  console.log("|---|---:|---:|---:|");
  const runs = [before, initial, after];
  for (const [name, value] of [
    ["OCR job wall time (seconds)", run => (run.elapsedMs / 1000).toFixed(3)],
    ["Summed recognition time (seconds)", run => (run.recognitionMs / 1000).toFixed(3)],
    ["Peak Chrome working set (MiB)", run => run.peakWorkingSetMiB.toFixed(2)],
    ["Peak Chrome private memory (MiB)", run => run.peakPrivateMiB.toFixed(2)],
  ]) console.log(`| ${name} | ${runs.map(value).join(" | ")} |`);
}
