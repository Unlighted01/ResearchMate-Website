// Offline Chrome smoke check. Usage: node scripts/check_msa_review_pack.mjs <external-pack-directory>
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, writeFile, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, relative, isAbsolute, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

if (!process.argv[2]) throw new Error("Supply the external review pack directory.");
const pack = await realpath(resolve(process.argv[2]));
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rel = relative(root, pack);
if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) throw new Error("Review artifacts must stay outside the repository.");
const qa = await mkdtemp(join(tmpdir(), "msa-review-qa-"));
const profile = join(qa, "chrome");
const chrome = spawn(process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
  "--headless", "--disable-gpu", "--no-sandbox", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore", windowsHide: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = Number((await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); break; } catch {}
    await sleep(100);
  }
  assert(port, "Chrome debug port unavailable");
  const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((item) => item.type === "page");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
  let id = 0; const pending = new Map(); const requests = []; const errors = [];
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === "Network.requestWillBeSent") requests.push(message.params.request.url);
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
    const task = pending.get(message.id);
    if (task) { clearTimeout(task.timer); pending.delete(message.id); message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const key = ++id; const timer = setTimeout(() => { pending.delete(key); reject(new Error(`Timed out: ${method}`)); }, 30000);
    pending.set(key, { resolve, reject, timer }); socket.send(JSON.stringify({ id: key, method, params }));
  });
  const evaluate = async (expression) => {
    const value = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (value.exceptionDetails) throw new Error(JSON.stringify(value.exceptionDetails));
    return value.result.value;
  };
  const navigate = async (name) => {
    await send("Page.navigate", { url: pathToFileURL(join(pack, name)).href });
    for (let i = 0; i < 100; i++) {
      if (await evaluate("document.readyState === 'complete'")) return;
      await sleep(50);
    }
    throw new Error("Page did not finish loading");
  };
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: qa });
  await send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
  await navigate("review.html");
  const initial = await evaluate(`({ regions: collect().regions.length, blank: collect().regions.every(r => r.status === 'unchecked' && !r.noKeys && ['transcription','math','digits','keys','notes'].every(k => r[k] === '')), images: document.images.length })`);
  assert.deepEqual(initial, { regions: 24, blank: true, images: 24 });
  const images = await evaluate(`Promise.all([...document.images].map(async image => { image.loading = 'eager'; await image.decode(); return image.naturalWidth > 0; }))`);
  assert(images.every(Boolean), "An original crop failed to load offline");
  await evaluate(`(() => { const input = document.querySelector('[data-field="transcription"]'); input.value = 'QA synthetic correction'; input.dispatchEvent(new Event('input', {bubbles:true})); })()`);
  await navigate("review.html");
  assert.equal(await evaluate("collect().regions[0].transcription"), "QA synthetic correction");
  await evaluate("document.getElementById('export').click()");
  let download;
  for (let i = 0; i < 100; i++) {
    download = (await readdir(qa)).find((name) => name.endsWith("-checked-labels.json"));
    if (download) break;
    await sleep(50);
  }
  assert(download, "Label export did not download");
  const exported = JSON.parse(await readFile(join(qa, download), "utf8"));
  assert.equal(exported.regions[0].transcription, "QA synthetic correction");
  await evaluate("localStorage.clear()"); await navigate("review.html");
  assert.equal(await evaluate("collect().regions[0].transcription"), "");
  const documentNode = await send("DOM.getDocument");
  const inputNode = await send("DOM.querySelector", { nodeId: documentNode.root.nodeId, selector: "#import" });
  await send("DOM.setFileInputFiles", { nodeId: inputNode.nodeId, files: [join(qa, download)] });
  for (let i = 0; i < 100; i++) {
    if (await evaluate("collect().regions[0].transcription === 'QA synthetic correction'")) break;
    await sleep(50);
  }
  assert.equal(await evaluate("collect().regions[0].transcription"), "QA synthetic correction");
  assert.equal(await evaluate(`(() => { try { restore({...TEMPLATE,sourceSha256:'wrong'}); return false; } catch { return true; } })()`), true);
  await evaluate("localStorage.clear()"); await navigate("review.html");
  const screenshot = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(join(qa, "review.png"), Buffer.from(screenshot.data, "base64"));
  await navigate("ocr.html");
  const reference = await evaluate(`({ sections:document.querySelectorAll('section').length,images:document.images.length,inputs:document.querySelectorAll('textarea').length,nonblank:[...document.querySelectorAll('section pre')].every(e=>e.textContent.trim()) })`);
  assert.deepEqual(reference, { sections: 24, images: 0, inputs: 0, nonblank: true });
  assert.equal(requests.filter((url) => /^https?:/.test(url)).length, 0);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ regions:24, originalCropsLoadedOffline:images.length, blankInitialLabels:true, autosaveReload:true, labelExportImport:true, wrongSourceRejected:true, separateOcrSections:reference.sections, httpRequests:0, browserErrors:0, qaDirectory:qa }, null, 2));
} finally { socket?.close(); chrome.kill(); }
