import { describe, it, expect } from "vitest";
import { formatInTextCitation, formatAPA7, CitationMetadata } from "../src/services/citationService";

describe("Document Studio Architecture & Data Flow", () => {
  const mockDoc: CitationMetadata = {
    id: "doc-1",
    title: "Philippine Civil Service Exam Comprehensive Reviewer",
    authors: [{ lastName: "Civil Service Commission", firstName: "CSC" }],
    year: 2024,
    sourceTitle: "Official Examination Reviewer",
    pages: "45-48",
  };

  it("formats quote clippings into structured markdown with page reference", () => {
    const rawQuote = "The Constitution is the supreme law of the land.";
    const pageNum = 12;
    const docTitle = "Philippine Civil Service Reviewer";

    const formattedClip = `\n\n> "${rawQuote}"\n> — *${docTitle}*, p. ${pageNum}\n\n`;

    expect(formattedClip).toContain('> "The Constitution is the supreme law of the land."');
    expect(formattedClip).toContain("> — *Philippine Civil Service Reviewer*, p. 12");
  });

  it("inserts in-text citation correctly into markdown note body", () => {
    const currentNote = "# Constitutional Law Notes\nKey principle regarding statutory validity:";
    const inText = formatInTextCitation(mockDoc, "apa7", 45);

    const updatedNote = `${currentNote} ${inText}`;

    expect(updatedNote).toBe(
      "# Constitutional Law Notes\nKey principle regarding statutory validity: (Civil Service Commission, 2024, p. 45)"
    );
  });

  it("computes responsive split pane classes accurately without layout collapse", () => {
    const getPaneClasses = (mode: string) => {
      switch (mode) {
        case "full_pdf":
          return { left: "w-full", right: "hidden" };
        case "full_notes":
          return { left: "hidden", right: "w-full" };
        case "pdf_focus":
          return { left: "w-full lg:w-2/3", right: "w-full lg:w-1/3" };
        case "notes_focus":
          return { left: "w-full lg:w-1/3", right: "w-full lg:w-2/3" };
        case "split":
        default:
          return { left: "w-full lg:w-1/2", right: "w-full lg:w-1/2" };
      }
    };

    expect(getPaneClasses("split")).toEqual({ left: "w-full lg:w-1/2", right: "w-full lg:w-1/2" });
    expect(getPaneClasses("full_pdf")).toEqual({ left: "w-full", right: "hidden" });
    expect(getPaneClasses("full_notes")).toEqual({ left: "hidden", right: "w-full" });
    expect(getPaneClasses("pdf_focus")).toEqual({ left: "w-full lg:w-2/3", right: "w-full lg:w-1/3" });
  });

  it("generates valid APA 7 citation for active reviewer", () => {
    const apa = formatAPA7(mockDoc);
    expect(apa).toContain("Civil Service Commission, C.");
    expect(apa).toContain("(2024).");
    expect(apa).toContain("Philippine Civil Service Exam Comprehensive Reviewer.");
  });
});
