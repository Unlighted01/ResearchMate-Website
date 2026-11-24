import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import QuestionImportModal from "../src/components/App/ReviewCompanion/QuestionImportModal";
import { startQuestionPdfImport, getQuestionPdfImportSnapshot, subscribeQuestionPdfImport, restoreQuestionPdfImport } from "../src/services/questionPdfImportService";
import { getLocalImage, getLocalOcrPage, getPdfOcrJob } from "../src/services/localOcrStore";
import { getPdfOcrSession, pausePdfOcrSession, subscribePdfOcrSessions } from "../src/services/pdfLocalOcrSession";
import { loadPdfOcrJob, pdfOcrPages } from "../src/services/pdfLocalOcrService";
import "../index.css";

let show: (visible: boolean) => void;
function Fixture() {
  const [visible,setVisible] = useState(true); show = setVisible;
  return <main style={{transform:"translateY(0)",margin:80,padding:24,background:"#f8fafc"}}>
    <h1>ResearchMate import check</h1><p>Dashboard and Mock Exams remain available when the importer is closed.</p>
    {visible && <QuestionImportModal isOpen onClose={()=>setVisible(false)} onImport={()=>{}} />}
  </main>;
}
createRoot(document.getElementById("root")!).render(<Fixture/>);
const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
(window as any).pdfAcceptance = async () => {
  const file = new File([await (await fetch("/input.pdf")).blob()],"MSA scan.pdf",{type:"application/pdf"});
  let savedMs=0, leftDuringJob=false;
  const start=performance.now();
  const unsubscribe=subscribeQuestionPdfImport(()=>{
    const job=getQuestionPdfImportSnapshot();
    if (job?.sourceHash && !savedMs) { savedMs=Math.round(performance.now()-start); show(false); leftDuringJob=true; }
  });
  await startQuestionPdfImport(file); unsubscribe();
  const completeMs=Math.round(performance.now()-start);
  const job=getQuestionPdfImportSnapshot()!;
  if(job.status!=="ready") throw new Error(job.error || job.status);
  show(true); await frame(); await frame();
  const overlay=document.querySelector('[data-testid="question-import-overlay"]')!;
  const bounds=overlay.getBoundingClientRect();
  return {pages:job.total,processedPages:job.current,savedMs,completeMs,leftDuringJob,
    pendingOcrPages:job.pendingOcrPages.length,parsed:job.parsed.length,
    retainedSource:Boolean(await getLocalImage(job.sourceHash!)),
    portalOnBody:overlay.parentElement===document.body,
    coversViewport:bounds.x===0&&bounds.y===0&&bounds.width===innerWidth&&bounds.height===innerHeight,
    ocrIsOptIn:!!Array.from(document.querySelectorAll("button")).find(button=>button.textContent==="Start local OCR"),
    migrationPreserved:await (await getLocalImage("b".repeat(64)))?.blob.text()==="retained original" &&
      (await getLocalOcrPage("migration-page"))?.text==="retained OCR" && (await getPdfOcrJob("migration-job"))?.completedPages[0]===1};
};
(window as any).restoredImport = async () => {
  await restoreQuestionPdfImport(); await frame(); await frame();
  const job=getQuestionPdfImportSnapshot();
  return {status:job?.status,total:job?.total,pending:job?.pendingOcrPages.length};
};
(window as any).ocrNavigation = async () => {
  const imported=getQuestionPdfImportSnapshot()!;
  const hash=imported.sourceHash!;
  let left=false;
  const unsubscribe=subscribePdfOcrSessions(()=>{
    const session=getPdfOcrSession(hash,"eng");
    if(session?.event.phase==="saved") {
      const count=session.event.job.completedPages.length;
      if(count===1&&!left) { left=true; show(false); }
      if(count===3&&!session.pausing) pausePdfOcrSession(hash,"eng");
    }
  });
  const click=async(text:string)=>{
    for(let i=0;i<200;i++) {
      const button=Array.from(document.querySelectorAll("button")).find(button=>button.textContent===text&&!button.disabled);
      if(button) { button.click(); return; }
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    throw new Error(`Missing enabled button: ${text}`);
  };
  try {
    await click("Start local OCR");
    await click("Download and start");
    for(let i=0;i<1200;i++) {
      const job=await loadPdfOcrJob(hash,imported.name,"eng");
      if(job.status==="error") throw new Error(job.error);
      if(job.status==="paused"&&job.completedPages.length===3) {
        show(true); await frame(); await frame();
        const pages=await pdfOcrPages(job);
        return {leftAfterPageOne:left,savedAfterNavigation:job.completedPages.length,status:job.status,
          allUnconfirmed:pages.every(page=>page.keyProvenance==="none"&&page.route==="FAIR")};
      }
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    throw new Error("OCR did not continue to page three after navigation");
  } finally { unsubscribe(); pausePdfOcrSession(hash,"eng"); }
};
