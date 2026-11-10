import { describe, it } from "vitest";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { extractAllPagesWithLayout } from "../src/services/pdfService";
import {
  parseTwoPassQuestionsAndAnswers,
  cleanPageText,
  ParsedQaItem,
} from "../src/services/pdfQuestionImporter";
import {
  assertNoStemLeaksOrOptionClashes,
  assertStemGroundedInSourcePage,
  filterEnemyItems,
} from "../src/services/distractorQualityService";

describe("Dump Review Markdown", () => {
  it("runs the importer modal pipeline on RA 6713 and dumps scratch/review_output.md", async () => {
    // 1. Get build stamp
    let gitCommit = "unknown";
    let gitBranch = "unknown";
    try {
      gitCommit = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
      gitBranch = execSync("git branch --show-current", { encoding: "utf-8" }).trim();
    } catch {
      // fallback
    }

    const fixtureRelative = "tests/fixtures/Philippines_Code_of_Conduct_and_Ethical_Standards_for_Public_Officials_1989.pdf";
    const fixturePath = path.resolve(__dirname, `../${fixtureRelative}`);
    const buffer = fs.readFileSync(fixturePath);

    // EXACT pipeline QuestionImportModal uses:
    // extractAllPagesWithLayout -> parseTwoPassQuestionsAndAnswers
    const layoutResult = await extractAllPagesWithLayout(buffer);
    const parsedQaList = parseTwoPassQuestionsAndAnswers(layoutResult.pages);

    // Build map of page text for grounding checks
    const pageTextMap = new Map<number, string>();
    layoutResult.pages.forEach((p) => {
      pageTextMap.set(p.pageNumber, cleanPageText(p.text || ""));
    });

    const totalItems = parsedQaList.length;
    const mcqItems = parsedQaList.filter((q) => q.questionType === "mcq");
    const flashcardItems = parsedQaList.filter((q) => q.questionType === "free_response");

    const tfCount = parsedQaList.filter((q) => q.templateType === "true_false").length;
    const negCount = parsedQaList.filter((q) => q.templateType === "negative_choice").length;
    const matchCount = parsedQaList.filter((q) => q.templateType === "matching_set").length;
    const nbCount = parsedQaList.filter((q) => q.templateType === "number_blank_deadline").length;
    const normDefCount = parsedQaList.filter((q) => q.templateType === "norm_definition" && q.questionType === "mcq").length;
    const termDefCount = parsedQaList.filter((q) => q.templateType === "term_definition" && q.questionType === "mcq").length;
    const standardMcqCount = normDefCount + termDefCount + nbCount;

    const needsReviewItems = parsedQaList.filter((q) => q.reviewStatus === "needs_review");
    const needsReviewCount = needsReviewItems.length;

    const distinctQuotes = new Set<string>();
    parsedQaList.forEach((q) => {
      if (q.sourceQuote && q.sourceQuote.trim()) {
        distinctQuotes.add(q.sourceQuote.trim().slice(0, 100));
      }
    });
    const distinctFactsCount = distinctQuotes.size;

    // Build Markdown Lines
    const md: string[] = [];

    // Header
    md.push("# Review Output: Question Import Modal Simulation");
    md.push("");
    md.push("## Build & Source Metadata");
    md.push(`- **Git Commit Hash**: \`${gitCommit}\``);
    md.push(`- **Git Branch**: \`${gitBranch}\``);
    md.push(`- **Source File**: \`${fixtureRelative}\``);
    md.push(`- **Total Items Generated**: **${totalItems}**`);
    md.push("");
    md.push("### Counts by Type");
    md.push(`- **Total MCQs**: **${mcqItems.length}**`);
    md.push(`  - Standard MCQs (Norm / Term / Deadline): **${standardMcqCount}** (Norm: ${normDefCount}, Term: ${termDefCount}, Deadline: ${nbCount})`);
    md.push(`  - True / False Items: **${tfCount}**`);
    md.push(`  - Negative Choice (\"Which is NOT\"): **${negCount}**`);
    md.push(`  - Matching Set Items: **${matchCount}**`);
    md.push(`- **Total Flashcards (Free Response)**: **${flashcardItems.length}**`);
    md.push(`- **Items Flagged \`needs_review\`**: **${needsReviewCount}**`);
    md.push(`- **Distinct Source Facts Used**: **${distinctFactsCount}**`);
    md.push("");
    md.push("---");
    md.push("");

    // Section for Every Item
    md.push("## Generated Items (In Order)");
    md.push("");

    parsedQaList.forEach((item, index) => {
      const itemNum = item.number || index + 1;
      const tType = item.templateType || (item.questionType === "free_response" ? "flashcard" : "mcq");
      const revStatus = item.reviewStatus || "unverified";
      const sPage = item.sourcePage || item.pageNumber || "?";
      const chapter = item.chapter || "N/A";

      md.push(`### Item #${itemNum} [${item.questionType === "mcq" ? "MCQ" : "Flashcard"}]`);
      md.push(`- **Template Type**: \`${tType}\``);
      md.push(`- **Review Status**: \`${revStatus}\``);
      md.push(`- **Source Page in PDF**: Page ${sPage}`);
      md.push(`- **Chapter / Section**: ${chapter}`);
      md.push("");
      md.push("**Stem (as displayed in Modal):**");
      md.push("```text");
      md.push(item.stem);
      md.push("```");
      md.push("");

      if (item.options && item.options.length > 0) {
        md.push("**Options:**");
        item.options.forEach((opt, optIdx) => {
          const letter = String.fromCharCode(65 + optIdx);
          const isCorrect = optIdx === item.correctIndex;
          const mark = isCorrect ? "  <-- [CORRECT ANSWER]" : "";
          md.push(`- **(${letter})** ${opt}${mark}`);
        });
        md.push("");
      }

      md.push(`**Explanation:**  \n${item.explanation || "None provided."}`);
      md.push("");

      md.push(`**Source Quote:**  \n> ${item.sourceQuote ? item.sourceQuote.replace(/\n/g, " ") : "*(None)*"}`);
      md.push("");

      const suspicious = item.suspiciousReasons || [];
      if (suspicious.length > 0) {
        md.push(`**Lint / Suspicious Reasons (${suspicious.length}):**`);
        suspicious.forEach((r) => md.push(`- ⚠️ ${r}`));
      } else {
        md.push("**Lint / Suspicious Reasons:** None (Clean)");
      }

      md.push("");
      md.push("---");
      md.push("");
    });

    // -------------------------------------------------------------
    // AUTOMATIC AUDIT CHECKS OVER REAL DATA
    // -------------------------------------------------------------
    md.push("## Automatic Quality Checks & Audit Summary");
    md.push("");

    // Check 1: Answer words or stems appearing in stem (Leaks)
    const leakFailures: { itemNum: number; violations: string[]; stemSnippet: string }[] = [];
    mcqItems.forEach((mcq) => {
      const leakRes = assertNoStemLeaksOrOptionClashes(mcq);
      if (!leakRes.passed) {
        leakFailures.push({
          itemNum: mcq.number,
          violations: leakRes.violations,
          stemSnippet: mcq.stem.slice(0, 70),
        });
      }
    });

    md.push("### Check 1: Stem Leaks & Option Clashes");
    if (leakFailures.length === 0) {
      md.push("✅ **PASSED**: 0 leaks detected across all generated MCQs. All correct answer terms and option-colliding numerals are safely masked in stems.");
    } else {
      md.push(`❌ **FAILED (${leakFailures.length} items flagged)**:`);
      leakFailures.forEach((f) => {
        md.push(`- **Item #${f.itemNum}**: "${f.stemSnippet}..."`);
        f.violations.forEach((v) => md.push(`  - Violation: ${v}`));
      });
    }
    md.push("");

    // Check 2: Option sets repeated across questions
    const optionSetMap = new Map<string, number[]>();
    mcqItems.forEach((mcq) => {
      const key = (mcq.options || [])
        .map((o) => o.trim().toLowerCase())
        .sort()
        .join(" | ");
      if (!optionSetMap.has(key)) {
        optionSetMap.set(key, []);
      }
      optionSetMap.get(key)!.push(mcq.number);
    });

    const repeatedOptionSets = Array.from(optionSetMap.entries()).filter(
      ([, nums]) => nums.length > 1
    );

    md.push("### Check 2: Repeated Option Sets Across Questions");
    if (repeatedOptionSets.length === 0) {
      md.push("✅ **PASSED**: No two questions share identical option sets.");
    } else {
      md.push(`ℹ️ **Found ${repeatedOptionSets.length} repeated option set groups** (analyzed below for validity):`);
      repeatedOptionSets.forEach(([opts, nums]) => {
        const sampleMcqs = mcqItems.filter((m) => nums.includes(m.number));
        const templates = Array.from(new Set(sampleMcqs.map((m) => m.templateType))).join(", ");
        const isExpected =
          templates === "true_false" ||
          templates === "matching_set" ||
          templates === "number_blank_deadline";

        const tag = isExpected ? "Expected Template Pattern" : "UNEXPECTED DUPLICATION";
        md.push(`- **Items #${nums.join(", #")}** [Template: \`${templates}\` — **${tag}**]:`);
        md.push(`  - Options: \`${opts}\``);
      });
    }
    md.push("");

    // Check 3: Items missing sourceQuote
    const missingQuotes: number[] = [];
    parsedQaList.forEach((item) => {
      if (!item.sourceQuote || item.sourceQuote.trim().length === 0) {
        missingQuotes.push(item.number);
      }
    });

    md.push("### Check 3: Items Missing sourceQuote");
    if (missingQuotes.length === 0) {
      md.push(`✅ **PASSED**: 0 items missing sourceQuote. All ${totalItems} generated items carry an authentic sourceQuote.`);
    } else {
      md.push(`❌ **FAILED (${missingQuotes.length} items)**:`);
      md.push(`- Items missing sourceQuote: #${missingQuotes.join(", #")}`);
    }
    md.push("");

    // Check 4: Stem fragments not substrings of source page text (Grounding)
    const groundingFailures: { itemNum: number; page: number; missing: string[] }[] = [];
    parsedQaList.forEach((item) => {
      const pageNum = item.sourcePage || item.pageNumber || 1;
      const pageText = pageTextMap.get(pageNum) || "";
      const gRes = assertStemGroundedInSourcePage(item, pageText);
      if (!gRes.grounded) {
        groundingFailures.push({
          itemNum: item.number,
          page: pageNum,
          missing: gRes.missingFragments,
        });
      }
    });

    md.push("### Check 4: Source Page Grounding Verification");
    if (groundingFailures.length === 0) {
      md.push(`✅ **PASSED**: 100% of generated items are strictly grounded. Every quoted fragment (and unquoted sourceQuote) exists as an exact substring on its declared source page.`);
    } else {
      md.push(`❌ **FAILED (${groundingFailures.length} items)**:`);
      groundingFailures.forEach((gf) => {
        md.push(`- **Item #${gf.itemNum}** (Source Page ${gf.page}):`);
        gf.missing.forEach((m) => md.push(`  - Missing fragment: "${m}"`));
      });
    }
    md.push("");

    // Check 5: Cross-Template Enemy Items & Exam Assembly Conflicts
    const { selected: assembledExamItems, rejected: examDroppedItems } = filterEnemyItems(mcqItems, 20);

    md.push("### Check 5: Cross-Template Enemy Items & Exam Assembly Conflicts");
    if (examDroppedItems.length === 0) {
      md.push("✅ **PASSED**: 0 enemy items detected. All items can be assembled into an exam without conflict.");
    } else {
      md.push(`ℹ️ **Exam Assembly dropped ${examDroppedItems.length} candidate items from this output** (conflict with earlier selected items):`);
      examDroppedItems.forEach((rej) => {
        md.push(`- **Item #${rej.item.number}** [Template: \`${rej.item.templateType}\`]:`);
        md.push(`  - Reason: ${rej.reason}`);
      });
      md.push("");
      md.push(`- **Items Assembled for Exam (${assembledExamItems.length} items)**: #${assembledExamItems.map((it) => it.number).join(", #")}`);
      md.push(`- **Items Dropped at Exam Assembly (${examDroppedItems.length} items)**: #${examDroppedItems.map((it) => it.item.number).join(", #")}`);
    }
    md.push("");

    // Summary of items still needing review / failing
    md.push("### Audit Summary: Items Flagged for Review");
    if (needsReviewCount === 0) {
      md.push("✅ **0 items flagged needs_review**. All items verified.");
    } else {
      md.push(`The following **${needsReviewCount} item(s)** are flagged \`needs_review\`:`);
      needsReviewItems.forEach((it) => {
        md.push(`- **Item #${it.number}** [${it.templateType}]:`);
        (it.suspiciousReasons || []).forEach((r) => md.push(`  - ⚠️ ${r}`));
      });
    }
    md.push("");

    // Write output to scratch/review_output.md
    const outPath = path.resolve(__dirname, "../scratch/review_output.md");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, md.join("\n"), "utf-8");

    // Print summary to terminal
    console.log("\n=======================================================");
    console.log("REVIEW OUTPUT GENERATION COMPLETE");
    console.log("=======================================================");
    console.log(`File Path: ${outPath}`);
    console.log(`Git Commit: ${gitCommit} (${gitBranch})`);
    console.log(`Total Items: ${totalItems}`);
    console.log(`  - MCQs: ${mcqItems.length} (Standard: ${standardMcqCount}, T/F: ${tfCount}, NOT: ${negCount}, Matching: ${matchCount})`);
    console.log(`  - Flashcards: ${flashcardItems.length}`);
    console.log(`  - Needs Review: ${needsReviewCount}`);
    console.log(`  - Distinct Source Facts: ${distinctFactsCount}`);
    console.log("Audit Checks:");
    console.log(`  - Check 1 (Stem Leaks): ${leakFailures.length === 0 ? "PASSED (0 leaks)" : `FAILED (${leakFailures.length})`}`);
    console.log(`  - Check 2 (Option Sets): ${repeatedOptionSets.length} groups found (T/F, matching sets, deadline numbers)`);
    console.log(`  - Check 3 (Missing Quotes): ${missingQuotes.length === 0 ? "PASSED (0 missing)" : `FAILED (${missingQuotes.length})`}`);
    console.log(`  - Check 4 (Grounding): ${groundingFailures.length === 0 ? "PASSED (100% grounded)" : `FAILED (${groundingFailures.length})`}`);
    console.log("=======================================================\n");
  });
});
