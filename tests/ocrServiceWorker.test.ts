import { readFileSync } from "node:fs";
import vm from "node:vm";
import { expect, it, vi } from "vitest";

function worker() {
  const handlers: Record<string, (event: any) => void> = {};
  const entries = new Map();
  const cache = { match: async (key: any) => entries.get(typeof key === "string" ? key : key.url), put: async (key: any, value: any) => { entries.set(typeof key === "string" ? key : key.url, value); } };
  const caches = { open: async () => cache, keys: async () => ["other-app", "researchmate-cache-v2", "researchmate-sw-shell-v1", "researchmate-sw-shell-v3", "researchmate-sw-ocr-runtime-v7"], delete: vi.fn(async () => true) };
  vm.runInNewContext(readFileSync("public/sw.js", "utf8"), {
    URL, caches, console, fetch: async () => new Response("runtime"),
    self: { location: { origin: "https://test.local" }, addEventListener: (name: string, fn: any) => { handlers[name] = fn; }, clients: { claim: async () => {} } },
  });
  return { handlers, caches, entries };
}
it("deletes only stale caches owned by this worker", async () => {
  const { handlers, caches } = worker(); let task: Promise<any>;
  handlers.activate({ waitUntil: (promise: Promise<any>) => { task = promise; } });
  await task!;
  expect(caches.delete.mock.calls.map(([key]) => key)).toEqual(["researchmate-cache-v2", "researchmate-sw-shell-v1"]);
});
it("bounds runtime cache entries even with query variations and never caches models", async () => {
  const { handlers, entries } = worker();
  for (let i = 0; i < 10; i++) {
    let task: Promise<any> | undefined;
    handlers.fetch({ request: new Request(`https://test.local/ocr/7.0.0/worker.min.js?v=${i}`), respondWith: (promise: Promise<any>) => { task = promise; } });
    await task;
  }
  expect(entries.size).toBe(1);
  const respondWith = vi.fn();
  handlers.fetch({ request: new Request("https://test.local/ocr/7.0.0/lang/eng.traineddata.gz"), respondWith });
  expect(respondWith).not.toHaveBeenCalled();
});
