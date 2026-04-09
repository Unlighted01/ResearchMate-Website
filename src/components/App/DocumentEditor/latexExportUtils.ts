// ============================================
// latexExportUtils.ts - TipTap JSON → LaTeX Conversion
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import { saveAs } from "file-saver";
import {
  CitationFormat,
  generateCitation,
} from "../Citations/citationUtils";
import { buildCitationDataFromItem } from "./bibliographyUtils";
import type { StorageItem } from "../../../services/storageService";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TiptapNode {
  type: string;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
  attrs?: Record<string, unknown>;
}

// ============================================
// PART 3: TEXT-LEVEL CONVERSION
// ============================================

function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function marksToLatex(text: string, marks: TiptapMark[]): string {
  let result = escapeLatex(text);

  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        result = `\\textbf{${result}}`;
        break;
      case "italic":
        result = `\\textit{${result}}`;
        break;
      case "underline":
        result = `\\underline{${result}}`;
        break;
      case "strike":
        result = `\\sout{${result}}`;
        break;
      case "subscript":
        result = `\\textsubscript{${result}}`;
        break;
      case "superscript":
        result = `\\textsuperscript{${result}}`;
        break;
    }
  }

  return result;
}

function extractLatexText(node: TiptapNode): string {
  if (node.text) {
    return node.marks?.length
      ? marksToLatex(node.text, node.marks)
      : escapeLatex(node.text);
  }

  if (node.content) {
    return node.content.map(extractLatexText).join("");
  }

  return "";
}

// ============================================
// PART 4: BLOCK-LEVEL CONVERSION
// ============================================

function nodeToLatex(node: TiptapNode): string {
  const align = node.attrs?.textAlign as string | undefined;

  const wrapAlign = (inner: string): string => {
    if (align === "center") return `\\begin{center}\n${inner}\n\\end{center}\n`;
    if (align === "right")
      return `\\begin{flushright}\n${inner}\n\\end{flushright}\n`;
    return inner;
  };

  switch (node.type) {
    case "heading": {
      if ((node.attrs as Record<string, unknown>)?.dataBibliography) return "";
      const text = extractLatexText(node);
      const level = (node.attrs?.level as number) || 1;
      const cmd =
        level === 1
          ? "\\section"
          : level === 2
          ? "\\subsection"
          : "\\subsubsection";
      return wrapAlign(`${cmd}{${text}}\n`);
    }

    case "paragraph": {
      const text = extractLatexText(node);
      if (!text) return "\n";
      return wrapAlign(`${text}\n\n`);
    }

    case "bulletList": {
      const items = (node.content || [])
        .map((li) => {
          const inner = (li.content || []).map(extractLatexText).join("");
          return `  \\item ${inner}`;
        })
        .join("\n");
      return `\\begin{itemize}\n${items}\n\\end{itemize}\n\n`;
    }

    case "orderedList": {
      const items = (node.content || [])
        .map((li) => {
          const inner = (li.content || []).map(extractLatexText).join("");
          return `  \\item ${inner}`;
        })
        .join("\n");
      return `\\begin{enumerate}\n${items}\n\\end{enumerate}\n\n`;
    }

    case "blockquote": {
      const inner = (node.content || []).map(extractLatexText).join("\n");
      return `\\begin{quote}\n${inner}\n\\end{quote}\n\n`;
    }

    case "horizontalRule":
      return "\\bigskip\\hrulefill\\bigskip\n\n";

    default:
      return extractLatexText(node);
  }
}

// ============================================
// PART 5: BIBLIOGRAPHY & DOCUMENT ASSEMBLY
// ============================================

function buildBibliographyLatex(
  citedItemIds: string[],
  items: StorageItem[],
  format: CitationFormat,
): string {
  const citedItems = items.filter((i) => citedItemIds.includes(i.id));
  if (citedItems.length === 0) return "";

  const entries = citedItems.map((item, index) => {
    const data = buildCitationDataFromItem(item);

    if (format === "bibtex") {
      return generateCitation(data, "bibtex");
    }

    const citation = generateCitation(data, format);
    const key =
      data.title.split(" ")[0]?.toLowerCase().replace(/[^a-z]/g, "") ||
      `ref${index}`;
    return `  \\bibitem{${key}} ${escapeLatex(citation)}`;
  });

  if (format === "bibtex") {
    return `\n% ===== Bibliography (BibTeX) =====\n${entries.join("\n\n")}\n`;
  }

  return `\n\\begin{thebibliography}{${citedItems.length}}\n${entries.join("\n\n")}\n\\end{thebibliography}\n`;
}

function isBibliographyNode(node: TiptapNode): boolean {
  return (
    node.type === "heading" &&
    (node.attrs as Record<string, unknown>)?.dataBibliography === true
  );
}

// ============================================
// PART 6: MAIN EXPORT FUNCTION
// ============================================

export function exportToLatex(
  json: Record<string, unknown>,
  title: string,
  citedItemIds: string[],
  items: StorageItem[],
  bibFormat: CitationFormat,
): void {
  const doc = json as unknown as TiptapNode;
  const nodes = doc.content || [];

  const bibStartIdx = nodes.findIndex(isBibliographyNode);
  const contentNodes =
    bibStartIdx >= 0 ? nodes.slice(0, Math.max(0, bibStartIdx - 1)) : nodes;

  const body = contentNodes.map(nodeToLatex).join("");
  const bibliography = buildBibliographyLatex(citedItemIds, items, bibFormat);

  const latex = `\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{ulem}
\\usepackage{hyperref}
\\usepackage{geometry}
\\geometry{a4paper, margin=1in}

\\title{${escapeLatex(title)}}
\\date{}

\\begin{document}
\\maketitle

${body}${bibliography}
\\end{document}
`;

  const blob = new Blob([latex], { type: "text/x-tex;charset=utf-8" });
  saveAs(blob, `${title}.tex`);
}
