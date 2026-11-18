import { afterEach, describe, expect, it, vi } from "vitest";
import { addItem, getLocalItemsCount, migrateLocalToCloud } from "../src/services/storageService";
import { isAuthenticated, supabase } from "../src/services/supabaseClient";

vi.mock("../src/services/supabaseClient", () => ({
  isAuthenticated: vi.fn(async () => true),
  isSessionKnownInvalid: vi.fn(() => false),
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() } },
  setSyncStatus: vi.fn(),
  handleAuthError: vi.fn(),
  isAuthError: vi.fn(),
}));

describe("local OCR storage policy", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("reports metadata quota failure instead of claiming the import succeeded", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => { throw new DOMException("Full", "QuotaExceededError"); } });
    await expect(addItem({ text: "image", storageScope: "local" })).rejects.toThrow();
  });

  it("never migrates a local-only image on sign-in", async () => {
    const records = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => records.set(key, value),
      removeItem: (key: string) => records.delete(key),
    });
    const item = await addItem({
      text: "Image awaiting OCR review", sourceTitle: "sample", tags: ["image"],
      localAssetHash: "a".repeat(64), storageScope: "local",
    });
    expect(item.storageScope).toBe("local");
    expect(item.imageUrl).toBeUndefined();
    expect(getLocalItemsCount()).toBe(0);
    expect(await migrateLocalToCloud()).toEqual({ success: 0, failed: 0 });
    expect(isAuthenticated).toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
    expect(JSON.parse(records.get("researchMateItems") || "[]")).toHaveLength(1);
  });
});
