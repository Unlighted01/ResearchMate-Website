// Local acceptance harness: synthetic images only, isolated Chrome profile, no credentials.
import { build } from "vite";
import { mkdir, writeFile, readFile, cp, mkdtemp } from "node:fs/promises";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { resolve, join, extname } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";

const root = process.cwd();
const dir = resolve(root, ".tmp/ocr-acceptance");
await mkdir(dir, { recursive: true });
await writeFile(join(dir, "index.html"), `<html><body>OCR acceptance<script type="module" src="/scripts/ocrB1BrowserFixture.ts"></script></body></html>`);
await build({ configFile: false, root, envDir: dir, publicDir: false, logLevel: "error",
  define: { "import.meta.env.VITE_LOCAL_OCR_B1": '"true"' },
  build: { outDir: join(dir, "dist"), emptyOutDir: true, rollupOptions: { input: join(dir, "index.html") } },
});
const dist = join(dir, "dist");
await cp(resolve(root, "public/ocr"), join(dist, "ocr"), { recursive: true });
await cp(resolve(root, "public/sw.js"), join(dist, "sw.js"));
const html = await readFile(join(dist, ".tmp/ocr-acceptance/index.html"));
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  try {
    const file = resolve(dist, `.${pathname}`);
    if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
    const body = pathname === "/" ? html : await readFile(file);
    const type = ({ ".js": "text/javascript", ".wasm": "application/wasm", ".html": "text/html" })[extname(file)] || (pathname === "/" ? "text/html" : "application/octet-stream");
    res.writeHead(200, { "Content-Type": type }); res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(join(tmpdir(), "rm-ocr-acceptance-"));
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
  await send("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const ready = async () => { for (let i = 0; i < 200; i++) { try { if (await evaluate("Boolean(window.ocrAcceptance)")) return; } catch {} await sleep(100); } throw new Error("Page did not load."); };
  await send("Page.navigate", { url: origin }); await ready();
  await evaluate("ocrAcceptance.installWorker()");
  const first = await evaluate("ocrAcceptance.firstRun()");
  assert.equal(first.completed, 5); assert.equal(first.cancelled, true);
  await send("Page.reload"); await ready();
  const resumed = await evaluate("ocrAcceptance.resume()");
  assert.equal(resumed.completed, 15);
  const repeat = await evaluate("ocrAcceptance.repeat()");
  assert.equal(repeat.cached, 20); assert.equal(repeat.recognized, 0);
  // Stop the HTTP server: stronger than only setting the page target offline,
  // which does not reliably cover nested worker targets.
  await new Promise((resolve) => server.close(resolve));
  await send("Page.reload"); await ready();
  const offline = await evaluate("ocrAcceptance.offline()");
  assert.equal(offline.cached, 20); assert.equal(offline.freshCompleted, 1);
  const eviction = await evaluate("ocrAcceptance.eviction()");
  assert.equal(eviction.ready, false); assert.equal(eviction.prompts, 1); assert.equal(eviction.completed, 0);
  const forbidden = requests.filter((url) => /^https?:/.test(url) && (!url.startsWith(origin + "/") || /\/api\/|\/functions\//.test(url)));
  assert.deepEqual(forbidden, []);
  assert.deepEqual(errors, []);
  const result = { first, resumed, repeat, offline, eviction, requests: requests.length, forbiddenRequests: forbidden.length, workerModelRequests: requests.filter((url) => url.includes("traineddata")).length, browserErrors: errors.length };
  await writeFile(join(dir, "results.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  socket?.close(); chrome.kill(); server.close();
}
