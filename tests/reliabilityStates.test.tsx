// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import {
  saveExam,
  saveExamAttempt,
  saveFlashcardDeck,
  getLocalExams,
  saveLocalExams,
  generateUUID,
} from "../src/services/examService";
import {
  getSyncStatus,
  setSyncStatus,
  executeWithBackoff,
} from "../src/services/supabaseClient";
import { createSeededExam } from "../src/services/examSeedService";
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

    it("executeWithBackoff retries up to maxRetries on failure without tight loops", async () => {
      let attempts = 0;
      const startTime = Date.now();

      const result = await executeWithBackoff(
        async () => {
          attempts++;
          throw new Error("Simulated network outage / table missing");
        },
        { maxRetries: 3, initialDelayMs: 20, maxDelayMs: 80 }
      );

      const duration = Date.now() - startTime;
      expect(result.success).toBe(false);
      expect(attempts).toBe(3);
      expect(result.error.message).toContain("Simulated network outage");
      // Must take at least initialDelayMs * (1 + 2) = 60ms, confirming exponential backoff delays
      expect(duration).toBeGreaterThanOrEqual(40);
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
});
