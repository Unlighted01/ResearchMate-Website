// Local PDF latency harness. Serves the external PDF directly; never copies it into the repository.
import { build } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { mkdir, writeFile, readFile, mkdtemp, cp } from "node:fs/promises";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { resolve, join, extname } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";

const root = process.cwd();
const pdfFile = process.env.PDF_ACCEPTANCE_FILE;
if (!pdfFile) throw new Error("Set PDF_ACCEPTANCE_FILE to a non-frozen PDF.");
const frozen = ["Express Review Guides - Vocabulary.pdf", "Vocabulary for Civil Service Exam.pdf", "Newton P., Bristoll H. - Complete Set of Practice Tests for Numerical Reasoning.pdf", "English Verb Drills.pdf"];
if (frozen.some((name) => pdfFile.endsWith(name))) throw new Error("Frozen PDF: refusing to open");
const dir = resolve(root, ".tmp/question-import-check");
await mkdir(dir, { recursive: true });
await writeFile(join(dir, "index.html"), `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/scripts/questionImportBrowserFixture.tsx"></script></body></html>`);
await build({ configFile: false, plugins: [tailwindcss()], root, envDir: dir, publicDir: false, logLevel: "error",
  define: { "import.meta.env.VITE_LOCAL_OCR_B1": '"false"' },
  build: { outDir: join(dir, "dist"), emptyOutDir: true, rollupOptions: { input: join(dir, "index.html") } },
});
console.log("Acceptance build ready");
const dist = join(dir, "dist");
await cp(resolve(root,"public/ocr"),join(dist,"ocr"),{recursive:true});


const html = await readFile(join(dist, ".tmp/question-import-check/index.html"));
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  try {
    if (pathname === "/input.pdf") {
      const bytes = await readFile(pdfFile);
      res.writeHead(200, { "Content-Type": "application/pdf" }).end(bytes); return;
    }
    const file = resolve(dist, `.${pathname}`);
    if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
    const body = pathname === "/" ? html : await readFile(file);
    const type = ({ ".js": "text/javascript", ".mjs": "text/javascript", ".wasm": "application/wasm", ".css": "text/css", ".html": "text/html" })[extname(file)] || (pathname === "/" ? "text/html" : "application/octet-stream");
    res.writeHead(200, { "Content-Type": type }); res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(join(tmpdir(), "rm-pdf-acceptance-"));
const chrome = spawn(process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
  "--headless", "--disable-gpu", "--no-sandbox", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore", windowsHide: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  let port;
  for (let i = 0; i < 100; i++) { try { port = (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; break; } catch { await sleep(100); } }
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  const requests = [];
  const errors = [];
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const key = ++id;
    const timeout = setTimeout(() => { pending.delete(key); reject(new Error(`Timed out: ${method}`)); }, 180000);
    pending.set(key, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id: key, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  socket.addEventListener("message", async (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id) { const p = pending.get(msg.id); if (p) { clearTimeout(p.timeout); pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result); } }
    if (msg.method === "Network.requestWillBeSent") requests.push(msg.params.request.url);
    if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.text);
    if (msg.method === "Target.attachedToTarget") {
      try {
        await send("Network.enable", {}, msg.params.sessionId);
        await send("Runtime.runIfWaitingForDebugger", {}, msg.params.sessionId);
      } catch (error) { errors.push(String(error)); }
    }
  });
  await send("Network.enable");
  await send("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: true, flatten: true,
    filter: [{ type: "worker", exclude: false }, { exclude: true }],
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const ready = async () => { for (let i = 0; i < 200; i++) { try { if (await evaluate("Boolean(window.pdfAcceptance)")) return; } catch {} await sleep(100); } throw new Error("Page did not load."); };
  await send("Page.enable");
  // Seed a previous-version database before application modules run. Reloading an
  // already-upgraded database is expected to reject version 3 without mutating it.
  await send("Page.addScriptToEvaluateOnNewDocument", {source:`
    const probe = indexedDB.open("researchmate_local_ocr_b1",3);
    probe.onupgradeneeded = () => {
      const db=probe.result;
      for (const [name,keyPath] of [["assets","hash"],["pages","cacheKey"],["models","id"],["queue","id"],["pdfJobs","id"]]) db.createObjectStore(name,{keyPath});
      probe.transaction.objectStore("assets").put({hash:"b".repeat(64),blob:new Blob(["retained original"])});
      probe.transaction.objectStore("pages").put({cacheKey:"migration-page",text:"retained OCR"});
      probe.transaction.objectStore("pdfJobs").put({id:"migration-job",completedPages:[1]});
    };
    probe.onsuccess=()=>probe.result.close();
    probe.onerror=()=>{};
  `});
  await send("Page.navigate", { url: origin }); await ready();
  console.log("Browser page ready");
  await send("Emulation.setDeviceMetricsOverride",{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  const metrics = await evaluate("pdfAcceptance()");
  if (!metrics.migrationPreserved) console.log("Migration diagnostic", await evaluate(`(async()=>{
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('researchmate_local_ocr_b1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    const rows={};
    for(const store of ['assets','pages','pdfJobs']) rows[store]=await new Promise(resolve=>{const r=db.transaction(store,'readonly').objectStore(store).getAllKeys();r.onsuccess=()=>resolve(r.result);});
    db.close();return rows;
  })()`));
  for (const name of ["leftDuringJob","retainedSource","portalOnBody","coversViewport","ocrIsOptIn","migrationPreserved"]) assert.equal(metrics[name],true,name);
  assert.equal(metrics.pendingOcrPages,156);
  assert.equal(metrics.parsed,0);
  const desktop=await send("Page.captureScreenshot",{format:"png"});
  await writeFile(join(dir,"desktop.png"),Buffer.from(desktop.data,"base64"));
  await send("Page.reload",{ignoreCache:true}); await ready();
  const restored=await evaluate("restoredImport()");
  assert.deepEqual(restored,{status:"ready",total:156,pending:156});
  await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await sleep(200);
  const mobile=await send("Page.captureScreenshot",{format:"png"});
  await writeFile(join(dir,"mobile.png"),Buffer.from(mobile.data,"base64"));
  const ocrNavigation=await evaluate("ocrNavigation()");
  assert.deepEqual(ocrNavigation,{leftAfterPageOne:true,savedAfterNavigation:3,status:"paused",allUnconfirmed:true});
  const forbidden = requests.filter((url) => /^https?:/.test(url) && (!url.startsWith(origin + "/") || /\/api\/|\/functions\//.test(url)));
  assert.deepEqual(forbidden, []);
  assert.deepEqual(errors, []);
  assert.equal(metrics.processedPages, metrics.pages);
  const result = { file: pdfFile, ...metrics, restored, ocrNavigation, requests: requests.length, forbiddenRequests: forbidden.length, browserErrors: errors.length };
  await writeFile(join(dir, "results.json"), JSON.stringify(result, null, 2));
  await writeFile(join(dir, `${pdfFile.split(/[\\/]/).at(-1).replace(/[^\p{L}\p{N}.-]+/gu, "_")}.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  socket?.close(); chrome.kill(); server.close();
}
