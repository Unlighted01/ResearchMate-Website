import { describe, it } from "vitest";
import fs from "fs";
import { extractAllPagesWithLayout } from "../src/services/pdfService";
import { parseTwoPassQuestionsAndAnswersDetailed, detectParserProfile } from "../src/services/pdfQuestionImporter";

describe("Test Math Reviewer for Civil Service Exam Skew", () => {
  it("verifies skew demotion on Math Reviewer for Civil Service Exam", async () => {
    const pdfPath = "C:/Users/netne/Documents/CSC REVIEWER 2027/📝 2027 CSE Reviewer/Practice Tests with Answer Keys/Math Reviewer for Civil Service Exam.pdf";
    const layout = await extractAllPagesWithLayout(fs.readFileSync(pdfPath));
    const det = detectParserProfile(layout.pages);
    const result = parseTwoPassQuestionsAndAnswersDetailed(layout.pages, { profile: det.profile });

    const graded = result.items.filter((it) => it.questionType !== "prompt" && it.correctIndex >= 0);
    const prompts = result.items.filter((it) => it.questionType === "prompt");
    console.log("Total items:", result.items.length);
    console.log("Graded count:", graded.length);
    console.log("Prompts count:", prompts.length);
    console.log("Reasons on item 0:", result.items[0]?.suspiciousReasons);
  });
});
