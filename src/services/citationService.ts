// ============================================
// CITATION SERVICE
// High-accuracy citation generation, DOI extraction,
// and multi-style bibliography formatting (APA 7, MLA 9, Chicago, IEEE, Harvard, BibTeX)
// ============================================

export type CitationStyle = "apa7" | "mla9" | "chicago" | "ieee" | "harvard" | "bibtex";

export interface CitationAuthor {
  lastName: string;
  firstName?: string;
  initials?: string;
}

export interface CitationMetadata {
  id?: string;
  title: string;
  authors: CitationAuthor[];
  year?: number | string;
  sourceTitle?: string; // Journal, Book, Conference, or Publisher
  volume?: string | number;
  issue?: string | number;
  pages?: string;
  doi?: string;
  url?: string;
  publisher?: string;
  accessDate?: string;
  sourceType?: "journal" | "book" | "web" | "conference" | "general";
}

/**
 * Normalizes a list of author strings or objects into structured CitationAuthor items.
 */
export function parseAuthors(rawAuthors: string | string[]): CitationAuthor[] {
  if (!rawAuthors) return [];

  const list = Array.isArray(rawAuthors) ? rawAuthors : rawAuthors.split(/;\s*|\s+and\s+/i);

  return list
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => {
      // Check if format is "LastName, FirstName"
      if (name.includes(",")) {
        const [last, first] = name.split(",").map((s) => s.trim());
        const initials = first
          ? first
              .split(/\s+/)
              .map((w) => `${w[0].toUpperCase()}.`)
              .join(" ")
          : undefined;
        return { lastName: last, firstName: first, initials };
      }

      // Format is "FirstName LastName"
      const parts = name.split(/\s+/).filter(Boolean);
      if (parts.length === 1) {
        return { lastName: parts[0] };
      }
      const last = parts.pop() || "";
      const first = parts.join(" ");
      const initials = parts.map((w) => `${w[0].toUpperCase()}.`).join(" ");
      return { lastName: last, firstName: first, initials };
    });
}

/**
 * Extracts potential DOI string from arbitrary text or URLs.
 */
export function extractDoi(text: string): string | null {
  if (!text) return null;
  const doiRegex = /\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/;
  const match = text.match(doiRegex);
  return match ? match[1] : null;
}

/**
 * Extracts potential publication year (1900 - 2099) from string.
 */
export function extractYear(text: string): number | null {
  if (!text) return null;
  const match = text.match(/\b(19\d\d|20\d\d)\b/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extracts arXiv ID if present (e.g., arXiv:2305.12345 or 2305.12345).
 */
export function extractArxivId(text: string): string | null {
  if (!text) return null;
  const arxivRegex = /\b(?:arXiv:\s*)?(\d{4}\.\d{4,5}(?:v\d+)?)\b/i;
  const match = text.match(arxivRegex);
  return match ? match[1] : null;
}

/**
 * APA 7th Edition Formatter
 * Format: Author, A. A., & Author, B. B. (Year). Title. Source, Volume(Issue), pages. https://doi.org/...
 */
export function formatAPA7(meta: CitationMetadata): string {
  const authorPart = formatAuthorsAPA(meta.authors);
  const yearPart = meta.year ? `(${meta.year}).` : "(n.d.).";
  const titlePart = meta.title ? (meta.title.endsWith(".") ? meta.title : `${meta.title}.`) : "Untitled.";

  let sourcePart = "";
  if (meta.sourceTitle) {
    sourcePart = meta.sourceTitle;
    if (meta.volume) {
      sourcePart += `, ${meta.volume}`;
      if (meta.issue) sourcePart += `(${meta.issue})`;
    }
    if (meta.pages) sourcePart += `, ${meta.pages}`;
    sourcePart += ".";
  } else if (meta.publisher) {
    sourcePart = `${meta.publisher}.`;
  }

  const doiPart = meta.doi
    ? `https://doi.org/${meta.doi.replace(/^https?:\/\/doi\.org\//, "")}`
    : meta.url || "";

  return [authorPart, yearPart, titlePart, sourcePart, doiPart].filter(Boolean).join(" ").trim();
}

/**
 * Helper for APA Author string
 */
function formatAuthorsAPA(authors: CitationAuthor[]): string {
  if (!authors || authors.length === 0) return "Anonymous.";
  const formatted = authors.map((a) => {
    const initials = a.initials || (a.firstName ? `${a.firstName[0].toUpperCase()}.` : "");
    return initials ? `${a.lastName}, ${initials}` : a.lastName;
  });

  if (formatted.length === 1) return `${formatted[0]}.`;
  if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}.`;
  if (formatted.length <= 20) {
    const last = formatted.pop();
    return `${formatted.join(", ")}, & ${last}.`;
  }
  // Over 20 authors
  return `${formatted.slice(0, 19).join(", ")}, ... ${formatted[formatted.length - 1]}.`;
}

/**
 * MLA 9th Edition Formatter
 * Format: Author, First. "Title." Source, vol. X, no. Y, Year, pp. XX-XX. Location.
 */
export function formatMLA9(meta: CitationMetadata): string {
  const authorPart = formatAuthorsMLA(meta.authors);
  const titlePart = meta.title ? `"${meta.title.replace(/\.$/, "")}."` : `"Untitled."`;

  const details: string[] = [];
  if (meta.sourceTitle) details.push(meta.sourceTitle);
  if (meta.volume) details.push(`vol. ${meta.volume}`);
  if (meta.issue) details.push(`no. ${meta.issue}`);
  if (meta.year) details.push(String(meta.year));
  if (meta.pages) {
    const pagePrefix = meta.pages.includes("-") ? "pp." : "p.";
    details.push(`${pagePrefix} ${meta.pages}`);
  }
  if (meta.doi) {
    details.push(`https://doi.org/${meta.doi.replace(/^https?:\/\/doi\.org\//, "")}`);
  } else if (meta.url) {
    details.push(meta.url);
  }

  const containerPart = details.length > 0 ? `${details.join(", ")}.` : "";

  return [authorPart, titlePart, containerPart].filter(Boolean).join(" ").trim();
}

function formatAuthorsMLA(authors: CitationAuthor[]): string {
  if (!authors || authors.length === 0) return "";
  if (authors.length === 1) {
    const a = authors[0];
    const first = a.firstName || a.initials || "";
    return first ? `${a.lastName}, ${first}.` : `${a.lastName}.`;
  }
  if (authors.length === 2) {
    const a1 = authors[0];
    const a2 = authors[1];
    const first1 = a1.firstName || a1.initials || "";
    const first2 = a2.firstName || a2.initials || "";
    const name2 = first2 ? `${first2} ${a2.lastName}` : a2.lastName;
    return first1 ? `${a1.lastName}, ${first1}, and ${name2}.` : `${a1.lastName} and ${name2}.`;
  }
  // 3 or more authors
  const a1 = authors[0];
  const first1 = a1.firstName || a1.initials || "";
  return first1 ? `${a1.lastName}, ${first1}, et al.` : `${a1.lastName} et al.`;
}

/**
 * Chicago 17th Edition (Author-Date)
 */
export function formatChicago(meta: CitationMetadata): string {
  const authorPart = formatAuthorsChicago(meta.authors);
  const yearPart = meta.year ? `${meta.year}.` : "n.d.";
  const titlePart = meta.title ? `"${meta.title.replace(/\.$/, "")}."` : `"Untitled."`;

  let sourcePart = "";
  if (meta.sourceTitle) {
    sourcePart = meta.sourceTitle;
    if (meta.volume) {
      sourcePart += ` ${meta.volume}`;
      if (meta.issue) sourcePart += `, no. ${meta.issue}`;
    }
    if (meta.pages) sourcePart += `: ${meta.pages}`;
    sourcePart += ".";
  }

  const linkPart = meta.doi
    ? `https://doi.org/${meta.doi.replace(/^https?:\/\/doi\.org\//, "")}`
    : meta.url || "";

  return [authorPart, yearPart, titlePart, sourcePart, linkPart].filter(Boolean).join(" ").trim();
}

function formatAuthorsChicago(authors: CitationAuthor[]): string {
  if (!authors || authors.length === 0) return "Anonymous.";
  if (authors.length === 1) {
    const a = authors[0];
    const first = a.firstName || a.initials || "";
    return first ? `${a.lastName}, ${first}.` : `${a.lastName}.`;
  }
  if (authors.length <= 3) {
    const formatted = authors.map((a, i) => {
      const first = a.firstName || a.initials || "";
      if (i === 0) return first ? `${a.lastName}, ${first}` : a.lastName;
      return first ? `${first} ${a.lastName}` : a.lastName;
    });
    const last = formatted.pop();
    return `${formatted.join(", ")}, and ${last}.`;
  }
  const first = authors[0].firstName || authors[0].initials || "";
  return first ? `${authors[0].lastName}, ${first}, et al.` : `${authors[0].lastName} et al.`;
}

/**
 * IEEE Formatter
 * Format: [1] A. A. Author and B. B. Author, "Title," Source, vol. x, no. y, pp. xxx, Year.
 */
export function formatIEEE(meta: CitationMetadata, citationNumber: number = 1): string {
  const authorPart = formatAuthorsIEEE(meta.authors);
  const titlePart = meta.title ? `"${meta.title.replace(/\.$/, "")},"` : `"Untitled,"`;

  const details: string[] = [];
  if (meta.sourceTitle) details.push(meta.sourceTitle);
  if (meta.volume) details.push(`vol. ${meta.volume}`);
  if (meta.issue) details.push(`no. ${meta.issue}`);
  if (meta.pages) details.push(`pp. ${meta.pages}`);
  if (meta.year) details.push(String(meta.year));

  const sourcePart = details.length > 0 ? `${details.join(", ")}.` : "";
  const doiPart = meta.doi ? `doi: ${meta.doi.replace(/^https?:\/\/doi\.org\//, "")}.` : "";

  return `[${citationNumber}] ${[authorPart, titlePart, sourcePart, doiPart].filter(Boolean).join(" ")}`.trim();
}

function formatAuthorsIEEE(authors: CitationAuthor[]): string {
  if (!authors || authors.length === 0) return "Anon.,";
  const formatted = authors.map((a) => {
    const initials = a.initials || (a.firstName ? `${a.firstName[0].toUpperCase()}.` : "");
    return initials ? `${initials} ${a.lastName}` : a.lastName;
  });

  if (formatted.length === 1) return `${formatted[0]},`;
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]},`;
  if (formatted.length <= 6) {
    const last = formatted.pop();
    return `${formatted.join(", ")}, and ${last},`;
  }
  return `${formatted[0]} et al.,`;
}

/**
 * Harvard (Author-Date) Formatter
 */
export function formatHarvard(meta: CitationMetadata): string {
  const authorPart = formatAuthorsHarvard(meta.authors);
  const yearPart = meta.year ? `(${meta.year})` : "(no date)";
  const titlePart = meta.title ? `'${meta.title.replace(/\.$/, "")}',` : `'Untitled',`;

  let sourcePart = "";
  if (meta.sourceTitle) {
    sourcePart = meta.sourceTitle;
    if (meta.volume) {
      sourcePart += `, ${meta.volume}`;
      if (meta.issue) sourcePart += `(${meta.issue})`;
    }
    if (meta.pages) sourcePart += `, pp. ${meta.pages}`;
    sourcePart += ".";
  }

  const availPart = meta.doi
    ? `Available at: https://doi.org/${meta.doi.replace(/^https?:\/\/doi\.org\//, "")}`
    : meta.url
    ? `Available at: ${meta.url}`
    : "";

  return [authorPart, yearPart, titlePart, sourcePart, availPart].filter(Boolean).join(" ").trim();
}

function formatAuthorsHarvard(authors: CitationAuthor[]): string {
  if (!authors || authors.length === 0) return "Anon.";
  const formatted = authors.map((a) => {
    const initials = a.initials ? a.initials.replace(/\s+/g, "") : a.firstName ? `${a.firstName[0].toUpperCase()}.` : "";
    return initials ? `${a.lastName}, ${initials}` : a.lastName;
  });

  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
  if (formatted.length <= 3) {
    const last = formatted.pop();
    return `${formatted.join(", ")} and ${last}`;
  }
  return `${formatted[0]} et al.`;
}

/**
 * BibTeX Formatter
 */
export function formatBibTeX(meta: CitationMetadata): string {
  const firstAuthor = meta.authors[0]?.lastName.toLowerCase().replace(/[^a-z0-9]/g, "") || "anon";
  const year = meta.year || "nodate";
  const firstWord = meta.title
    ? meta.title
        .split(/\s+/)[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
    : "doc";
  const citeKey = `${firstAuthor}${year}${firstWord}`;

  const authorsString = meta.authors
    .map((a) => {
      const first = a.firstName || a.initials || "";
      return first ? `${a.lastName}, ${first}` : a.lastName;
    })
    .join(" and ");

  const lines = [
    `@article{${citeKey},`,
    `  title = {${meta.title || "Untitled"}},`,
    authorsString ? `  author = {${authorsString}},` : undefined,
    meta.sourceTitle ? `  journal = {${meta.sourceTitle}},` : undefined,
    meta.year ? `  year = {${meta.year}},` : undefined,
    meta.volume ? `  volume = {${meta.volume}},` : undefined,
    meta.issue ? `  number = {${meta.issue}},` : undefined,
    meta.pages ? `  pages = {${meta.pages}},` : undefined,
    meta.doi ? `  doi = {${meta.doi}},` : undefined,
    meta.url ? `  url = {${meta.url}},` : undefined,
    `}`,
  ].filter(Boolean);

  return lines.join("\n");
}

/**
 * Formats in-text citations.
 * Examples:
 * - APA parenthetical: (Santos, 2024, p. 12)
 * - APA narrative: Santos (2024, p. 12)
 * - IEEE: [1, p. 12]
 */
export function formatInTextCitation(
  meta: CitationMetadata,
  style: CitationStyle = "apa7",
  pageNumber?: number | string,
  narrative: boolean = false
): string {
  const pageStr = pageNumber ? `, p. ${pageNumber}` : "";

  if (style === "ieee") {
    return pageNumber ? `[1, p. ${pageNumber}]` : `[1]`;
  }

  const primaryAuthor = meta.authors[0]?.lastName || "Anonymous";
  const authorsText =
    meta.authors.length === 1
      ? primaryAuthor
      : meta.authors.length === 2
      ? `${primaryAuthor} & ${meta.authors[1].lastName}`
      : `${primaryAuthor} et al.`;

  const yearStr = meta.year || "n.d.";

  if (narrative) {
    return `${authorsText} (${yearStr}${pageStr})`;
  }

  return `(${authorsText}, ${yearStr}${pageStr})`;
}

/**
 * Universal formatter dispatcher
 */
export function formatCitation(
  meta: CitationMetadata,
  style: CitationStyle = "apa7",
  citationNumber: number = 1
): string {
  switch (style) {
    case "apa7":
      return formatAPA7(meta);
    case "mla9":
      return formatMLA9(meta);
    case "chicago":
      return formatChicago(meta);
    case "ieee":
      return formatIEEE(meta, citationNumber);
    case "harvard":
      return formatHarvard(meta);
    case "bibtex":
      return formatBibTeX(meta);
    default:
      return formatAPA7(meta);
  }
}
