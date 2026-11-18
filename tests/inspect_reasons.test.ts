import { describe, it } from "vitest";
import fs from "fs";

describe("Test Q300 option e stripping", () => {
  it("strips inspirational quotes from option e", () => {
    let optText = "10:45am \nREAD these INSPIRATIONAL QUOTES... \nI hope these words will somehow help motivate you to study, review, \npass all exams and be successful in life... and become an inspiration \nto others...";
    optText = optText.replace(/(?:\n|^|\s{2,})\s*(?:READ\s+these\s+INSPIRATIONAL\s+QUOTES|INSPIRATIONAL\s+QUOTES|END\s+OF\s+(?:TEST|EXAM|SECTION)|STOP\s*[\.\!]|DO\s+NOT\s+GO\s+ON)[\s\S]*/i, "").trim();
    console.log("Cleaned optText:", optText);
  });
});
