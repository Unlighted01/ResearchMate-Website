import fs from "node:fs";
import path from "node:path";

const frozen = new Set(["Express Review Guides - Vocabulary.pdf", "Vocabulary for Civil Service Exam.pdf", "Newton P., Bristoll H. - Complete Set of Practice Tests for Numerical Reasoning.pdf", "English Verb Drills.pdf"]);

/** Resolve moved fixtures by filename without reading PDF contents. */
export function corpusFile(priorPath: string): string {
  const name = path.basename(priorPath.replace(/\\/g, "/"));
  if (frozen.has(name)) throw new Error(`Frozen held-out PDF: refusing access to ${name}`);
  if (fs.existsSync(priorPath)) return priorPath;
  const root = process.env.CORPUS_ROOT || "C:/Users/netne/Documents/CSC REVIEWER 2027/📝 2027 CSE Reviewer";
  const matches: string[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name === name) matches.push(full);
    }
  };
  walk(root);
  if (matches.length > 1) throw new Error(`Ambiguous corpus filename: ${name}`);
  return matches[0] || priorPath;
}
