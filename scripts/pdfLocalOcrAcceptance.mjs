// Local PDF latency harness. Serves the external PDF directly; never copies it into the repository.
import { build } from "vite";
import { mkdir, writeFile, readFile, mkdtemp, cp } from "node:fs/promises";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { resolve, join, extname } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import tailwindcss from "@tailwindcss/vite";
import { createBrowserMemorySampler } from "./browserMemory.mjs";
import os from "node:os";

const root = process.cwd();
const pdfFile = process.env.PDF_ACCEPTANCE_FILE;
if (!pdfFile) throw new Error("Set PDF_ACCEPTANCE_FILE to a non-frozen PDF.");
const frozen = ["Express Review Guides - Vocabulary.pdf", "Vocabulary for Civil Service Exam.pdf", "Newton P., Bristoll H. - Complete Set of Practice Tests for Numerical Reasoning.pdf", "English Verb Drills.pdf"];
if (frozen.some((name) => pdfFile.toLowerCase().endsWith(name.toLowerCase()))) throw new Error("Frozen PDF: refusing to open");
const fullRun = process.env.PDF_OCR_FULL === "1";
const outputName = fullRun ? "pdf-ocr-full" : "pdf-ocr-workflow";
const dir = resolve(root, `.tmp/${outputName}`);
await mkdir(dir, { recursive: true });
await writeFile(join(dir, "index.html"), `<html><body><div id="root" style="max-width:960px;margin:24px auto"></div><script type="module" src="/scripts/pdfLocalOcrBrowserFixture.tsx"></script></body></html>`);
await build({ configFile: false, root, envDir: dir, publicDir: false, logLevel: "error", plugins: [tailwindcss()],
  define: { "import.meta.env.VITE_LOCAL_OCR_B1": '"false"' },
  build: { outDir: join(dir, "dist"), emptyOutDir: true, rollupOptions: { input: join(dir, "index.html") } },
});
console.log("Acceptance build ready");
const dist = join(dir, "dist");
await cp(resolve(root, "public/ocr"), join(dist, "ocr"), { recursive: true });
await cp(resolve(root, "public/sw.js"), join(dist, "sw.js"));


const html = await readFile(join(dist, `.tmp/${outputName}/index.html`));
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
    const type = ({ ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".wasm": "application/wasm", ".html": "text/html" })[extname(file)] || (pathname === "/" ? "text/html" : "application/octet-stream");
    res.writeHead(200, { "Content-Type": type }); res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(join(tmpdir(), "rm-pdf-ocr-workflow-"));
const chrome = spawn(process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
  "--headless", "--disable-gpu", "--no-sandbox", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore", windowsHide: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
let memory;
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
  const workerSessions = new Map();
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const key = ++id;
    const timeout = setTimeout(() => { pending.delete(key); reject(new Error(`Timed out: ${method}`)); }, method === "Runtime.getHeapUsage" ? 5000 : 900000);
    pending.set(key, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id: key, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  socket.addEventListener("message", async (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id) { const p = pending.get(msg.id); if (p) { clearTimeout(p.timeout); pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result); } }
    if (msg.method === "Network.requestWillBeSent") requests.push(msg.params.request.url);
    if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.text);
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.args[0]?.value === "PDF_OCR_PROGRESS") console.log("Progress", msg.params.args[1]?.value);
    if (msg.method === "Target.detachedFromTarget") workerSessions.delete(msg.params.sessionId);
    if (msg.method === "Target.attachedToTarget") {
      workerSessions.set(msg.params.sessionId, msg.params.targetInfo.url);
      try {
        await send("Network.enable", {}, msg.params.sessionId);
        await send("Runtime.enable", {}, msg.params.sessionId);
        await send("Runtime.runIfWaitingForDebugger", {}, msg.params.sessionId);
      } catch (error) { errors.push(String(error)); }
    }
  });
  await send("Network.enable");
  await send("Runtime.enable");
  await send("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: true, flatten: true,
    filter: [{ type: "worker", exclude: false }, { exclude: true }],
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const ready = async () => { for (let i = 0; i < 200; i++) { try { if (await evaluate("Boolean(window.pdfWorkflow)")) return; } catch {} await sleep(100); } throw new Error("Page did not load."); };
  await send("Page.navigate", { url: origin }); await ready();
  console.log("Browser page ready");
  const mounted = await evaluate("pdfWorkflow.mount()");
  assert.equal(mounted.completed, 0);
  assert.equal(requests.filter((url) => url.includes("/ocr/")).length, 0, "OCR downloaded before user consent");
  const browserInfo = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  memory = await createBrowserMemorySampler(browserInfo.webSocketDebuggerUrl, send, workerSessions);
  await memory.sample("baseline"); memory.setPhase("initial");
  if (process.platform === "win32") assert.ok(memory.samples[0]?.osMemory, "Chrome process memory counters are unavailable");
  const workflowStart = Date.now();
  const first = await evaluate(`pdfWorkflow.runUntil(${fullRun ? 20 : 5})`);
  console.log("Paused first run", first);
  await send("Page.reload"); await ready();
  const restored = await evaluate("pdfWorkflow.mount()");
  assert.equal(restored.completed, first.saved);
  memory.setPhase("resumed");
  const resumed = await evaluate(`pdfWorkflow.runUntil(${fullRun ? 40 : 20})`);
  console.log("Resumed", resumed);
  await send("Emulation.setDeviceMetricsOverride", { width: 1040, height: 850, deviceScaleFactor: 1, mobile: false });
  const shot = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(join(profile, "pdf-ocr-ui.png"), Buffer.from(shot.data, "base64"));
  server.closeAllConnections(); await new Promise((resolve) => server.close(resolve));
  await send("Page.reload"); await ready(); await evaluate("pdfWorkflow.mount()");
  const modelRequestsBeforeOffline = requests.filter((url) => url.includes("traineddata")).length;
  memory.setPhase("offline");
  const offline = await evaluate(`pdfWorkflow.runUntil(${fullRun ? 156 : resumed.saved + 1})`);
  const workflowElapsedMs = Date.now() - workflowStart;
  assert.equal(requests.filter((url) => url.includes("traineddata")).length, modelRequestsBeforeOffline, "Offline resume fetched a model");
  let completion = null; let restoredComplete = null;
  if (fullRun) {
    assert.equal(offline.saved, 156); assert.equal(offline.status, "completed");
    completion = await evaluate("pdfWorkflow.verifyCompletion()");
    assert.equal(completion.pages, 156); assert.equal(completion.allFair, true); assert.equal(completion.completedButtonDisabled, true);
    await send("Page.reload"); await ready(); await evaluate("pdfWorkflow.mount()");
    restoredComplete = await evaluate("pdfWorkflow.verifyCompletion()");
    assert.deepEqual(restoredComplete, completion);
    memory.setPhase("completed"); await sleep(2000); await memory.sample("completed");
  }
  const preview = await evaluate("pdfWorkflow.inspect()");
  const forbidden = requests.filter((url) => /^https?:/.test(url) && (!url.startsWith(origin + "/") || /\/api\/|\/functions\//.test(url)));
  assert.deepEqual(forbidden, []); assert.deepEqual(errors, []);
  assert.equal(first.gradable + resumed.gradable + offline.gradable, 0);
  await memory.stop();
  const recognitionTimes = [...first.recognitionTimes, ...resumed.recognitionTimes, ...offline.recognitionTimes];
  if (fullRun) {
    assert.equal(recognitionTimes.length, 156, "A page was re-OCRed or skipped");
    assert.deepEqual(recognitionTimes.map((page) => page.page), Array.from({ length: 156 }, (_, i) => i + 1));
    assert.equal(recognitionTimes.every((page) => page.ok), true);
  }
  const result = { environment: { chrome: browserInfo.Browser, platform: process.platform, cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, physicalMemoryBytes: os.totalmem(), dpi: 144, language: "eng", isolatedProfile: true },
    source: { file: pdfFile, sourceHash: mounted.hash },
    first, restoredPages: restored.completed, resumed, offline, workflowElapsedMs, completion, restoredComplete, preview,
    memory: { source: "SystemInfo process IDs + Windows Get-Process counters; CDP heap counters", intervalMs: 2000, note: "Working sets can double-count shared pages. Private bytes measure committed memory, not resident RAM. Heap/backing-store counters are not total memory.", samples: memory.samples, errors: memory.errors },
    forbiddenRequests: forbidden.length, browserErrors: errors.length, modelRequests: requests.filter((url) => url.includes("traineddata")).length, screenshot: join(profile, "pdf-ocr-ui.png") };
  await writeFile(join(dir, "results.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ first: { saved: first.saved, elapsedMs: first.elapsedMs }, resumed: { saved: resumed.saved, elapsedMs: resumed.elapsedMs }, offline: { saved: offline.saved, elapsedMs: offline.elapsedMs }, workflowElapsedMs, memorySamples: memory.samples.length, memoryErrors: memory.errors, pages: completion?.pages, forbiddenRequests: forbidden.length, browserErrors: errors.length }, null, 2));
} finally {
  await memory?.stop();
  socket?.close(); chrome.kill(); server.close();
}
