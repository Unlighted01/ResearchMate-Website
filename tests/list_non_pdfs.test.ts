import { describe, it } from "vitest";
import fs from "fs";
import path from "path";

describe("List non-pdf files", () => {
  it("scans corpus for non-PDFs", () => {
    const root = "C:/Users/netne/Documents/CSC REVIEWER 2027/📝 2027 CSE Reviewer";
    const nonPdfs: string[] = [];
    const dirsWithNoPdfs = new Set<string>();
    const allDirs = new Set<string>();
    const dirsWithPdfs = new Set<string>();

    function scan(dir: string) {
      allDirs.add(dir);
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      let hasPdf = false;
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          scan(full);
        } else if (e.isFile()) {
          if (e.name.toLowerCase().endsWith(".pdf")) {
            hasPdf = true;
          } else {
            nonPdfs.push(full);
          }
        }
      }
      if (hasPdf) {
        dirsWithPdfs.add(dir);
      }
    }

    scan(root);
    for (const d of allDirs) {
      if (!dirsWithPdfs.has(d)) {
        dirsWithNoPdfs.add(d);
      }
    }

    console.log("=== NON-PDF FILES IN CORPUS ===");
    console.log(`Total non-PDF files: ${nonPdfs.length}`);
    nonPdfs.forEach(f => console.log(" -", f));

    console.log(`\n=== DIRECTORIES WITH ZERO PDFS ===`);
    dirsWithNoPdfs.forEach(d => console.log(" -", d));
  });
});
