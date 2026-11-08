import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  parseTwoPassQuestionsAndAnswersDetailed,
  detectParserProfile,
  findRepeatingHeadersAndFooters,
  compareAnswersOrderInsensitive,
  checkWordNumeralConsistency,
  stripGluedPageNumbers,
  evaluateSuspiciousItem,
  SAVED_PARSER_PROFILES,
} from "../src/services/pdfQuestionImporter";
import { PdfPageWithLayout } from "../src/services/pdfService";

async function extractPagesFromPdf(filePath: string): Promise<PdfPageWithLayout[]> {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const pages: PdfPageWithLayout[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let text = "";
    for (const it of content.items as any[]) {
      text += (it.str || "") + (it.hasEOL ? "\n" : " ");
    }
    pages.push({ pageNumber: i, text: text.trim() });
  }
  return pages;
}

describe("Real PDF Reviewer Fixtures & Regression Audit", () => {
  // Test 1: 4-6 page document with legitimate repeated line (e.g. "Directions")
  it("preserves legitimate repeated directions across a 5-page document while stripping true running headers", () => {
    const fivePageDocument = [
      "CIVIL SERVICE REVIEWER 2027\nDirections: Choose the best answer for each question.\n1. Solve for x: 2x = 10\na. 3\nb. 5\nc. 7\nd. 9\nPage 1",
      "CIVIL SERVICE REVIEWER 2027\nDirections: Choose the best answer for each question.\n2. Solve for y: y + 4 = 12\na. 6\nb. 8\nc. 10\nd. 12\nPage 2",
      "CIVIL SERVICE REVIEWER 2027\nDirections: Choose the best answer for each question.\n3. Solve for z: 3z = 21\na. 7\nb. 8\nc. 9\nd. 10\nPage 3",
      "CIVIL SERVICE REVIEWER 2027\nDirections: Choose the best answer for each question.\n4. Solve for w: w - 5 = 15\na. 18\nb. 20\nc. 22\nd. 25\nPage 4",
      "CIVIL SERVICE REVIEWER 2027\nDirections: Choose the best answer for each question.\n5. Solve for n: 4n = 32\na. 6\nb. 7\nc. 8\nd. 9\nAnswers and Explanations\n1. b. x = 5\n2. b. y = 8\n3. a. z = 7\n4. b. w = 20\n5. c. n = 8\nPage 5",
    ];

    const repeating = findRepeatingHeadersAndFooters(fivePageDocument);

    // True running header MUST be detected (normalized without trailing page/year digits)
    expect(repeating.has("civil service reviewer")).toBe(true);

    // Legitimate instructional directions MUST NOT be detected as header/footer
    expect(repeating.has("directions: choose the best answer for each question.")).toBe(false);

    // Ensure parsing preserves questions cleanly
    const parsed = parseTwoPassQuestionsAndAnswersDetailed(fivePageDocument);
    expect(parsed.items.length).toBe(5);
    expect(parsed.items[0].stem).toContain("Solve for x");
  });

  // Test 2: Order-insensitive answer comparison and word-numeral consistency
  it("compares answers order-insensitively and detects word-numeral inconsistencies", () => {
    expect(compareAnswersOrderInsensitive("6, 16", "16, 6")).toBe(true);
    expect(compareAnswersOrderInsensitive("12,20", "20, 12")).toBe(true);
    expect(compareAnswersOrderInsensitive("12, 20", "12,20")).toBe(true);
    expect(compareAnswersOrderInsensitive("6, 16", "6, 17")).toBe(false);

    // Consistency checks
    expect(checkWordNumeralConsistency("ten", 10).isConsistent).toBe(true);
    expect(checkWordNumeralConsistency("forty-five", 45).isConsistent).toBe(true);
    const mismatch = checkWordNumeralConsistency("five", 45);
    expect(mismatch.isConsistent).toBe(false);
    expect(mismatch.reason).toContain("disagrees with numeral (45)");
  });

  // Test 3: Glued page numbers stripping
  it("strips glued page numbers without removing mathematical numbers", () => {
    expect(stripGluedPageNumbers("the 5present age")).toBe("the present age");
    expect(stripGluedPageNumbers("How 6many years")).toBe("How many years");
    expect(stripGluedPageNumbers("Find the 5present")).toBe("Find the present");
    expect(stripGluedPageNumbers("gravity of the offense.27")).toBe("gravity of the offense.");

    // Mathematical numbers with spaces must remain untouched
    expect(stripGluedPageNumbers("A boy is 10 years older than his brother. In 4 years")).toBe(
      "A boy is 10 years older than his brother. In 4 years"
    );
    expect(stripGluedPageNumbers("cost is 990.24 dollars")).toBe("cost is 990.24 dollars");
  });

  // Test 4: Real Age Problems PDF
  it("parses Age_Problems.pdf accurately with free-response profile and answer alignment", async () => {
    const agePdfPath = path.resolve(__dirname, "fixtures/Age_Problems.pdf");
    if (!fs.existsSync(agePdfPath)) {
      console.warn("Age_Problems.pdf not found at:", agePdfPath);
      return;
    }

    const pages = await extractPagesFromPdf(agePdfPath);
    const detected = detectParserProfile(pages);

    expect(detected.profile.id).toBe("free_response");
    expect(detected.confidence).toBeGreaterThanOrEqual(80);

    const result = parseTwoPassQuestionsAndAnswersDetailed(pages, { profile: detected.profile });

    // 40 questions total
    expect(result.items.length).toBe(40);
    expect(result.missingQuestionNumbers.length).toBe(0);

    // Question 1 check
    const q1 = result.items.find((q) => q.number === 1);
    expect(q1).toBeDefined();
    expect(q1?.questionType).toBe("free_response");
    expect(q1?.stem).toContain("10 years older");
    expect(q1?.stem).toContain("In 4 years");
    expect(q1?.explanation).toContain("6, 16");

    // Question 40 check
    const q40 = result.items.find((q) => q.number === 40);
    expect(q40).toBeDefined();
    expect(q40?.questionType).toBe("free_response");
    expect(q40?.stem).toContain("25 years old");
    expect(q40?.stem).toContain("85 years old");
    expect(q40?.explanation).toBe("5");

    // Must not contain lesson steps from page 2
    const lessonStep = result.items.find((q) => q.stem.includes("Fill in the now column"));
    expect(lessonStep).toBeUndefined();
  });

  // Test 5: Real RA 6713 PDF
  it("routes RA 6713 to unstructured legal text notes generator with source quotes and consistency flags", async () => {
    const raPdfPath = path.resolve(
      __dirname,
      "fixtures/Philippines_Code_of_Conduct_and_Ethical_Standards_for_Public_Officials_1989.pdf"
    );
    if (!fs.existsSync(raPdfPath)) {
      console.warn("RA 6713 PDF not found at:", raPdfPath);
      return;
    }

    const pages = await extractPagesFromPdf(raPdfPath);
    const result = parseTwoPassQuestionsAndAnswersDetailed(pages);

    expect(result.notesRoute).toBe(true);
    expect(result.isUnstructuredDocument).toBe(true);
    expect(result.items.length).toBeGreaterThan(20);

    // Verify all items have sourcePage and sourceQuote
    for (const item of result.items.slice(0, 10)) {
      expect(item.sourcePage).toBeDefined();
      expect(item.sourceQuote).toBeDefined();
      expect(item.options.length).toBeGreaterThanOrEqual(4);
    }

    // Verify consistency check flagged Section 8(C)(2) ("ten (100") and broken stems ending mid-parenthesis
    const flagged = result.items.filter((it) => it.reviewStatus === "needs_review");
    expect(flagged.length).toBe(3);

    // Flagged 1: Sec. 8(C)(2)
    const sec8Item = flagged.find((it) => it.sourcePage === 8);
    expect(sec8Item).toBeDefined();
    expect(sec8Item!.chapter).toContain("Sec. 8");
    expect(sec8Item!.suspiciousReasons?.some((r) => r.includes("unclosed parenthesis") && r.includes("disagrees with numeral (100)"))).toBe(true);

    // Test case 1: "imprisonment not exceeding five (5) years" provision must be Sec. 11 (Penalties)
    // and flagged as needs_review because stem ends mid-parenthesis / broken number "(P5, 000."
    // Numeral (5) is masked to "_____" so it does not leak into the stem
    const sec11Item = flagged.find((it) => it.sourcePage === 10 && it.stem.includes("years"));
    expect(sec11Item).toBeDefined();
    expect(sec11Item!.chapter).toBe("Sec. 11 (Penalties)");
    expect(sec11Item!.reviewStatus).toBe("needs_review");
    expect(sec11Item!.stem).not.toContain("(5) years");
    expect(sec11Item!.suspiciousReasons?.some((r) => r.includes("mid-parenthesis"))).toBe(true);

    // Test case 2: "These Rules shall take effect thirty (30) days" must be Rule XIV (Effectivity)
    // Numeral (30) is masked to "_____" so it does not leak into the stem
    const rule14Item = result.items.find((it) => it.sourcePage === 31 && it.stem.includes("days"));
    expect(rule14Item).toBeDefined();
    expect(rule14Item!.chapter).toBe("Rule XIV (Effectivity)");
    expect(rule14Item!.reviewStatus).toBe("verified");
    expect(rule14Item!.stem).not.toContain("(30) days");

    // Test case 3: Distractor pool excludes mismatched numbers ("100" from "ten (100")
    const daysQuestions = result.items.filter((it) => it.stem.includes("days"));
    for (const dq of daysQuestions) {
      // "100" should never be used as a distractor for valid days questions
      if (!dq.explanation?.includes("ten (100") && dq.reviewStatus !== "needs_review") {
        expect(dq.options).not.toContain("100");
      }
    }

    // Test case 4: Sec. 3 definitions (Gift, Loan, Conflict of interest) are generated
    const giftItem = result.items.find((it) => it.stem.includes("which term is defined as") && it.options.includes("Gift"));
    expect(giftItem).toBeDefined();
    expect(giftItem!.chapter).toBe("Sec. 3 (Definition of Terms)");

    const loanItem = result.items.find((it) => it.stem.includes("which term is defined as") && it.options.includes("Loan"));
    expect(loanItem).toBeDefined();
    expect(loanItem!.chapter).toBe("Sec. 3 (Definition of Terms)");

    const conflictItem = result.items.find((it) => it.stem.includes("which term is defined as") && it.options.includes("Conflict of interest"));
    expect(conflictItem).toBeDefined();
    expect(conflictItem!.chapter).toBe("Sec. 3 (Definition of Terms)");

    // Verify "forty-five (45)" was parsed cleanly as verified without false positive
    const fortyFiveItems = result.items.filter((it) => it.sourceQuote?.includes("forty-five") || it.sourceQuote?.includes("forty five"));
    expect(fortyFiveItems.length).toBeGreaterThanOrEqual(1);
    for (const ff of fortyFiveItems) {
      expect(ff.reviewStatus).toBe("verified");
    }
  });

  // Test 6: Short math stem flag suppression
  it("does not flag short math stems with digits/symbols and valid choices", () => {
    const evaluation7Pct = evaluateSuspiciousItem({
      stem: "7% =",
      options: ["0.7", "0.07", "7.0", "0.007"],
      questionType: "mcq",
      hasIncompleteAnswer: false,
    });
    expect(evaluation7Pct.isSuspicious).toBe(false);
    expect(evaluation7Pct.reviewStatus).toBe("verified");

    const evaluation4Pct = evaluateSuspiciousItem({
      stem: "4% =",
      options: ["0.4", "0.04", "4.0", "0.004"],
      questionType: "mcq",
      hasIncompleteAnswer: false,
    });
    expect(evaluation4Pct.isSuspicious).toBe(false);
    expect(evaluation4Pct.reviewStatus).toBe("verified");

    // But a non-math short stem should still be flagged
    const evaluationShortText = evaluateSuspiciousItem({
      stem: "Who",
      options: ["Alice", "Bob", "Charlie", "David"],
      questionType: "mcq",
      hasIncompleteAnswer: false,
    });
    expect(evaluationShortText.isSuspicious).toBe(true);
    expect(evaluationShortText.reviewStatus).toBe("needs_review");
  });
});
