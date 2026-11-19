// Counts only: this script never opens corpus source files.
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const before = JSON.parse(readFileSync(process.argv[2] || "reports/pdf_confirmation_before.json", "utf8"));
const after = JSON.parse(readFileSync(process.argv[3] || "reports/pdf_confirmation_current.json", "utf8"));
const frozen = new Set(["Express Review Guides - Vocabulary.pdf", "Vocabulary for Civil Service Exam.pdf", "Newton P., Bristoll H. - Complete Set of Practice Tests for Numerical Reasoning.pdf", "English Verb Drills.pdf"]);
assert.equal(new Set(before.map((row) => row.file)).size, before.length, "Before filenames must be unique");
assert.equal(new Set(after.map((row) => row.file)).size, after.length, "After filenames must be unique");
assert.equal(before.length, after.length, "Corpus file count changed");
const fields = ["questionsFound", "gradedCount", "verifiedQuestionCount", "needsReview", "droppedOversizedStems"];
const changes = after.filter((row) => {
  const prior = before.find((candidate) => candidate.file === row.file);
  assert.ok(prior, `No baseline for ${row.file}`);
  return fields.some((key) => (row[key] ?? null) !== (prior[key] ?? null));
});
assert.equal(changes.length, 0, "Corpus counts regressed or changed; inspect before claiming confirmation");
const sum = (rows, key) => rows.reduce((total, row) => total + (row[key] || 0), 0);
const table = (head, rows) => ["| " + head.join(" | ") + " |", "|" + head.map(() => "---").join("|") + "|", ...rows.map((row) => "| " + row.join(" | ") + " |")].join("\n");
const count = (row) => `${row.questionsFound}/${row.gradedCount}/${row.needsReview}`;
const summary = table(["Metric", "Before", "After"], [
  ["PDFs (54 rescanned; 4 frozen cached)", before.length, after.length],
  ...[["Found", "questionsFound"], ["Keyed/answered (includes review and free response)", "gradedCount"], ["Needs review", "needsReview"], ["Dropped oversized stems", "droppedOversizedStems"]].map(([label, key]) => [label, sum(before, key), sum(after, key)]),
  ["Reviewed MCQs (54 non-frozen PDFs only)", sum(before.filter((row) => !frozen.has(row.file)), "verifiedQuestionCount"), sum(after.filter((row) => !frozen.has(row.file)), "verifiedQuestionCount")],
  ["Files with changed counts", "-", changes.length],
]);
const allFiles = table(["File", "Before found/keyed/review", "After found/keyed/review", "Longest keyed stem", "Dropped", "Evidence"], after.map((row) => [row.file, count(before.find((prior) => prior.file === row.file)), count(row), row.longestStem, row.droppedOversizedStems, frozen.has(row.file) ? "cached only" : "fresh scan"]));
const heldout = table(["Frozen file", "Before found/keyed/review", "After found/keyed/review"], after.filter((row) => frozen.has(row.file)).map((row) => [row.file, count(before.find((prior) => prior.file === row.file)), count(row)]));
const report = `# Local PDF confirmation counts\n\n${summary}\n\nPASS ${after.filter((row) => row.status === "PASS").length}; WARN ${after.filter((row) => row.status === "WARN").length}; UNVERIFIED ${after.filter((row) => row.status === "UNVERIFIED").length}; FAIL ${after.filter((row) => row.status === "FAIL").length}. These are scanner classifications, not human answer validation.\n\n${allFiles}\n\n${heldout}\n`;
writeFileSync("reports/pdf_confirmation_summary.md", report);
console.log(summary + "\n\n" + heldout);
