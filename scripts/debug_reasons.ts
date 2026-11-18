import fs from "fs";

const content = fs.readFileSync("src/services/pdfQuestionImporter.ts", "utf-8");
const lines = content.split("\n");
lines.forEach((l, i) => {
  if (l.includes("suspiciousReasons.push") || l.includes('reviewStatus = "needs_review"') || l.includes("needs_review")) {
    console.log(`${i + 1}: ${l.trim()}`);
  }
});
