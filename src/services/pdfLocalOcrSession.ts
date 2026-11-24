import { PdfLocalOcrTask, type PdfOcrJob, type PdfOcrProgress } from "./pdfLocalOcrService";

type Session = { task: PdfLocalOcrTask; event: PdfOcrProgress; running: boolean; pausing: boolean; error?: string; promise?: Promise<PdfOcrJob> };
const sessions = new Map<string, Session>();
const listeners = new Set<() => void>();
const key = (hash: string, language: string) => `${hash}:${language}`;
export const getPdfOcrSession = (hash: string, language: string) => sessions.get(key(hash, language));
export function subscribePdfOcrSessions(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
const emit = () => listeners.forEach(listener => listener());

/** A view subscribes to progress; unmounting it never cancels an accepted OCR job. */
export function startPdfOcrSession(job: PdfOcrJob, options: Parameters<PdfLocalOcrTask["run"]>[1]): Promise<PdfOcrJob> {
  const id = key(job.sourceHash, job.language);
  const existing = sessions.get(id);
  if (existing?.running) return existing.promise!;
  const session: Session = {task:new PdfLocalOcrTask(),event:{job,phase:"opening"},running:true,pausing:false};
  sessions.set(id, session);
  session.promise = Promise.resolve().then(() => session.task.run(job, {...options,onProgress:event => {
    session.event = event; emit();
  }})).then(result => {
    session.event = {job:result,phase:result.status === "completed" ? "completed" : "paused"};
    return result;
  }).catch(error => {
    session.error = error instanceof Error ? error.message : String(error);
    session.event = {...session.event,job:{...session.event.job,status:"error",error:session.error}};
    throw error;
  }).finally(() => { session.running = false; session.pausing = false; emit(); sessions.delete(id); });
  emit();
  return session.promise;
}
export function pausePdfOcrSession(hash: string, language: string) {
  const session = getPdfOcrSession(hash, language);
  if (session?.running) { session.pausing = true; session.task.pause(); emit(); }
}
