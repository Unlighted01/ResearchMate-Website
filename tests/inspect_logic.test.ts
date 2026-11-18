import { describe, it } from "vitest";
import fs from "fs";
import { extractAllPagesWithLayout } from "../src/services/pdfService";
import { parseTwoPassQuestionsAndAnswersDetailed, detectParserProfile } from "../src/services/pdfQuestionImporter";

describe("Inspect Logic book keys", () => {
  it("inspects answer distribution of Logic book", async () => {
    const pdfPath = "C:/Users/netne/Documents/CSC REVIEWER 2027/📝 2027 CSE Reviewer/Logic (for prof only)/-LOGIC- Challenging Logic and Reasoning Questions.pdf";
    const layout = await extractAllPagesWithLayout(fs.readFileSync(pdfPath));
    const det = detectParserProfile(layout.pages);
    const result = parseTwoPassQuestionsAndAnswersDetailed(layout.pages, { profile: det.profile });
    
    const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0, e: 0 };
    for (const it of result.items) {
      if (it.correctLetter) {
        counts[it.correctLetter.toLowerCase()] = (counts[it.correctLetter.toLowerCase()] || 0) + 1;
      }
    }
    console.log("Total items:", result.items.length);
    console.log("Counts:", counts);
    console.log("Suspicious reasons on item 0:", result.items[0]?.suspiciousReasons);
    console.log("Conditional key samples:", result.items.filter((item) => item.suspiciousReasons.some((reason) => reason.includes("conditional or ambiguous"))).slice(0, 15).map((item) => ({ number: item.number, explanation: item.explanation.slice(0, 200) })));
    const keyPages = layout.pages.map((page, index) => ({ page, index })).filter(({ page }) => /(?:^|\n)\s*(?:Answers|Answer Key|Solutions)\b/i.test(page.text));
    console.log("Key-region page numbers:", keyPages.map(({ index }) => index + 1));
    for (const { page, index } of keyPages.filter(({ index }) => index > 20).slice(0, 2)) console.log(`Key page ${index + 1}:`, page.text.slice(0, 900));
  });
});
