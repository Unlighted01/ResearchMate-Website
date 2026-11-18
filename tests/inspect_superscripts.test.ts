import { describe, it } from "vitest";
import fs from "fs";
import { extractAllPagesWithLayout } from "../src/services/pdfService";
import { parseTwoPassQuestionsAndAnswersDetailed, detectParserProfile } from "../src/services/pdfQuestionImporter";

describe("Inspect superscripts", () => {
  it("prints items with lost superscripts flag in 1001 Math", async () => {
    const pdfPath = "C:/Users/netne/Documents/CSC REVIEWER 2027/📝 2027 CSE Reviewer/Math Word Problems (for prof and subprof )/1001 Math Problems.pdf";
    const layout = await extractAllPagesWithLayout(fs.readFileSync(pdfPath));
    const det = detectParserProfile(layout.pages);
    const result = parseTwoPassQuestionsAndAnswersDetailed(layout.pages, { profile: det.profile });

    const flagged = result.items.filter((it) =>
      it.suspiciousReasons?.some((r) => r.includes("lost superscripts"))
    );
    console.log("Count flagged for lost superscripts:", flagged.length);
    for (const it of flagged.slice(0, 10)) {
      console.log(`Q${it.number}: stem="${it.stem.slice(0, 80)}" options=${JSON.stringify(it.options)}`);
    }
  }, 30000);
});
