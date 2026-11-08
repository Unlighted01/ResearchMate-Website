// ============================================
// EXAM READINESS SERVICE
// Tracks examinee accuracy, rolling readiness score (80% passing threshold),
// study streaks, category weakness analysis, and daily sprint generation.
// ============================================

import { StorageItem } from "./storageService";
import { sampleSprintQuestions } from "./questionBankService";

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

export interface SprintQuestionItem {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  category: string;
  explanation: string;
}

// Universal High-Yield 5-Question Default Set
export const DEFAULT_SPRINT_QUESTIONS: SprintQuestionItem[] = [
  {
    id: "sprint-default-1",
    question: "Pipe A can fill a reservoir in 6 hours, while Pipe B takes 12 hours. If both pipes are opened simultaneously, how many hours will it take to fill the reservoir?",
    options: ["3 hours", "4 hours", "6 hours", "9 hours"],
    correctAnswer: "4 hours",
    category: "Numerical Reasoning",
    explanation: "⚡ 30-Second Shortcut: T = (A × B) / (A + B) = (6 × 12) / (6 + 12) = 72 / 18 = 4 hours. Common trap: Never take the simple arithmetic average (9 hrs)!",
  },
  {
    id: "sprint-default-2",
    question: "A vehicle travels to its destination at 40 km/h and returns along the same route at 60 km/h. What is the average speed for the round trip?",
    options: ["48 km/h", "50 km/h", "52 km/h", "55 km/h"],
    correctAnswer: "48 km/h",
    category: "Numerical Reasoning",
    explanation: "⚡ 30-Second Shortcut: For equal distance round-trips, use Harmonic Mean: V_avg = (2 × v1 × v2) / (v1 + v2) = (2 × 40 × 60) / 100 = 48 km/h. Trap: 50 km/h is arithmetic mean and always wrong!",
  },
  {
    id: "sprint-default-3",
    question: "EPHEMERAL is to PERMANENT as ZENITH is to _____?",
    options: ["Apex", "Nadir", "Horizon", "Pinnacle"],
    correctAnswer: "Nadir",
    category: "Verbal Ability",
    explanation: "⚡ Analogy: 'Ephemeral' (transient) and 'Permanent' are exact antonyms. 'Zenith' is the highest culmination point; its antonym is 'Nadir' (the lowest point).",
  },
  {
    id: "sprint-default-4",
    question: "If all squares are rectangles, and all rectangles are quadrilaterals, which conclusion MUST be true?",
    options: [
      "All quadrilaterals are squares",
      "Every square is a quadrilateral",
      "Some rectangles are not quadrilaterals",
      "No quadrilaterals are squares"
    ],
    correctAnswer: "Every square is a quadrilateral",
    category: "Analytical Reasoning",
    explanation: "⚡ Deductive Syllogism: Transitive inclusion states Square ⊆ Rectangle ⊆ Quadrilateral. Therefore, every square is necessarily a quadrilateral.",
  },
  {
    id: "sprint-default-5",
    question: "Complete the numerical series: 3, 7, 15, 31, 63, ____?",
    options: ["125", "126", "127", "128"],
    correctAnswer: "127",
    category: "Analytical Reasoning",
    explanation: "⚡ Pattern: Each successive term is (Previous × 2) + 1. 3×2+1=7; 7×2+1=15; 15×2+1=31; 31×2+1=63; 63×2+1 = 127.",
  },
];

// Expanded Universal Exam Question Pool
export const EXTENDED_SPRINT_POOL: SprintQuestionItem[] = [
  ...DEFAULT_SPRINT_QUESTIONS,
  {
    id: "sprint-ext-6",
    question: "A store offers a 20% discount on an item, followed by an additional 10% loyalty discount on the reduced price. What is the total effective discount?",
    options: ["28%", "30%", "32%", "26%"],
    correctAnswer: "28%",
    category: "Numerical Reasoning",
    explanation: "⚡ Formula: Total Discount = A + B - (A × B / 100) = 20 + 10 - 2 = 28%. Never simply add percentages directly (20 + 10 = 30% is incorrect).",
  },
  {
    id: "sprint-ext-7",
    question: "In a class of 60 students, the ratio of boys to girls is 3:2. How many boys are in the class?",
    options: ["24", "30", "36", "40"],
    correctAnswer: "36",
    category: "Numerical Reasoning",
    explanation: "⚡ Ratio Shortcut: Total parts = 3 + 2 = 5. Value per part = 60 / 5 = 12. Boys = 3 × 12 = 36 boys.",
  },
  {
    id: "sprint-ext-8",
    question: "Which of the following sentences exhibits flawless subject-verb agreement?",
    options: [
      "The committee have decided to postpone the vote.",
      "Neither the teacher nor the students were in the hall.",
      "Each of the candidates are speaking today.",
      "A bouquet of yellow roses were delivered."
    ],
    correctAnswer: "Neither the teacher nor the students were in the hall.",
    category: "Verbal Ability",
    explanation: "⚡ Proximity Rule: In 'neither... nor' constructions, the verb agrees with the subject closest to it. 'Students' is plural, so 'were' is correct.",
  },
  {
    id: "sprint-ext-9",
    question: "Identify the word most nearly OPPOSITE in meaning to 'PRAGMATIC':",
    options: ["Realistic", "Visionary / Idealistic", "Utilitarian", "Expedient"],
    correctAnswer: "Visionary / Idealistic",
    category: "Verbal Ability",
    explanation: "⚡ Antonym: 'Pragmatic' means dealing with things sensibly and realistically based on practical considerations; its opposite is 'Visionary / Idealistic'.",
  },
  {
    id: "sprint-ext-10",
    question: "Five colleagues (A, B, C, D, E) sit in a row. C sits in the exact middle. A sits at the far left. B sits immediately to the right of C. Where does D sit if E is to the right of B?",
    options: ["Between A and C", "Far right", "Immediately left of C", "Between B and E"],
    correctAnswer: "Between A and C",
    category: "Analytical Reasoning",
    explanation: "⚡ Deductive Order: 5 slots [1, 2, 3, 4, 5]. A is at 1 (far left), C is at 3 (middle). B is right of C (slot 4). E is right of B (slot 5). Thus D must occupy slot 2, between A and C.",
  },
  {
    id: "sprint-ext-11",
    question: "If a solution's pH changes from 6.0 to 4.0, how has its hydronium ion concentration [H+] changed?",
    options: [
      "Decreased by 2 times",
      "Increased by 2 times",
      "Increased by 100 times",
      "Decreased by 100 times"
    ],
    correctAnswer: "Increased by 100 times",
    category: "Science & Logic",
    explanation: "⚡ Logarithmic Rule: pH = -log10[H+]. A decrease of 2 pH units represents an increase in [H+] by 10^2 = 100-fold.",
  },
  {
    id: "sprint-ext-12",
    question: "A train 150 meters long passes a telegraph post in 9 seconds. What is the speed of the train in km/h?",
    options: ["50 km/h", "54 km/h", "60 km/h", "72 km/h"],
    correctAnswer: "60 km/h",
    category: "Numerical Reasoning",
    explanation: "⚡ Shortcut: Speed in m/s = 150 / 9 = 50/3 m/s. Convert to km/h by multiplying by (18/5): (50/3) × (18/5) = 10 × 6 = 60 km/h.",
  },
  {
    id: "sprint-ext-13",
    question: "Identify the logical fallacy: 'Nobody has proven that ghosts don't exist, therefore they must exist.'",
    options: [
      "Ad Hominem",
      "Argument from Ignorance (Ad Ignorantiam)",
      "Straw Man",
      "Post Hoc Ergo Propter Hoc"
    ],
    correctAnswer: "Argument from Ignorance (Ad Ignorantiam)",
    category: "Analytical Reasoning",
    explanation: "⚡ Fallacy: Asserting a proposition is true simply because it has not yet been proven false (or vice versa) is an Argument from Ignorance.",
  },
  {
    id: "sprint-ext-14",
    question: "Which organelle is responsible for generating the majority of cellular chemical energy in eukaryotic cells?",
    options: ["Ribosome", "Endoplasmic Reticulum", "Mitochondria", "Golgi Apparatus"],
    correctAnswer: "Mitochondria",
    category: "Science & Logic",
    explanation: "⚡ Science Fact: Mitochondria generate most of the cell's ATP through aerobic cellular respiration (oxidative phosphorylation).",
  },
  {
    id: "sprint-ext-15",
    question: "Find the odd one out: 64, 125, 216, 343, 512, 729, 1000, 1332",
    options: ["64", "343", "729", "1332"],
    correctAnswer: "1332",
    category: "Analytical Reasoning",
    explanation: "⚡ Perfect Cubes: 4^3=64, 5^3=125, 6^3=216, 7^3=343, 8^3=512, 9^3=729, 10^3=1000, but 11^3 = 1331 (not 1332).",
  },
];

/**
 * Get randomized questions for a sprint:
 * Prioritizes questions from user's personal uploaded Question Bank.
 * Falls back to high-yield calibration pool if bank is empty.
 */
export function getSprintQuestions(category?: string, count: number = 5): SprintQuestionItem[] {
  // 1. Check if user has uploaded questions in their personal Question Bank
  const userSample = sampleSprintQuestions(count, category);
  if (userSample.length > 0) {
    return userSample.map((q) => {
      const correctChoice = q.options[q.correctIndex] || q.options[0] || "";
      return {
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: correctChoice,
        category: q.topicTag || "General",
        explanation: q.explanation || `Verified correct answer: Option ${String.fromCharCode(65 + q.correctIndex)}: ${correctChoice}`,
      };
    });
  }

  // 2. Cold-start fallback: Universal high-yield logic and math pool
  let pool = EXTENDED_SPRINT_POOL;
  if (category && category !== "All Topics") {
    const filtered = pool.filter((q) => q.category.toLowerCase().includes(category.toLowerCase()));
    if (filtered.length >= count) {
      pool = filtered;
    }
  }

  // Shuffle pool
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

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
