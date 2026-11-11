import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import { extractAllPagesWithLayout, PdfPageWithLayout } from "../src/services/pdfService";
import {
  detectParserProfile,
  parseTwoPassQuestionsAndAnswersDetailed,
} from "../src/services/pdfQuestionImporter";

describe("501 Word Analogy Questions Full Engine Audit", () => {
  let pages: PdfPageWithLayout[];

  beforeAll(async () => {
    const jsonCache = path.resolve(__dirname, "../tests/fixtures/501_word_analogy_pages.json");
    if (fs.existsSync(jsonCache) && fs.statSync(jsonCache).size > 100) {
      pages = JSON.parse(fs.readFileSync(jsonCache, "utf-8"));
    } else {
      const pdfPath = path.resolve(__dirname, "../tests/fixtures/501_Word_Analogy_Questions.pdf");
      const buffer = fs.readFileSync(pdfPath);
      const layout = await extractAllPagesWithLayout(buffer);
      pages = layout.pages;
      fs.writeFileSync(jsonCache, JSON.stringify(pages));
    }
  });

  it("extracts all 501 questions cleanly across 13 chapters with 100% gradability and zero front-matter bugs", () => {
    const profileRes = detectParserProfile(pages);
    expect(profileRes.profile.id).toBe("standard_two_pass");
    expect(profileRes.profile.keyLocation).toBe("end_of_chapter");

    const result = parseTwoPassQuestionsAndAnswersDetailed(pages, { profile: profileRes.profile });

    // 1. Total Item Count Verification: Exactly 501 questions
    expect(result.items.length).toBe(501);
    expect(result.gradableCount).toBe(501);
    expect(result.promptCount).toBe(0);
    expect(result.missingQuestionNumbers).toEqual([]);

    // 2. Chapters Detected Verification: Exactly 13 chapters in sequential order
    expect(result.chaptersDetected.length).toBe(13);
    for (let c = 1; c <= 13; c++) {
      const chMatch = result.chaptersDetected.find((name) =>
        new RegExp(`^Practice\\s+${c}:`, "i").test(name)
      );
      expect(chMatch, `Chapter ${c} practice heading not detected`).toBeDefined();
    }

    // 3. Question #1 Verification
    const q1 = result.items[0];
    expect(q1.number).toBe(1);
    expect(q1.stem).toContain("______ : trail :: grain : grail");
    expect(q1.options.length).toBe(4);
    expect(q1.options[0]).toBe("train");
    expect(q1.correctLetter).toBe("a");
    expect(q1.correctIndex).toBe(0);
    expect(q1.explanation).toContain('Train becomes trail');
    expect(q1.chapter).toBe("Practice 1: Word Analogy Practice");

    // 4. Question #2 Verification (previously bugged with 3,071 chars front matter!)
    const q2 = result.items[1];
    expect(q2.number).toBe(2);
    expect(q2.stem).toContain("particular : fussy ::");
    expect(q2.stem).toContain("subservient");
    expect(q2.stem.length).toBeLessThan(100);
    expect(q2.options).toEqual(["meek", "above", "cranky", "uptight"]);
    expect(q2.correctLetter).toBe("a");
    expect(q2.correctIndex).toBe(0);
    expect(q2.explanation).toContain("Particular is a synonym for fussy");
    expect(q2.chapter).toBe("Practice 1: Word Analogy Practice");

    // 5. Question #36 Verification (Chapter 2 start)
    const q36 = result.items.find(it => it.number === 36);
    expect(q36).toBeDefined();
    expect(q36!.chapter).toBe("Practice 2: Word Analogy Practice");
    expect(q36!.correctLetter).toBe("c");
    expect(q36!.correctIndex).toBe(2);

    // 6. Question #501 Verification (the very last item in the book)
    const q501 = result.items[500];
    expect(q501.number).toBe(501);
    expect(q501.stem).toContain("Sophocles : B.C. ::");
    expect(q501.stem).toContain("A.D.");
    expect(q501.options).toEqual(["Euripedes", "Pindar", "Dante", "Virgil"]);
    expect(q501.correctLetter).toBe("c");
    expect(q501.correctIndex).toBe(2);
    expect(q501.explanation).toContain("Sophocles was born in B.C.");
    expect(q501.chapter).toBe("Practice 13: Targeted Word Analogy Practice");

    // 7. Front-Matter Suppression Verification
    // Sherpa : Tibet was the teaching example in the introduction on page 11
    const sherpaItem = result.items.find((it) => it.stem.includes("Sherpa"));
    expect(sherpaItem).toBeUndefined();

    // Table of Contents & Copyright text must never contaminate stems or options
    for (const it of result.items) {
      expect(it.stem).not.toContain("Library of Congress");
      expect(it.stem).not.toContain("LearningExpress");
      expect(it.stem).not.toContain("TABLE OF CONTENTS");
      expect(it.stem.length).toBeLessThanOrEqual(1200);
      for (const opt of it.options) {
        expect(opt.length).toBeLessThanOrEqual(250);
        expect(opt).not.toContain("Library of Congress");
        expect(opt).not.toContain("Part to Whole");
      }
    }
  });
});
