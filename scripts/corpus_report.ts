import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { extractAllPagesWithLayout, PdfPageWithLayout } from "../src/services/pdfService";
import {
  parseTwoPassQuestionsAndAnswersDetailed,
  detectParserProfile,
  ParsedQaItem,
} from "../src/services/pdfQuestionImporter";

// Directory setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const reportsDir = path.resolve(projectRoot, "reports");
const sidecarsDir = path.resolve(projectRoot, "sidecars");

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// CLI Argument parsing
const args = process.argv.slice(2);
let corpusRoot = "C:\\Users\\netne\\Documents\\CSC REVIEWER 2027\\📝 2027 CSE Reviewer";
let onlyFilter: string | null = null;
let excludeFilter: string | null = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--only" && args[i + 1]) {
    onlyFilter = args[++i].toLowerCase();
  } else if (args[i] === "--exclude" && args[i + 1]) {
    excludeFilter = args[++i].toLowerCase();
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
  expectedKind: "keyed_mcq" | "lesson_notes" | "figure_based" | "non_question";
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

function getExpectedKind(folderPath: string): ManifestRule["expectedKind"] {
  for (const rule of manifestRules) {
    if (folderPath.toLowerCase().includes(rule.folderSubstring.toLowerCase())) {
      return rule.expectedKind;
    }
  }
  return "keyed_mcq"; // default expectation
}

// Sidecar types
interface SidecarExpectation {
  questionCount?: number;
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
  hasTextLayer: boolean;
  detectedProfile: string;
  profileConfidence: number;
  questionsFound: number;
  gradedCount: number;
  promptsCards: number;
  needsReview: number;
  missingNumbers: string;
  answerDistribution: string;
  longestStem: string;
  expectedKind: string;
  status: "PASS" | "FAIL";
  statusReason?: string;
  error?: string;
  elapsedMs: number;
}

async function processSinglePdf(pdfPath: string): Promise<CorpusReportRow> {
  const startTime = Date.now();
  const fileName = path.basename(pdfPath);
  const relFolder = path.relative(corpusRoot, path.dirname(pdfPath)) || ".";
  const expectedKind = getExpectedKind(relFolder);
  const sidecar = loadSidecar(pdfPath, fileName);

  let pages: PdfPageWithLayout[] = [];
  let pageCount = 0;
  let hasTextLayer = false;
  let detectedProfile = "None";
  let profileConfidence = 0;
  let questionsFound = 0;
  let gradedCount = 0;
  let promptsCards = 0;
  let needsReview = 0;
  let missingNumbers = "0";
  let answerDistribution = "-";
  let longestStem = "-";
  let errorMsg = "-";
  let status: "PASS" | "FAIL" = "PASS";
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

    // Check for text layer
    const totalChars = pages.reduce((acc, p) => acc + (p.text?.length || 0), 0);
    hasTextLayer = totalChars > 50;

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
          (it) => it.questionType !== "prompt" && it.questionType !== "flashcard" && it.correctIndex >= 0 && !it.hasIncompleteAnswer
        ).length;

      promptsCards =
        (result.promptCount || 0) +
        (result.flashcardCount || 0) ||
        result.items.filter((it) => it.questionType === "prompt" || it.questionType === "flashcard").length;

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

      // Longest Stem
      const stems = result.items.map((it) => (it.stem || "").length);
      const maxStem = stems.length > 0 ? Math.max(...stems) : 0;
      longestStem = maxStem > 0 ? `${maxStem} chars` : "-";

      // Validation logic:
      if (sidecar) {
        // Compare against sidecar
        if (typeof sidecar.questionCount === "number") {
          const expectedQ = sidecar.questionCount;
          // If expected 0, gradedCount must be 0
          if (expectedQ === 0 && gradedCount !== 0) {
            status = "FAIL";
            statusReason = `Expected 0 graded Qs but found ${gradedCount}`;
          } else if (expectedQ > 0 && gradedCount !== expectedQ && questionsFound !== expectedQ) {
            status = "FAIL";
            statusReason = `Expected ${expectedQ} questions but found ${gradedCount} graded (${questionsFound} total)`;
          }
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
        if (expectedKind === "non_question" && gradedCount > 0) {
          status = "FAIL";
          statusReason = `non_question file produced ${gradedCount} graded questions`;
        } else if (expectedKind === "figure_based") {
          const unverified = result.items.filter(
            (it) => it.questionType !== "prompt" && (it.reviewStatus === "needs_review" || !it.correctLetter)
          );
          if (unverified.length > 0) {
            status = "FAIL";
            statusReason = `figure_based file has ${unverified.length} unverified question keys`;
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
        status = "FAIL";
        statusReason = `Scanned PDF (No text layer) in keyed_mcq folder`;
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
    hasTextLayer,
    detectedProfile,
    profileConfidence,
    questionsFound,
    gradedCount,
    promptsCards,
    needsReview,
    missingNumbers,
    answerDistribution,
    longestStem,
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

  const rows: CorpusReportRow[] = [];
  let index = 0;

  for (const pdfPath of targetPdfs) {
    index++;
    const relName = path.relative(corpusRoot, pdfPath);
    process.stdout.write(`[${index}/${targetPdfs.length}] Scanning "${relName}"... `);

    const row = await processSinglePdf(pdfPath);
    rows.push(row);

    const badge = row.status === "PASS" ? "✅ PASS" : "❌ FAIL";
    console.log(`${badge} (${row.pages} pages, ${row.questionsFound} Qs, ${row.elapsedMs}ms)${row.statusReason ? ` - ${row.statusReason}` : ""}`);
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
  const failCount = rows.filter((r) => r.status === "FAIL").length;
  mdLines.push(`- **Overall Pass Rate**: ${passCount} / ${rows.length} (${Math.round((passCount / rows.length) * 100) || 0}%)`);
  mdLines.push(`- **Passes**: ${passCount}`);
  mdLines.push(`- **Failures / Flaws**: ${failCount}\n`);

  mdLines.push("## Summary Table\n");
  mdLines.push(
    "| # | Folder | File | Pgs | Text Layer | Detected Profile | Found | Graded | Cards/Prompts | Needs Rev | Missing #s | Dist | Longest Stem | Status | Notes / Errors |"
  );
  mdLines.push(
    "|---|---|---|---|:---:|---|:---:|:---:|:---:|:---:|:---:|---|:---:|:---:|---|"
  );

  rows.forEach((r, idx) => {
    const textLayerBadge = r.hasTextLayer ? "Yes" : "**No**";
    const profileCell = `${r.detectedProfile}${r.profileConfidence > 0 ? ` (${r.profileConfidence}%)` : ""}`;
    const statusCell = r.status === "PASS" ? "✅ PASS" : "❌ FAIL";
    const noteCell = r.statusReason || r.error || "-";
    mdLines.push(
      `| ${idx + 1} | ${r.folder} | ${r.file} | ${r.pages} | ${textLayerBadge} | ${profileCell} | ${r.questionsFound} | ${r.gradedCount} | ${r.promptsCards} | ${r.needsReview} | ${r.missingNumbers} | ${r.answerDistribution} | ${r.longestStem} | ${statusCell} | ${noteCell} |`
    );
  });

  const mdReportPath = path.resolve(reportsDir, "corpus_report.md");
  fs.writeFileSync(mdReportPath, mdLines.join("\n"), "utf-8");
  console.log(`Written Markdown report: ${mdReportPath}\n`);

  // Print full table to stdout
  console.log("\n" + mdLines.join("\n"));
}

main().catch((err) => {
  console.error("Fatal error running corpus report:", err);
  process.exit(1);
});
