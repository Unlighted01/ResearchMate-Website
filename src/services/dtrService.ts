// ============================================
// DTR SERVICE - Daily Time Record & Research Logger
// ResearchMate Focus & Productivity System
// ============================================

export interface DTREntry {
  date: string; // YYYY-MM-DD
  accomplishments: string[];
  researchedTopics: string[];
  copiedSnippets: string[];
  focusMinutesCompleted: number;
  completedPomodoros: number;
  lastUpdated: string;
}

const STORAGE_KEY = "researchmate_dtr_logs";

export const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getAllDTREntries = (): Record<string, DTREntry> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Failed to parse DTR logs", e);
    return {};
  }
};

export const getDTREntry = (dateStr: string = getTodayDateString()): DTREntry => {
  const all = getAllDTREntries();
  return (
    all[dateStr] || {
      date: dateStr,
      accomplishments: [],
      researchedTopics: [],
      copiedSnippets: [],
      focusMinutesCompleted: 0,
      completedPomodoros: 0,
      lastUpdated: new Date().toISOString(),
    }
  );
};

export const saveDTREntry = (entry: DTREntry): void => {
  if (typeof window === "undefined") return;
  try {
    const all = getAllDTREntries();
    all[entry.date] = {
      ...entry,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    // Dispatch custom event for reactive UI updates
    window.dispatchEvent(new CustomEvent("dtrLogUpdated", { detail: entry }));
  } catch (e) {
    console.error("Failed to save DTR entry", e);
  }
};

export const addPomodoroTimeToTodayDTR = (minutes: number): void => {
  const today = getTodayDateString();
  const entry = getDTREntry(today);
  entry.focusMinutesCompleted += minutes;
  entry.completedPomodoros += 1;
  saveDTREntry(entry);
};

export const hasDTREntryForToday = (): boolean => {
  const entry = getDTREntry(getTodayDateString());
  return (
    entry.accomplishments.length > 0 ||
    entry.researchedTopics.length > 0 ||
    entry.copiedSnippets.length > 0 ||
    entry.focusMinutesCompleted > 0
  );
};

export const exportDTRAsMarkdown = (dateStr: string = getTodayDateString()): string => {
  const entry = getDTREntry(dateStr);
  const formattedDate = new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let md = `# Daily Time Record (DTR) - ${formattedDate}\n\n`;
  md += `**Focus Time Completed**: ${entry.focusMinutesCompleted} mins (${entry.completedPomodoros} Pomodoro sessions)\n\n`;

  md += `## 📋 What I Accomplished Today\n`;
  if (entry.accomplishments.length > 0) {
    entry.accomplishments.forEach((item) => {
      md += `- ${item}\n`;
    });
  } else {
    md += `*No accomplishments logged yet.*\n`;
  }
  md += `\n`;

  md += `## 🔬 Researched Topics\n`;
  if (entry.researchedTopics.length > 0) {
    entry.researchedTopics.forEach((topic) => {
      md += `- ${topic}\n`;
    });
  } else {
    md += `*No research topics logged yet.*\n`;
  }
  md += `\n`;

  md += `## 📝 Copied Snippets & Notes\n`;
  if (entry.copiedSnippets.length > 0) {
    entry.copiedSnippets.forEach((snippet) => {
      md += `> ${snippet.replace(/\n/g, "\n> ")}\n\n`;
    });
  } else {
    md += `*No snippets logged yet.*\n`;
  }

  return md;
};
