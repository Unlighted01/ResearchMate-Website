import { afterEach, expect, it, vi } from "vitest";
const cache = vi.hoisted(() => ({ pages: [] as any[] }));
vi.mock("../src/services/pdfLocalOcrService", () => ({ pdfOcrPages: async () => cache.pages }));
import { parseTwoPassQuestionsAndAnswersDetailed } from "../src/services/pdfQuestionImporter";
import { createPdfOcrDrafts, pdfOcrDrafts, confirmPdfOcrDraft } from "../src/services/pdfOcrReviewService";
import { clearQuestionBank } from "../src/services/questionBankService";
import { getGradableQuestions } from "../src/services/examQuestionPolicy";
import type { PdfOcrJob } from "../src/services/pdfLocalOcrService";

const hash = "a".repeat(64);
const pages = (prefix: string) => [
  {pageNumber:1,text:`${prefix}TABLE OF CONTENTS\nExercises ........ 2\nAnswer Key ........ 8`},
  {pageNumber:2,text:[
    "1. Which planet is nearest the Sun?", "a) Earth", "b) Mercury", "c) Mars", "d) Neptune",
    "2. Which planet is known for its rings?", "a) Venus", "b) Earth", "c) Saturn", "d) Mars",
    "3. Which planet is the largest in this list?", "a) Mars", "b) Jupiter", "c) Earth", "d) Venus",
  ].join("\n")},
  {pageNumber:8,text:"Answer Key\n1. B\n2. C"},
].map(page => ({...page,items:[],extractionMethod:"ocr" as const}));
afterEach(() => clearQuestionBank());

it.each(["i ", "| ", "I | "])("exits OCR-prefixed contents (%s) when real exercises start", prefix => {
  const parsed = parseTwoPassQuestionsAndAnswersDetailed(pages(prefix));
  const clean = parseTwoPassQuestionsAndAnswersDetailed(pages(""));
  expect(parsed.items.map(item => [item.number,item.stem,item.options,item.correctIndex,item.pageNumber]))
    .toEqual(clean.items.map(item => [item.number,item.stem,item.options,item.correctIndex,item.pageNumber]));
  expect(parsed.items).toHaveLength(3);
  expect(parsed.items.map(item => item.correctIndex)).toEqual([1,2,-1]);
  expect(parsed.items.every(item => item.pageNumber === 2)).toBe(true);
});

it("imports recovered OCR drafts ungraded, with only source-backed key candidates", async () => {
  clearQuestionBank(); cache.pages = pages("i ");
  await createPdfOcrDrafts({sourceHash:hash,name:"synthetic scan.pdf",completedPages:[1,2,8],pageCount:8} as PdfOcrJob);
  const drafts = pdfOcrDrafts(hash);
  expect(drafts).toHaveLength(3);
  expect(drafts.map(item => item.correctIndex)).toEqual([1,2,-1]);
  expect(drafts.every(item => item.keyProvenance === "none" && !item.keyConfirmation && item.reviewStatus === "needs_review")).toBe(true);
  expect(getGradableQuestions(drafts)).toHaveLength(0);
  confirmPdfOcrDraft({id:drafts[0].id,sourceHash:hash,page:8,crop:{x:0,y:0,width:0.5,height:0.2},correctIndex:1,reviewedQuestion:true});
  expect(getGradableQuestions(pdfOcrDrafts(hash))).toHaveLength(1);
});
