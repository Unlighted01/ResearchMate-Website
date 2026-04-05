// ============================================
// helpers.ts - Dashboard shared helper utilities
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

// (no imports required — pure functions)

// ============================================
// PART 2: HELPER FUNCTIONS
// ============================================

export const stripMarkdown = (text: string) =>
  text
    .replace(/^#{1,6} /gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\|.*\|/g, "")
    .replace(/^[-*+] /gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-]{3,}\s*$/gm, "")
    .trim();

export const isMarkdown = (text: string) =>
  /^#{1,3} |\n#{1,3} |\|.+\|/.test(text);

// ============================================
// PART 3: EXPORTS
// ============================================

// Named exports above — no default export needed.
