// ============================================
// PRACTICE PACER SERVICE
// Pacing calculations, telemetry, and presets for timed exam drills (CSC, Board Exams, SAT)
// ============================================

export interface PacerCalculationParams {
  totalQuestions: number;
  totalHours: number;
  bufferMinutes?: number;
}

export interface PacerMetrics {
  completedCount: number;
  totalQuestions: number;
  averageSecondsPerQuestion: number | null;
  paceDifferenceSeconds: number | null; // target - average (>0 = ahead, <0 = behind)
  totalBufferBankedSeconds: number;
  isAheadOfPace: boolean;
  completionPercentage: number;
}

export interface PacerPreset {
  id: string;
  label: string;
  paceSeconds: number;
  questions: number;
  description: string;
}

/**
 * Calculates target seconds per question given total questions, total hours, and review buffer.
 * e.g., 150 questions in 3 hours with 0 buffer = 72s
 * e.g., 150 questions in 3 hours with 13m buffer = 66.8s -> 67s (CSC standard pacing)
 * e.g., 170 questions in 3h10m (3.167 hrs) with 0 buffer = 67.05s -> 67s (CSC Professional)
 */
export function calculateExamPace(params: PacerCalculationParams): number {
  const { totalQuestions, totalHours, bufferMinutes = 0 } = params;
  if (totalQuestions <= 0 || totalHours <= 0) return 67;

  const totalAvailableSeconds = totalHours * 3600 - bufferMinutes * 60;
  if (totalAvailableSeconds <= 0) return 60;

  const secondsPerQ = Math.round(totalAvailableSeconds / totalQuestions);
  return Math.max(5, Math.min(600, secondsPerQ));
}

/**
 * Calculates live telemetry metrics from recorded question durations.
 */
export function computePacerMetrics(
  targetPaceSeconds: number,
  totalQuestions: number,
  recordedDurations: number[],
): PacerMetrics {
  const completedCount = recordedDurations.length;
  const completionPercentage =
    totalQuestions > 0
      ? Math.min(100, Math.round((completedCount / totalQuestions) * 100))
      : 0;

  if (completedCount === 0) {
    return {
      completedCount: 0,
      totalQuestions,
      averageSecondsPerQuestion: null,
      paceDifferenceSeconds: null,
      totalBufferBankedSeconds: 0,
      isAheadOfPace: true,
      completionPercentage: 0,
    };
  }

  const totalSpent = recordedDurations.reduce((sum, d) => sum + d, 0);
  const averageSecondsPerQuestion = Math.round(totalSpent / completedCount);
  const paceDifferenceSeconds = targetPaceSeconds - averageSecondsPerQuestion;
  const totalBufferBankedSeconds = paceDifferenceSeconds * completedCount;
  const isAheadOfPace = paceDifferenceSeconds >= 0;

  return {
    completedCount,
    totalQuestions,
    averageSecondsPerQuestion,
    paceDifferenceSeconds,
    totalBufferBankedSeconds,
    isAheadOfPace,
    completionPercentage,
  };
}

/**
 * Standard exam presets for fast selection.
 */
export const EXAM_PACER_PRESETS: PacerPreset[] = [
  {
    id: "csc_150",
    label: "67s (CSC)",
    paceSeconds: 67,
    questions: 150,
    description: "150 problems in 3 hours with review buffer",
  },
  {
    id: "speed_drill",
    label: "45s (Speed)",
    paceSeconds: 45,
    questions: 50,
    description: "Fast-pace recall & rapid vocabulary drill",
  },
  {
    id: "standard_60",
    label: "60s (1m)",
    paceSeconds: 60,
    questions: 100,
    description: "Even 1-minute per problem pacing",
  },
  {
    id: "exact_72",
    label: "72s (3h/150Q)",
    paceSeconds: 72,
    questions: 150,
    description: "Exact 3 hours for 150 questions (no buffer)",
  },
  {
    id: "standard_90",
    label: "90s (Standard)",
    paceSeconds: 90,
    questions: 60,
    description: "1.5 minutes per question standard exam",
  },
  {
    id: "analytical_120",
    label: "120s (Math)",
    paceSeconds: 120,
    questions: 40,
    description: "2 minutes for complex word problems & math",
  },
];

/**
 * Format seconds into clean m:ss or s string
 */
export function formatPacerTime(seconds: number): string {
  const abs = Math.abs(seconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const formatted = m === 0 ? `${s}s` : `${m}:${s.toString().padStart(2, "0")}`;
  return seconds < 0 ? `-${formatted}` : formatted;
}
