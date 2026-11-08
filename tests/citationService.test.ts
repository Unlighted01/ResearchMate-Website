import { describe, it, expect } from "vitest";
import {
  parseAuthors,
  extractDoi,
  extractYear,
  extractArxivId,
  formatAPA7,
  formatMLA9,
  formatChicago,
  formatIEEE,
  formatHarvard,
  formatBibTeX,
  formatInTextCitation,
  CitationMetadata,
} from "../src/services/citationService";

describe("Citation Service Unit Tests", () => {
  const sampleMeta: CitationMetadata = {
    title: "Deep Active Learning for High-Stakes Exam Diagnostics",
    authors: [
      { lastName: "Santos", firstName: "Maria", initials: "M." },
      { lastName: "Reyes", firstName: "Jose", initials: "J." },
    ],
    year: 2024,
    sourceTitle: "Journal of Educational Technology Systems",
    volume: 52,
    issue: 3,
    pages: "215-230",
    doi: "10.1177/0047239524123456",
  };

  describe("Regex & Heuristic Extractors", () => {
    it("extracts DOI from strings or URLs", () => {
      expect(extractDoi("Paper available at https://doi.org/10.1016/j.compedu.2023.104821.")).toBe(
        "10.1016/j.compedu.2023.104821"
      );
      expect(extractDoi("DOI: 10.1145/3313831.3376727")).toBe("10.1145/3313831.3376727");
      expect(extractDoi("No doi here")).toBeNull();
    });

    it("extracts 4-digit publication years accurately", () => {
      expect(extractYear("Published October 2023")).toBe(2023);
      expect(extractYear("Exam Reviewer (1998 Edition)")).toBe(1998);
      expect(extractYear("Random 45678 text")).toBeNull();
    });

    it("extracts arXiv identifiers", () => {
      expect(extractArxivId("Preprint arXiv:2305.18290v1 on quantitative biology")).toBe(
        "2305.18290v1"
      );
      expect(extractArxivId("See 2106.09685 for details")).toBe("2106.09685");
    });

    it("parses diverse author formats cleanly", () => {
      const parsed1 = parseAuthors("Santos, Maria; Reyes, Jose");
      expect(parsed1).toEqual([
        { lastName: "Santos", firstName: "Maria", initials: "M." },
        { lastName: "Reyes", firstName: "Jose", initials: "J." },
      ]);

      const parsed2 = parseAuthors("Maria Santos and Jose Reyes");
      expect(parsed2[0].lastName).toBe("Santos");
      expect(parsed2[1].lastName).toBe("Reyes");
    });
  });

  describe("Multi-Style Citation Formatters", () => {
    it("formats APA 7th Edition with DOI link", () => {
      const apa = formatAPA7(sampleMeta);
      expect(apa).toContain("Santos, M., & Reyes, J.");
      expect(apa).toContain("(2024).");
      expect(apa).toContain("Deep Active Learning for High-Stakes Exam Diagnostics.");
      expect(apa).toContain("Journal of Educational Technology Systems, 52(3), 215-230.");
      expect(apa).toContain("https://doi.org/10.1177/0047239524123456");
    });

    it("formats MLA 9th Edition", () => {
      const mla = formatMLA9(sampleMeta);
      expect(mla).toContain('Santos, Maria, and Jose Reyes. "Deep Active Learning for High-Stakes Exam Diagnostics."');
      expect(mla).toContain("Journal of Educational Technology Systems, vol. 52, no. 3, 2024, pp. 215-230");
      expect(mla).toContain("https://doi.org/10.1177/0047239524123456");
    });

    it("formats Chicago 17th Edition", () => {
      const chicago = formatChicago(sampleMeta);
      expect(chicago).toContain('Santos, Maria, and Jose Reyes. 2024. "Deep Active Learning for High-Stakes Exam Diagnostics."');
      expect(chicago).toContain("Journal of Educational Technology Systems 52, no. 3: 215-230.");
    });

    it("formats IEEE style with numeric badge", () => {
      const ieee = formatIEEE(sampleMeta, 1);
      expect(ieee).toContain('[1] M. Santos and J. Reyes, "Deep Active Learning for High-Stakes Exam Diagnostics,"');
      expect(ieee).toContain("vol. 52, no. 3, pp. 215-230, 2024.");
    });

    it("formats Harvard style", () => {
      const harvard = formatHarvard(sampleMeta);
      expect(harvard).toContain("Santos, M. and Reyes, J. (2024) 'Deep Active Learning for High-Stakes Exam Diagnostics',");
      expect(harvard).toContain("Available at: https://doi.org/10.1177/0047239524123456");
    });

    it("formats BibTeX @article entry", () => {
      const bib = formatBibTeX(sampleMeta);
      expect(bib).toContain("@article{santos2024deep,");
      expect(bib).toContain("  title = {Deep Active Learning for High-Stakes Exam Diagnostics},");
      expect(bib).toContain("  author = {Santos, Maria and Reyes, Jose},");
      expect(bib).toContain("  year = {2024},");
      expect(bib).toContain("  doi = {10.1177/0047239524123456},");
    });
  });

  describe("In-Text Citation Generation", () => {
    it("generates parenthetical in-text citations with page number", () => {
      const inText = formatInTextCitation(sampleMeta, "apa7", 14);
      expect(inText).toBe("(Santos & Reyes, 2024, p. 14)");
    });

    it("generates narrative in-text citations", () => {
      const inText = formatInTextCitation(sampleMeta, "apa7", 14, true);
      expect(inText).toBe("Santos & Reyes (2024, p. 14)");
    });

    it("generates IEEE numeric in-text citations", () => {
      expect(formatInTextCitation(sampleMeta, "ieee")).toBe("[1]");
      expect(formatInTextCitation(sampleMeta, "ieee", 42)).toBe("[1, p. 42]");
    });
  });
});
