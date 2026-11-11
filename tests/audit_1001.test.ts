import { describe, it, expect } from "vitest";
import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  parseTwoPassQuestionsAndAnswersDetailed,
  detectParserProfile,
  findRepeatingHeadersAndFooters,
  PROFILE_1001_MATH,
} from "../src/services/pdfQuestionImporter";
import { PdfPageWithLayout, PdfLayoutItem } from "../src/services/pdfService";

const pdfPath = "c:\\Users\\netne\\Documents\\CSC REVIEWER 2027\\📝 2027 CSE Reviewer\\Math Word Problems (for prof and subprof )\\1001 Math Problems.pdf";

describe("1001 Math Problems Real PDF Audit", () => {
  it("audits the real 1001 Math Problems PDF", async () => {
    if (!fs.existsSync(pdfPath)) {
      console.log("PDF not found at path:", pdfPath);
      return;
    }

    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    const pages: PdfPageWithLayout[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const items: PdfLayoutItem[] = [];
      let text = "";

      for (const it of content.items as any[]) {
        if (!it.str && !it.hasEOL) continue;
        const transform = it.transform || [1, 0, 0, 1, 0, 0];
        items.push({
          str: it.str || "",
          x: transform[4] ?? 0,
          y: transform[5] ?? 0,
          width: it.width ?? 0,
          height: it.height || Math.abs(transform[3]) || 12,
          hasEOL: it.hasEOL,
        });
        text += (it.str || "") + (it.hasEOL ? "\n" : " ");
      }
      pages.push({
        pageNumber: i,
        text: text.trim(),
        items,
      });
    }

    console.log("Pages extracted:", pages.length);

    // Profile detection
    const profileDetection = detectParserProfile(pages);
    console.log("\n--- Profile Auto-Detection ---");
    console.log("Profile:", profileDetection.profile.name, `(${profileDetection.profile.id})`);
    console.log("Confidence:", profileDetection.confidence + "%");
    console.log("Summary:", profileDetection.summary);

    // Frequency-based headers detection
    const repeatingHeaders = findRepeatingHeadersAndFooters(pages);
    console.log("\n--- Frequency-Based Repeating Headers Detected (" + repeatingHeaders.size + ") ---");
    console.log(Array.from(repeatingHeaders));

    // Run parser with profile
    const result = parseTwoPassQuestionsAndAnswersDetailed(pages, {
      profile: profileDetection.profile,
    });

    console.log("\n================ 1001 AUDIT RESULTS ================");
    console.log("Questions found:", result.items.length);
    console.log("Total expected:", result.totalExpected);
    console.log("Missing question numbers count:", result.missingQuestionNumbers.length);
    console.log("Exact missing question numbers:", JSON.stringify(result.missingQuestionNumbers));
    console.log("Needs review count:", result.suspiciousCount);
    console.log("\nChapters detected (" + result.chaptersDetected.length + "):");
    result.chaptersDetected.forEach((ch, idx) => console.log(`  ${idx + 1}. "${ch}"`));

    const poleQuestions = result.items.filter(
      (q) =>
        (q.stem || "").toLowerCase().includes("pole") ||
        (q.stem || "").toLowerCase().includes("shadow") ||
        (q.explanation || "").toLowerCase().includes("pole") ||
        (q.explanation || "").toLowerCase().includes("shadow")
    );
    console.log(`\nFound ${poleQuestions.length} questions mentioning pole/shadow:`);
    poleQuestions.forEach((q) => {
      console.log(`\n--- Question #${q.number} ---`);
      console.log("Stem:", q.stem);
      console.log("Choice D:", q.options[3]);
      console.log("All Options:", q.options);
      console.log("Explanation (first 100):", q.explanation?.slice(0, 100));
      console.log("Explanation (last 100):", q.explanation?.slice(-100));
    });

    const q1001 = result.items.find((q) => q.number === 1001);
    console.log("\n================ QUESTION #1001 (POLE/SHADOW) ================");
    if (q1001) {
      console.log("Stem:", q1001.stem);
      console.log("Choice D (AFTER):", JSON.stringify(q1001.options[3]));
      console.log("All Options:", q1001.options);
      console.log("Correct letter:", q1001.correctLetter, "Index:", q1001.correctIndex);
      console.log("Explanation Full:\n", q1001.explanation);
      console.log("Explanation ending (last 120 chars):", JSON.stringify(q1001.explanation.slice(-120)));
    } else {
      console.log("Question #1001 was NOT found!");
    }

    const q990 = result.items.find((q) => q.number === 990);
    console.log("\n--- Question #990 Extracted (AFTER) ---");
    if (q990) {
      console.log("Number:", q990.number);
      console.log("Chapter:", q990.chapter);
      console.log("Stem:", q990.stem);
      console.log("Choice D:", q990.options[3]);
      console.log("All Options:", q990.options);
      console.log("Correct letter:", q990.correctLetter, "Index:", q990.correctIndex);
      console.log("Explanation:", q990.explanation);
      console.log("Has incomplete answer?", q990.hasIncompleteAnswer);
      console.log("Is suspicious?", q990.isSuspicious);
      console.log("Suspicious reasons:", q990.suspiciousReasons);
      console.log("Review status:", q990.reviewStatus);
    } else {
      console.log("Question #990 was NOT found!");
    }

    expect(result.items.length).toBe(1001);
    expect(result.missingQuestionNumbers).toEqual([]);
    expect(q1001).toBeDefined();
    expect(q1001?.options.length).toBe(4);
    expect(q1001?.correctLetter).toBe("a");
  }, 120000);
});
