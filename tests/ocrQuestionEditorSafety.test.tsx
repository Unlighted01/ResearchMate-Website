// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { QuestionEditorModal } from "../src/components/App/ReviewCompanion/QuestionEditorModal";
import { getGradableQuestions } from "../src/services/examQuestionPolicy";
afterEach(cleanup);
it("preserves the OCR grading gate when saving through the exam editor", () => {
  const saved = vi.fn();
  render(<QuestionEditorModal isOpen questionToEdit={{ id: "ocr-editor", question: "What is two plus two?", options: ["Three", "Four", "Five", "Six"], correctIndex: 1, explanation: "Two plus two equals four.", topicTag: "Math", keyProvenance: "none", sourceHash: "a".repeat(64), reviewStatus: "verified" }} onSave={saved} onClose={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Update Question" }));
  expect(saved).toHaveBeenCalled();
  expect(getGradableQuestions([saved.mock.calls[0][0]])).toHaveLength(0);
});
it("preserves a fifth source choice when editing an OCR question", () => {
  const saved = vi.fn();
  render(<QuestionEditorModal isOpen questionToEdit={{ id: "five", question: "Which number is five?", options: ["One", "Two", "Three", "Four", "Five"], correctIndex: 4, explanation: "The printed answer is E.", topicTag: "Math", keyProvenance: "none", sourceHash: "a".repeat(64), reviewStatus: "verified" }} onSave={saved} onClose={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Update Question" }));
  expect(saved.mock.calls[0][0].options).toHaveLength(5);
  expect(saved.mock.calls[0][0].correctIndex).toBe(4);
  expect(getGradableQuestions([saved.mock.calls[0][0]])).toHaveLength(0);
});
