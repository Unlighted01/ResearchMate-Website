import { describe, it } from "vitest";
import fs from "fs";
import path from "path";
import { extractAllPagesWithLayout } from "../src/services/pdfService";
import { parseTwoPassQuestionsAndAnswersDetailed, detectParserProfile } from "../src/services/pdfQuestionImporter";

describe("300-item reconstruction audit", () => {
  it("prints requested numbered items", async () => {
    const base = "C:/Users/netne/Documents/CSC REVIEWER 2027";
    const corpusRoot = path.join(base, fs.readdirSync(base).find((name) => name.includes("CSE Reviewer"))!);
    const pdfPath = path.join(corpusRoot, "Practice Tests with Answer Keys", "300 items Mathematics Reviewer with Detailed Solutions.pdf");
    const layout = await extractAllPagesWithLayout(fs.readFileSync(pdfPath));
    const detection = detectParserProfile(layout.pages);
    const result = parseTwoPassQuestionsAndAnswersDetailed(layout.pages, { profile: detection.profile });
    for (const number of [4, 29, 124, 202, 203, 204]) {
      const item = result.items.find((candidate) => candidate.number === number);
      console.log(`ITEM ${number}:`, JSON.stringify(item && { stem: item.stem, options: item.options, correctLetter: item.correctLetter, explanation: item.explanation, reviewStatus: item.reviewStatus, reasons: item.suspiciousReasons }));
    }
    for (const term of ["1.45", "Liza's science", "Tony's hou", "One Canadian dollar"]) {
      const page = layout.pages.find((candidate) => candidate.text.includes(term));
      if (!page) continue;
      const textIndex = page.text.indexOf(term);
      const itemIndex = page.items.findIndex((candidate) => candidate.str.includes(term.slice(0, 5)));
      console.log(`RAW ${term} PAGE ${page.pageNumber}:`, page.text.slice(Math.max(0, textIndex - 150), textIndex + 900));
      console.log(`LAYOUT ${term}:`, JSON.stringify(page.items.slice(Math.max(0, itemIndex - 4), itemIndex + 35).map(({ str, x, y }) => ({ str, x: Math.round(x), y: Math.round(y) }))));
    }
    const fractionPage = layout.pages[13];
    for (const marker of ["202.)", "203.)", "204.)"]) {
      const index = fractionPage.items.findIndex((candidate) => candidate.str.includes(marker));
      console.log(`FRACTION LAYOUT ${marker}:`, JSON.stringify(fractionPage.items.slice(index, index + 105).map(({ str, x, y, width, height }) => ({ str, x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height) }))));
    }
  });
});
