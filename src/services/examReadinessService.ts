// ============================================
// EXAM READINESS SERVICE
// Tracks examinee accuracy, rolling readiness score (80% passing threshold),
// study streaks, category weakness analysis, and daily sprint generation.
// ============================================

import { StorageItem } from "./storageService";

export interface CategoryScore {
  correct: number;
  total: number;
  percent: number;
}

export interface ExamAttemptRecord {
  id: string;
  timestamp: number;
  scorePercent: number; // 0 - 100
  correctCount: number;
  totalQuestions: number;
  mode: "sprint" | "mock" | "twin";
  categoryBreakdown?: Record<string, { correct: number; total: number }>;
}

export interface ExamReadinessStats {
  isCalibrated: boolean;
  score: number; // 0 - 100
  passingThreshold: number; // 80% (CSC passing benchmark)
  isPassing: boolean;
  totalQuestionsSolved: number;
  totalTestsCompleted: number;
  streakDays: number;
  primaryWeakness: string | null;
  categoryAccuracies: Record<string, CategoryScore>;
  recentAttempts: ExamAttemptRecord[];
}

const STORAGE_KEY = "researchmate_exam_readiness_v1";
const STREAK_KEY = "researchmate_exam_streak_v1";
const PASSING_THRESHOLD = 80;

// High-Yield built-in sprint question fallback (Civil Service & Entrance Exam heuristics)
export const DEFAULT_SPRINT_QUESTIONS = [
  {
    id: "sprint-default-1",
    question: "Pipe A can fill a reservoir in 6 hours, while Pipe B takes 12 hours. If both pipes are opened simultaneously, how many hours will it take to fill the reservoir?",
    options: ["3 hours", "4 hours", "6 hours", "9 hours"],
    correctAnswer: "4 hours",
    category: "Numerical Reasoning",
    explanation: "⚡ 30-Second Shortcut: T = (A × B) / (A + B) = (6 × 12) / (6 + 12) = 72 / 18 = 4 hours. Common trap: Never take the simple average (9 hrs)!",
  },
  {
    id: "sprint-default-2",
    question: "A motorboat travels upstream at 40 km/h and returns downstream along the same path at 60 km/h. What is the average speed of the boat for the round trip?",
    options: ["48 km/h", "50 km/h", "52 km/h", "55 km/h"],
    correctAnswer: "48 km/h",
    category: "Numerical Reasoning",
    explanation: "⚡ 30-Second Shortcut: For equal distance round-trips, use the Harmonic Mean: V_avg = (2 × v1 × v2) / (v1 + v2) = (2 × 40 × 60) / 100 = 48 km/h. Common trap: 50 km/h is the arithmetic mean and always wrong!",
  },
  {
    id: "sprint-default-3",
    question: "Under RA 6713 (Code of Conduct and Ethical Standards for Public Officials and Employees), what is the maximum time allowed for a public officer to respond to public letters and requests?",
    options: ["5 working days", "10 working days", "15 working days", "30 calendar days"],
    correctAnswer: "15 working days",
    category: "General Information",
    explanation: "Section 5(a) of RA 6713 mandates that all public officials and employees must act on letters, telegrams, or other communications within 15 working days from receipt.",
  },
  {
    id: "sprint-default-4",
    question: "Choose the correct word: 'Ang mga mag-aaral ay pumunta sa silid-aklatan _____ magbasa ng mga aklat.'",
    options: ["ng", "nang", "may", "mayroon"],
    correctAnswer: "nang",
    category: "Verbal Ability",
    explanation: "⚡ Filipino Grammar Rule: Gamitin ang 'nang' bilang kasingkahulugan ng 'upang' o 'para' (in order to), at kapag sumasagot sa tanong na 'paano'. Gamitin ang 'ng' kapag sinusundan ng pangngalan (noun).",
  },
  {
    id: "sprint-default-5",
    question: "Complete the numerical series: 3, 7, 15, 31, 63, ____?",
    options: ["125", "126", "127", "128"],
    correctAnswer: "127",
    category: "Analytical Reasoning",
    explanation: "⚡ Pattern: Each term is (Previous × 2) + 1. 3×2+1=7; 7×2+1=15; 15×2+1=31; 31×2+1=63; 63×2+1 = 127.",
  },
];

/**
 * Retrieve persistent attempt history
 */
export function getExamHistory(): ExamAttemptRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Record a new sprint or mock exam attempt
 */
export function recordExamAttempt(
  attempt: Omit<ExamAttemptRecord, "id" | "timestamp">
): ExamReadinessStats {
  const history = getExamHistory();
  const newRecord: ExamAttemptRecord = {
    ...attempt,
    id: `attempt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
  };

  const updatedHistory = [newRecord, ...history].slice(0, 50); // Keep last 50 attempts
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    updateStreak();
  } catch (err) {
    console.warn("Could not save exam history to localStorage:", err);
  }

  return getReadinessStats(updatedHistory);
}

/**
 * Calculate study streak
 */
function updateStreak(): number {
  if (typeof window === "undefined") return 1;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(STREAK_KEY);
    let streakData: { lastDate: string; count: number } = raw
      ? JSON.parse(raw)
      : { lastDate: "", count: 0 };

    if (streakData.lastDate === today) {
      return streakData.count;
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (streakData.lastDate === yesterday) {
      streakData = { lastDate: today, count: streakData.count + 1 };
    } else {
      streakData = { lastDate: today, count: 1 };
    }

    localStorage.setItem(STREAK_KEY, JSON.stringify(streakData));
    return streakData.count;
  } catch {
    return 1;
  }
}

export function getStreakDays(): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return 1;
    const data = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (data.lastDate === today || data.lastDate === yesterday) {
      return Math.max(1, data.count);
    }
    return 1;
  } catch {
    return 1;
  }
}

/**
 * Calculate dynamic Readiness Score, passing threshold, and weakness spotter
 */
export function getReadinessStats(customHistory?: ExamAttemptRecord[]): ExamReadinessStats {
  const history = customHistory || getExamHistory();

  if (history.length === 0) {
    return {
      isCalibrated: false,
      score: 0,
      passingThreshold: PASSING_THRESHOLD,
      isPassing: false,
      totalQuestionsSolved: 0,
      totalTestsCompleted: 0,
      streakDays: getStreakDays(),
      primaryWeakness: null,
      categoryAccuracies: {},
      recentAttempts: [],
    };
  }

  // Calculate rolling score from up to the last 30 questions
  let questionCount = 0;
  let correctCount = 0;
  const categoryMap: Record<string, { correct: number; total: number }> = {};

  for (const record of history) {
    questionCount += record.totalQuestions;
    correctCount += record.correctCount;

    if (record.categoryBreakdown) {
      for (const [cat, stats] of Object.entries(record.categoryBreakdown)) {
        if (!categoryMap[cat]) categoryMap[cat] = { correct: 0, total: 0 };
        categoryMap[cat].correct += stats.correct;
        categoryMap[cat].total += stats.total;
      }
    }

    // Stop counting once we've reached a window of 30+ questions
    if (questionCount >= 30) break;
  }

  const rollingScore = questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 0;

  // Compute category breakdown accuracies
  const categoryAccuracies: Record<string, CategoryScore> = {};
  let lowestPercent = 101;
  let primaryWeakness: string | null = null;

  for (const [cat, val] of Object.entries(categoryMap)) {
    const pct = val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0;
    categoryAccuracies[cat] = {
      correct: val.correct,
      total: val.total,
      percent: pct,
    };

    if (pct < lowestPercent && val.total >= 2) {
      lowestPercent = pct;
      primaryWeakness = cat;
    }
  }

  const totalQuestionsSolved = history.reduce((sum, h) => sum + h.totalQuestions, 0);

  return {
    isCalibrated: true,
    score: rollingScore,
    passingThreshold: PASSING_THRESHOLD,
    isPassing: rollingScore >= PASSING_THRESHOLD,
    totalQuestionsSolved,
    totalTestsCompleted: history.length,
    streakDays: getStreakDays(),
    primaryWeakness,
    categoryAccuracies,
    recentAttempts: history.slice(0, 5),
  };
}
