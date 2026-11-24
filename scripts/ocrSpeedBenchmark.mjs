// Focused MSA speed benchmark over CDP, independent of paused Playwright acceptance.
// Serves the external PDF directly; never copies it into the repository.
import { build } from "vite";
import { mkdir, writeFile, readFile, mkdtemp, cp } from "node:fs/promises";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { resolve, join, extname, sep } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { createBrowserMemorySampler } from "./browserMemory.mjs";

const root = process.cwd();
const pdfFile = process.env.PDF_ACCEPTANCE_FILE;
if (!pdfFile) throw new Error("Set PDF_ACCEPTANCE_FILE to a non-frozen PDF.");
const frozen = ["Express Review Guides - Vocabulary.pdf", "Vocabulary for Civil Service Exam.pdf", "Newton P., Bristoll H. - Complete Set of Practice Tests for Numerical Reasoning.pdf", "English Verb Drills.pdf"];
if (frozen.some((name) => pdfFile.endsWith(name))) throw new Error("Frozen PDF: refusing to open");
const dir = resolve(root, ".tmp/ocr-speed");
await mkdir(dir, { recursive: true });
await writeFile(join(dir, "index.html"), `<html><body>MSA OCR speed benchmark<script type="module" src="/scripts/ocrSpeedBrowserFixture.ts"></script></body></html>`);
await build({ configFile: false, root, envDir: dir, publicDir: false, logLevel: "error",
  define: { "import.meta.env.VITE_LOCAL_OCR_B1": '"false"' },
  build: { outDir: join(dir, "dist"), emptyOutDir: true, rollupOptions: { input: join(dir, "index.html") } },
});
console.log("Benchmark build ready");
const dist = join(dir, "dist");
await cp(resolve(root,"public/ocr"),join(dist,"ocr"),{recursive:true});


const html = await readFile(join(dist, ".tmp/ocr-speed/index.html"));
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  try {
    if (pathname === "/input.pdf") {
      const bytes = await readFile(pdfFile);
      res.writeHead(200, { "Content-Type": "application/pdf" }).end(bytes); return;
    }
    const file = resolve(dist, `.${pathname}`);
    if (file !== dist && !file.startsWith(dist + sep)) { res.writeHead(403).end(); return; }
    const body = pathname === "/" ? html : await readFile(file);
    const type = ({ ".js": "text/javascript", ".mjs": "text/javascript", ".wasm": "application/wasm", ".html": "text/html" })[extname(file)] || (pathname === "/" ? "text/html" : "application/octet-stream");
    res.writeHead(200, { "Content-Type": type }); res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(join(tmpdir(), "rm-ocr-speed-"));
const chrome = spawn(process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
  "--headless", "--disable-gpu", "--no-sandbox", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore", windowsHide: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket, memory;
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
    const timeout = setTimeout(() => { pending.delete(key); reject(new Error(`Timed out: ${method}`)); }, 900000);
    pending.set(key, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id: key, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  socket.addEventListener("message", async (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id) { const p = pending.get(msg.id); if (p) { clearTimeout(p.timeout); pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result); } }
    if (msg.method === "Network.requestWillBeSent") requests.push(msg.params.request.url);
    if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.text);
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.args?.[0]?.value === "OCR_SPEED") console.log("Pages saved:", msg.params.args[1]?.value);
    if (msg.method === "Target.detachedFromTarget") workerSessions.delete(msg.params.sessionId);
    if (msg.method === "Target.attachedToTarget") {
      workerSessions.set(msg.params.sessionId, msg.params.targetInfo);
      try {
        await send("Network.enable", {}, msg.params.sessionId);
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
  const ready = async () => { for (let i = 0; i < 200; i++) { try { if (await evaluate("Boolean(window.pdfAcceptance)")) return; } catch {} await sleep(100); } throw new Error("Page did not load."); };
  await send("Page.navigate", { url: origin + "?workers=" + (process.env.OCR_WORKERS || "1") }); await ready();
  console.log("Browser page ready");
  const browser = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  memory = await createBrowserMemorySampler(browser.webSocketDebuggerUrl, send, workerSessions);
  await memory.sample("baseline");
  memory.setPhase("ocr");
  const metrics = await evaluate("pdfAcceptance()");
  await memory.sample("finished");
  await memory.stop();
  const forbidden = requests.filter((url) => /^https?:/.test(url) && (!url.startsWith(origin + "/") || /\/api\/|\/functions\//.test(url)));
  assert.deepEqual(forbidden, []);
  assert.deepEqual(errors, []);
  assert.equal(metrics.processedPages, metrics.pages);
  assert.equal(metrics.pages, 156);
  assert.equal(metrics.recognitionCalls, 156);
  assert.equal(metrics.allFair, true);
  assert.equal(metrics.gradable, 0);
  const samples = memory.samples.filter(s => s.phase === "ocr" && s.osMemory);
  assert.ok(samples.length > 0, "No OCR process memory samples");
  const result = { file: pdfFile, workers: Number(process.env.OCR_WORKERS || 1), browser: browser.Browser, ...metrics,
    peakWorkingSetMiB: Math.max(...samples.map(s => s.osMemory.workingSetBytes)) / 1048576,
    peakPrivateMiB: Math.max(...samples.map(s => s.osMemory.privateBytes)) / 1048576,
    memorySamples: memory.samples, memoryErrors: memory.errors,
    requests: requests.length, forbiddenRequests: forbidden.length, browserErrors: errors.length };
  await writeFile(join(dir, `workers-${process.env.OCR_WORKERS || "1"}.json`), JSON.stringify(result, null, 2));
  await writeFile(join(dir, `${pdfFile.split(/[\\/]/).at(-1).replace(/[^\p{L}\p{N}.-]+/gu, "_")}.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({...result, hashes: undefined, memorySamples: undefined}, null, 2));
} finally {
  await memory?.stop();
  socket?.close(); chrome.kill(); server.close();
}
