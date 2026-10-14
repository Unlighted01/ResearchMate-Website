// ============================================
// wordImportUtils.ts - Word (.docx) & Text Manuscript Parser
// ============================================

import mammoth from "mammoth";

export interface ImportedWordDocument {
  title: string;
  html: string;
}

/**
 * Parses an uploaded .docx, .txt, or .md file into title and clean HTML
 */
export async function parseWordDocument(file: File): Promise<ImportedWordDocument> {
  const fileName = file.name;
  const title = fileName
    .replace(/\.(docx|txt|md)$/i, "")
    .replace(/[-_]/g, " ")
    .trim();

  if (fileName.toLowerCase().endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return {
      title: title || "Imported Manuscript",
      html: result.value || "<p></p>",
    };
  } else {
    // Plain text or Markdown fallback
    const text = await file.text();
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
      .join("");
    return {
      title: title || "Imported Document",
      html: paragraphs || "<p></p>",
    };
  }
}
