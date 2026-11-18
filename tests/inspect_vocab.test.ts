import { describe, it } from "vitest";
import fs from "fs";
import { extractAllPagesWithLayout } from "../src/services/pdfService";
import { parseTwoPassQuestionsAndAnswersDetailed, detectParserProfile } from "../src/services/pdfQuestionImporter";

describe("Inspect Vocabulary over-flagging", () => {
  it("inspects 501 Synonym and Antonym Questions", async () => {
    const pdfPath = "C:/Users/netne/Documents/CSC REVIEWER 2027/📝 2027 CSE Reviewer/Vocabulary (for prof and subprof)/(Skill Builder in Focus) LearningExpress Editors - 501 Synonym and Antonym Questions-Learningexpress, Llc (2007).pdf";
    const layout = await extractAllPagesWithLayout(fs.readFileSync(pdfPath));
    const det = detectParserProfile(layout.pages);
    const result = parseTwoPassQuestionsAndAnswersDetailed(layout.pages, { profile: det.profile });

    const reasonItems: Record<string, typeof result.items> = {};
    for (const it of result.items) {
      if (it.reviewStatus === "needs_review") {
        for (const r of it.suspiciousReasons || []) {
          let cat = r;
          if (r.startsWith("Near-duplicate option detected")) cat = "near-duplicate";
          else if (r.startsWith("Duplicate option detected")) cat = "duplicate-option";
          else if (r.startsWith("Format outlier")) cat = "format-outlier";
          else if (r.startsWith("Length outlier")) cat = "length-outlier";
          
          if (!reasonItems[cat]) reasonItems[cat] = [];
          reasonItems[cat].push(it);
        }
      }
    }

    console.log("=== 501 Synonym and Antonym Questions ===");
    console.log("Total items:", result.items.length);
    console.log("Needs review count:", result.items.filter(it => it.reviewStatus === "needs_review").length);
    for (const [cat, items] of Object.entries(reasonItems)) {
      console.log(`\n--- Reason: ${cat} (Total: ${items.length}) ---`);
      for (const it of items.slice(0, 10)) {
        console.log(`Q${it.number}: stem="${it.stem.slice(0, 70)}" choices=${JSON.stringify(it.options)} key=${it.correctLetter}`);
      }
    }
  });
});
