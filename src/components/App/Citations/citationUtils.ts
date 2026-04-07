// ============================================
// citationUtils.ts - Citation Types & Formatting Utilities
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

// (no external imports needed)

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

export type CitationFormat =
  | "apa"
  | "mla"
  | "chicago"
  | "harvard"
  | "ieee"
  | "bibtex";

export interface CitationData {
  title: string;
  author: string;
  publishDate: string;
  accessDate: string;
  url: string;
  publisher: string;
  websiteName: string;
}

// ============================================
// PART 3: CONSTANTS
// ============================================

export const CITATION_FORMATS: {
  id: CitationFormat;
  name: string;
  description: string;
}[] = [
  {
    id: "apa",
    name: "APA 7th",
    description: "American Psychological Association",
  },
  { id: "mla", name: "MLA 9th", description: "Modern Language Association" },
  { id: "chicago", name: "Chicago", description: "Chicago Manual of Style" },
  { id: "harvard", name: "Harvard", description: "Harvard Referencing" },
  {
    id: "ieee",
    name: "IEEE",
    description: "Institute of Electrical and Electronics Engineers",
  },
  { id: "bibtex", name: "BibTeX", description: "LaTeX Bibliography Format" },
];

export const EMPTY_CITATION_DATA: CitationData = {
  title: "",
  author: "",
  publishDate: new Date().toISOString(),
  accessDate: new Date().toISOString(),
  url: "",
  publisher: "",
  websiteName: "",
};

// ============================================
// PART 4: HELPER FUNCTIONS
// ============================================

export const formatDate = (
  dateStr: string,
  format: "full" | "year" | "mla" | "chicago"
): string => {
  let date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    const yearMatch = dateStr.match(/\d{4}/);
    if (yearMatch) {
      date = new Date(`${yearMatch[0]}-01-01`);
    } else {
      date = new Date();
    }
  }

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthsShort = [
    "Jan.",
    "Feb.",
    "Mar.",
    "Apr.",
    "May",
    "June",
    "July",
    "Aug.",
    "Sept.",
    "Oct.",
    "Nov.",
    "Dec.",
  ];

  switch (format) {
    case "year":
      return date.getFullYear().toString();
    case "mla":
      return `${date.getDate()} ${monthsShort[date.getMonth()]} ${date.getFullYear()}`;
    case "chicago":
      return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    case "full":
    default:
      return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
};

export const generateCitation = (
  data: CitationData,
  format: CitationFormat
): string => {
  const { title, author, publishDate, accessDate, url, publisher, websiteName } =
    data;
  const authorDisplay = author || "Unknown Author";
  const titleDisplay = title || "Untitled";

  switch (format) {
    case "apa":
      return `${authorDisplay}. (${formatDate(publishDate, "year")}). ${titleDisplay}. ${
        websiteName || publisher || "Website"
      }. Retrieved ${formatDate(accessDate, "full")}, from ${url}`;

    case "mla":
      return `${authorDisplay}. "${titleDisplay}." ${
        websiteName || publisher || "Website"
      }, ${formatDate(publishDate, "mla")}, ${url}. Accessed ${formatDate(accessDate, "mla")}.`;

    case "chicago":
      return `${authorDisplay}. "${titleDisplay}." ${
        websiteName || publisher || "Website"
      }. ${formatDate(publishDate, "chicago")}. ${url}.`;

    case "harvard":
      return `${authorDisplay} (${formatDate(publishDate, "year")}) ${titleDisplay}. Available at: ${url} (Accessed: ${formatDate(accessDate, "mla")}).`;

    case "ieee":
      return `${authorDisplay}, "${titleDisplay}," ${
        websiteName || publisher || "Website"
      }, ${formatDate(publishDate, "year")}. [Online]. Available: ${url}. [Accessed: ${formatDate(accessDate, "mla")}].`;

    case "bibtex": {
      const key =
        titleDisplay.split(" ")[0].toLowerCase() + formatDate(publishDate, "year");
      return `@misc{${key},
  author = {${authorDisplay}},
  title = {${titleDisplay}},
  year = {${formatDate(publishDate, "year")}},
  url = {${url}},
  note = {Accessed: ${formatDate(accessDate, "mla")}}
}`;
    }

    default:
      return "";
  }
};

export const extractDomain = (url: string): string => {
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return "";
  }
};
