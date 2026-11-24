import React, { useEffect, useRef, useState } from "react";
import { loadPdfOcrJob, PdfLocalOcrTask, pdfOcrPageKey, type PdfOcrJob, type PdfOcrProgress } from "../../../services/pdfLocalOcrService";
import { getLocalImage, getLocalOcrPage } from "../../../services/localOcrStore";
import { openPdfOcrRenderer } from "../../../services/pdfOcrRenderer";
import { createPdfOcrDrafts, pdfOcrDrafts, confirmPdfOcrDraft, createReviewedPdfExam } from "../../../services/pdfOcrReviewService";
import type { OcrLanguage } from "../../../services/localOcrEngine";
import type { ModelDownloadPrompt } from "../../../services/localOcrQueue";
import type { SourceCrop } from "../../../services/keyProvenance";
import { getGradableQuestions } from "../../../services/examQuestionPolicy";
import { QuestionEditorModal } from "../ReviewCompanion/QuestionEditorModal";
import { initQuestionBank, updateQuestion, type StoredQuestion } from "../../../services/questionBankService";

const control = "rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm disabled:opacity-50";

function KeyCropPreview({ url, crop }: { url: string; crop: SourceCrop }) {
  const [cropped, setCropped] = useState<string>();
  useEffect(() => {
    let cancelled = false; let objectUrl: string | undefined;
    setCropped(undefined);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * crop.width));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * crop.height));
      canvas.getContext("2d")?.drawImage(image, image.naturalWidth * crop.x, image.naturalHeight * crop.y, image.naturalWidth * crop.width, image.naturalHeight * crop.height, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        canvas.width = 0; canvas.height = 0;
        if (blob && !cancelled) { objectUrl = URL.createObjectURL(blob); setCropped(objectUrl); }
      });
    };
    image.src = url;
    return () => { cancelled = true; image.onload = null; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url, crop]);
  return cropped ? <img src={cropped} alt="Selected printed key region" className="max-h-48 max-w-full border rounded my-2" /> : null;
}

export function PdfLocalOcrPanel({ sourceHash, name }: { sourceHash: string; name: string }) {
  const [language, setLanguage] = useState<OcrLanguage>(() => (localStorage.getItem(`pdf-ocr-language:${sourceHash}`) as OcrLanguage) || "eng");
  const [job, setJob] = useState<PdfOcrJob>();
  const [busy, setBusy] = useState(false);
  const [concurrency, setConcurrency] = useState<1 | 2>(1);
  const [pausing, setPausing] = useState(false);
  const [phase, setPhase] = useState<string>("");
  const [download, setDownload] = useState<ModelDownloadPrompt>();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [preview, setPreview] = useState<{ url: string; page: number; text: string }>();
  const [previewBusy, setPreviewBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [crop, setCrop] = useState<SourceCrop>();
  const [drafts, setDrafts] = useState<StoredQuestion[]>([]);
  const [draftId, setDraftId] = useState("");
  const [keyIndex, setKeyIndex] = useState(-1);
  const [checked, setChecked] = useState(false);
  const [editing, setEditing] = useState<StoredQuestion>();
  const [startingExam, setStartingExam] = useState(false);
  const controller = useRef<PdfLocalOcrTask | undefined>(undefined);
  const answerDownload = useRef<((accepted: boolean) => void) | undefined>(undefined);
  const mounted = useRef(true);
  const imageUrl = useRef<string | undefined>(undefined);
  const selection = useRef<{ x: number; y: number } | undefined>(undefined);
  const busyRef = useRef(false);
  const selected = drafts.find((draft) => draft.id === draftId);

  const refreshDrafts = () => setDrafts(pdfOcrDrafts(sourceHash));
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false; controller.current?.pause(); answerDownload.current?.(false);
      if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadPdfOcrJob(sourceHash, name, language), initQuestionBank()]).then(([stored]) => {
      if (!cancelled) { setJob(stored); setPageNumber(stored.currentPage || 1); refreshDrafts(); }
    }).catch((error) => { if (!cancelled) setError(String(error)); });
    return () => { cancelled = true; };
  }, [sourceHash, language]);
  useEffect(() => { setChecked(false); setKeyIndex(-1); }, [draftId, preview?.page, crop, selected?.question, selected?.explanation, selected?.correctIndex, JSON.stringify(selected?.options)]);

  const run = async () => {
    if (!job || busyRef.current) return;
    busyRef.current = true; setBusy(true); setPausing(false); setError(""); setMessage("");
    const task = new PdfLocalOcrTask(); controller.current = task;
    try {
      const result = await task.run(job, {
        concurrency,
        confirmDownload: (request) => !mounted.current ? Promise.resolve(false) : new Promise<boolean>((resolve) => { answerDownload.current = resolve; setDownload(request); }),
        onProgress: (event: PdfOcrProgress) => {
          if (!mounted.current) return;
          setJob(event.job);
          setPhase(({ opening: "Opening PDF", download: "Waiting for download consent", loading: "Loading local OCR", rendering: "Rendering page", recognizing: "Reading page locally", saved: "Page saved", paused: "Paused", completed: "OCR complete" })[event.phase] + (event.progress === undefined ? "" : ` ${Math.round(event.progress * 100)}%`));
        },
      });
      if (mounted.current) setJob(result);
    } catch (error) {
      if (mounted.current) {
        setPhase("Stopped — resume to retry");
        setError(error instanceof Error ? error.message : String(error));
        setJob(await loadPdfOcrJob(sourceHash, name, language));
      }
    } finally {
      busyRef.current = false;
      if (mounted.current) { setBusy(false); setDownload(undefined); setPausing(false); }
    }
  };
  const pause = () => {
    controller.current?.pause(); setPausing(true);
    answerDownload.current?.(false); setDownload(undefined);
  };
  const decideDownload = (accept: boolean) => { setDownload(undefined); answerDownload.current?.(accept); answerDownload.current = undefined; };
  const reviewPage = async () => {
    if (!job || !Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > job.pageCount) return;
    setPreviewBusy(true); setError(""); setCrop(undefined);
    let renderer: Awaited<ReturnType<typeof openPdfOcrRenderer>> | undefined;
    try {
      const asset = await getLocalImage(sourceHash);
      if (!asset) throw new Error("The original PDF is missing from device storage.");
      renderer = await openPdfOcrRenderer(asset.blob);
      const blob = await renderer.render(pageNumber, job.dpi);
      const page = await getLocalOcrPage(pdfOcrPageKey(job, pageNumber));
      if (mounted.current) {
        if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
        imageUrl.current = URL.createObjectURL(blob);
        setPreview({ url: imageUrl.current, page: pageNumber, text: page ? page.text || "OCR ran but found no text. Check the original page." : "No OCR text saved for this page yet." });
      }
    } catch (error) { if (mounted.current) setError(String(error)); }
    finally { await renderer?.dispose(); if (mounted.current) setPreviewBusy(false); }
  };
  const extractDrafts = async () => {
    if (!job || extracting) return;
    setExtracting(true);
    setError("");
    try {
      const result = await createPdfOcrDrafts(job); refreshDrafts();
      setMessage(`${result.importedCount} local drafts added; ${result.duplicatesSkipped} duplicates skipped. Source pages: ${result.sourcePages.join(", ")} (${result.sourcePages.length} of ${result.totalPages}). Every new key needs confirmation.`);
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { setExtracting(false); }
  };
  const confirmKey = () => {
    if (!selected || !preview || !crop) return;
    try {
      confirmPdfOcrDraft({ id: selected.id, sourceHash, page: preview.page, crop, correctIndex: keyIndex, reviewedQuestion: checked });
      refreshDrafts(); setChecked(false); setMessage("This question's key was confirmed against the selected PDF region.");
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
  };

  return <section aria-label="Local PDF OCR" className="rounded-xl border border-indigo-200 dark:border-indigo-800 p-4 space-y-3 text-slate-900 dark:text-slate-100">
    <h3 className="font-semibold">Read scanned PDF on this device</h3>
    <p className="text-sm">OCR starts only when you choose Start. Your PDF and results stay on this device. Close this view to pause after the active pages finish; reopen it to resume. All text needs full review.</p>
    <p className="text-sm">Results are saved separately for each language. OCR continues only while this app is open.</p>
    <div className="flex flex-wrap gap-2 items-center">
      <label>OCR speed <select aria-label="OCR speed" className={control} value={concurrency} disabled={busy} onChange={event => setConcurrency(event.target.value === "2" ? 2 : 1)}>
        <option value="1">Standard — lower memory</option><option value="2">Faster — two workers, more memory</option>
      </select></label>
      <label>OCR language <select aria-label="OCR language" className={control} value={language} disabled={busy} onChange={(event) => {
        const value = event.target.value as OcrLanguage; setLanguage(value); localStorage.setItem(`pdf-ocr-language:${sourceHash}`, value); setPreview(undefined); setCrop(undefined); setPhase("");
      }}><option value="eng">English</option><option value="tgl">Tagalog</option><option value="eng+tgl">English + Tagalog</option></select></label>
      <button className={control} disabled={!job || busy || job.status === "completed"} onClick={run}>{busy ? "OCR running…" : job?.status === "completed" ? "Local OCR complete" : job?.completedPages.length || job?.status === "paused" || job?.status === "error" || job?.status === "running" ? "Resume local OCR" : "Start local OCR"}</button>
      {busy && <button className={control} onClick={pause} disabled={pausing}>{pausing ? "Pausing after active step…" : "Pause OCR"}</button>}
    </div>
    {download && <div role="dialog" aria-label="Download OCR model" className="rounded-lg bg-indigo-50 dark:bg-indigo-950 p-3 space-y-2">
      <p>Download {download.language} OCR files, about {download.estimatedMiB.toFixed(2)} MiB? Files are hosted by ResearchMate and cached for offline use. No PDF pages are uploaded.</p>
      <button className={control} onClick={() => decideDownload(true)}>Download and start</button>{" "}<button className={control} onClick={() => decideDownload(false)}>Not now</button>
    </div>}
    <div role="status" aria-live="polite" className="text-sm">{phase || (job?.status === "running" ? "Interrupted job — ready to resume" : job?.status || "Loading saved progress…")}. {job?.completedPages.length || 0} / {job?.pageCount || "?"} pages saved{job?.currentPage ? `; current page ${job.currentPage}` : ""}.</div>
    {job && job.pageCount > 0 && <progress className="w-full" aria-label="PDF OCR progress" max={job.pageCount} value={job.completedPages.length} />}
    {(error || job?.error) && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error || job?.error} Saved pages remain on this device.</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    {job && job.pageCount > 0 && <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2"><label>PDF page <input aria-label="PDF page to review" className={control + " w-24"} type="number" min={1} max={job.pageCount} value={pageNumber} onChange={(event) => setPageNumber(Number(event.target.value))} /></label>
        <button className={control} disabled={previewBusy} onClick={reviewPage}>{previewBusy ? "Opening page…" : "Review page"}</button>
        <button className={control} disabled={extracting || !job.completedPages.length} onClick={extractDrafts}>Extract ungraded question drafts</button>
      </div>
      <p className="text-sm">{drafts.length} question drafts; {getGradableQuestions(drafts).length} eligible for grading. Unconfirmed OCR keys cannot grade.</p>
      <button className={control} disabled={busy || startingExam || getGradableQuestions(drafts).length === 0} onClick={async () => {
        setStartingExam(true); setError("");
        try {
          const exam = await createReviewedPdfExam(sourceHash, name);
          window.location.hash = `/app/exams?examId=${encodeURIComponent(exam.id)}`;
        } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
        finally { setStartingExam(false); }
      }}>{startingExam ? "Opening reviewed exam…" : "Start reviewed PDF exam"}</button>
      {preview && <div className="grid md:grid-cols-2 gap-3">
        <div><p className="text-sm font-medium">Original PDF page {preview.page}. Drag over the printed key to select its region.</p>
          <a href={preview.url} target="_blank" rel="noopener noreferrer" className="underline text-sm">Open page at full size</a>
          <button className={control + " my-2"} onClick={() => setCrop({ x: 0, y: 0, width: 1, height: 1 })}>Use entire page as key region</button>
          <div className="relative touch-none select-none border" onPointerDown={(event) => {
            const rect = event.currentTarget.getBoundingClientRect(); event.currentTarget.setPointerCapture(event.pointerId);
            selection.current = { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) }; setCrop(undefined);
          }} onPointerCancel={() => { selection.current = undefined; }} onPointerUp={(event) => {
            if (!selection.current) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const end = { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
            const start = selection.current; selection.current = undefined;
            const region = { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(start.x - end.x), height: Math.abs(start.y - end.y) };
            if (region.width > 0.005 && region.height > 0.005) setCrop(region);
          }}>
            <img src={preview.url} alt={`Original PDF page ${preview.page}`} className="w-full block pointer-events-none" draggable={false} />
            {crop && <div className="absolute border-2 border-indigo-500 bg-indigo-300/20 pointer-events-none" style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.width * 100}%`, height: `${crop.height * 100}%` }} />}
          </div>
          {crop && <><p className="text-sm">Key region selected on page {preview.page}.</p><KeyCropPreview url={preview.url} crop={crop} /></>}
        </div>
        <div><p className="text-sm font-medium">Raw OCR — FAIR, full review required</p><pre className="text-xs whitespace-pre-wrap max-h-[40rem] overflow-auto rounded bg-slate-100 dark:bg-slate-950 p-3">{preview.text}</pre></div>
      </div>}
      {drafts.length > 0 && <div className="space-y-2 rounded-lg border p-3">
        <h4 className="font-medium">Confirm one answer key</h4>
        <label>Question <select aria-label="Question draft" className={control + " w-full"} value={draftId} onChange={(event) => setDraftId(event.target.value)}><option value="">Choose a draft</option>{drafts.map((draft, index) => <option key={draft.id} value={draft.id}>{index + 1}. {draft.question.slice(0, 100)}</option>)}</select></label>
        {selected && <>
          <p className="text-sm whitespace-pre-wrap">{selected.question}</p>
          <ul className="text-sm">{selected.options.map((option, index) => <li key={index}>{String.fromCharCode(65 + index)}. {option}</li>)}</ul>
          <p className="text-sm whitespace-pre-wrap">Explanation: {selected.explanation}</p>
          <button className={control} onClick={() => setEditing(selected)}>Edit question and choices</button>
          <p className="text-sm">Review the original page containing this key, then select its region above.</p>
          <label>Printed correct answer <select aria-label="Printed correct answer" className={control} value={keyIndex} onChange={(event) => { setKeyIndex(Number(event.target.value)); setChecked(false); }}><option value={-1}>Select the key you read</option>{selected.options.map((_, index) => <option key={index} value={index}>{String.fromCharCode(65 + index)}</option>)}</select></label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />I checked the question, every choice, the explanation, and this key against the original PDF.</label>
          <button className={control} disabled={!preview || !crop || keyIndex < 0 || !checked} onClick={confirmKey}>Confirm this key and question</button>
        </>}
      </div>}
    </div>}
    {editing && <QuestionEditorModal isOpen questionToEdit={editing} onClose={() => setEditing(undefined)} onSave={(question) => { updateQuestion(question.id, question); refreshDrafts(); setEditing(undefined); }} />}
  </section>;
}
