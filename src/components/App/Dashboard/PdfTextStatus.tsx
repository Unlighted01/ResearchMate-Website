import React, { useEffect, useState } from "react";
import { getPdfTextProgress, queuePdfTextExtraction, subscribePdfTextProgress } from "../../../services/pdfTextQueue";
import { getItemById, type StorageItem } from "../../../services/storageService";

export function PdfTextStatus({ item, onUpdated }: { item: StorageItem; onUpdated?: (item: StorageItem) => void }) {
  const [progress, setProgress] = useState(() => getPdfTextProgress(item.id));
  const [saved, setSaved] = useState(item);
  useEffect(() => {
    let active = true;
    const refreshSaved = () => { void getItemById(item.id).then(value => { if (active && value) { setSaved(value); if (value.text !== item.text || value.tags.join() !== item.tags.join()) onUpdated?.(value); } }); };
    const refresh = (id = item.id) => {
      if (id !== item.id) return;
      setProgress(getPdfTextProgress(item.id));
      if (getPdfTextProgress(item.id)?.status === "complete") refreshSaved();
    };
    refresh(); refreshSaved();
    const unsubscribe = subscribePdfTextProgress(refresh);
    return () => { active = false; unsubscribe(); };
  }, [item.id]);
  const pending = saved.tags.includes("pdf-text-pending");
  const busy = progress?.status === "reading" || progress?.status === "queued";
  return <section aria-label="PDF text extraction" className="rounded-lg border p-3 space-y-2">
    <p role="status">{pending ? busy ? `Reading PDF text: ${progress.page} / ${progress.total || "?"} pages. Original saved on this device.` : "Original saved. Text extraction is pending." : "PDF text extraction complete."}</p>
    {progress?.error && <p role="alert">{progress.error} Your original PDF is still saved.</p>}
    {pending && !busy && <button className="border rounded px-3 py-2" onClick={() => void queuePdfTextExtraction(item.id)}>Retry text extraction</button>}
    {!pending && !saved.text && <p>No selectable text found. Choose Start local OCR below to read scanned pages.</p>}
    {saved.text && <details><summary>Extracted PDF text</summary><pre className="whitespace-pre-wrap max-h-80 overflow-auto">{saved.text}</pre></details>}
  </section>;
}
