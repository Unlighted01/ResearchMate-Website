import { describe, it, expect } from "vitest";
import fs from "fs";
import { extractAllPagesWithLayout } from "../src/services/pdfService";
import { parseTwoPassQuestionsAndAnswersDetailed, detectParserProfile } from "../src/services/pdfQuestionImporter";

function printReasonTable(label: string, reasonCounts: Record<string, number>) {
  const grouped: Record<string, number> = {};
  for (const [reason, count] of Object.entries(reasonCounts)) {
    const category = reason.startsWith("Near-duplicate") ? "Near-duplicate option" :
      reason.startsWith("Duplicate option") ? "Duplicate option pair" :
      reason.startsWith("Length outlier") ? "Length outlier" :
      reason.startsWith("Format outlier") ? "Format outlier" :
      reason.startsWith("Answer key contains") ? "Ambiguous key guidance" : reason;
    grouped[category] = (grouped[category] || 0) + count;
  }
  console.log(`| ${label} reason | Flag occurrences |`);
  console.log("|---|---:|");
  for (const [reason, count] of Object.entries(grouped).sort((a, b) => b[1] - a[1])) {
    console.log(`| ${reason} | ${count} |`);
  }
}

describe("Debug Regressions in 1001 Math and 501 Math Word Problems", () => {
  it("counts reasons for 1001 Math Problems", async () => {
    const pdfPath = "C:/Users/netne/Documents/CSC REVIEWER 2027/📝 2027 CSE Reviewer/Math Word Problems (for prof and subprof )/1001 Math Problems.pdf";
    const layout = await extractAllPagesWithLayout(fs.readFileSync(pdfPath));
    const det = detectParserProfile(layout.pages);
    const result = parseTwoPassQuestionsAndAnswersDetailed(layout.pages, { profile: det.profile });

    const reasonCounts: Record<string, number> = {};
    let needsReviewCount = 0;
    for (const it of result.items) {
      if (it.reviewStatus === "needs_review") {
        needsReviewCount++;
        for (const r of it.suspiciousReasons || []) {
          reasonCounts[r] = (reasonCounts[r] || 0) + 1;
        }
      }
    }
    console.log("=== 1001 Math Problems ===");
    console.log("Total items:", result.items.length);
    console.log("Needs Review count:", needsReviewCount);
    printReasonTable("1001 Math", reasonCounts);
    expect(result.items.length).toBe(1001);
    expect(needsReviewCount).toBeLessThanOrEqual(50);
  }, 30000);

  it("counts reasons for 501 Math Word Problems", async () => {
    const pdfPath = "C:/Users/netne/Documents/CSC REVIEWER 2027/📝 2027 CSE Reviewer/Math Word Problems (for prof and subprof )/501 Math Word Problems.pdf";
    const layout = await extractAllPagesWithLayout(fs.readFileSync(pdfPath));
    const det = detectParserProfile(layout.pages);
    const result = parseTwoPassQuestionsAndAnswersDetailed(layout.pages, { profile: det.profile });

    const reasonCounts: Record<string, number> = {};
    let needsReviewCount = 0;
    for (const it of result.items) {
      if (it.reviewStatus === "needs_review") {
        needsReviewCount++;
        for (const r of it.suspiciousReasons || []) {
          reasonCounts[r] = (reasonCounts[r] || 0) + 1;
        }
      }
    }
    console.log("=== 501 Math Word Problems ===");
    console.log("Total items:", result.items.length);
    console.log("Needs Review count:", needsReviewCount);
    printReasonTable("501 Math Word Problems", reasonCounts);
    expect(result.items.length).toBe(500);
    expect(needsReviewCount).toBeLessThanOrEqual(35);
  }, 30000);
});
