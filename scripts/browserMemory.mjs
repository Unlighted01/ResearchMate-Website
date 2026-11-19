import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function readProcessMemory(processIds) {
  const ids = [...new Set(processIds)];
  if (!ids.length || !ids.every((id) => Number.isInteger(id) && id > 0)) throw new Error("Invalid process IDs for memory sampling");
  // A renderer can exit between CDP's process list and Get-Process. Preserve
  // surviving counters and force a successful shell exit only after JSON output.
  const command = `$ocrRows = @(Get-Process -Id ${ids.join(",")} -ErrorAction SilentlyContinue | Select-Object Id,WorkingSet64,PrivateMemorySize64); ConvertTo-Json -InputObject $ocrRows -Compress; exit 0`;
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], { windowsHide: true, timeout: 5000 });
  const values = JSON.parse(stdout.trim());
  const rows = (Array.isArray(values) ? values : [values]).filter((row) => row && ids.includes(row.Id) && Number.isFinite(row.WorkingSet64) && Number.isFinite(row.PrivateMemorySize64));
  if (!rows.length) throw new Error("No live process memory counters returned");
  return { processCount: rows.length, requestedCount: ids.length, missingProcessIds: ids.filter((id) => !rows.some((row) => row.Id === id)),
    workingSetBytes: rows.reduce((sum, row) => sum + row.WorkingSet64, 0), privateBytes: rows.reduce((sum, row) => sum + row.PrivateMemorySize64, 0) };
}

/** Read counters for this isolated Chrome instance, never unrelated browsers. */
export async function createBrowserMemorySampler(browserUrl, tabSend, workerSessions) {
  const socket = new WebSocket(browserUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data); const task = pending.get(message.id);
    if (!task) return;
    clearTimeout(task.timer); pending.delete(message.id);
    message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
  });
  const send = (method) => new Promise((resolve, reject) => {
    const id = ++nextId; const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Memory query timed out: ${method}`)); }, 5000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method }));
  });
  const samples = [];
  const errors = [];
  let phase = "baseline"; let busy = false;
  const sample = async (label = phase) => {
    if (busy) return;
    busy = true;
    try {
      const processes = await send("SystemInfo.getProcessInfo");
      const ids = [...new Set(processes.processInfo.map((process) => process.id).filter((id) => Number.isInteger(id) && id > 0))];
      let osMemory = null;
      if (process.platform === "win32" && ids.length) {
        osMemory = await readProcessMemory(ids);
      }
      const heaps = await Promise.allSettled([
        tabSend("Runtime.getHeapUsage"),
        ...[...workerSessions.keys()].map((session) => tabSend("Runtime.getHeapUsage", {}, session)),
      ]);
      const available = heaps.filter((heap) => heap.status === "fulfilled").map((heap) => heap.value);
      samples.push({ phase: label, time: new Date().toISOString(), osMemory,
        mainJsHeapBytes: heaps[0].status === "fulfilled" ? heaps[0].value.usedSize : null,
        contextJsHeapBytes: available.reduce((sum, heap) => sum + heap.usedSize, 0),
        contextBackingStorageBytes: available.reduce((sum, heap) => sum + (heap.backingStorageSize || 0), 0),
        sampledContexts: available.length,
      });
    } catch (error) { errors.push({ phase: label, message: String(error) }); }
    finally { busy = false; }
  };
  const timer = setInterval(() => { void sample(); }, 2000);
  return {
    samples, errors, sample,
    setPhase: (name) => { phase = name; },
    async stop() {
      clearInterval(timer);
      while (busy) await new Promise((resolve) => setTimeout(resolve, 50));
      socket.close();
    },
  };
}
