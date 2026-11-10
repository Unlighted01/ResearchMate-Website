// ============================================
// PROBE SCHEMA - Read-only schema probe script
// Queries PostgREST /rest/v1/<table_name>?select=<column>&limit=1
// Uses anon key to verify table and column presence
// ============================================

require('dotenv').config();
const https = require('https');
const http = require('http');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

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
    "title",
    "text",
    "created_at"
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

function probeColumn(table, column) {
  return new Promise((resolve) => {
    const url = new URL(`${supabaseUrl}/rest/v1/${table}?select=${column}&limit=1`);
    const options = {
      method: "GET",
      headers: {
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`,
        "Accept": "application/json"
      }
    };

    const client = url.protocol === "https:" ? https : http;
    const req = client.request(url, options, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        let parsed = null;
        try { parsed = JSON.parse(body); } catch {}
        resolve({
          table,
          column,
          status: res.statusCode,
          error: res.statusCode !== 200 ? (parsed?.message || body) : null
        });
      });
    });

    req.on("error", (err) => {
      resolve({ table, column, status: 0, error: err.message });
    });

    req.end();
  });
}

async function runProbe() {
  console.log(`Probing Supabase Endpoint: ${supabaseUrl}\n`);
  const report = {};

  for (const [table, columns] of Object.entries(tablesToProbe)) {
    console.log(`--- Table: ${table} ---`);
    report[table] = [];

    // First check table existence with ?select=*&limit=0
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

  return report;
}

const fs = require('fs');
const path = require('path');

runProbe().then((res) => {
  // Output summary
  console.log("\n=== PROBE SUMMARY ===");
  for (const [tbl, cols] of Object.entries(res)) {
    const existing = cols.filter(c => c.exists).length;
    console.log(`${tbl}: ${existing}/${cols.length} columns verified`);
  }

  // Generate Markdown report
  let md = `# Supabase Remote Schema Probe Report\n\n`;
  md += `**Timestamp:** ${new Date().toISOString()}\n`;
  md += `**Endpoint:** \`${supabaseUrl}\`\n`;
  md += `**Auth:** Anon Key (Read-Only HTTP GET /rest/v1/?select=<column>&limit=1)\n\n`;

  md += `## Table Summary\n\n`;
  md += `| Table | Status | Columns Probed | Columns Present | Notes |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- |\n`;

  for (const [tbl, cols] of Object.entries(res)) {
    const existing = cols.filter(c => c.exists).length;
    const tableStatus = existing === cols.length ? "EXISTS (Full)" : existing > 0 ? "PARTIAL" : "MISSING (404)";
    const notes = existing === 0 ? "Table not created in Supabase project" : existing < cols.length ? "Missing specific columns" : "All fields match";
    md += `| \`${tbl}\` | **${tableStatus}** | ${cols.length} | ${existing} | ${notes} |\n`;
  }

  md += `\n## Column-by-Column Breakdown\n\n`;

  for (const [tbl, cols] of Object.entries(res)) {
    md += `### Table: \`${tbl}\`\n\n`;
    md += `| Column | HTTP Status | Exists in Remote DB? | Error / Diagnostic |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
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
