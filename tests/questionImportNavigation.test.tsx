// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({snapshot:undefined as any,start:vi.fn(),restore:vi.fn(async()=>{})}));
vi.mock("../src/services/questionPdfImportService",()=>({getQuestionPdfImportSnapshot:()=>state.snapshot,subscribeQuestionPdfImport:()=>()=>{},restoreQuestionPdfImport:state.restore,startQuestionPdfImport:state.start}));
vi.mock("../src/components/App/Dashboard/PdfLocalOcrPanel",()=>({PdfLocalOcrPanel:()=> <div>Optional local OCR controls</div>}));
import QuestionImportModal from "../src/components/App/ReviewCompanion/QuestionImportModal";
const props={isOpen:true,onClose:vi.fn(),onImport:vi.fn()};
beforeEach(()=>{state.snapshot=undefined;state.start.mockResolvedValue(undefined);vi.clearAllMocks();});
afterEach(()=>{cleanup();localStorage.clear();});
it("portals the modal outside transformed content and closes without cancelling the import",()=>{
  state.snapshot={name:"scan.pdf",status:"reading",sourceHash:"a".repeat(64),current:2,total:156,parsed:[],pendingOcrPages:[]};
  const view=render(<div style={{transform:"translateY(0)"}}><QuestionImportModal {...props}/></div>);
  const overlay=screen.getByTestId("question-import-overlay");
  expect(overlay.parentElement).toBe(document.body);
  expect(view.container.contains(screen.getByRole("dialog"))).toBe(false);
  expect(screen.getByText("Page 2 of 156")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Continue in background"}));
  expect(props.onClose).toHaveBeenCalledTimes(1);
  expect(state.start).not.toHaveBeenCalled();
});
it("restores completed scan results after navigation and offers explicit local OCR",()=>{
  state.snapshot={name:"scan.pdf",status:"ready",sourceHash:"a".repeat(64),current:156,total:156,parsed:[],pendingOcrPages:[1,2]};
  const first=render(<QuestionImportModal {...props}/>); first.unmount();
  render(<QuestionImportModal {...props}/>);
  expect(screen.getByText("Optional local OCR controls")).toBeTruthy();
  expect(screen.getByText(/2 pages need optional local OCR/)).toBeTruthy();
  expect(state.start).not.toHaveBeenCalled();
  expect(screen.getByRole("button",{name:"Add to Question Bank"}).hasAttribute("disabled")).toBe(true);
});
it("delegates PDF uploads to the shared save-first job",()=>{
  render(<QuestionImportModal {...props}/>);
  const file=new File(["scan"],"scan.pdf",{type:"application/pdf"});
  fireEvent.change(screen.getByLabelText("Choose material file"),{target:{files:[file]}});
  expect(state.start).toHaveBeenCalledWith(file);
});
