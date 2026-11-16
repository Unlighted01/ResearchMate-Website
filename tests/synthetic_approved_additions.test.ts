import { describe, it, expect } from "vitest";
import { cleanPageText, parseTwoPassQuestionsAndAnswersDetailed } from "../src/services/pdfQuestionImporter";
import { PdfPageWithLayout } from "../src/services/pdfService";

describe("Condition 9: Synthetic Fixtures for Approved Additions", () => {
  describe("Condition 9(a): Padded digits only inside line-start marker followed by . or ), never in number series", () => {
    it("normalizes padded digits at line start followed by . or )", () => {
      const input = "0 1 . First question\n0 2 ) Second question\n0 3 . Third question";
      const cleaned = cleanPageText(input);
      expect(cleaned).toContain("01. First question");
      expect(cleaned).toContain("02) Second question");
      expect(cleaned).toContain("03. Third question");
    });

    it("preserves number series inside text and never collapses them", () => {
      const input = "1. What is the next number in the series: 2 4 6 8 ?\n2 4 6 8. Continue the series\na. 10\nb. 12\nc. 14\nd. 16";
      const cleaned = cleanPageText(input);
      expect(cleaned).toContain("2 4 6 8 ?");
      expect(cleaned).toContain("2 4 6 8. Continue the series");
    });
  });

  describe("Condition 9(b): Block keys require letter count == range length, else reject", () => {
    it("accepts block key when letter count equals range length", () => {
      const pages: PdfPageWithLayout[] = [
        {
          pageNum: 1,
          text: "1. Stem one\na. Opt A\nb. Opt B\nc. Opt C\nd. Opt D\n\n2. Stem two\na. Opt A\nb. Opt B\nc. Opt C\nd. Opt D\n\n3. Stem three\na. Opt A\nb. Opt B\nc. Opt C\nd. Opt D",
          width: 600,
          height: 800,
          lines: [],
        },
        {
          pageNum: 2,
          text: "Answers\n1 to 3: CAB",
          width: 600,
          height: 800,
          lines: [],
        },
      ];

      const result = parseTwoPassQuestionsAndAnswersDetailed(pages, {
        profile: {
          id: "standard_two_pass",
          name: "Standard",
          description: "",
          headingPattern: /^Chapter/i,
          keyLocation: "end_of_chapter",
          choiceStyle: "letter_dot",
          expectedChoicesPerItem: 4,
          endMarkers: [/^Answers/i],
        },
      });

      expect(result.items.length).toBe(3);
      expect(result.items[0].correctLetter).toBe("c");
      expect(result.items[1].correctLetter).toBe("a");
      expect(result.items[2].correctLetter).toBe("b");
    });

    it("rejects block key when letter count does not equal range length", () => {
      const pages: PdfPageWithLayout[] = [
        {
          pageNum: 1,
          text: "1. Stem one\na. Opt A\nb. Opt B\nc. Opt C\nd. Opt D\n\n2. Stem two\na. Opt A\nb. Opt B\nc. Opt C\nd. Opt D\n\n3. Stem three\na. Opt A\nb. Opt B\nc. Opt C\nd. Opt D",
          width: 600,
          height: 800,
          lines: [],
        },
        {
          pageNum: 2,
          text: "Answers\n1 to 3: CA", // Only 2 letters for range of 3
          width: 600,
          height: 800,
          lines: [],
        },
      ];

      const result = parseTwoPassQuestionsAndAnswersDetailed(pages, {
        profile: {
          id: "standard_two_pass",
          name: "Standard",
          description: "",
          headingPattern: /^Chapter/i,
          keyLocation: "end_of_chapter",
          choiceStyle: "letter_dot",
          expectedChoicesPerItem: 4,
          endMarkers: [/^Answers/i],
        },
      });

      expect(result.items.length).toBe(3);
      // All items should have no valid key
      expect(result.items[0].correctLetter).toBe("");
      expect(result.items[1].correctLetter).toBe("");
      expect(result.items[2].correctLetter).toBe("");
    });
  });

  describe("Condition 9(c): Numeric keys require per-page number alignment, else reject", () => {
    it("accepts strictly aligned monotonic numeric keys", () => {
      const pages: PdfPageWithLayout[] = [
        {
          pageNum: 1,
          text: "1. Question one\na. Opt 1\nb. Opt 2\nc. Opt 3\nd. Opt 4\n\n2. Question two\na. Opt 1\nb. Opt 2\nc. Opt 3\nd. Opt 4\n\n3. Question three\na. Opt 1\nb. Opt 2\nc. Opt 3\nd. Opt 4",
          width: 600,
          height: 800,
          lines: [],
        },
        {
          pageNum: 2,
          text: "Answers\n1. (2) Solution for 1\n2. (4) Solution for 2\n3. (1) Solution for 3",
          width: 600,
          height: 800,
          lines: [],
        },
      ];

      const result = parseTwoPassQuestionsAndAnswersDetailed(pages, {
        profile: {
          id: "standard_two_pass",
          name: "Standard",
          description: "",
          headingPattern: /^Chapter/i,
          keyLocation: "end_of_chapter",
          choiceStyle: "letter_dot",
          expectedChoicesPerItem: 4,
          endMarkers: [/^Answers/i],
        },
      });

      expect(result.items.length).toBe(3);
      expect(result.items[0].correctLetter).toBe("b"); // Option 2 -> b
      expect(result.items[1].correctLetter).toBe("d"); // Option 4 -> d
      expect(result.items[2].correctLetter).toBe("a"); // Option 1 -> a
    });

    it("rejects non-monotonic or misaligned numeric keys", () => {
      const pages: PdfPageWithLayout[] = [
        {
          pageNum: 1,
          text: "1. Question one\na. Opt 1\nb. Opt 2\nc. Opt 3\nd. Opt 4\n\n2. Question two\na. Opt 1\nb. Opt 2\nc. Opt 3\nd. Opt 4\n\n3. Question three\na. Opt 1\nb. Opt 2\nc. Opt 3\nd. Opt 4",
          width: 600,
          height: 800,
          lines: [],
        },
        {
          pageNum: 2,
          text: "Answers\n1. (2) Random note.\n15. (4) Another note.\n2. (1) Jumbled note.",
          width: 600,
          height: 800,
          lines: [],
        },
      ];

      const result = parseTwoPassQuestionsAndAnswersDetailed(pages, {
        profile: {
          id: "standard_two_pass",
          name: "Standard",
          description: "",
          headingPattern: /^Chapter/i,
          keyLocation: "end_of_chapter",
          choiceStyle: "letter_dot",
          expectedChoicesPerItem: 4,
          endMarkers: [/^Answers/i],
        },
      });

      expect(result.items.length).toBe(3);
      // Key rejected due to misalignment
      expect(result.items[0].correctLetter).toBe("");
    });
  });
});
