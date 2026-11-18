import fs from "fs";
import path from "path";

const root = "C:/Users/netne/Documents/CSC REVIEWER 2027/📝 2027 CSE Reviewer";

function scanDir(dir: string, nonPdfList: string[]) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath, nonPdfList);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext !== ".pdf") {
        nonPdfList.push(fullPath);
      }
    }
  }
}

const list: string[] = [];
scanDir(root, list);
console.log("Non-PDF count:", list.length);
console.log("Files:", list);
