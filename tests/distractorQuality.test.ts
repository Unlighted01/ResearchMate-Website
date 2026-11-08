// ============================================
// DISTRACTOR QUALITY SERVICE TESTS & AUDIT
// Tests stem-leak, outlier detection, absolute words, duplicate choices,
// RA 6713 norm-of-conduct masking, math wrong-path traps, and item analytics.
// ============================================

import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";
import {
  lintDistractorQuality,
  generateNumericDistractors,
  generateSiblingTermDistractors,
  recordOptionPickAndAnalyze,
  computeStringSimilarity,
  normalizeOptionText,
} from "../src/services/distractorQualityService";
import {
  generateWrongPathDistractorsForMath,
  generateWrongPathDistractorsForMathWithReasons,
  generateHarmonicSpeedTwin,
  generateWorkRateTwin,
} from "../src/services/twinTemplateService";
import { createSeededExam } from "../src/services/examSeedService";
import { Question } from "../src/services/examService";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { parseTwoPassQuestionsAndAnswersDetailed } from "../src/services/pdfQuestionImporter";
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

describe("Distractor Quality & Linting Service", () => {
  // -------------------------------------------------------------
  // 1. STEM-LEAK DETECTION & AUTO-FIX
  // -------------------------------------------------------------
  describe("Stem-Leak Detection & Auto-Fix", () => {
    it("detects when a content word from the correct option appears in the stem and flags it if autoFix is disabled", () => {
      const q = {
        stem: "Under civil service rules, which standard refers to maintaining strict professionalism in all duties?",
        options: ["Punctuality", "Professionalism", "Courage", "Loyalty"],
        correctIndex: 1, // "Professionalism"
      };

      const result = lintDistractorQuality(q, { autoFixStemLeak: false });
      expect(result.passed).toBe(false);
      expect(result.issues.some((i) => i.rule === "stem-leak")).toBe(true);
      expect(result.reasons.some((r) => r.includes("professionalism"))).toBe(true);
    });

    it("automatically masks the leaked term in the stem with [______] when autoFix is enabled", () => {
      const q = {
        stem: 'Under RA 6713, which norm of conduct is defined as: "Public officials and employees shall perform and discharge their duties with the highest degree of professionalism at all times"?',
        options: [
          "Commitment to public interest",
          "Justness and sincerity",
          "Professionalism",
          "Simple living",
        ],
        correctIndex: 2, // "Professionalism"
      };

      const result = lintDistractorQuality(q, { autoFixStemLeak: true });
      expect(result.autoFixed).toBe(true);
      expect(result.fixedStem).toBeDefined();
      expect(result.fixedStem).toContain("[______]");
      expect(result.fixedStem).not.toContain("professionalism");

      // Running lint on the fixed stem now passes!
      const retest = lintDistractorQuality({
        stem: result.fixedStem!,
        options: q.options,
        correctIndex: q.correctIndex,
      });
      expect(retest.passed).toBe(true);
    });

    it("handles multi-word norm-of-conduct stem-leaks and masks leftover partner words like 'public' in 'public [______]'", () => {
      const q = {
        stem: 'Under RA 6713, which norm is defined as: "Officials shall always uphold the public interest over and above personal interest"?',
        options: [
          "Commitment to public interest",
          "Professionalism",
          "Justness and sincerity",
          "Simple living",
        ],
        correctIndex: 0,
      };

      const result = lintDistractorQuality(q, { autoFixStemLeak: true });
      expect(result.autoFixed).toBe(true);
      expect(result.fixedStem).toContain("[______]");
      // Leftover partner word "public" must NOT be left hanging as "public [______]"
      expect(result.fixedStem).not.toMatch(/\bpublic\s*\[______\]/i);
      expect(result.fixedStem).not.toMatch(/\[______\]\s*interest\b/i);
    });

    it("stems content words (e.g. plurals, -ing, -ed, -ism) to detect morphological stem-leaks", () => {
      const qPlural = {
        stem: "Which entities exercise sovereign powers in democratic government systems?",
        options: ["Judiciary", "Governments", "Corporations", "Private Sector"],
        correctIndex: 1, // "Governments" stems to match "government" in stem
      };
      const resultPlural = lintDistractorQuality(qPlural, { autoFixStemLeak: false });
      expect(resultPlural.passed).toBe(false);
      expect(resultPlural.issues.some((i) => i.rule === "stem-leak")).toBe(true);

      const qGerund = {
        stem: "Under civil service regulations, receiving or accepting any valuable consideration from clients is prohibited.",
        options: ["Lawful business", "Receiving any gift", "Standard compensation", "Travel reimbursement"],
        correctIndex: 1, // "Receiving" stems to match "receiving" in stem
      };
      const resultGerund = lintDistractorQuality(qGerund, { autoFixStemLeak: true });
      expect(resultGerund.autoFixed).toBe(true);
      expect(resultGerund.fixedStem).toContain("[______]");
    });

    it("masks BOTH number word and parenthesized numeral so digits do not appear in number-blank stems", () => {
      const q = {
        stem: 'Complete the legal provision: "Officials have an obligation to submit declarations under oath of assets, liabilities including unmarried children under eighteen (18) years of age living in their households."',
        options: ["1", "5", "10", "18"],
        correctIndex: 3,
      };

      const result = lintDistractorQuality(q, { autoFixStemLeak: true });
      // Verify parenthesized numeral (18) is masked
      const finalStem = result.fixedStem || q.stem;
      expect(finalStem).not.toContain("_____ (18)");
      expect(finalStem).not.toContain("(18)");
    });

    it("does not flag legitimate words shared across distractors or common stopwords", () => {
      const q = {
        stem: "What is the primary function of the legislative department in government?",
        options: [
          "To enforce laws",
          "To interpret laws",
          "To enact and pass laws",
          "To adjudicate disputes",
        ],
        correctIndex: 2, // "To enact and pass laws"
      };

      const result = lintDistractorQuality(q);
      // "laws" is in distractors, stopwords "to", "and" are ignored
      expect(result.issues.filter((i) => i.rule === "stem-leak").length).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // 2. LENGTH & FORMAT OUTLIERS
  // -------------------------------------------------------------
  describe("Length & Format Outliers", () => {
    it("flags when the correct option is the unique longest by more than 2x ratio", () => {
      const q = {
        stem: "Which group qualifies for immediate family medical coverage?",
        options: [
          "Spouse only",
          "Parents",
          "Siblings",
          "Family of public officials or employees including their legitimate spouses and minor dependent children",
        ],
        correctIndex: 3,
      };

      const result = lintDistractorQuality(q);
      expect(result.passed).toBe(false);
      expect(result.issues.some((i) => i.rule === "length-outlier")).toBe(true);
    });

    it("flags format outliers when only the correct option ends in a period", () => {
      const q = {
        stem: "Identify the correct protocol:",
        options: [
          "File form A",
          "Submit form B",
          "Request clearance from the department head.",
          "Notify supervisor",
        ],
        correctIndex: 2,
      };

      const result = lintDistractorQuality(q);
      expect(result.issues.some((i) => i.rule === "format-outlier")).toBe(true);
    });

    it("flags format outliers when correct option is text while all distractors are numbers", () => {
      const q = {
        stem: "What is the penalty duration?",
        options: ["10", "20", "Suspension without pay", "40"],
        correctIndex: 2,
      };

      const result = lintDistractorQuality(q);
      expect(result.issues.some((i) => i.rule === "format-outlier")).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 3. ALL/NONE OF THE ABOVE & ABSOLUTE WORDS
  // -------------------------------------------------------------
  describe("Lazy Meta-Choices & Absolute Words", () => {
    it("flags 'all of the above' and 'none of the above'", () => {
      const q = {
        stem: "Which of the following are valid grounds for disciplinary action?",
        options: ["Dishonesty", "Neglect of duty", "Misconduct", "All of the above"],
        correctIndex: 3,
      };

      const result = lintDistractorQuality(q);
      expect(result.issues.some((i) => i.rule === "all-none-above")).toBe(true);
    });

    it("flags absolute qualifier words (always, never, only) appearing in distractors", () => {
      const q = {
        stem: "Under government ethical guidelines, when may a public officer accept small gifts?",
        options: [
          "Only when authorized by law and of nominal value",
          "Gifts are always prohibited under any condition",
          "Never under any circumstance",
          "Only from immediate superiors",
        ],
        correctIndex: 0,
      };

      const result = lintDistractorQuality(q);
      expect(result.issues.some((i) => i.rule === "absolute-word")).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 4. DUPLICATE & NEAR-DUPLICATE CHOICES
  // -------------------------------------------------------------
  describe("Duplicate & Near-Duplicate Detection", () => {
    it("flags exact duplicate options", () => {
      const q = {
        stem: "What is 2 + 2?",
        options: ["4", "5", "4", "6"],
        correctIndex: 0,
      };

      const result = lintDistractorQuality(q);
      expect(result.issues.some((i) => i.rule === "duplicate-option")).toBe(true);
    });

    it("flags near-duplicate options based on string similarity", () => {
      const qClose = {
        stem: "Select the option:",
        options: ["1,500 cubic inches", "1,500 cubic inche", "2,000 cubic inches", "3,000 cubic inches"],
        correctIndex: 0,
      };
      const result = lintDistractorQuality(qClose);
      expect(result.issues.some((i) => i.rule === "duplicate-option")).toBe(true);
    });

    it("compares numeric options mathematically and does NOT flag distinct numbers ('15 days' vs '25 days') as duplicates", () => {
      const qDays = {
        stem: "How many days are allotted for filing the initial document?",
        options: ["15 days", "25 days", "30 days", "45 days"],
        correctIndex: 0,
      };
      const resultDays = lintDistractorQuality(qDays);
      expect(resultDays.issues.filter((i) => i.rule === "duplicate-option").length).toBe(0);

      const qSpeed = {
        stem: "A commuter travels at 60 km/h and returns at 40 km/h. What is the average speed?",
        options: ["48 km/h", "50 km/h", "52 km/h", "55 km/h"],
        correctIndex: 0,
      };
      const resultSpeed = lintDistractorQuality(qSpeed);
      expect(resultSpeed.issues.filter((i) => i.rule === "duplicate-option").length).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // 5. RULE-BASED DISTRACTOR GENERATORS
  // -------------------------------------------------------------
  describe("Rule-Based Distractor Quality", () => {
    it("generates numeric near values (decimal shifts, +/- 10-25%, swapped digits) of the exact same unit", () => {
      const { distractors, formattedCorrect } = generateNumericDistractors(15, "days");

      expect(formattedCorrect).toBe("15 days");
      expect(distractors.length).toBe(3);

      // Verify all distractors have the exact same unit
      distractors.forEach((d) => {
        expect(d).toContain("days");
        const num = parseInt(d, 10);
        expect(num).not.toBe(15);
        expect(num).toBeGreaterThan(0);
      });

      // Swapped digits test: 15 -> 51 or decimal shift -> 150 or near +/- 10-25%
      const numbers = distractors.map((d) => parseInt(d, 10));
      expect(numbers.some((n) => n === 51 || n === 150 || Math.abs(n - 15) <= 5)).toBe(true);
    });

    it("generates sibling term distractors from the same semantic category without synthetic filler", () => {
      const allTerms = [
        { term: "Gift", section: "Sec. 3 (Definition of Terms)" },
        { term: "Loan", section: "Sec. 3 (Definition of Terms)" },
        { term: "Receiving any gift", section: "Sec. 3 (Definition of Terms)" },
        { term: "Divestment", section: "Sec. 3 (Definition of Terms)" },
        { term: "Relatives", section: "Sec. 3 (Definition of Terms)" },
        { term: "Government", section: "Sec. 3 (Definition of Terms)" },
      ];

      const distractors = generateSiblingTermDistractors(
        "Gift",
        "Sec. 3 (Definition of Terms)",
        allTerms
      );

      expect(distractors.length).toBe(3);
      expect(distractors).not.toContain("Gift");
      // Must not contain fake filler like "Provision 1"
      distractors.forEach((d) => {
        expect(d).not.toMatch(/^Provision\s+\d+$/);
        expect(d).not.toMatch(/^General Rule\s+\d+$/);
      });
      // Sibling terms must be semantically close (finance / gift transfers)
      expect(distractors).toContain("Loan");
      expect(distractors).toContain("Divestment");
      expect(distractors).toContain("Receiving any gift");
      // Must NOT contain mismatched entities like "Government" or "Relatives"
      expect(distractors).not.toContain("Government");
      expect(distractors).not.toContain("Relatives");
    });

    it("skips term-definition questions when fewer than 3 close siblings exist", () => {
      const isolatedTerms = [
        { term: "Government", section: "Sec. 3 (Definition of Terms)" },
        { term: "Loan", section: "Sec. 3 (Definition of Terms)" },
        { term: "Simple living", section: "Sec. 4 (Norms of Conduct)" },
      ];

      const distractors = generateSiblingTermDistractors(
        "Government",
        "Sec. 3 (Definition of Terms)",
        isolatedTerms
      );

      // Fewer than 3 close government entity siblings exist -> returns empty array
      expect(distractors).toEqual([]);
    });
  });

  // -------------------------------------------------------------
  // 6. TWIN TEMPLATE SERVICE MATH WRONG-PATH TRAPS
  // -------------------------------------------------------------
  describe("TwinTemplateService Math Traps", () => {
    it("produces wrong-path calculation traps for work/pipe rate problems", () => {
      const stem = "Pipe A can fill the tank in 6 hours, while Pipe B takes 12 hours. How many hours simultaneously?";
      const correct = "4 hours";

      const wrongPaths = generateWrongPathDistractorsForMath(stem, correct, "work_rate");
      expect(wrongPaths.length).toBe(3);
      // Arithmetic average trap: (6 + 12) / 2 = 9 hours
      expect(wrongPaths).toContain("9 hours");
      // Direct sum trap: 6 + 12 = 18 hours
      expect(wrongPaths).toContain("18 hours");
      // Difference trap: 12 - 6 = 6 hours
      expect(wrongPaths).toContain("6 hours");
    });

    it("produces harmonic speed traps (linear average vs harmonic mean)", () => {
      const stem = "A commuter travels at 30 km/h and returns at 60 km/h. Average round trip speed?";
      const correct = "40 km/h";

      const wrongPaths = generateWrongPathDistractorsForMath(stem, correct, "harmonic_speed");
      expect(wrongPaths.length).toBe(3);
      // Linear average trap: (30 + 60) / 2 = 45 km/h
      expect(wrongPaths).toContain("45 km/h");
      // Difference trap: 30 km/h
      expect(wrongPaths).toContain("30 km/h");
    });

    it("produces successive discount traps (linear addition instead of equivalent discount)", () => {
      const stem = "A store offers successive discounts of 20% and 10%. Single equivalent discount?";
      const correct = "28%";

      const wrongPaths = generateWrongPathDistractorsForMath(stem, correct, "successive_discount");
      expect(wrongPaths.length).toBe(3);
      // Linear sum trap: 20 + 10 = 30%
      expect(wrongPaths).toContain("30%");
    });

    it("attaches explicit named error reasons to math distractors and eliminates unexplained offsets", () => {
      const stem = "A commuter drives 30 km/h and returns at 60 km/h. Average speed?";
      const correct = "40 km/h";

      const trapsWithReasons = generateWrongPathDistractorsForMathWithReasons(stem, correct, "harmonic_speed");
      expect(trapsWithReasons.length).toBe(3);

      const reasons = trapsWithReasons.map((t) => t.reason);
      expect(reasons).toContain("average");
      expect(reasons).toContain("difference");
      expect(reasons).toContain("missing_two_factor");

      // Verify twin question generator attaches distractorReasons map
      const twin = generateHarmonicSpeedTwin();
      expect(twin.distractorReasons).toBeDefined();
      expect(Object.keys(twin.distractorReasons!).length).toBeGreaterThanOrEqual(3);
      const twinReasons = Object.values(twin.distractorReasons!);
      expect(twinReasons.some((r) => r === "average" || r === "difference" || r === "missing_two_factor")).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 7. OPTION PICK TRACKING & ITEM PERFORMANCE
  // -------------------------------------------------------------
  describe("Option Pick Tracking & Analytics", () => {
    it("tracks option pick counts and flags ineffective distractors (<5%) after N attempts", () => {
      let stats = undefined;
      const correctIdx = 1;
      const totalOptions = 4;

      // Simulate 20 attempts: Option 1 chosen 18 times (90%), Option 0 chosen 2 times (10%), Option 2 and 3 chosen 0 times (0%)
      for (let i = 0; i < 18; i++) {
        stats = recordOptionPickAndAnalyze(stats, 1, correctIdx, totalOptions, { minAttemptsForItemStats: 10 });
      }
      for (let i = 0; i < 2; i++) {
        stats = recordOptionPickAndAnalyze(stats, 0, correctIdx, totalOptions, { minAttemptsForItemStats: 10 });
      }

      expect(stats!.attempts).toBe(20);
      expect(stats!.correct).toBe(18);
      expect(stats!.pickCounts[1]).toBe(18);
      expect(stats!.pickCounts[0]).toBe(2);

      // Options 2 and 3 were never picked (0% < 5%) -> flagged as ineffective distractors
      expect(stats!.lowPickDistractors).toContain(2);
      expect(stats!.lowPickDistractors).toContain(3);
      // Option 0 picked 10% >= 5% -> not in low picks
      expect(stats!.lowPickDistractors).not.toContain(0);
    });

    it("flags question as too easy if answered correctly > 95% after N attempts", () => {
      let stats = undefined;
      const correctIdx = 0;

      // 20 attempts, all 20 correct (100% > 95%)
      for (let i = 0; i < 20; i++) {
        stats = recordOptionPickAndAnalyze(stats, 0, correctIdx, 4, { minAttemptsForItemStats: 10 });
      }

      expect(stats!.tooEasyFlag).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 8. BALANCED CORRECT-ANSWER POSITIONS IN SEEDED EXAMS
  // -------------------------------------------------------------
  describe("Balanced Correct-Answer Distribution", () => {
    it("balances correct answer positions evenly across choices A, B, C, D in a seeded exam", () => {
      const questions: Question[] = Array.from({ length: 20 }, (_, i) => ({
        id: `test-q-${i}`,
        question: `Question statement ${i + 1}`,
        options: ["Option Alpha", "Option Beta", "Option Gamma", "Option Delta"],
        correctIndex: 0,
        explanation: "Rationale",
        topicTag: "General",
      }));

      const { orderedQuestions, examRecord } = createSeededExam(
        questions,
        { totalQuestions: 20, choicesPerItem: 4 },
        "BALANCED-AUDIT-SEED"
      );

      // Count positions of correct answers in the generated exam
      const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
      orderedQuestions.forEach((q, idx) => {
        counts[q.correctIndex] = (counts[q.correctIndex] || 0) + 1;
        // Verify consistency with ExamRecord key
        expect(examRecord.answerKey[idx]).toBe(q.correctIndex);
        expect(examRecord.permutations[q.id].newCorrectIndex).toBe(q.correctIndex);
      });

      // For 20 questions with 4 choices, balanced target is exactly 5 per option
      expect(counts[0]).toBe(5);
      expect(counts[1]).toBe(5);
      expect(counts[2]).toBe(5);
      expect(counts[3]).toBe(5);
    });
  });

  // -------------------------------------------------------------
  // 9. AUDIT EXISTING REAL PDF QUESTIONS (RA 6713 & 1001 MATH)
  // -------------------------------------------------------------
  describe("Audit of Real PDF Generated Questions", () => {
    it("audits RA 6713 generated questions and reports pass, auto-fixed, and failure reasons", async () => {
      const raPdfPath = path.resolve(
        __dirname,
        "fixtures/Philippines_Code_of_Conduct_and_Ethical_Standards_for_Public_Officials_1989.pdf"
      );

      if (!fs.existsSync(raPdfPath)) {
        console.warn("RA 6713 PDF fixture not found for audit");
        return;
      }

      const pages = await extractPagesFromPdf(raPdfPath);
      const result = parseTwoPassQuestionsAndAnswersDetailed(pages);

      let totalAudited = result.items.length;
      let totalVerified = 0;
      let totalNeedsReview = 0;
      const failureReasonCounts: Record<string, number> = {};

      for (const item of result.items) {
        if (item.reviewStatus === "needs_review") {
          totalNeedsReview++;
          for (const reason of item.suspiciousReasons || []) {
            // Group by category prefix
            let cat = reason.split(":")[0].trim();
            if (reason.includes("Length outlier")) cat = "Length outlier";
            else if (reason.includes("parenthesis")) cat = "Unclosed parenthesis / broken stem";
            else if (reason.includes("mismatch")) cat = "Word-numeral mismatch";
            failureReasonCounts[cat] = (failureReasonCounts[cat] || 0) + 1;
          }
        } else {
          totalVerified++;
        }
      }

      console.log("\n=======================================================");
      console.log("       RA 6713 DISTRACTOR QUALITY AUDIT REPORT         ");
      console.log("=======================================================");
      console.log(`Total Questions Generated: ${totalAudited}`);
      console.log(`Verified (Exam-Ready):     ${totalVerified} (${Math.round((totalVerified / totalAudited) * 100)}%)`);
      console.log(`Needs Review:              ${totalNeedsReview}`);
      console.log("Breakdown of Review Reasons:");
      for (const [reason, count] of Object.entries(failureReasonCounts)) {
        console.log(`  - ${reason}: ${count}`);
      }
      console.log("=======================================================\n");

      expect(totalAudited).toBeGreaterThan(20);
      expect(totalVerified).toBeGreaterThan(totalNeedsReview);

      // Norms of conduct whose terms appear in their definitions (e.g. Professionalism)
      // are masked with [______] so they do not leak into the stem
      const maskedNorms = result.items.filter(
        (it) => it.chapter?.includes("Norms") && it.stem.includes("[______]")
      );
      expect(maskedNorms.length).toBeGreaterThan(0);

      const profItem = result.items.find(
        (it) => it.options.includes("Professionalism") && it.chapter?.includes("Norms")
      );
      expect(profItem).toBeDefined();
      expect(profItem!.stem).toContain("[______]");
      expect(profItem!.stem.toLowerCase()).not.toContain("professionalism");
    });
  });
});
