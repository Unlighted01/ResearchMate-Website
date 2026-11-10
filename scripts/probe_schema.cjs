// ============================================
// PROBE SCHEMA - Schema & RLS Probe Script
// 1. Column Probe: Queries PostgREST /rest/v1/<table_name>?select=<column>&limit=1
// 2. Canary Write Test: Performs real INSERT + immediate DELETE on exams, exam_attempts,
//    and flashcard_decks to verify RLS policies, column types, and foreign key rules.
// ============================================

require('dotenv').config();
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const testUserEmail = process.env.PROBE_TEST_USER_EMAIL;
const testUserPassword = process.env.PROBE_TEST_USER_PASSWORD;
const probeToken = process.env.PROBE_BEARER_TOKEN;

if (!supabaseUrl || !anonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const tablesToProbe = {
  exams: [
    "id",
    "user_id",
    "title",
    "description",
    "source_item_ids",
    "config",
    "questions",
    "version",
    "visibility",
    "created_at",
    "updated_at",
    "seed",
    "source_document_title"
  ],
  exam_attempts: [
    "id",
    "exam_id",
    "user_id",
    "score",
    "total",
    "percentage",
    "answers",
    "questions_snapshot",
    "duration_seconds",
    "passed",
    "created_at"
  ],
  flashcard_decks: [
    "id",
    "user_id",
    "title",
    "description",
    "source_item_ids",
    "cards",
    "version",
    "visibility",
    "created_at",
    "updated_at",
    "source_document_title"
  ],
  items: [
    "id",
    "user_id",
    "text",
    "tags",
    "note",
    "source_url",
    "source_title",
    "ai_summary",
    "preferred_view",
    "device_source",
    "collection_id",
    "citation",
    "citation_format",
    "image_url",
    "ocr_text",
    "ocr_confidence",
    "created_at",
    "updated_at"
  ],
  question_bank: [
    "id",
    "user_id",
    "stem",
    "options",
    "correct_index"
  ],
  question_bank_batches: [
    "id",
    "user_id",
    "subject"
  ]
};

function requestHttp(method, endpointPath, headers = {}, body = null) {
  return new Promise((resolve) => {
    const url = new URL(`${supabaseUrl}${endpointPath}`);
    const client = url.protocol === "https:" ? https : http;
    const bodyStr = body ? JSON.stringify(body) : null;

    const reqHeaders = {
      "apikey": anonKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...headers,
    };
    if (bodyStr) {
      reqHeaders["Content-Length"] = Buffer.byteLength(bodyStr);
    }

    const req = client.request(url, { method, headers: reqHeaders }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch {}
        resolve({
          status: res.statusCode,
          data: parsed,
          raw: data,
        });
      });
    });

    req.on("error", (err) => {
      resolve({ status: 0, error: err.message, data: null });
    });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function probeColumn(table, column, token = anonKey) {
  return requestHttp("GET", `/rest/v1/${table}?select=${column}&limit=1`, {
    "Authorization": `Bearer ${token}`
  }).then(res => ({
    table,
    column,
    status: res.status,
    error: res.status !== 200 ? (res.data?.message || res.raw) : null
  }));
}

async function authenticateTestUser() {
  if (probeToken) {
    console.log("Using pre-configured PROBE_BEARER_TOKEN for authenticated RLS write checks.");
    return { token: probeToken, userId: null };
  }

  if (testUserEmail && testUserPassword) {
    console.log(`Authenticating test user '${testUserEmail}' via Supabase Auth API...`);
    const res = await requestHttp("POST", "/auth/v1/token?grant_type=password", {}, {
      email: testUserEmail,
      password: testUserPassword
    });

    if (res.status === 200 && res.data?.access_token) {
      console.log(`Authentication successful. User ID: ${res.data.user?.id}`);
      return { token: res.data.access_token, userId: res.data.user?.id };
    } else {
      console.warn(`Test user authentication failed (${res.status}):`, res.data?.error_description || res.data?.message || res.raw);
    }
  }

  return null;
}

async function runCanaryWriteTests(authInfo) {
  console.log("\n--- Phase 2: Canary Write Tests (INSERT + immediate DELETE) ---");
  const writeResults = {};
  const token = authInfo?.token || anonKey;
  const isUserAuthenticated = Boolean(authInfo?.userId);
  const probeUserId = authInfo?.userId || crypto.randomUUID();

  // 1. Canary row for exams
  const canaryExamId = crypto.randomUUID();
  const examPayload = {
    id: canaryExamId,
    user_id: probeUserId,
    title: "__canary_probe_exam__",
    description: "Automated probe row - safe to delete",
    source_item_ids: [],
    config: { difficulty: "mixed", benchmarkScore: 80, timedMode: false },
    questions: [],
    version: 1,
    visibility: "private"
  };

  console.log(`Testing table 'exams' INSERT (id: ${canaryExamId})...`);
  const examInsertRes = await requestHttp("POST", "/rest/v1/exams", {
    "Authorization": `Bearer ${token}`,
    "Prefer": "return=representation"
  }, examPayload);

  writeResults["exams"] = {
    insertStatus: examInsertRes.status,
    insertSuccess: examInsertRes.status === 201 || examInsertRes.status === 200,
    insertError: examInsertRes.status >= 400 ? (examInsertRes.data?.message || examInsertRes.raw) : null,
    deleteSuccess: false,
  };

  if (writeResults["exams"].insertSuccess) {
    const deleteRes = await requestHttp("DELETE", `/rest/v1/exams?id=eq.${canaryExamId}`, {
      "Authorization": `Bearer ${token}`
    });
    writeResults["exams"].deleteSuccess = deleteRes.status === 204 || deleteRes.status === 200;
  }
  console.log(`  exams: Insert Status ${examInsertRes.status} (${writeResults["exams"].insertSuccess ? "SUCCESS" : "FAILED"}), Cleaned up: ${writeResults["exams"].deleteSuccess}`);

  // 2. Canary row for exam_attempts (with exam_id = null to test nullable FK)
  const canaryAttemptId = crypto.randomUUID();
  const attemptPayload = {
    id: canaryAttemptId,
    exam_id: null, // nullable foreign key
    user_id: probeUserId,
    score: 10,
    total: 10,
    percentage: 100.0,
    answers: {},
    questions_snapshot: [],
    duration_seconds: 60,
    passed: true
  };

  console.log(`Testing table 'exam_attempts' INSERT (id: ${canaryAttemptId})...`);
  const attemptInsertRes = await requestHttp("POST", "/rest/v1/exam_attempts", {
    "Authorization": `Bearer ${token}`,
    "Prefer": "return=representation"
  }, attemptPayload);

  writeResults["exam_attempts"] = {
    insertStatus: attemptInsertRes.status,
    insertSuccess: attemptInsertRes.status === 201 || attemptInsertRes.status === 200,
    insertError: attemptInsertRes.status >= 400 ? (attemptInsertRes.data?.message || attemptInsertRes.raw) : null,
    deleteSuccess: false,
  };

  if (writeResults["exam_attempts"].insertSuccess) {
    const deleteRes = await requestHttp("DELETE", `/rest/v1/exam_attempts?id=eq.${canaryAttemptId}`, {
      "Authorization": `Bearer ${token}`
    });
    writeResults["exam_attempts"].deleteSuccess = deleteRes.status === 204 || deleteRes.status === 200;
  }
  console.log(`  exam_attempts: Insert Status ${attemptInsertRes.status} (${writeResults["exam_attempts"].insertSuccess ? "SUCCESS" : "FAILED"}), Cleaned up: ${writeResults["exam_attempts"].deleteSuccess}`);

  // 3. Canary row for flashcard_decks
  const canaryDeckId = crypto.randomUUID();
  const deckPayload = {
    id: canaryDeckId,
    user_id: probeUserId,
    title: "__canary_probe_deck__",
    description: "Automated probe row - safe to delete",
    source_item_ids: [],
    cards: [],
    version: 1,
    visibility: "private"
  };

  console.log(`Testing table 'flashcard_decks' INSERT (id: ${canaryDeckId})...`);
  const deckInsertRes = await requestHttp("POST", "/rest/v1/flashcard_decks", {
    "Authorization": `Bearer ${token}`,
    "Prefer": "return=representation"
  }, deckPayload);

  writeResults["flashcard_decks"] = {
    insertStatus: deckInsertRes.status,
    insertSuccess: deckInsertRes.status === 201 || deckInsertRes.status === 200,
    insertError: deckInsertRes.status >= 400 ? (deckInsertRes.data?.message || deckInsertRes.raw) : null,
    deleteSuccess: false,
  };

  if (writeResults["flashcard_decks"].insertSuccess) {
    const deleteRes = await requestHttp("DELETE", `/rest/v1/flashcard_decks?id=eq.${canaryDeckId}`, {
      "Authorization": `Bearer ${token}`
    });
    writeResults["flashcard_decks"].deleteSuccess = deleteRes.status === 204 || deleteRes.status === 200;
  }
  console.log(`  flashcard_decks: Insert Status ${deckInsertRes.status} (${writeResults["flashcard_decks"].insertSuccess ? "SUCCESS" : "FAILED"}), Cleaned up: ${writeResults["flashcard_decks"].deleteSuccess}`);

  return { writeResults, isUserAuthenticated };
}

async function runProbe() {
  console.log(`Probing Supabase Endpoint: ${supabaseUrl}\n`);
  const report = {};

  for (const [table, columns] of Object.entries(tablesToProbe)) {
    console.log(`--- Table: ${table} ---`);
    report[table] = [];

    // Check table existence with ?select=*&limit=0
    const tableCheck = await probeColumn(table, "*");
    if (tableCheck.status === 404 || (tableCheck.error && tableCheck.error.includes("schema cache"))) {
      console.log(`[TABLE MISSING] ${table}: status ${tableCheck.status} - ${tableCheck.error}`);
      for (const col of columns) {
        report[table].push({ column: col, status: tableCheck.status, exists: false, reason: "Table does not exist" });
      }
      continue;
    }

    for (const col of columns) {
      const res = await probeColumn(table, col);
      const exists = res.status === 200;
      report[table].push({ column: col, status: res.status, exists, error: res.error });
      console.log(`  ${col.padEnd(24)} -> Status ${res.status} [${exists ? "EXISTS" : "MISSING: " + res.error}]`);
    }
  }

  const authInfo = await authenticateTestUser();
  const canaryOutput = await runCanaryWriteTests(authInfo);

  return { columnReport: report, canaryOutput };
}

runProbe().then(({ columnReport, canaryOutput }) => {
  // Output summary
  console.log("\n=== PROBE SUMMARY ===");
  for (const [tbl, cols] of Object.entries(columnReport)) {
    const existing = cols.filter(c => c.exists).length;
    console.log(`${tbl}: ${existing}/${cols.length} columns verified`);
  }

  // Generate Markdown report
  let md = `# Supabase Remote Schema & RLS Probe Report\n\n`;
  md += `**Timestamp:** ${new Date().toISOString()}\n`;
  md += `**Endpoint:** \`${supabaseUrl}\`\n`;
  md += `**Auth Mode:** ${canaryOutput.isUserAuthenticated ? "Authenticated Test User JWT" : "Public Anon Key"}\n\n`;

  md += `## 1. Table Schema Summary\n\n`;
  md += `| Table | Status | Columns Probed | Columns Present | Notes |\n`;
  md += `| :--- | :--- | :---: | :---: | :--- |\n`;

  for (const [tbl, cols] of Object.entries(columnReport)) {
    const existing = cols.filter(c => c.exists).length;
    const tableStatus = existing === cols.length ? "EXISTS (Full)" : existing > 0 ? "PARTIAL" : "MISSING (404)";
    const notes = existing === 0 ? "Table not created in Supabase project" : existing < cols.length ? "Missing specific columns" : "All fields match";
    md += `| \`${tbl}\` | **${tableStatus}** | ${cols.length} | ${existing} | ${notes} |\n`;
  }

  md += `\n## 2. Canary Write & RLS Execution (Insert + Delete)\n\n`;
  md += `| Table | HTTP Status | Insert Result | Cleaned Up (Deleted)? | Error / Policy Diagnostic |\n`;
  md += `| :--- | :---: | :--- | :---: | :--- |\n`;

  for (const [tbl, res] of Object.entries(canaryOutput.writeResults)) {
    md += `| \`${tbl}\` | \`${res.insertStatus}\` | ${res.insertSuccess ? "✅ Insert Succeeded" : "❌ Insert Failed"} | ${res.deleteSuccess ? "✅ Yes" : "—"} | ${res.insertError ? `\`${res.insertError.replace(/\|/g, "\\|")}\`` : "OK"} |\n`;
  }

  if (!canaryOutput.isUserAuthenticated) {
    md += `\n> **Note on Authenticated RLS Testing:**\n`;
    md += `> To test with authenticated Row-Level Security (RLS) enforcement, supply test user credentials:\n`;
    md += `> \`\`\`bash\n`;
    md += `> PROBE_TEST_USER_EMAIL="user@univ.edu" PROBE_TEST_USER_PASSWORD="secret" node scripts/probe_schema.cjs\n`;
    md += `> \`\`\`\n`;
    md += `> or set \`PROBE_BEARER_TOKEN=<jwt>\`.\n`;
  }

  md += `\n## 3. Column-by-Column Breakdown\n\n`;

  for (const [tbl, cols] of Object.entries(columnReport)) {
    md += `### Table: \`${tbl}\`\n\n`;
    md += `| Column | HTTP Status | Exists in Remote DB? | Error / Diagnostic |\n`;
    md += `| :--- | :---: | :---: | :--- |\n`;
    for (const c of cols) {
      md += `| \`${c.column}\` | \`${c.status}\` | ${c.exists ? "✅ Yes" : "❌ No"} | ${c.error ? `\`${c.error.replace(/\|/g, "\\|")}\`` : "OK"} |\n`;
    }
    md += `\n`;
  }

  const reportsDir = path.resolve(__dirname, "..", "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const outPath = path.join(reportsDir, "probe_schema_results.md");
  fs.writeFileSync(outPath, md, "utf8");
  console.log(`\nMarkdown report written to: ${outPath}`);
});
