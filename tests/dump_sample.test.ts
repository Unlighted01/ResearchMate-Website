import { describe, it } from "vitest";
import fs from "fs";
import path from "path";
import { extractAllPagesWithLayout } from "../src/services/pdfService";
import { parseTwoPassQuestionsAndAnswers } from "../src/services/pdfQuestionImporter";

describe("Dump Real Generator Sample", () => {
  it("runs the real modal generator and dumps JSON", async () => {
    const fixturePath = path.resolve(
      __dirname,
      "../tests/fixtures/Philippines_Code_of_Conduct_and_Ethical_Standards_for_Public_Officials_1989.pdf"
    );
    const buffer = fs.readFileSync(fixturePath);
    const layoutResult = await extractAllPagesWithLayout(buffer);
    const parsed = parseTwoPassQuestionsAndAnswers(layoutResult.pages);

    const mcqs = parsed.filter((q) => q.questionType === "mcq").slice(0, 20);
    const outPath = path.resolve(__dirname, "../scratch/real_generator_sample_20.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(mcqs, null, 2), "utf-8");
    console.log("WROTE", mcqs.length, "MCQs to", outPath);
  });
});
