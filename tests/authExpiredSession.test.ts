import { describe, it, expect, beforeEach, vi } from "vitest";

// Ensure localStorage mock is present in Node/Vitest environment
if (typeof globalThis.localStorage === "undefined") {
  let store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

import {
  supabase,
  isAuthError,
  handleAuthError,
  isSessionKnownInvalid,
  resetSessionInvalidFlag,
  isAuthenticated,
  signOut,
  getSyncStatus,
  subscribeToSyncStatus,
  SyncStatus,
} from "../src/services/supabaseClient";
import { getAllItems } from "../src/services/storageService";
import { getAllCollections } from "../src/services/collectionsService";
import { saveQuestionsToBank, getBankStats } from "../src/services/questionBankService";

describe("Bugfix: Expired Session & Local-Only Fallback Guard", () => {
  beforeEach(() => {
    localStorage.clear();
    resetSessionInvalidFlag();
    vi.restoreAllMocks();
  });

  it("accurately identifies JWT-expired and 401/403 auth errors", () => {
    expect(isAuthError({ code: "PGRST303", message: "JWT expired" })).toBe(true);
    expect(isAuthError({ status: 401, message: "Unauthorized" })).toBe(true);
    expect(isAuthError({ status: 403, message: "Forbidden" })).toBe(true);
    expect(isAuthError({ code: "401", message: "Invalid token" })).toBe(true);
    expect(isAuthError({ message: "token is expired by 3600s" })).toBe(true);

    expect(isAuthError({ code: "23505", message: "duplicate key value" })).toBe(false);
    expect(isAuthError({ status: 500, message: "Internal server error" })).toBe(false);
    expect(isAuthError(null)).toBe(false);
  });

  it("on JWT-expired error, attempts refresh; if refresh fails, signs out cleanly to local mode and preserves local question bank", async () => {
    // 1. Seed existing local Question Bank, exams, and decks
    saveQuestionsToBank(
      [
        {
          id: "q-local-1",
          question: "What is 2 + 2?",
          options: ["3", "4", "5", "6"],
          correctIndex: 1,
          explanation: "Basic arithmetic",
          topicTag: "Math",
        },
      ],
      "Local Document",
      "append"
    );

    localStorage.setItem("rm_local_exams", JSON.stringify([{ id: "exam-1", title: "Practice Exam" }]));
    localStorage.setItem("rm_local_decks", JSON.stringify([{ id: "deck-1", title: "Flashcard Deck" }]));
    localStorage.setItem("researchmate-auth", JSON.stringify({ access_token: "expired-token" }));
    localStorage.setItem("supabase.auth.token", "token-value");

    // 2. Mock refreshSession to simulate failed refresh (dead/revoked token)
    vi.spyOn(supabase.auth, "refreshSession").mockResolvedValue({
      data: { session: null, user: null },
      error: new Error("Refresh token expired"),
    } as any);

    vi.spyOn(supabase.auth, "signOut").mockResolvedValue({ error: null } as any);

    // 3. Track sync status changes
    let observedStatus: SyncStatus | null = null;
    const unsubscribe = subscribeToSyncStatus((status) => {
      observedStatus = status;
    });

    // 4. Trigger handleAuthError with PGRST303
    const refreshed = await handleAuthError({ code: "PGRST303", message: "JWT expired" });
    expect(refreshed).toBe(false);

    // 5. Verify session is marked known-invalid
    expect(isSessionKnownInvalid()).toBe(true);

    // 6. Verify ONLY Supabase auth keys were cleared from localStorage
    expect(localStorage.getItem("researchmate-auth")).toBeNull();
    expect(localStorage.getItem("supabase.auth.token")).toBeNull();
    expect(localStorage.getItem("rm_guest_mode")).toBe("true");

    // 7. CRUCIAL: Question Bank, exams, and decks are completely preserved!
    const stats = getBankStats();
    expect(stats.totalQuestions).toBe(1);
    expect(localStorage.getItem("rm_local_exams")).toContain("Practice Exam");
    expect(localStorage.getItem("rm_local_decks")).toContain("Flashcard Deck");

    // 8. Verify status badge changed to 'Signed out, working locally'
    expect(getSyncStatus().state).toBe("signed_out");
    expect(getSyncStatus().label).toBe("Signed out, working locally");
    expect(observedStatus?.label).toBe("Signed out, working locally");

    // 9. Verify isAuthenticated now reports false
    const authState = await isAuthenticated();
    expect(authState).toBe(false);

    unsubscribe();
  });

  it("prevents tight retry loops by immediately short-circuiting cloud calls when session is known invalid", async () => {
    // Put system in known invalid session state
    await handleAuthError({ code: "PGRST303", message: "JWT expired" });
    expect(isSessionKnownInvalid()).toBe(true);

    const fromSpy = vi.spyOn(supabase, "from");

    // Attempting to fetch items should NOT call supabase.from("items")
    const items = await getAllItems(10, 0);
    expect(items).toEqual([]);

    // Attempting to fetch collections should NOT call supabase.from("collections")
    const collections = await getAllCollections();
    expect(collections).toEqual([]);

    // Verify zero calls made to supabase.from
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it("signOut cleans only Supabase keys and retains local student materials", async () => {
    localStorage.setItem("researchmate-auth", "mock-auth");
    localStorage.setItem("rm_local_exams", JSON.stringify([{ id: "exam-99" }]));

    vi.spyOn(supabase.auth, "signOut").mockResolvedValue({ error: null } as any);

    await signOut();

    expect(isSessionKnownInvalid()).toBe(true);
    expect(localStorage.getItem("researchmate-auth")).toBeNull();
    expect(localStorage.getItem("rm_local_exams")).toContain("exam-99");
    expect(getSyncStatus().label).toBe("Signed out, working locally");
  });
});
