import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { extractAllPagesWithLayout, PdfPageWithLayout } from "../src/services/pdfService";
import {
  parseTwoPassQuestionsAndAnswersDetailed,
  detectParserProfile,
  ParsedQaItem,
  toFlashcards,
} from "../src/services/pdfQuestionImporter";
import { recommendStudyOutput, StudyOutputRoute } from "../src/services/studyOutputPolicy";

// Directory setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const reportsDir = path.resolve(projectRoot, "reports");
const sidecarsDir = path.resolve(projectRoot, "sidecars");
const frozenHeldoutFiles = new Set([
  "Express Review Guides - Vocabulary.pdf",
  "Vocabulary for Civil Service Exam.pdf",
  "Newton P., Bristoll H. - Complete Set of Practice Tests for Numerical Reasoning.pdf",
  "English Verb Drills.pdf",
]);

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// CLI Argument parsing
const args = process.argv.slice(2);
let corpusRoot =
  process.env.CORPUS_ROOT ||
  "C:\\Users\\netne\\Documents\\CSC REVIEWER 2027\\📝 2027 CSE Reviewer";
let onlyFilter: string | null = null;
let excludeFilter: string | null = null;
let freshRun = process.env.CORPUS_FRESH === "1";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--only" && args[i + 1]) {
    onlyFilter = args[++i].toLowerCase();
  } else if (args[i] === "--exclude" && args[i + 1]) {
    excludeFilter = args[++i].toLowerCase();
  } else if (args[i] === "--fresh") {
    freshRun = true;
  } else if (!args[i].startsWith("--")) {
    corpusRoot = args[i];
  }
}

// Timeout utility
function withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(msg)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// Load manifest
interface ManifestRule {
  folderSubstring: string;
  expectedKind: "keyed_mcq" | "lesson_notes" | "figure_based" | "non_question" | "mixed_practice" | "free_response_practice";
}

function loadManifest(): ManifestRule[] {
  const manifestPath = path.resolve(projectRoot, "corpus_manifest.csv");
  if (!fs.existsSync(manifestPath)) return [];
  const lines = fs.readFileSync(manifestPath, "utf-8").split("\n");
  const rules: ManifestRule[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("folder_substring")) continue;
    const parts = trimmed.split(",");
    if (parts.length >= 2) {
      rules.push({
        folderSubstring: parts[0].trim(),
        expectedKind: parts[1].trim() as any,
      });
    }
  }
  return rules;
}

const manifestRules = loadManifest();

function getExpectedKind(folderPath: string, fileName: string = ""): ManifestRule["expectedKind"] {
  const combined = `${folderPath}/${fileName}`.toLowerCase();
  for (const rule of manifestRules) {
    if (combined.includes(rule.folderSubstring.toLowerCase())) {
      return rule.expectedKind;
    }
  }
  return "keyed_mcq"; // default expectation
}

// Sidecar types
interface SidecarExpectation {
  questionCount?: number;
  cardCount?: number;
  sourceGap?: string;
  missingNumbers?: number[];
  spotChecks?: Array<{ n: number; key: string }>;
}

function loadSidecar(pdfPath: string, fileName: string): SidecarExpectation | null {
  const baseName = fileName.replace(/\.pdf$/i, "");
  const candidates = [
    path.resolve(sidecarsDir, `${fileName}.expected.json`),
    path.resolve(sidecarsDir, `${baseName}.expected.json`),
    path.resolve(path.dirname(pdfPath), `${fileName}.expected.json`),
    path.resolve(path.dirname(pdfPath), `${baseName}.expected.json`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        return JSON.parse(fs.readFileSync(c, "utf-8"));
      } catch (e) {
        console.warn(`Failed reading sidecar ${c}:`, e);
      }
    }
  }
  return null;
}

// Recursive PDF search
function findPdfsRecursively(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findPdfsRecursively(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
      results.push(fullPath);
    }
  }
  return results;
}

// Report Row Data Structure
export interface CorpusReportRow {
  folder: string;
  file: string;
  pages: number;
  textPages: string; // e.g. "120/121"
  hasTextLayer: boolean;
  detectedProfile: string;
  profileConfidence: number;
  questionsFound: number;
  gradedCount: number;
  verifiedQuestionCount?: number;
  verifiedCardCount?: number;
  recommendedOutput?: StudyOutputRoute;
  promptsCards: number;
  needsReview: number;
  missingNumbers: string;
  answerDistribution: string;
  longestStem: string;
  droppedOversizedStems: number;
  expectedKind: string;
  status: "PASS" | "WARN" | "FAIL" | "UNVERIFIED";
  statusReason?: string;
  error?: string;
  elapsedMs: number;
}

async function processSinglePdf(pdfPath: string): Promise<CorpusReportRow> {
  const startTime = Date.now();
  const fileName = path.basename(pdfPath);
  const relFolder = path.relative(corpusRoot, path.dirname(pdfPath)) || ".";
  const expectedKind = getExpectedKind(relFolder, fileName);
  const sidecar = loadSidecar(pdfPath, fileName);

  let pages: PdfPageWithLayout[] = [];
  let pageCount = 0;
  let textPages = "0/0";
  let hasTextLayer = false;
  let detectedProfile = "None";
  let profileConfidence = 0;
  let questionsFound = 0;
  let gradedCount = 0;
  let verifiedQuestionCount = 0;
  let verifiedCardCount = 0;
  let promptsCards = 0;
  let needsReview = 0;
  let missingNumbers = "0";
  let answerDistribution = "-";
  let longestStem = "-";
  let droppedOversizedStems = 0;
  let errorMsg = "-";
  let status: "PASS" | "WARN" | "FAIL" | "UNVERIFIED" = "PASS";
  let statusReason = "";

  try {
    const buffer = fs.readFileSync(pdfPath);

    // Run extraction with 60s per-file timeout
    const layout = await withTimeout(
      extractAllPagesWithLayout(buffer),
      60000,
      "Timeout (60s exceeded during text extraction)"
    );

    pages = layout.pages;
    pageCount = layout.pageCount;

    // Per-page text layer count
    const pagesWithText = pages.filter((p) => (p.text?.trim()?.length || 0) > 20).length;
    textPages = `${pagesWithText}/${pageCount}`;
    hasTextLayer = pagesWithText > 0;

    if (hasTextLayer) {
      // Profile Detection
      const detection = detectParserProfile(pages);
      detectedProfile = detection.profile.name;
      profileConfidence = detection.confidence;

      // Importer run
      const result = await withTimeout(
        Promise.resolve(parseTwoPassQuestionsAndAnswersDetailed(pages, { profile: detection.profile })),
        60000,
        "Timeout (60s exceeded during parsing)"
      );

      questionsFound = result.items.length;
      gradedCount =
        result.gradableCount ??
        result.items.filter(
          (it) => it.questionType !== "prompt" && it.correctIndex >= 0 && !it.hasIncompleteAnswer
        ).length;
      verifiedQuestionCount = result.items.filter((item) =>
        item.reviewStatus === "verified" && item.questionType !== "prompt" &&
        item.questionType !== "figure_based" && !item.hasIncompleteAnswer &&
        item.correctIndex >= 0 && item.correctIndex < item.options.length
      ).length;
      verifiedCardCount = toFlashcards(result.items).length;

      promptsCards =
        (result.promptCount || 0) +
        (result.flashcardCount || 0) ||
        result.items.filter((it) => it.questionType === "prompt").length;

      needsReview =
        result.suspiciousCount ??
        result.items.filter((it) => it.reviewStatus === "needs_review" || it.isSuspicious).length;

      // Missing Question Numbers
      if (!result.missingQuestionNumbers || result.missingQuestionNumbers.length === 0) {
        missingNumbers = "0";
      } else if (result.missingQuestionNumbers.length <= 6) {
        missingNumbers = result.missingQuestionNumbers.join(", ");
      } else {
        missingNumbers = `${result.missingQuestionNumbers.length} missing (${result.missingQuestionNumbers.slice(0, 4).join(", ")}...)`;
      }

      // Answer Letter Distribution
      const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
      let totalLettered = 0;
      for (const it of result.items) {
        if (it.correctLetter && dist[it.correctLetter.toUpperCase()] !== undefined) {
          dist[it.correctLetter.toUpperCase()]++;
          totalLettered++;
        }
      }
      if (totalLettered > 0) {
        answerDistribution = `A:${dist.A} B:${dist.B} C:${dist.C} D:${dist.D}${dist.E > 0 ? ` E:${dist.E}` : ""}`;
      } else {
        answerDistribution = "-";
      }

      // Longest Graded Stem (Condition 5)
      const gradedStems = result.items
        .filter((it) => it.questionType !== "prompt" && it.correctIndex >= 0)
        .map((it) => (it.stem || "").length);
      const maxGradedStem = gradedStems.length > 0 ? Math.max(...gradedStems) : 0;
      longestStem = maxGradedStem > 0 ? `${maxGradedStem} chars` : "-";
      droppedOversizedStems = result.droppedOversizedStemCount || 0;

      // Check for key skew warning in items
      const hasSkewWarning = result.items.some((it) =>
        (it.suspiciousReasons || []).some((r) => r.includes("Answer keys look unreliable"))
      );

      // Validation logic:
      if (sidecar) {
        // Compare against sidecar
        if (typeof sidecar.questionCount === "number") {
          const expectedQ = sidecar.questionCount;
          if (expectedQ === 0 && gradedCount !== 0) {
            status = "FAIL";
            statusReason = `Expected 0 graded Qs but found ${gradedCount}`;
          } else if (expectedQ > 0 && gradedCount !== expectedQ && questionsFound + droppedOversizedStems !== expectedQ) {
            status = "FAIL";
            statusReason = `Expected ${expectedQ} questions but found ${gradedCount} graded (${questionsFound} total)`;
          }
        }

        if (status === "PASS" && typeof sidecar.cardCount === "number") {
          if (sidecar.sourceGap && promptsCards !== sidecar.cardCount) {
            status = "FAIL";
            statusReason = `Expected exactly ${sidecar.cardCount} prompts, got ${promptsCards}`;
          } else if (promptsCards < sidecar.cardCount) {
            status = "WARN";
            statusReason = `Expected ${sidecar.cardCount} cards, got ${promptsCards}`;
          }
        }

        if (status === "PASS" && sidecar.missingNumbers &&
          JSON.stringify(result.missingQuestionNumbers || []) !== JSON.stringify(sidecar.missingNumbers)) {
          status = "FAIL";
          statusReason = `Source numbering gap differs from sidecar: expected ${sidecar.sourceGap || sidecar.missingNumbers.join(",")}`;
        }

        if (status === "PASS" && sidecar.spotChecks && sidecar.spotChecks.length > 0) {
          for (const check of sidecar.spotChecks) {
            const match = result.items.find((it) => it.number === check.n);
            if (!match) {
              status = "FAIL";
              statusReason = `Spot-check Q#${check.n} missing`;
              break;
            }
            if (check.key !== "free_response") {
              const actualKey = (match.correctLetter || "").toLowerCase();
              if (actualKey !== check.key.toLowerCase()) {
                status = "FAIL";
                statusReason = `Spot-check Q#${check.n} key mismatch: expected "${check.key}", got "${actualKey}"`;
                break;
              }
            }
          }
        }
      } else {
        // Validation without sidecar
        if (expectedKind === "non_question") {
          if (gradedCount > 0) {
            status = "FAIL";
            statusReason = `non_question file produced ${gradedCount} graded questions`;
          } else {
            status = "PASS";
          }
        } else if (expectedKind === "figure_based") {
          const unverified = result.items.filter(
            (it) => it.questionType !== "prompt" && (it.reviewStatus === "needs_review" || !it.correctLetter)
          );
          if (unverified.length > 0) {
            status = "FAIL";
            statusReason = `figure_based file has ${unverified.length} unverified question keys`;
          } else {
            status = "PASS";
          }
        } else if (expectedKind === "lesson_notes") {
          if (gradedCount > 0) {
            status = "WARN";
            statusReason = `lesson_notes produced ${gradedCount} graded items (expected notes/cards only)`;
          } else {
            status = "PASS";
          }
        } else if (expectedKind === "mixed_practice" || expectedKind === "free_response_practice") {
          status = questionsFound > 0 ? "PASS" : "WARN";
          if (status === "WARN") statusReason = `Expected practice items, found none`;
        } else {
          // keyed_mcq
          if (hasSkewWarning) {
            status = "WARN";
            statusReason = "Answer keys look unreliable (>60% single choice, demoted to prompts)";
          } else if (gradedCount === 0 && questionsFound > 0) {
            status = "WARN";
            statusReason = `All ${questionsFound} items parsed as prompts/ungradable`;
          } else if (missingNumbers !== "0") {
            status = "WARN";
            statusReason = `Sequence gap: ${missingNumbers}`;
          } else {
            status = "PASS";
          }
        }
      }
    } else {
      // Scanned PDF (No text layer)
      detectedProfile = "Scanned / No Text";
      profileConfidence = 0;
      if (sidecar && (sidecar.questionCount ?? 0) > 0) {
        status = "FAIL";
        statusReason = `Sidecar expected ${sidecar.questionCount} questions, but PDF has no text layer (scanned)`;
      } else if (expectedKind === "keyed_mcq") {
        status = "UNVERIFIED";
        statusReason = `Scanned PDF (${textPages} pages with text layer) in keyed_mcq folder`;
      } else {
        status = "PASS";
      }
    }
  } catch (err: any) {
    errorMsg = err.message || String(err);
    status = "FAIL";
    statusReason = errorMsg;
  }

  const elapsedMs = Date.now() - startTime;

  return {
    folder: relFolder,
    file: fileName,
    pages: pageCount,
    textPages,
    hasTextLayer,
    detectedProfile,
    profileConfidence,
    questionsFound,
    gradedCount,
    verifiedQuestionCount,
    verifiedCardCount,
    recommendedOutput: recommendStudyOutput({
      hasReadableText: hasTextLayer,
      isReferenceOnly: expectedKind === "non_question",
      verifiedQuestions: verifiedQuestionCount,
      verifiedCards: verifiedCardCount,
      ungradedPrompts: promptsCards,
    }),
    promptsCards,
    needsReview,
    missingNumbers,
    answerDistribution,
    longestStem,
    droppedOversizedStems,
    expectedKind,
    status,
    statusReason: statusReason || undefined,
    error: errorMsg !== "-" ? errorMsg : undefined,
    elapsedMs,
  };
}

async function main() {
  console.log("================================================================================");
  console.log("  ResearchMate Corpus Importer Audit & Generalization Scanner");
  console.log(`  Corpus Root: ${corpusRoot}`);
  if (onlyFilter) console.log(`  --only filter: "${onlyFilter}"`);
  if (excludeFilter) console.log(`  --exclude filter: "${excludeFilter}"`);
  console.log("================================================================================\n");

  const allPdfs = findPdfsRecursively(corpusRoot);
  const targetPdfs = allPdfs.filter((p) => {
    const rel = path.relative(corpusRoot, p).toLowerCase();
    if (onlyFilter && !rel.includes(onlyFilter)) return false;
    if (excludeFilter && rel.includes(excludeFilter)) return false;
    return true;
  });

  console.log(`Found ${allPdfs.length} total PDFs in corpus (${targetPdfs.length} matched active filters).\n`);

  // Resumable JSONL
  const jsonlPath = path.resolve(reportsDir, "corpus_report.jsonl");
  const completedRows = new Map<string, CorpusReportRow>();

  // Frozen held-outs are counts-only. Reuse prior report rows even on a fresh scan.
  const priorReportPath = path.resolve(reportsDir, "corpus_report.json");
  const frozenRows = new Map<string, CorpusReportRow>();
  if (fs.existsSync(priorReportPath)) {
    const priorRows = JSON.parse(fs.readFileSync(priorReportPath, "utf-8")) as CorpusReportRow[];
    for (const row of priorRows) {
      if (frozenHeldoutFiles.has(row.file)) frozenRows.set(path.join(row.folder, row.file), row);
    }
  }

  if (!freshRun && fs.existsSync(jsonlPath)) {
    const lines = fs.readFileSync(jsonlPath, "utf-8").split("\n");
    for (const line of lines) {
      if (line.trim()) {
        try {
          const row: CorpusReportRow = JSON.parse(line);
          const key = path.join(row.folder, row.file);
          completedRows.set(key, row);
        } catch (e) {}
      }
    }
    console.log(`Resuming: loaded ${completedRows.size} previously scanned results from corpus_report.jsonl\n`);
  } else if (freshRun && fs.existsSync(jsonlPath)) {
    fs.unlinkSync(jsonlPath);
  }

  const rows: CorpusReportRow[] = [];
  let index = 0;

  for (const pdfPath of targetPdfs) {
    index++;
    const fileName = path.basename(pdfPath);
    const relFolder = path.relative(corpusRoot, path.dirname(pdfPath)) || ".";
    const fileKey = path.join(relFolder, fileName);

    if (frozenHeldoutFiles.has(fileName)) {
      const frozenRow = frozenRows.get(fileKey) || completedRows.get(fileKey);
      if (!frozenRow) throw new Error(`Frozen held-out counts are unavailable for ${fileName}; refusing to open its PDF`);
      rows.push(frozenRow);
      console.log(`[${index}/${targetPdfs.length}] Frozen counts only "${fileKey}" -> ${frozenRow.status}`);
      continue;
    }

    if (completedRows.has(fileKey)) {
      const existing = completedRows.get(fileKey)!;
      rows.push(existing);
      console.log(`[${index}/${targetPdfs.length}] Cached "${fileKey}" -> ${existing.status}`);
      continue;
    }

    process.stdout.write(`[${index}/${targetPdfs.length}] Scanning "${fileKey}"... `);

    const row = await processSinglePdf(pdfPath);
    rows.push(row);

    // Append to JSONL immediately
    fs.appendFileSync(jsonlPath, JSON.stringify(row) + "\n", "utf-8");

    const badge =
      row.status === "PASS"
        ? "✅ PASS"
        : row.status === "WARN"
        ? "⚠️ WARN"
        : row.status === "UNVERIFIED"
        ? "❓ UNVERIFIED"
        : "❌ FAIL";
    console.log(`${badge} (${row.textPages} text pgs, ${row.questionsFound} Qs, ${row.elapsedMs}ms)${row.statusReason ? ` - ${row.statusReason}` : ""}`);
  }

  // Generate Reports
  const jsonReportPath = path.resolve(reportsDir, "corpus_report.json");
  fs.writeFileSync(jsonReportPath, JSON.stringify(rows, null, 2), "utf-8");
  console.log(`\nWritten JSON report: ${jsonReportPath}`);

  // Generate Markdown Report
  const mdLines: string[] = [];
  mdLines.push("# ResearchMate Corpus Importer Generalization Report\n");
  mdLines.push(`- **Scan Date**: ${new Date().toISOString()}`);
  mdLines.push(`- **Corpus Root**: \`${corpusRoot}\``);
  mdLines.push(`- **Total Files Scanned**: ${rows.length}`);
  const passCount = rows.filter((r) => r.status === "PASS").length;
  const warnCount = rows.filter((r) => r.status === "WARN").length;
  const unverCount = rows.filter((r) => r.status === "UNVERIFIED").length;
  const failCount = rows.filter((r) => r.status === "FAIL").length;
  mdLines.push(`- **Overall Pass Rate**: ${passCount} / ${rows.length} (${Math.round((passCount / rows.length) * 100) || 0}%)`);
  mdLines.push(`- **✅ PASS**: ${passCount}`);
  mdLines.push(`- **⚠️ WARN**: ${warnCount}`);
  mdLines.push(`- **❓ UNVERIFIED**: ${unverCount}`);
  mdLines.push(`- **❌ FAIL**: ${failCount}\n`);
  mdLines.push(`- **Output routing**: ${Array.from(new Set(rows.map((row) => row.recommendedOutput).filter(Boolean))).map((route) => `${route}: ${rows.filter((row) => row.recommendedOutput === route).length}`).join(", ")} (frozen held-outs: cached counts only)\n`);

  mdLines.push("## Summary Table\n");
  mdLines.push(
    "| # | Folder | File | Pgs | Text Pgs | Detected Profile | Found | Graded | Verified Questions | Verified Card Candidates | Recommended Output | Cards/Prompts | Needs Rev | Missing #s | Dist | Longest Graded Stem | Dropped Long Stems | Status | Notes / Errors |"
  );
  mdLines.push(
    "|---|---|---|---|:---:|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|---|:---:|---|:---:|:---:|:---:|---|"
  );

  rows.forEach((r, idx) => {
    const profileCell = `${r.detectedProfile}${r.profileConfidence > 0 ? ` (${r.profileConfidence}%)` : ""}`;
    const statusBadge =
      r.status === "PASS"
        ? "✅ PASS"
        : r.status === "WARN"
        ? "⚠️ WARN"
        : r.status === "UNVERIFIED"
        ? "❓ UNVERIFIED"
        : "❌ FAIL";
    const noteCell = r.statusReason || r.error || "-";
    mdLines.push(
      `| ${idx + 1} | ${r.folder} | ${r.file} | ${r.pages} | ${r.textPages} | ${profileCell} | ${r.questionsFound} | ${r.gradedCount} | ${r.verifiedQuestionCount ?? "-"} | ${r.verifiedCardCount ?? "-"} | ${r.recommendedOutput ?? "heldout_counts_only"} | ${r.promptsCards} | ${r.needsReview} | ${r.missingNumbers} | ${r.answerDistribution} | ${r.longestStem} | ${r.droppedOversizedStems} | ${statusBadge} | ${noteCell} |`
    );
  });

  const mdReportPath = path.resolve(reportsDir, "corpus_report.md");
  fs.writeFileSync(mdReportPath, mdLines.join("\n"), "utf-8");
  console.log(`Written Markdown report: ${mdReportPath}\n`);

  // Print full table to stdout
  console.log("\n" + mdLines.join("\n"));
}

export { main as runCorpusScan };

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error("Fatal error running corpus report:", err);
    process.exit(1);
  });
}
