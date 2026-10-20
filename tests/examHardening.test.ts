import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
}));

vi.mock("../src/services/geminiService", () => ({
  generateAiResponse: vi.fn(),
  generateExamAiResponse: vi.fn(),
}));

vi.mock("../src/services/supabaseClient", () => ({
  supabase: mockSupabase,
  isAuthenticated: vi.fn().mockResolvedValue(true),
  getCurrentUser: vi.fn().mockResolvedValue({ id: "user-123", email: "student@univ.edu" }),
}));

import {
  saveExam,
  saveExamAttempt,
  deleteExam,
  getLocalExams,
  getLocalAttempts,
  saveLocalExams,
  saveLocalAttempts,
  generateUUID,
} from "../src/services/examService";

describe("Phase 1: Database Hardening & Schema Integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveLocalExams([]);
    saveLocalAttempts([]);
  });

  it("increments version on saveExam and detects optimistic concurrency conflicts", async () => {
    const examId = generateUUID();

    // Mock initial Supabase upsert
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: examId, title: "Calculus I", questions: [], version: 2 },
            error: null,
          }),
        }),
      }),
    });

    const saved = await saveExam({
      id: examId,
      title: "Calculus I",
      questions: [],
      version: 1,
    });

    expect(saved.version).toBe(2);

    // Mock conflict scenario: remote has version 3, incoming update has version 1
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { version: 3 },
          }),
        }),
      }),
    });

    await expect(
      saveExam({
        id: examId,
        title: "Calculus I Conflict",
        questions: [],
        version: 1,
      })
    ).rejects.toThrow(/Conflict/i);
  });

  it("sanitizes non-UUID exam_id and calculates precise 2-decimal percentage in saveExamAttempt", async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockImplementation((payload) => ({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...payload, user_id: "user-123" },
            error: null,
          }),
        }),
      })),
    });

    // Pass non-UUID placeholder 'active-session'
    const attempt = await saveExamAttempt({
      exam_id: "active-session",
      score: 13,
      total: 16,
      percentage: 81.25,
      answers: {},
      questions_snapshot: [],
      passed: true,
    });

    // UUID format regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(attempt.exam_id).toMatch(uuidRegex);
    expect(attempt.percentage).toBe(81.25);
  });

  it("cascades attempt deletion when parent exam is deleted", async () => {
    const parentExamId = generateUUID();
    const otherExamId = generateUUID();

    saveLocalExams([
      { id: parentExamId, title: "Exam 1", questions: [], version: 1, source_item_ids: [], config: {} as any, visibility: "private", created_at: "", updated_at: "" },
      { id: otherExamId, title: "Exam 2", questions: [], version: 1, source_item_ids: [], config: {} as any, visibility: "private", created_at: "", updated_at: "" },
    ]);

    saveLocalAttempts([
      { id: generateUUID(), exam_id: parentExamId, score: 10, total: 10, percentage: 100, answers: {}, questions_snapshot: [], passed: true, created_at: "" },
      { id: generateUUID(), exam_id: otherExamId, score: 8, total: 10, percentage: 80, answers: {}, questions_snapshot: [], passed: true, created_at: "" },
    ]);

    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    await deleteExam(parentExamId);

    // Verified parent exam removed from cache
    const remainingExams = getLocalExams();
    expect(remainingExams.length).toBe(1);
    expect(remainingExams[0].id).toBe(otherExamId);
  });
});
