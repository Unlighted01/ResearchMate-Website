import { corpusFile } from "./helpers/corpusFile";
import { describe, it } from "vitest";
import fs from "fs";
import { extractAllPagesWithLayout } from "../src/services/pdfService";
import { parseTwoPassQuestionsAndAnswersDetailed, detectParserProfile } from "../src/services/pdfQuestionImporter";

describe("Inspect Grammar Essentials", () => {
  it("inspects pages and layout of Grammar Essentials", async () => {
    const pdfPath = corpusFile("C:/Users/netne/Documents/CSC REVIEWER 2027/📝 2027 CSE Reviewer/Grammar (for prof and subprof)/Grammar Essentials, 3rd Edition.pdf");
    const layout = await extractAllPagesWithLayout(fs.readFileSync(pdfPath));
    console.log("Total pages:", layout.pages.length);
    const det = detectParserProfile(layout.pages);
    console.log("Detected profile:", det);

    // Look for answers / key sections in pages
    const keyPages: number[] = [];
    layout.pages.forEach((p, idx) => {
      const text = p.text;
      if (/(?:^|\n)\s*(?:Answers|Answer\s+Key)\b/i.test(text)) {
        keyPages.push(idx + 1);
      }
    });
    console.log("Pages with Answers/Answer Key:", keyPages);

    // Look for questions with options
    const result = parseTwoPassQuestionsAndAnswersDetailed(layout.pages, { profile: det.profile });
    const graded = result.items.filter(it => it.questionType !== "prompt" && it.correctIndex >= 0);
    const prompts = result.items.filter(it => it.questionType === "prompt" || it.correctIndex < 0);
    console.log("Total items:", result.items.length);
    console.log("Graded items:", graded.length);
    console.log("Prompt items:", prompts.length);
  });
});
