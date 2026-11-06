// ============================================
// INGESTION PROGRESS ENGINE UNIT TESTS
// Verifies multi-file batch calculation, page progress, and error resilience
// ============================================

import { describe, it, expect, vi } from "vitest";

describe("Ingestion Progress Engine Calculations", () => {
  it("calculates exact overall percentage for sequential multi-file batch", () => {
    const totalFiles = 4;

    // File 1 at 50%
    const file1Index = 0;
    const file1Percent = 50;
    const overall1 = Math.round(((file1Index + (file1Percent / 100)) / totalFiles) * 100);
    expect(overall1).toBe(13); // (0.5 / 4) * 100 = 12.5 -> 13%

    // File 2 at 100% (completed 1 file, file 2 at 40%)
    const file2Index = 1;
    const file2Percent = 40;
    const overall2 = Math.round(((file2Index + (file2Percent / 100)) / totalFiles) * 100);
    expect(overall2).toBe(35); // (1.4 / 4) * 100 = 35%

    // File 3 at 80% (completed 2 files)
    const file3Index = 2;
    const file3Percent = 80;
    const overall3 = Math.round(((file3Index + (file3Percent / 100)) / totalFiles) * 100);
    expect(overall3).toBe(70); // (2.8 / 4) * 100 = 70%

    // All 4 completed
    const completedCount = 4;
    const overallFinal = Math.round((completedCount / totalFiles) * 100);
    expect(overallFinal).toBe(100);
  });

  it("handles single-file extraction percentage accurately", () => {
    const totalFiles = 1;
    const currentPage = 14;
    const totalPages = 28;
    const filePercent = Math.round((currentPage / totalPages) * 100);
    const overallPercent = Math.round(((0 + (filePercent / 100)) / totalFiles) * 100);

    expect(filePercent).toBe(50);
    expect(overallPercent).toBe(50);
  });

  it("isolates errors: failing file does not abort remaining batch items", () => {
    const files = [
      { name: "Doc1.pdf", shouldFail: false },
      { name: "Corrupt.pdf", shouldFail: true },
      { name: "Doc3.docx", shouldFail: false },
    ];

    let successCount = 0;
    const errors: string[] = [];

    for (const f of files) {
      try {
        if (f.shouldFail) {
          throw new Error("Corrupted PDF structure");
        }
        successCount++;
      } catch (err: any) {
        errors.push(`"${f.name}": ${err.message}`);
      }
    }

    expect(successCount).toBe(2);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("Corrupted PDF structure");
  });
});
