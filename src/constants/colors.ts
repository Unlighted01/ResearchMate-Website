// ============================================
// colors.ts - Shared highlight color definitions
// ============================================

// ============================================
// PART 1: HIGHLIGHT COLORS
// ============================================

export const HIGHLIGHT_COLORS = [
  { name: "yellow", hex: "#FBBF24" },
  { name: "green", hex: "#34D399" },
  { name: "blue", hex: "#60A5FA" },
  { name: "red", hex: "#F87171" },
  { name: "purple", hex: "#A78BFA" },
] as const;

/**
 * Returns CSS classes for a colored border-left on research item cards.
 */
export const getHighlightColorClasses = (color?: string): string => {
  const map: Record<string, string> = {
    yellow:
      "border-l-[4px] border-l-[#FBBF24] bg-amber-50/10 dark:bg-amber-900/10",
    green:
      "border-l-[4px] border-l-[#34D399] bg-emerald-50/10 dark:bg-emerald-900/10",
    blue: "border-l-[4px] border-l-[#60A5FA] bg-blue-50/10 dark:bg-blue-900/10",
    red: "border-l-[4px] border-l-[#F87171] bg-red-50/10 dark:bg-red-900/10",
    purple:
      "border-l-[4px] border-l-[#A78BFA] bg-purple-50/10 dark:bg-purple-900/10",
  };
  return color ? map[color] || "" : "";
};

// ============================================
// PART 2: SOURCE COLORS
// ============================================

export const SOURCE_COLORS: Record<string, string> = {
  extension: "#007AFF",
  mobile: "#5856D6",
  smart_pen: "#FF9500",
  web: "#34C759",
};

export const getSourceColor = (source: string): string => {
  return SOURCE_COLORS[source] || "#8E8E93";
};
