import { afterEach, expect, it, vi } from "vitest";
const cloud = vi.hoisted(() => ({ from: vi.fn(() => { throw new Error("Unexpected cloud write"); }) }));
vi.mock("../src/services/supabaseClient", () => ({
  supabase: { from: cloud.from }, isAuthenticated: async () => true,
  getCurrentUser: async () => ({ id: "synthetic-user" }), setSyncStatus: vi.fn(),
  executeWithBackoff: async (action: () => unknown) => action(),
}));
import { createReviewedPdfExam, confirmPdfOcrDraft } from "../src/services/pdfOcrReviewService";
import { clearQuestionBank, saveQuestionsToBank, updateQuestion } from "../src/services/questionBankService";
import { getLocalExams, saveLocalExams, saveExamAttempt, saveLocalAttempts } from "../src/services/examService";
const hash = "a".repeat(64);
afterEach(() => { clearQuestionBank(); saveLocalExams([]); saveLocalAttempts([]); vi.clearAllMocks(); });
it("hands off only confirmed questions and keeps OCR exams and attempts local even signed in", async () => {
  saveQuestionsToBank([1,2].map(n => ({ id:`scan-${n}`, question:`Which value equals ${n} plus two?`, options:["Three","Four","Five","Six"], correctIndex:0, explanation:"Count the units.", topicTag:"Math", origin:"ocr_import" as const, sourceHash:hash, keyProvenance:"none" as const, reviewStatus:"needs_review" as const })), "scan.pdf");
  await expect(createReviewedPdfExam(hash,"scan.pdf")).rejects.toThrow(/Confirm at least one/);
  confirmPdfOcrDraft({id:"scan-1",sourceHash:hash,page:1,crop:{x:0,y:0,width:1,height:1},correctIndex:0,reviewedQuestion:true});
  const exam = await createReviewedPdfExam(hash,"scan.pdf");
  expect(exam.questions).toHaveLength(1);
  expect(exam.questions[0].id).toBe("scan-1");
  expect(exam.syncStatus).toBe("local-only");
  expect(getLocalExams().some(item => item.id === exam.id)).toBe(true);
  const attempt = await saveExamAttempt({exam_id:exam.id,score:1,total:1,percentage:100,answers:{"scan-1":0},questions_snapshot:exam.questions,passed:true});
  expect(attempt.syncStatus).toBe("local-only");
  expect(cloud.from).not.toHaveBeenCalled();
  updateQuestion("scan-1",{correctIndex:1});
  await expect(createReviewedPdfExam(hash,"scan.pdf")).rejects.toThrow(/Confirm at least one/);
});
