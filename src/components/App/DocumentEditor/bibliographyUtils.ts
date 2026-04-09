// ============================================
// bibliographyUtils.ts - Bibliography Generation & Insertion
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import {
  CitationFormat,
  CitationData,
  generateCitation,
  extractDomain,
} from "../Citations/citationUtils";
import type { StorageItem } from "../../../services/storageService";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

export interface BibliographyOptions {
  format: CitationFormat;
  items: StorageItem[];
  citedItemIds: string[];
}

interface DocContent {
  type: string;
  content: Record<string, unknown>[];
  citedItemIds?: string[];
  [key: string]: unknown;
}

// ============================================
// PART 3: HELPER FUNCTIONS
// ============================================

export function buildCitationDataFromItem(item: StorageItem): CitationData {
  let author = "Unknown Author";
  if (item.citation) {
    const match = item.citation.match(/^([^.(]+)/);
    if (match && match[1].trim() && match[1].trim() !== "Unknown Author") {
      author = match[1].trim().replace(/,\s*$/, "");
    }
  }

  return {
    title: item.sourceTitle || item.text?.slice(0, 80) || "Untitled",
    author,
    publishDate: item.createdAt || new Date().toISOString(),
    accessDate: new Date().toISOString(),
    url: item.sourceUrl || "",
    publisher: "",
    websiteName: item.sourceUrl ? extractDomain(item.sourceUrl) : "",
  };
}

function sortCitations(
  items: StorageItem[],
  format: CitationFormat,
  citedItemIds: string[],
): StorageItem[] {
  if (format === "ieee") {
    return citedItemIds
      .map((id) => items.find((i) => i.id === id))
      .filter((i): i is StorageItem => i !== undefined);
  }

  return [...items].sort((a, b) => {
    const authorA = buildCitationDataFromItem(a).author.toLowerCase();
    const authorB = buildCitationDataFromItem(b).author.toLowerCase();
    return authorA.localeCompare(authorB);
  });
}

// ============================================
// PART 4: MAIN FUNCTIONS
// ============================================

export function generateBibliographyNodes(
  options: BibliographyOptions,
): Record<string, unknown>[] {
  const { format, items, citedItemIds } = options;

  const citedItems = items.filter((item) => citedItemIds.includes(item.id));
  if (citedItems.length === 0) return [];

  const sorted = sortCitations(citedItems, format, citedItemIds);

  const citationParagraphs = sorted.map((item, index) => {
    const data = buildCitationDataFromItem(item);
    const citationText =
      format === "ieee"
        ? `[${index + 1}] ${generateCitation(data, format)}`
        : generateCitation(data, format);

    return {
      type: "paragraph",
      attrs: { indent: 1 },
      content: [
        {
          type: "text",
          text: citationText,
        },
      ],
    };
  });

  return [
    { type: "horizontalRule" },
    {
      type: "heading",
      attrs: { level: 2, dataBibliography: true },
      content: [{ type: "text", text: "Bibliography" }],
    },
    ...citationParagraphs,
  ];
}

export function removeBibliographyFromDoc(
  content: Record<string, unknown>,
): Record<string, unknown> {
  const doc = content as unknown as DocContent;
  if (!doc.content || !Array.isArray(doc.content)) return content;

  const nodes = doc.content;
  let bibHeadingIndex = -1;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] as Record<string, unknown>;
    if (
      node.type === "heading" &&
      (node.attrs as Record<string, unknown>)?.dataBibliography === true
    ) {
      bibHeadingIndex = i;
      break;
    }
  }

  if (bibHeadingIndex === -1) return content;

  const hrIndex =
    bibHeadingIndex > 0 &&
    (nodes[bibHeadingIndex - 1] as Record<string, unknown>).type ===
      "horizontalRule"
      ? bibHeadingIndex - 1
      : bibHeadingIndex;

  return {
    ...doc,
    content: nodes.slice(0, hrIndex),
  };
}

export function insertBibliography(
  content: Record<string, unknown>,
  bibNodes: Record<string, unknown>[],
): Record<string, unknown> {
  const cleaned = removeBibliographyFromDoc(content);
  const doc = cleaned as unknown as DocContent;

  if (bibNodes.length === 0) return cleaned;

  return {
    ...doc,
    content: [...(doc.content || []), ...bibNodes],
  };
}

// ============================================
// PART 5: EXPORTS
// ============================================

export {
  generateBibliographyNodes as default,
};
