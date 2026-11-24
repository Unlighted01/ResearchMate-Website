import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
const saved = vi.hoisted(() => ({ pages: [] as any[] }));
vi.mock("../src/services/pdfLocalOcrService", () => ({ pdfOcrPages: async () => saved.pages }));
import { classifyDocumentType, detectParserProfile, parseTwoPassQuestionsAndAnswersDetailed } from "../src/services/pdfQuestionImporter";
import { createPdfOcrDrafts, pdfOcrDrafts } from "../src/services/pdfOcrReviewService";
import { clearQuestionBank } from "../src/services/questionBankService";
import { getGradableQuestions } from "../src/services/examQuestionPolicy";
import type { PdfOcrJob } from "../src/services/pdfLocalOcrService";

afterEach(() => clearQuestionBank());

// Explicit opt-in: consume a saved OCR cache outside the repo; never open a PDF.
it.skipIf(!process.env.MSA_OCR_CACHE)("reports MSA OCR draft parsing from its external cache", async () => {
  const rel = relative(process.cwd(), resolve(process.env.MSA_OCR_CACHE!));
  expect(isAbsolute(rel) || rel.startsWith(".."), "Keep source OCR outside the repo").toBe(true);
  const cache = JSON.parse(readFileSync(process.env.MSA_OCR_CACHE!, "utf8"));
  expect(cache.pages).toHaveLength(156);
  expect(cache.source.sourceHash).toBe("e794320f914974b231843153a79ae925984d609c7c1a9b17610e957c1efee477");
  expect(cache.pages.map((page: any) => page.pageNumber)).toEqual(Array.from({length:156}, (_,i)=>i+1));
  expect(cache.pages.every((page: any) => page.sourceHash === cache.source.sourceHash)).toBe(true);
  saved.pages = cache.pages;
  clearQuestionBank();
  const pages = cache.pages.map((page: any) => ({pageNumber:page.pageNumber,text:page.text,items:[],extractionMethod:"ocr" as const}));
  console.log("Classification", classifyDocumentType(pages));
  console.log("Profile", detectParserProfile(pages).summary);
  const baseline = process.env.MSA_OCR_BASELINE === "true";
  const result = parseTwoPassQuestionsAndAnswersDetailed(pages);
  const job = {sourceHash:cache.source.sourceHash,name:"MSA scan.pdf",completedPages:pages.map((p:any)=>p.pageNumber),pageCount:156} as PdfOcrJob;
  if (baseline) {
    expect(result.items).toHaveLength(0);
    await expect(createPdfOcrDrafts(job)).rejects.toThrow(/No structured questions/);
  } else {
    expect(result.items).toHaveLength(19);
    await createPdfOcrDrafts(job);
    expect(pdfOcrDrafts(job.sourceHash)).toHaveLength(19);
    expect(pdfOcrDrafts(job.sourceHash).every(item => item.keyProvenance === "none" && !item.keyConfirmation && item.reviewStatus === "needs_review")).toBe(true);
    expect(result.items.filter(item=>item.correctIndex>=0)).toHaveLength(14);
  }
  const drafts = pdfOcrDrafts(job.sourceHash);
  expect(getGradableQuestions(drafts)).toHaveLength(0);
  const report = {label:baseline ? "Before" : "After",ocrPages:pages.length,parsed:result.items.length,imported:drafts.length,keyCandidates:result.items.filter(item=>item.correctIndex>=0).length,gradable:getGradableQuestions(drafts).length,dropped:result.droppedOversizedStemCount || 0};
  mkdirSync(".tmp/msa-drafts",{recursive:true});
  const beforeFile = ".tmp/msa-drafts/before.json";
  writeFileSync(`.tmp/msa-drafts/${baseline ? "before" : "after"}.json`, JSON.stringify(report,null,2));
  const rows = !baseline && existsSync(beforeFile) ? [JSON.parse(readFileSync(beforeFile,"utf8")),report] : [report];
  console.log("| Run | OCR pages | Parsed drafts | Imported drafts | Unconfirmed key candidates | Gradable | Oversized stems dropped |");
  console.log("|---|---:|---:|---:|---:|---:|---:|");
  rows.forEach(row => console.log(`| ${row.label} | ${row.ocrPages} | ${row.parsed} | ${row.imported} | ${row.keyCandidates} | ${row.gradable} | ${row.dropped} |`));
  console.log("Retained source pages:", [...new Set(result.items.map(item=>item.sourcePage || item.pageNumber))].sort((a,b)=>a!-b!));
  console.log("Reasons:",result.items.flatMap(item=>item.suspiciousReasons || []).reduce((counts: Record<string,number>,reason)=>{counts[reason]=(counts[reason] || 0)+1;return counts;},{}));
});
