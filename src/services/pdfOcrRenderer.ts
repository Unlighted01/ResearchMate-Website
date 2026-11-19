import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

if (typeof window !== "undefined") pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PdfOcrRenderer {
  pageCount: number;
  render(page: number, dpi: number): Promise<Blob>;
  dispose(): Promise<void>;
}

/** Rasters are temporary: persist the original PDF and normalized OCR boxes only. */
export async function openPdfOcrRenderer(blob: Blob): Promise<PdfOcrRenderer> {
  const loading = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
  let timer: ReturnType<typeof setTimeout>;
  try {
    const pdf = await Promise.race([loading.promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Opening the PDF timed out. Retry or use a smaller PDF.")), 20_000);
    })]);
    clearTimeout(timer!);
    return {
      pageCount: pdf.numPages,
      async render(pageNumber, dpi) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: dpi / 72 });
        const canvas = document.createElement("canvas");
        if (viewport.width * viewport.height > 12_000_000) throw new Error("This page is too large to render safely. Use a smaller page size.");
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        let task: ReturnType<typeof page.render> | undefined;
        let renderTimer: ReturnType<typeof setTimeout>;
        try {
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas is unavailable on this device.");
          task = page.render({ canvas, canvasContext: context, viewport } as any);
          await Promise.race([task.promise, new Promise<never>((_, reject) => {
            renderTimer = setTimeout(() => { task?.cancel(); reject(new Error(`Rendering page ${pageNumber} timed out. Resume to retry.`)); }, 30_000);
          })]);
          return await new Promise<Blob>((resolve, reject) => canvas.toBlob((image) => image ? resolve(image) : reject(new Error("Unable to rasterize this page.")), "image/png"));
        } finally {
          clearTimeout(renderTimer!); canvas.width = 0; canvas.height = 0; page.cleanup();
        }
      },
      dispose: () => loading.destroy(),
    };
  } catch (error) {
    clearTimeout(timer!); void loading.destroy().catch(() => {}); throw error;
  }
}
