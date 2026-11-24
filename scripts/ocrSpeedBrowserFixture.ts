import { PdfLocalOcrTask, loadPdfOcrJob, pdfOcrPages } from "../src/services/pdfLocalOcrService";
import { saveLocalImage } from "../src/services/localOcrStore";
import { TesseractLocalOcrEngine } from "../src/services/tesseractLocalOcrEngine";
import { openPdfOcrRenderer } from "../src/services/pdfOcrRenderer";
import { getGradableQuestions } from "../src/services/examQuestionPolicy";
import { createPdfOcrDrafts, pdfOcrDrafts } from "../src/services/pdfOcrReviewService";
import { parseTwoPassQuestionsAndAnswersDetailed } from "../src/services/pdfQuestionImporter";

(window as any).pdfAcceptance = async () => {
  const file = new File([await (await fetch('/input.pdf')).blob()], 'MSA speed benchmark.pdf', {type:'application/pdf'});
  const asset = await saveLocalImage(file, file.name);
  const recognition: number[] = [], rendering: number[] = [];
  const task = new PdfLocalOcrTask({
    engine: () => {
      const engine = new TesseractLocalOcrEngine();
      const recognize = engine.recognize.bind(engine);
      engine.recognize = async (...args) => { const start=performance.now(); try { return await recognize(...args); } finally { recognition.push(performance.now()-start); } };
      return engine;
    },
    renderer: async blob => {
      const renderer=await openPdfOcrRenderer(blob); const render=renderer.render.bind(renderer);
      renderer.render=async (...args)=>{const start=performance.now();try{return await render(...args);}finally{rendering.push(performance.now()-start);}};
      return renderer;
    },
  });
  let maxDelayMs=0, previous=performance.now(), currentPhase="starting", savedPages=0;
  const delays: {phase:string;savedPages:number;ms:number}[] = [];
  const timer=setInterval(()=>{const now=performance.now();const delay=now-previous-50;maxDelayMs=Math.max(maxDelayMs,delay);if(delay>50) delays.push({phase:currentPhase,savedPages,ms:Math.round(delay)});previous=now;},50);
  const start=performance.now();
  try {
    const job=await task.run(await loadPdfOcrJob(asset.hash,file.name,'eng'), {
      confirmDownload:async()=>true,
      onProgress:({phase,job})=>{currentPhase=phase;savedPages=job.completedPages.length;if(phase==='saved' && job.completedPages.length%20===0) console.log('OCR_SPEED',job.completedPages.length);},
      concurrency: Number(new URL(location.href).searchParams.get('workers') || 1) as 1|2,
    });
    const elapsedMs=Math.round(performance.now()-start);
    // Stop responsiveness sampling before the benchmark's full-document hash/parse checks.
    clearInterval(timer);
    const pages=await pdfOcrPages(job);
    const digest=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(b=>b.toString(16).padStart(2,'0')).join('');
    const hashes=await Promise.all(pages.map(async p=>({page:p.pageNumber,text:await digest(p.text),words:await digest(p.words),confidence:p.confidence})));
    const parsed = parseTwoPassQuestionsAndAnswersDetailed(pages.map(page => ({pageNumber:page.pageNumber,text:page.text,items:[],extractionMethod:'ocr' as const})));
    // A notes-only parse is a valid OCR outcome, not a failed timing run.
    if (parsed.items.length) await createPdfOcrDrafts(job);
    const keysHash = await digest(parsed.items.map(item => ({page:item.sourcePage || item.pageNumber, key:item.correctIndex})));
    return {sourceHash:asset.hash,pages:pages.length,processedPages:pages.length,elapsedMs,recognitionMs:Math.round(recognition.reduce((a,b)=>a+b,0)),renderingMs:Math.round(rendering.reduce((a,b)=>a+b,0)),maxDelayMs:Math.round(maxDelayMs),delays,recognitionCalls:recognition.length,hashes,keysHash,parseSummary:parsed.coverageSummary,drafts:pdfOcrDrafts(asset.hash).length,allFair:pages.every(p=>p.route==='FAIR'&&p.keyProvenance==='none'),gradable:getGradableQuestions(pdfOcrDrafts(asset.hash)).length};
  } finally { clearInterval(timer); }
};
