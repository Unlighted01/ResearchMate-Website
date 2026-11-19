import { expect, it } from "vitest";
import { readProcessMemory } from "../scripts/browserMemory.mjs";

it("rejects nonnumeric process IDs before creating shell code", async () => {
  await expect(readProcessMemory(["1; invalid"])).rejects.toThrow(/Invalid process IDs/);
});

it.skipIf(process.platform !== "win32")("retains live counters when another process has exited", async () => {
  const memory = await readProcessMemory([process.pid, 2147483647]);
  expect(memory.processCount).toBe(1);
  expect(memory.missingProcessIds).toContain(2147483647);
  expect(memory.workingSetBytes).toBeGreaterThan(0);
  expect(memory.privateBytes).toBeGreaterThan(0);
}, 10000);
