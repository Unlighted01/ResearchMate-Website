// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MockExamEngine from "../src/components/App/ReviewCompanion/MockExamEngine";
import { NotificationProvider } from "../src/context/NotificationContext";
import { StorageItem } from "../src/services/storageService";
import { clearQuestionBank, saveQuestionsToBank } from "../src/services/questionBankService";

// Mock Supabase
vi.mock("../src/services/supabaseClient", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
    }),
  },
  isAuthenticated: vi.fn().mockResolvedValue(false),
  getCurrentUser: vi.fn().mockResolvedValue(null),
  setSyncStatus: vi.fn(),
  executeWithBackoff: vi.fn().mockImplementation(async (action) => {
    try {
      const data = await action();
      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  }),
}));

describe("MockExamEngine Component Render Tests", () => {
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    clearQuestionBank();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  const sampleItems: StorageItem[] = [
    {
      id: "doc-ra-6713",
      title: "RA 6713 Code of Conduct",
      text: "Code of Conduct and Ethical Standards for Public Officials and Employees",
      note: "Philippine statutory ethics code",
      sourceUrl: "https://lawphil.net/statutes/repacts/ra1989/ra_6713_1989.html",
      sourceTitle: "RA 6713",
      tags: ["ethics", "law"],
      createdAt: new Date().toISOString(),
      deviceSource: "web",
    },
  ];

  it("1. renders cleanly in empty bank state without throwing", () => {
    const { container } = render(
      <MemoryRouter>
        <NotificationProvider>
          <MockExamEngine items={[]} showToast={mockShowToast} />
        </NotificationProvider>
      </MemoryRouter>
    );

    expect(container).toBeDefined();
    expect(screen.getByText(/Universal Mock Exam & Simulator/i)).toBeDefined();
    expect(screen.getByText(/Exam Parameters/i)).toBeDefined();
  });

  it("2. renders cleanly with a loaded question bank", () => {
    saveQuestionsToBank([
      {
        id: "q-test-1",
        question: "Under RA 6713, which norm requires public officials to uphold the public interest?",
        options: [
          "Commitment to democracy",
          "Commitment to public interest",
          "Professionalism",
          "Simple living",
        ],
        correctIndex: 1,
        explanation: "Section 4(a) defines Commitment to public interest.",
        topicTag: "Sec. 4",
        questionType: "mcq",
        reviewStatus: "verified",
        suspiciousReasons: [],
      },
      {
        id: "q-test-2",
        question: "Under Section 5(a), within how many working days must letters be answered?",
        options: ["15", "30", "45", "60"],
        correctIndex: 0,
        explanation: "Section 5(a) requires 15 working days.",
        topicTag: "Sec. 5(a)",
        questionType: "mcq",
        reviewStatus: "verified",
        suspiciousReasons: [],
      },
    ]);

    const { container } = render(
      <MemoryRouter>
        <NotificationProvider>
          <MockExamEngine items={sampleItems} showToast={mockShowToast} />
        </NotificationProvider>
      </MemoryRouter>
    );

    expect(container).toBeDefined();
    expect(screen.getByText(/Universal Mock Exam & Simulator/i)).toBeDefined();
    expect(screen.getByText(/Material Grounding Scope/i)).toBeDefined();
  });

  it("3. renders question controls and simulator buttons when questions are present", () => {
    saveQuestionsToBank([
      {
        id: "q-session-1",
        question: "What is the primary obligation under Section 4(a)?",
        options: [
          "Commitment to public interest",
          "Political neutrality",
          "Simple living",
          "Professionalism",
        ],
        correctIndex: 0,
        explanation: "Commitment to public interest is Sec. 4(a).",
        topicTag: "Sec. 4",
        questionType: "mcq",
        reviewStatus: "verified",
        suspiciousReasons: [],
      },
    ]);

    const { container } = render(
      <MemoryRouter>
        <NotificationProvider>
          <MockExamEngine items={sampleItems} showToast={mockShowToast} />
        </NotificationProvider>
      </MemoryRouter>
    );

    expect(container).toBeDefined();
    expect(screen.getByText(/Exam Parameters/i)).toBeDefined();
    expect(screen.getByText(/Universal Mock Exam & Simulator/i)).toBeDefined();
  });
});
