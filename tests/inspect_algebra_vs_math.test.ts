import { describe, it } from "vitest";
import fs from "fs";
import { extractAllPagesWithLayout } from "../src/services/pdfService";

describe("Compare Key Regions: 501 Algebra vs 501 Math Word Problems", () => {
  it("inspects 501 Math Word Problems key region", async () => {
    const mathPath = "C:/Users/netne/Documents/CSC REVIEWER 2027/📝 2027 CSE Reviewer/Math Word Problems (for prof and subprof )/501 Math Word Problems.pdf";
    const layout = await extractAllPagesWithLayout(fs.readFileSync(mathPath));
    const firstKeyIndex = layout.pages.findIndex((page) => /(?:^|\n)\s*Answers\b/i.test(page.text));
    console.log(`=== 501 Math Word Problems Raw Key Page ${firstKeyIndex + 1} ===`);
    console.log(layout.pages[firstKeyIndex].text);
  });

  it("inspects 501 Algebra Questions key region", async () => {
    const algebraPath = "C:/Users/netne/Documents/CSC REVIEWER 2027/📝 2027 CSE Reviewer/Math Word Problems (for prof and subprof )/Math topics/LearningExpress Editors - 501 Algebra Questions-LearningExpress (2006).pdf";
    const layout = await extractAllPagesWithLayout(fs.readFileSync(algebraPath));
    // Find first answers page
    for (let i = 0; i < layout.pages.length; i++) {
      if (/(?:^|\n)\s*Answers\b/i.test(layout.pages[i].text)) {
        console.log(`=== 501 Algebra Questions Raw Key Page ${i + 1} ===`);
        console.log(layout.pages[i].text);
        break;
      }
    }
  });
});
