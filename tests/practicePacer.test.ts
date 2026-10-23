import { describe, it, expect } from "vitest";
import {
  calculateExamPace,
  computePacerMetrics,
  formatPacerTime,
  EXAM_PACER_PRESETS,
} from "../src/services/practicePacerService";

describe("Practice Pacer Service", () => {
  describe("calculateExamPace", () => {
    it("computes exact CSC 150 problems in 3 hours with review buffer to ~67s", () => {
      // 3 hours = 10,800s. With 12.5 min (750s) buffer -> 10,050s / 150 = 67s!
      const pace = calculateExamPace({
        totalQuestions: 150,
        totalHours: 3,
        bufferMinutes: 12.5,
      });
      expect(pace).toBe(67);
    });

    it("computes exact 150 problems in 3 hours with 0 buffer to 72s", () => {
      const pace = calculateExamPace({
        totalQuestions: 150,
        totalHours: 3,
        bufferMinutes: 0,
      });
      expect(pace).toBe(72);
    });

    it("computes CSC Professional 170 items in 3.167 hours (190 min) to 67s", () => {
      // 190 min * 60 = 11,400s. 11,400 / 170 = 67.05s -> 67s
      const pace = calculateExamPace({
        totalQuestions: 170,
        totalHours: 190 / 60,
        bufferMinutes: 0,
      });
      expect(pace).toBe(67);
    });

    it("clamps output within reasonable range [5, 600]", () => {
      expect(calculateExamPace({ totalQuestions: 10000, totalHours: 1 })).toBe(5);
      expect(calculateExamPace({ totalQuestions: 1, totalHours: 10 })).toBe(600);
    });

    it("handles edge cases gracefully", () => {
      expect(calculateExamPace({ totalQuestions: 0, totalHours: 3 })).toBe(67);
      expect(calculateExamPace({ totalQuestions: 150, totalHours: 0 })).toBe(67);
    });
  });

  describe("computePacerMetrics", () => {
    it("returns initial default telemetry when no questions are completed", () => {
      const metrics = computePacerMetrics(67, 150, []);
      expect(metrics.completedCount).toBe(0);
      expect(metrics.averageSecondsPerQuestion).toBeNull();
      expect(metrics.paceDifferenceSeconds).toBeNull();
      expect(metrics.totalBufferBankedSeconds).toBe(0);
      expect(metrics.completionPercentage).toBe(0);
      expect(metrics.isAheadOfPace).toBe(true);
    });

    it("calculates ahead-of-pace banked time when user answers faster than 67s", () => {
      // User spent 50s, 60s, 55s (avg 55s). Target is 67s -> +12s ahead per Q!
      const metrics = computePacerMetrics(67, 150, [50, 60, 55]);
      expect(metrics.completedCount).toBe(3);
      expect(metrics.averageSecondsPerQuestion).toBe(55);
      expect(metrics.paceDifferenceSeconds).toBe(12);
      expect(metrics.totalBufferBankedSeconds).toBe(36); // 12s * 3 questions
      expect(metrics.isAheadOfPace).toBe(true);
      expect(metrics.completionPercentage).toBe(2); // 3/150 = 2%
    });

    it("calculates behind-schedule deficit when user answers slower than 67s", () => {
      // User spent 80s, 90s (avg 85s). Target is 67s -> -18s behind per Q!
      const metrics = computePacerMetrics(67, 150, [80, 90]);
      expect(metrics.completedCount).toBe(2);
      expect(metrics.averageSecondsPerQuestion).toBe(85);
      expect(metrics.paceDifferenceSeconds).toBe(-18);
      expect(metrics.totalBufferBankedSeconds).toBe(-36);
      expect(metrics.isAheadOfPace).toBe(false);
    });
  });

  describe("EXAM_PACER_PRESETS", () => {
    it("includes standard CSC 67s preset for 150 questions", () => {
      const cscPreset = EXAM_PACER_PRESETS.find((p) => p.id === "csc_150");
      expect(cscPreset).toBeDefined();
      expect(cscPreset?.paceSeconds).toBe(67);
      expect(cscPreset?.questions).toBe(150);
    });
  });

  describe("formatPacerTime", () => {
    it("formats seconds properly", () => {
      expect(formatPacerTime(45)).toBe("45s");
      expect(formatPacerTime(67)).toBe("1:07");
      expect(formatPacerTime(125)).toBe("2:05");
      expect(formatPacerTime(-15)).toBe("-15s");
    });
  });
});
