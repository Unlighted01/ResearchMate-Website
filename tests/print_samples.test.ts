import { describe, it } from "vitest";
import fs from "fs";
import { extractAllPagesWithLayout } from "../src/services/pdfService";
import { parseTwoPassQuestionsAndAnswersDetailed, detectParserProfile } from "../src/services/pdfQuestionImporter";

describe("Print 10 samples per reason", () => {
  it("samples 501 Synonym", async () => {
    const pdfPath = "C:/Users/netne/Documents/CSC REVIEWER 2027/📝 2027 CSE Reviewer/Vocabulary (for prof and subprof)/(Skill Builder in Focus) LearningExpress Editors - 501 Synonym and Antonym Questions-Learningexpress, Llc (2007).pdf";
    const layout = await extractAllPagesWithLayout(fs.readFileSync(pdfPath));
    const det = detectParserProfile(layout.pages);
    const result = parseTwoPassQuestionsAndAnswersDetailed(layout.pages, { profile: det.profile });

    const byReason: Record<string, any[]> = {};
    for (const it of result.items.filter((candidate) => candidate.reviewStatus === "needs_review")) {
      for (const r of it.suspiciousReasons || []) {
        if (!byReason[r]) byReason[r] = [];
        byReason[r].push(it);
      }
    }
    console.log("=== 501 SYNONYM SAMPLES ===");
    for (const [r, items] of Object.entries(byReason)) {
      console.log(`\nREASON: "${r}" (Total: ${items.length})`);
      items.slice(0, 10).forEach((it, idx) => {
        console.log(JSON.stringify({ sample: idx + 1, number: it.number, stem: it.stem, options: it.options, key: it.correctLetter, page: it.pageNumber }));
      });
    }
  });

  it("samples Grammar Essentials", async () => {
    const pdfPath = "C:/Users/netne/Documents/CSC REVIEWER 2027/📝 2027 CSE Reviewer/Grammar (for prof and subprof)/Grammar Essentials, 3rd Edition.pdf";
    const layout = await extractAllPagesWithLayout(fs.readFileSync(pdfPath));
    const det = detectParserProfile(layout.pages);
    const result = parseTwoPassQuestionsAndAnswersDetailed(layout.pages, { profile: det.profile });

    const byReason: Record<string, any[]> = {};
    for (const it of result.items.filter((candidate) => candidate.reviewStatus === "needs_review")) {
      for (const r of it.suspiciousReasons || []) {
        let key = r;
        if (r.startsWith("Near-duplicate")) key = "Near-duplicate option detected";
        if (r.startsWith("Duplicate option")) key = "Duplicate option detected";
        if (r.startsWith("Length outlier")) key = "Length outlier";
        if (r.startsWith("Format outlier")) key = "Format outlier";
        if (!byReason[key]) byReason[key] = [];
        byReason[key].push(it);
      }
    }
    console.log("=== GRAMMAR ESSENTIALS SAMPLES ===");
    for (const [r, items] of Object.entries(byReason)) {
      console.log(`\nREASON: "${r}" (Total: ${items.length})`);
      items.slice(0, 10).forEach((it, idx) => {
        console.log(JSON.stringify({ sample: idx + 1, number: it.number, stem: it.stem, options: it.options, key: it.correctLetter, page: it.pageNumber }));
      });
    }
  });
});
