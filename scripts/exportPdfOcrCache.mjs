// Read the completed benchmark's IndexedDB cache; never rerun OCR or copy the PDF.
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { dirname, resolve, join, relative, isAbsolute, basename } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const result = JSON.parse(await readFile(process.argv[2] || join(root, ".tmp/pdf-ocr-full/results.json"), "utf8"));
const destination = resolve(process.argv[3] || join(tmpdir(), "msa-accuracy-work", "browser-ocr.json"));
const inside = (parent, target) => { const rel = relative(parent, target); return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel)); };
if (inside(root, destination)) throw new Error("OCR output must stay outside the repository.");
const profile = dirname(result.screenshot);
if (!inside(tmpdir(), profile) || !basename(profile).startsWith("rm-pdf-ocr-workflow-")) throw new Error("Expected an isolated benchmark profile under OS temp.");
const databases = (await readdir(join(profile, "Default", "IndexedDB"))).filter((name) => /^http_127\.0\.0\.1_\d+\.indexeddb\.leveldb$/.test(name));
if (databases.length !== 1) throw new Error("Benchmark origin is ambiguous or missing.");
const originPort = Number(databases[0].match(/_(\d+)\.indexeddb/)[1]);
const server = createServer((request, response) => {
  if (request.url !== "/msa-cache-export.html") { response.writeHead(404).end(); return; }
  response.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-store" }).end("<!doctype html><title>Read local OCR cache</title><p>Reading the benchmark cache locally.</p>");
});
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(originPort, "127.0.0.1", resolve); });
const reservation = createServer();
await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
const debugPort = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const chrome = spawn(process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
  "--headless", "--disable-gpu", "--no-sandbox", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore", windowsHide: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  let target;
  for (let i = 0; i < 100; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).find((page) => page.type === "page"); if (target) break; } catch {}
    await sleep(100);
  }
  if (!target) throw new Error("Could not reopen the isolated benchmark browser.");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
  let id = 0; const pending = new Map();
  socket.addEventListener("message", ({ data }) => {
    const msg = JSON.parse(data); const task = pending.get(msg.id);
    if (task) { clearTimeout(task.timer); pending.delete(msg.id); msg.error ? task.reject(new Error(msg.error.message)) : task.resolve(msg.result); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const key = ++id; const timer = setTimeout(() => { pending.delete(key); reject(new Error(`Timed out: ${method}`)); }, 30000);
    pending.set(key, { resolve, reject, timer }); socket.send(JSON.stringify({ id: key, method, params }));
  });
  await send("Network.enable"); await send("Network.setBypassServiceWorker", { bypass: true });
  await send("Page.navigate", { url: `http://127.0.0.1:${originPort}/msa-cache-export.html` });
  await sleep(500);
  const exported = await send("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `new Promise((resolve, reject) => {
    const request = indexedDB.open('researchmate_local_ocr_b1');
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => { request.transaction.abort(); reject(new Error('OCR cache is unavailable')); };
    request.onsuccess = () => {
      const db = request.result;
      const pages = db.transaction('pages', 'readonly').objectStore('pages').getAll();
      pages.onerror = () => { db.close(); reject(pages.error); };
      pages.onsuccess = () => { db.close(); resolve(pages.result); };
    };
  })` });
  if (exported.exceptionDetails) throw new Error(JSON.stringify(exported.exceptionDetails));
  const pages = exported.result.value.filter((page) => page.sourceHash === result.source.sourceHash && page.engineVersion === "tesseract.js@7.0.0" && page.language === "eng" && page.rasterDpi === 144).sort((a, b) => a.pageNumber - b.pageNumber);
  if (pages.length !== 156 || pages.some((page, index) => page.pageNumber !== index + 1)) throw new Error("Expected the exact 156-page browser OCR cache.");
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, JSON.stringify({ source: result.source, engineVersion: "tesseract.js@7.0.0", language: "eng", dpi: 144, pages }, null, 2), { flag: "wx" });
  console.log(`Exported ${pages.length} saved browser OCR pages to ${destination}`);
} finally { socket?.close(); chrome.kill(); server.closeAllConnections(); server.close(); }
