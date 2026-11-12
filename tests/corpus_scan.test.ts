import { it, describe } from "vitest";
import { runCorpusScan } from "../scripts/corpus_report";

describe("Corpus Scan Runner", () => {
  it("executes the corpus report across the entire reviewer corpus", async () => {
    // Only run if explicitly targeted or CORPUS_SCAN=1
    await runCorpusScan();
  }, 900000); // 15 min timeout for full corpus
});
