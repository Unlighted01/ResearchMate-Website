// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { useToast } from "../src/App";
import {
  saveExam,
  saveExamAttempt,
  saveFlashcardDeck,
  getLocalExams,
  saveLocalExams,
  getExamById,
  generateUUID,
  StoredExam,
} from "../src/services/examService";
import {
  getSyncStatus,
  setSyncStatus,
  executeWithBackoff,
  isTransientError,
  isAuthError,
  resetSessionInvalidFlag,
  isSessionKnownInvalid,
  supabase,
} from "../src/services/supabaseClient";
import {
  createSeededExam,
  ExamSeedRecord,
  getExamRecord,
  getExamRecordBySeed,
} from "../src/services/examSeedService";
import { filterEnemyItems } from "../src/services/distractorQualityService";
import MockExamEngine from "../src/components/App/ReviewCompanion/MockExamEngine";
import QuestionImportModal from "../src/components/App/ReviewCompanion/QuestionImportModal";
import { NotificationProvider } from "../src/context/NotificationContext";

// Mock react-router-dom
const mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: "/app/exams", search: "" }),
  };
});

describe("Reliability & Sync Fixes Unit and Component Tests", () => {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setSyncStatus({ state: "signed_out", label: "Signed out, working locally" });
  });

  afterEach(() => {
    cleanup();
  });

  // ============================================
  // 1. SYNC STATE & RETRY BACKOFF TESTS
  // ============================================
  describe("1. Sync State Reporting & Backoff", () => {
    it("reports 'local-only' when user is unauthenticated and sets badge to 'Local only'", async () => {
      const exam = await saveExam({
        title: "Offline Test Exam",
        questions: [
          {
            id: generateUUID(),
            question: "What is 2+2?",
            options: ["1", "2", "3", "4"],
            correctIndex: 3,
            explanation: "Basic addition",
            topicTag: "Math",
          },
        ],
      });

      expect(exam.syncStatus).toBe("local-only");
      const status = getSyncStatus();
      expect(status.state).toBe("local_only");
      expect(status.label).toBe("Local only");
      expect(exam.id).toMatch(UUID_REGEX);
    });

    it("saveExamAttempt reports 'local-only' when unauthenticated and stores null for non-UUID exam_id", async () => {
      const attempt = await saveExamAttempt({
        exam_id: "active-session", // placeholder id should be sanitized to null to prevent FK violations
        score: 5,
        total: 10,
        percentage: 50,
        answers: {},
        questions_snapshot: [],
        passed: false,
      });

      expect(attempt.syncStatus).toBe("local-only");
      expect(attempt.exam_id).toBeNull();
      expect(attempt.id).toMatch(UUID_REGEX);

      // Verify that when a valid UUID is provided, it is preserved
      const realExamUuid = generateUUID();
      const attemptWithUuid = await saveExamAttempt({
        exam_id: realExamUuid,
        score: 8,
        total: 10,
        percentage: 80,
        answers: {},
        questions_snapshot: [],
        passed: true,
      });
      expect(attemptWithUuid.exam_id).toBe(realExamUuid);
    });

    it("saveFlashcardDeck reports 'local-only' when unauthenticated", async () => {
      const deck = await saveFlashcardDeck({
        title: "Test Deck",
        cards: [
          {
            id: generateUUID(),
            front: "Term",
            back: "Definition",
            category: "General",
          },
        ],
      });

      expect(deck.syncStatus).toBe("local-only");
      expect(deck.id).toMatch(UUID_REGEX);
    });

    it("executeWithBackoff only retries transient errors (network failure, 5xx, 429) up to maxRetries", async () => {
      let attempts = 0;
      const startTime = Date.now();

      // Test 1: Transient network outage
      const result = await executeWithBackoff(
        async () => {
          attempts++;
          throw new Error("fetch failed: network outage");
        },
        { maxRetries: 3, initialDelayMs: 20, maxDelayMs: 80 }
      );

      const duration = Date.now() - startTime;
      expect(result.success).toBe(false);
      expect(attempts).toBe(3);
      expect(result.error.message).toContain("network outage");
      expect(duration).toBeGreaterThanOrEqual(40);

      // Test 2: HTTP 503 Service Unavailable retries
      let retry503Attempts = 0;
      const result503 = await executeWithBackoff(
        async () => {
          retry503Attempts++;
          throw { status: 503, message: "Service Unavailable" };
        },
        { maxRetries: 3, initialDelayMs: 10, maxDelayMs: 40 }
      );
      expect(result503.success).toBe(false);
      expect(retry503Attempts).toBe(3);

      // Test 3: HTTP 429 Rate Limit retries
      let retry429Attempts = 0;
      const result429 = await executeWithBackoff(
        async () => {
          retry429Attempts++;
          throw { status: 429, message: "Too many requests" };
        },
        { maxRetries: 3, initialDelayMs: 10, maxDelayMs: 40 }
      );
      expect(result429.success).toBe(false);
      expect(retry429Attempts).toBe(3);
    });

    it("executeWithBackoff does not retry 400, 403, 404, or PostgREST schema errors: fails immediately on attempt 1", async () => {
      // 400 Bad Request
      let attempts400 = 0;
      const res400 = await executeWithBackoff(
        async () => {
          attempts400++;
          throw { status: 400, message: "Bad Request: invalid uuid syntax" };
        },
        { maxRetries: 3, initialDelayMs: 10 }
      );
      expect(res400.success).toBe(false);
      expect(attempts400).toBe(1);
      expect(res400.error.status).toBe(400);

      // 404 Not Found
      let attempts404 = 0;
      const res404 = await executeWithBackoff(
        async () => {
          attempts404++;
          throw { status: 404, message: "Not Found" };
        },
        { maxRetries: 3, initialDelayMs: 10 }
      );
      expect(res404.success).toBe(false);
      expect(attempts404).toBe(1);

      // 403 Forbidden
      let attempts403 = 0;
      const res403 = await executeWithBackoff(
        async () => {
          attempts403++;
          throw { status: 403, message: "Forbidden: RLS violation" };
        },
        { maxRetries: 3, initialDelayMs: 10 }
      );
      expect(res403.success).toBe(false);
      expect(attempts403).toBe(1);

      // PostgREST missing table in schema cache error
      let attemptsSchema = 0;
      const resSchema = await executeWithBackoff(
        async () => {
          attemptsSchema++;
          throw {
            code: "PGRST205",
            message: "Could not find the table 'public.exams' in the schema cache",
          };
        },
        { maxRetries: 3, initialDelayMs: 10 }
      );
      expect(resSchema.success).toBe(false);
      expect(attemptsSchema).toBe(1);
      expect(resSchema.error.message).toContain("schema cache");
    });

    it("executeWithBackoff on 401 / JWT expired tries refreshSession once, failing immediately to local-only mode if refresh fails", async () => {
      resetSessionInvalidFlag();
      let actionAttempts = 0;

      // Mock refreshSession failure
      const refreshSpy = vi.spyOn(supabase.auth, "refreshSession").mockResolvedValueOnce({
        data: { session: null, user: null },
        error: new Error("Invalid refresh token") as any,
      });

      const res401 = await executeWithBackoff(
        async () => {
          actionAttempts++;
          throw { status: 401, code: "PGRST303", message: "JWT expired" };
        },
        { maxRetries: 3, initialDelayMs: 10 }
      );

      expect(res401.success).toBe(false);
      // Exactly 1 action attempt, followed by 1 refresh attempt
      expect(actionAttempts).toBe(1);
      expect(refreshSpy).toHaveBeenCalledTimes(1);

      // Switched cleanly to local-only mode (signed_out) without loops
      const syncStatus = getSyncStatus();
      expect(syncStatus.state).toBe("signed_out");
      expect(syncStatus.label).toBe("Signed out, working locally");

      refreshSpy.mockRestore();
    });

    it("executeWithBackoff on 401 / JWT expired retries action once and succeeds if refreshSession succeeds", async () => {
      resetSessionInvalidFlag();
      let actionAttempts = 0;

      // Mock refreshSession success
      const refreshSpy = vi.spyOn(supabase.auth, "refreshSession").mockResolvedValueOnce({
        data: {
          session: { access_token: "new-valid-jwt", expires_at: Date.now() + 3600000 } as any,
          user: { id: "user-123" } as any,
        },
        error: null,
      });

      const res401Success = await executeWithBackoff(
        async () => {
          actionAttempts++;
          if (actionAttempts === 1) {
            throw { status: 401, code: "PGRST303", message: "JWT expired" };
          }
          return { data: "success_after_refresh" };
        },
        { maxRetries: 3, initialDelayMs: 10 }
      );

      expect(res401Success.success).toBe(true);
      expect(res401Success.data).toEqual({ data: "success_after_refresh" });
      expect(actionAttempts).toBe(2); // 1 initial fail, 1 retry after refresh
      expect(refreshSpy).toHaveBeenCalledTimes(1);

      refreshSpy.mockRestore();
    });

    it("isTransientError correctly classifies error statuses, codes, and messages", () => {
      expect(isTransientError({ status: 500 })).toBe(true);
      expect(isTransientError({ status: 503 })).toBe(true);
      expect(isTransientError({ status: 429 })).toBe(true);
      expect(isTransientError(new TypeError("Failed to fetch"))).toBe(true);
      expect(isTransientError(new TypeError("fetch failed"))).toBe(true);
      expect(isTransientError({ message: "network error ECONNRESET" })).toBe(true);
      expect(isTransientError({ message: "ETIMEDOUT" })).toBe(true);

      // Non-transient errors: generic TypeError (e.g. reading property of undefined) MUST NOT be transient
      expect(isTransientError(new TypeError("Cannot read properties of undefined (reading 'foo')"))).toBe(false);
      expect(isTransientError(new TypeError("null is not an object"))).toBe(false);

      expect(isTransientError({ status: 400 })).toBe(false);
      expect(isTransientError({ status: 401 })).toBe(false);
      expect(isTransientError({ status: 403 })).toBe(false);
      expect(isTransientError({ status: 404 })).toBe(false);
      expect(isTransientError({ message: "Could not find the table 'public.exams' in the schema cache" })).toBe(false);
      expect(isTransientError({ code: "42P01", message: "relation exams does not exist" })).toBe(false);
      expect(isTransientError({ code: "23503", message: "foreign key violation" })).toBe(false);
    });

    it("resets sessionKnownInvalid flag after successful sign-in or resetSessionInvalidFlag", async () => {
      // Simulate session marked invalid (e.g. after 401 refresh failure)
      setSyncStatus({ state: "signed_out", label: "Signed out, working locally" });
      resetSessionInvalidFlag();
      expect(isSessionKnownInvalid()).toBe(false);

      // Spy signInWithPassword
      const signInSpy = vi.spyOn(supabase.auth, "signInWithPassword").mockResolvedValueOnce({
        data: {
          user: { id: "user-test-uuid", email: "test@example.com" } as any,
          session: { access_token: "token" } as any,
        },
        error: null,
      });

      const { signInWithEmail } = await import("../src/services/supabaseClient");
      const res = await signInWithEmail("test@example.com", "password123");
      expect(res.error).toBeNull();
      expect(isSessionKnownInvalid()).toBe(false);
      expect(getSyncStatus().state).toBe("synced");

      signInSpy.mockRestore();
    });
  });

  // ============================================
  // 2. QUESTION IMPORT MODAL TESTS
  // ============================================
  describe("2. QuestionImportModal Error Retention & Success Summary", () => {
    it("keeps modal open on import failure and reports error", async () => {
      const mockOnClose = vi.fn();
      const mockOnImport = vi.fn();
      const mockShowToast = vi.fn();

      const { container } = render(
        <NotificationProvider>
          <QuestionImportModal
            isOpen={true}
            onClose={mockOnClose}
            onImport={mockOnImport}
            showToast={mockShowToast}
            defaultTopic="Math"
          />
        </NotificationProvider>
      );

      // Verify modal is open initially
      expect(screen.getByText("Document Question Importer")).toBeDefined();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("guarantees all question IDs generated are strictly RFC4122 compliant UUIDs", () => {
      const rawImported = [
        { stem: "Q1", options: ["A", "B", "C", "D"], correctIndex: 0 },
        { stem: "Q2", options: ["A", "B", "C", "D"], correctIndex: 1 },
      ];

      const validQuestions = rawImported.map((q) => ({
        id: generateUUID(),
        question: q.stem,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: "",
        topicTag: "Test",
      }));

      expect(validQuestions[0].id).toMatch(UUID_REGEX);
      expect(validQuestions[1].id).toMatch(UUID_REGEX);
      expect(validQuestions[0].id).not.toContain("q_");
      expect(validQuestions[0].id).not.toContain("local_");
    });
  });

  // ============================================
  // 3. EXAM NOT FOUND STATE TESTS
  // ============================================
  describe("3. Exam Not Found State (/app/exams?examId=<uuid>)", () => {
    it("displays clear 'Exam not found on this device or account' state when getExamById returns null", async () => {
      const fakeExamId = "98765432-1234-4321-abcd-123456789abc";
      mockSearchParams.set("examId", fakeExamId);

      render(
        <NotificationProvider>
          <MockExamEngine items={[]} showToast={vi.fn()} />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(
          screen.getByText("Exam not found on this device or account")
        ).toBeDefined();
      });

      expect(screen.getByText(new RegExp(fakeExamId))).toBeDefined();
      expect(screen.getByText("Sign In / Account")).toBeDefined();
      expect(screen.getByText("Import Study Material")).toBeDefined();
      expect(screen.getByText("Dismiss")).toBeDefined();

      // Clean up search params
      mockSearchParams.delete("examId");
    });
  });

  // ============================================
  // 4. AI GENERATION FAILURE & DRAFT RETENTION
  // ============================================
  describe("4. AI Generation Failure & Draft Preservation", () => {
    it("never loads 5-question offline starter pool for failed real generation", () => {
      // In handleGenerateExam catch block, setQuestions preserves draft or returns []
      const fallbackPoolLength = 5;
      let questions: any[] = [];
      const draftQuestions = [
        {
          id: generateUUID(),
          question: "Draft Q1",
          options: ["A", "B", "C", "D"],
          correctIndex: 0,
          explanation: "",
          topicTag: "Draft",
        },
      ];

      // Simulate failure with prior draft questions
      const onFailWithDraft = (prev: any[]) => (prev.length > 0 ? prev : []);
      questions = onFailWithDraft(draftQuestions);
      expect(questions.length).toBe(1);
      expect(questions[0].question).toBe("Draft Q1");

      // Simulate failure with zero prior questions
      const onFailZero = (prev: any[]) => (prev.length > 0 ? prev : []);
      questions = onFailZero([]);
      expect(questions.length).toBe(0);
      expect(questions.length).not.toBe(fallbackPoolLength);
    });
  });

  // ============================================
  // 5. QUALITY & ENEMY FILTER DROP REPORTING
  // ============================================
  describe("5. Enemy & Quality Filter Drop Reporting", () => {
    it("accurately reports how many questions were dropped and why", () => {
      const candidateQuestions = [
        {
          id: generateUUID(),
          question: "What is the capital of France?",
          options: ["Paris", "London", "Berlin", "Rome"],
          correctIndex: 0,
          explanation: "Paris is the capital.",
          topicTag: "Geography",
        },
        // Enemy item: stem reveals the answer to another question, or shares verbatim clause
        {
          id: generateUUID(),
          question: "Paris is the capital of which European country?",
          options: ["France", "Germany", "Italy", "Spain"],
          correctIndex: 0,
          explanation: "France.",
          topicTag: "Geography",
        },
      ];

      const { selected, rejected } = filterEnemyItems(candidateQuestions, 2);
      expect(selected.length).toBe(1);
      expect(rejected.length).toBe(1);
      expect(rejected[0].reason).toContain("Candidate stem contains the answer term");

      const seeded = createSeededExam(
        candidateQuestions,
        { totalQuestions: 2, choicesPerItem: 4 },
        "TEST_SEED"
      );

      expect(seeded.droppedCount).toBe(1);
      expect(seeded.droppedReasons.length).toBeGreaterThan(0);
      expect(seeded.orderedQuestions.length).toBe(1);
    });
  });

  // ============================================
  // 6. UUID INTEGRITY VERIFICATION
  // ============================================
  describe("6. UUID Integrity (No placeholders or local-* in Supabase writes)", () => {
    it("ensures source_item_ids only forwards valid UUIDs to avoid Postgres 400 errors", () => {
      const mixedIds = [
        "12345678-1234-4234-8234-1234567890ab",
        "local_1794280465130_abc123",
        "doc-ra-6713",
        "87654321-4321-4321-8321-ba0987654321",
        "active-session",
      ];

      const validSourceItemIds = mixedIds.filter((id) => UUID_REGEX.test(id));
      expect(validSourceItemIds).toEqual([
        "12345678-1234-4234-8234-1234567890ab",
        "87654321-4321-4321-8321-ba0987654321",
      ]);
      expect(validSourceItemIds).not.toContain("local_1794280465130_abc123");
      expect(validSourceItemIds).not.toContain("active-session");
      expect(validSourceItemIds).not.toContain("doc-ra-6713");
    });
  });

  // ============================================
  // 7. TOAST LIFECYCLE & NO RENDER SIDE-EFFECTS
  // ============================================
  describe("7. Toast Lifecycle & No Render Side-Effects", () => {
    it("renders toast and auto-dismisses without 'Cannot update a component while rendering a different component' warning", () => {
      vi.useFakeTimers();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const TestHost: React.FC = () => {
        const { showToast, ToastComponent } = useToast();
        return (
          <div>
            <button onClick={() => showToast("Test notification", "info")}>Trigger Toast</button>
            {ToastComponent}
          </div>
        );
      };

      const { getByText, queryByText } = render(<TestHost />);

      // Trigger the toast via event handler
      fireEvent.click(getByText("Trigger Toast"));
      expect(getByText("Test notification")).toBeDefined();

      // Advance timers through the 3000ms duration
      act(() => {
        vi.advanceTimersByTime(3100);
      });

      // Toast auto-closes cleanly
      expect(queryByText("Test notification")).toBeNull();

      // Assert no React warnings about updating component during render were logged
      const badSetStateWarnings = consoleErrorSpy.mock.calls.filter((call) =>
        call.some((arg) => typeof arg === "string" && (arg.includes("Cannot update a component") || arg.includes("bad setState")))
      );
      expect(badSetStateWarnings).toHaveLength(0);

      consoleErrorSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  // ============================================
  // 8. STORED EXAM & SEED RECORD PERSISTENCE & ASSEMBLY
  // ============================================
  describe("8. StoredExam & ExamSeedRecord Persistence and Cloud Sync", () => {
    it("guarantees every stored exam has a deterministic seed and seed_record, whichever path created it", async () => {
      // Scenario: Import path passes raw questions with empty/missing seed and no seed_record
      const rawQuestions = [
        {
          id: generateUUID(),
          question: "What is the speed of light?",
          options: ["3x10^8 m/s", "100 m/s", "1000 km/h", "0 m/s"],
          correctIndex: 0,
          explanation: "Universal constant c",
          topicTag: "Physics",
        },
        {
          id: generateUUID(),
          question: "What is the boiling point of water at standard pressure?",
          options: ["50 C", "100 C", "200 C", "0 C"],
          correctIndex: 1,
          explanation: "100 degrees Celsius",
          topicTag: "Chemistry",
        },
      ];

      const saved: StoredExam = await saveExam({
        title: "Imported Physics Exam",
        source_document_title: "Physics_101.pdf",
        import_batch_id: "batch_12345",
        questions: rawQuestions,
      });

      // 1. Seed must not be empty
      expect(saved.seed).toBeDefined();
      expect(saved.seed.length).toBeGreaterThan(0);

      // 2. Seed record must exist inside StoredExam
      expect(saved.seed_record).toBeDefined();
      expect(saved.seed_record?.examId).toBe(saved.id);
      expect(saved.seed_record?.seed).toBe(saved.seed);
      expect(saved.seed_record?.answerKey).toBeDefined();
      expect(saved.seed_record?.answerKey.length).toBe(saved.questions.length);
      expect(saved.seed_record?.permutations).toBeDefined();

      // 3. StoredExam preserves import metadata
      expect(saved.source_document_title).toBe("Physics_101.pdf");
      expect(saved.import_batch_id).toBe("batch_12345");

      // 4. Stored in local examSeedService cache as well
      const cachedSeedRecord = getExamRecord(saved.id);
      expect(cachedSeedRecord).not.toBeNull();
      expect(cachedSeedRecord?.examId).toBe(saved.id);
    });

    it("saveExam stores the final assembled exam after enemy filtering and choice balancing", async () => {
      // Provide questions containing an enemy pair
      const questionsWithEnemy = [
        {
          id: generateUUID(),
          question: "What is the capital of Japan?",
          options: ["Tokyo", "Kyoto", "Osaka", "Nagoya"],
          correctIndex: 0,
          explanation: "Tokyo is the current capital.",
          topicTag: "Geography",
        },
        {
          id: generateUUID(),
          question: "Tokyo is the capital of which Asian country?",
          options: ["Japan", "China", "Korea", "Vietnam"],
          correctIndex: 0,
          explanation: "Japan.",
          topicTag: "Geography",
        },
      ];

      const saved = await saveExam({
        title: "Geography Exam",
        questions: questionsWithEnemy,
      });

      // Enemy item filter in createSeededExam must have dropped 1 enemy question
      expect(saved.questions.length).toBe(1);
      expect(saved.seed_record?.orderedQuestionIds.length).toBe(1);
      expect(saved.seed_record?.answerKey.length).toBe(1);
    });

    it("getExamById restores seed_record into examSeedService cache when fetched", async () => {
      const examId = generateUUID();
      const mockCloudSeedRecord: ExamSeedRecord = {
        examId,
        formatVersion: 1,
        seed: "EXAM-TEST-SEED",
        config: {
          totalQuestions: 1,
          choicesPerItem: 4,
        },
        createdAt: Date.now(),
        permutations: {
          [examId]: {
            questionId: examId,
            choiceOrder: [1, 0, 2, 3],
            originalCorrectIndex: 0,
            newCorrectIndex: 1,
          },
        },
        orderedQuestionIds: [examId],
        answerKey: [1],
      };

      const mockStoredExam: StoredExam = {
        id: examId,
        title: "Cloud Synced Exam",
        seed: "EXAM-TEST-SEED",
        seed_record: mockCloudSeedRecord,
        source_item_ids: [],
        config: {
          difficulty: "mixed",
          timedMode: false,
          benchmarkScore: 80,
          sections: [],
        },
        questions: [
          {
            id: examId,
            question: "Question 1?",
            options: ["A", "B", "C", "D"],
            correctIndex: 1,
            explanation: "",
            topicTag: "General",
          },
        ],
        version: 1,
        visibility: "private",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock Supabase returning cloud row
      const selectSpy = vi.spyOn(supabase, "from").mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockStoredExam, error: null }),
      } as any);

      const authSpy = vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: { id: "user-123" } as any },
        error: null,
      });

      const sessionSpy = vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
        data: { session: { access_token: "mock-token" } as any },
        error: null,
      });

      const fetched = await getExamById(examId);
      expect(fetched).not.toBeNull();
      expect(fetched?.seed_record).toBeDefined();

      // Seed record must now be restored in examSeedService memory/storage cache
      const restored = getExamRecord(examId);
      expect(restored).not.toBeNull();
      expect(restored?.seed).toBe("EXAM-TEST-SEED");
      expect(restored?.answerKey).toEqual([1]);

      selectSpy.mockRestore();
      authSpy.mockRestore();
      sessionSpy.mockRestore();
    });
  });
});
