import type { DeviceSource } from "../types";
// ============================================
// INGESTION CONTEXT & ENGINE
// Provides granular, real-time extraction progress
// for single and multi-document material uploads
// ============================================

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { addItem, StorageItem } from "../services/storageService";
import { importPdfFile } from "../services/importService";
import { useNotifications } from "./NotificationContext";

export type IngestionFileStatus =
  | "queued"
  | "extracting"
  | "ocr"
  | "summarizing"
  | "saving"
  | "completed"
  | "error";

export interface IngestionFileItem {
  id: string;
  name: string;
  size: number;
  status: IngestionFileStatus;
  currentPage?: number;
  totalPages?: number;
  percent: number;
  statusMessage: string;
  errorMessage?: string;
}

export interface IngestionBatch {
  isActive: boolean;
  isMinimized: boolean;
  totalFiles: number;
  completedCount: number;
  currentFileIndex: number;
  currentFileName: string;
  overallPercent: number;
  statusMessage: string;
  files: IngestionFileItem[];
  isCompleted: boolean;
  hasErrors: boolean;
}

export interface IngestFilesOptions {
  tags?: string[];
  deviceSource?: DeviceSource;
  onItemSuccess?: (item: StorageItem) => void;
  onBatchComplete?: (successCount: number, errorCount: number) => void;
}

interface IngestionContextType {
  batch: IngestionBatch;
  isIngesting: boolean;
  ingestFiles: (
    files: File[],
    options?: IngestFilesOptions
  ) => Promise<{ successCount: number; errors: string[] }>;
  toggleMinimize: () => void;
  dismiss: () => void;
}

const initialBatchState: IngestionBatch = {
  isActive: false,
  isMinimized: false,
  totalFiles: 0,
  completedCount: 0,
  currentFileIndex: 0,
  currentFileName: "",
  overallPercent: 0,
  statusMessage: "",
  files: [],
  isCompleted: false,
  hasErrors: false,
};

const IngestionContext = createContext<IngestionContextType | undefined>(undefined);

export const IngestionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [batch, setBatch] = useState<IngestionBatch>(initialBatchState);
  const { addNotification } = useNotifications();
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  const dismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setBatch(initialBatchState);
  }, []);

  const toggleMinimize = useCallback(() => {
    setBatch((prev) => ({ ...prev, isMinimized: !prev.isMinimized }));
  }, []);

  const ingestFiles = useCallback(
    async (
      files: File[],
      options?: IngestFilesOptions
    ): Promise<{ successCount: number; errors: string[] }> => {
      if (!files || files.length === 0) {
        return { successCount: 0, errors: [] };
      }

      // Concurrency guard: avoid launching duplicate parallel extraction jobs for files already processing
      if (batch.isActive && !batch.isCompleted) {
        const currentlyProcessing = new Set(batch.files.map((f) => f.name));
        const duplicateFiles = files.filter((f) => currentlyProcessing.has(f.name));
        if (duplicateFiles.length === files.length) {
          console.warn("Requested file(s) are already actively ingesting; ignoring duplicate launch.", files.map((f) => f.name));
          return { successCount: 0, errors: [] };
        }
      }

      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }

      const initialFiles: IngestionFileItem[] = files.map((f, idx) => ({
        id: `ingest-${Date.now()}-${idx}-${f.name}`,
        name: f.name,
        size: f.size,
        status: idx === 0 ? "extracting" : "queued",
        percent: 0,
        statusMessage: idx === 0 ? "Initializing extraction..." : "Queued...",
      }));

      const totalCount = files.length;

      setBatch({
        isActive: true,
        isMinimized: false,
        totalFiles: totalCount,
        completedCount: 0,
        currentFileIndex: 0,
        currentFileName: files[0]?.name || "",
        overallPercent: 0,
        statusMessage: `Ingesting 1 of ${totalCount}: "${files[0]?.name}"...`,
        files: initialFiles,
        isCompleted: false,
        hasErrors: false,
      });

      let successCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const lowerName = file.name.toLowerCase();
        const fileId = initialFiles[i].id;

        // Update active file header
        setBatch((prev) => {
          const updatedFiles = prev.files.map((f, idx) =>
            idx === i
              ? { ...f, status: "extracting" as IngestionFileStatus, statusMessage: "Reading material..." }
              : f
          );
          return {
            ...prev,
            currentFileIndex: i,
            currentFileName: file.name,
            statusMessage: `Ingesting ${i + 1} of ${totalCount}: "${file.name}"...`,
            files: updatedFiles,
          };
        });

        try {
          let savedItem: StorageItem | null = null;

          if (lowerName.endsWith(".pdf") || file.type === "application/pdf") {
            // PDF with page-by-page progress reporting
            savedItem = await importPdfFile(file, undefined, (curr, tot, msg) => {
              const filePercent = tot > 0 ? Math.round((curr / tot) * 100) : 0;
              const overall = Math.min(
                99,
                Math.round(((i + (filePercent / 100)) / totalCount) * 100)
              );

              let fileStatus: IngestionFileStatus = "extracting";
              if (msg?.toLowerCase().includes("ocr")) fileStatus = "ocr";
              else if (msg?.toLowerCase().includes("summary")) fileStatus = "summarizing";

              setBatch((prev) => {
                const updatedFiles = prev.files.map((f) =>
                  f.id === fileId
                    ? {
                        ...f,
                        status: fileStatus,
                        currentPage: curr,
                        totalPages: tot,
                        percent: filePercent,
                        statusMessage: msg || `Page ${curr} of ${tot}`,
                      }
                    : f
                );
                return {
                  ...prev,
                  overallPercent: overall,
                  statusMessage: `[${i + 1}/${totalCount}] "${file.name}": ${msg || `Page ${curr}/${tot}`}`,
                  files: updatedFiles,
                };
              });
            });
          } else if (lowerName.endsWith(".docx")) {
            // Word document via Mammoth
            setBatch((prev) => ({
              ...prev,
              files: prev.files.map((f) =>
                f.id === fileId
                  ? { ...f, status: "extracting", percent: 35, statusMessage: "Extracting Word text..." }
                  : f
              ),
            }));

            const arrayBuffer = await file.arrayBuffer();
            const mammoth = await import("mammoth");
            const result = await mammoth.extractRawText({ arrayBuffer });
            const rawText = result.value.trim();

            setBatch((prev) => ({
              ...prev,
              files: prev.files.map((f) =>
                f.id === fileId
                  ? { ...f, status: "summarizing", percent: 75, statusMessage: "Generating study summary..." }
                  : f
              ),
            }));

            const { generateSummary } = await import("../services/geminiService");
            let summary = "";
            try {
              summary = await generateSummary(rawText.slice(0, 5000));
            } catch {
              summary = `Notes extracted from ${file.name}`;
            }

            savedItem = await addItem({
              sourceTitle: file.name.replace(/\.docx$/i, ""),
              text: rawText || `Word Document: ${file.name}`,
              aiSummary: summary,
              deviceSource: options?.deviceSource || "web",
              tags: options?.tags || ["word", "imported-source"],
            });
          } else if (file.type.startsWith("image/")) {
            // Image / OCR scan
            setBatch((prev) => ({
              ...prev,
              files: prev.files.map((f) =>
                f.id === fileId
                  ? { ...f, status: "ocr", percent: 50, statusMessage: "Running Vision OCR..." }
                  : f
              ),
            }));

            const { readFileAsDataUrl, runOcr } = await import("../services/importService");
            const base64DataUrl = await readFileAsDataUrl(file);
            const data = await runOcr(base64DataUrl, false);

            if (!data.ocrText?.trim()) {
              throw new Error("No readable text found in image.");
            }

            savedItem = await addItem({
              sourceTitle: file.name.replace(/\.[^/.]+$/, "") || "Visual Note",
              text: data.ocrText.trim(),
              ocrText: data.ocrText.trim(),
              aiSummary: data.aiSummary || null,
              imageUrl: base64DataUrl,
              deviceSource: options?.deviceSource || "smart_pen",
              ocrConfidence: data.ocrConfidence ?? null,
              tags: options?.tags || ["image", "ocr", "imported-source"],
            });
          } else if (lowerName.endsWith(".txt") || lowerName.endsWith(".md")) {
            // Text or Markdown
            setBatch((prev) => ({
              ...prev,
              files: prev.files.map((f) =>
                f.id === fileId
                  ? { ...f, status: "extracting", percent: 50, statusMessage: "Reading text..." }
                  : f
              ),
            }));

            const text = await file.text();
            savedItem = await addItem({
              sourceTitle: file.name.replace(/\.(txt|md)$/i, ""),
              text: text.trim() || `Document: ${file.name}`,
              deviceSource: options?.deviceSource || "web",
              tags: options?.tags || [lowerName.endsWith(".md") ? "markdown" : "text", "imported-source"],
            });
          } else if (lowerName.endsWith(".json")) {
            const { importJsonFile } = await import("../services/importService");
            await importJsonFile(file);
          } else {
            throw new Error("Unsupported format");
          }

          successCount++;
          if (savedItem && options?.onItemSuccess) {
            options.onItemSuccess(savedItem);
          }

          // Mark current file complete
          setBatch((prev) => {
            const updatedFiles = prev.files.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    status: "completed" as IngestionFileStatus,
                    percent: 100,
                    statusMessage: "Imported successfully",
                  }
                : f
            );
            const comp = prev.completedCount + 1;
            const overall = Math.round((comp / totalCount) * 100);
            return {
              ...prev,
              completedCount: comp,
              overallPercent: overall,
              files: updatedFiles,
            };
          });
        } catch (err: any) {
          const errMsg = err?.message || "Failed to parse file";
          errors.push(`"${file.name}": ${errMsg}`);

          setBatch((prev) => {
            const updatedFiles = prev.files.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    status: "error" as IngestionFileStatus,
                    errorMessage: errMsg,
                    statusMessage: `Failed: ${errMsg}`,
                  }
                : f
            );
            return {
              ...prev,
              hasErrors: true,
              files: updatedFiles,
            };
          });
        }
      }

      // Finish batch
      const hasErrors = errors.length > 0;
      setBatch((prev) => ({
        ...prev,
        overallPercent: 100,
        isCompleted: true,
        statusMessage: hasErrors
          ? `Ingested ${successCount} of ${totalCount} file(s) with ${errors.length} issue(s)`
          : `Successfully ingested all ${successCount} study material(s)!`,
      }));

      if (successCount > 0) {
        addNotification(
          "ocr_job",
          `Ingested ${successCount} material(s) into your study library.`
        );
      }

      if (options?.onBatchComplete) {
        options.onBatchComplete(successCount, errors.length);
      }

      // Auto-dismiss cleanly after 5 seconds if completely successful
      if (!hasErrors) {
        dismissTimerRef.current = setTimeout(() => {
          dismiss();
        }, 5000);
      }

      return { successCount, errors };
    },
    [addNotification, dismiss]
  );

  const value = useMemo(
    () => ({
      batch,
      isIngesting: batch.isActive && !batch.isCompleted,
      ingestFiles,
      toggleMinimize,
      dismiss,
    }),
    [batch, ingestFiles, toggleMinimize, dismiss]
  );

  return (
    <IngestionContext.Provider value={value}>
      {children}
    </IngestionContext.Provider>
  );
};

export const useIngestion = (): IngestionContextType => {
  const context = useContext(IngestionContext);
  if (!context) {
    throw new Error("useIngestion must be used within an IngestionProvider");
  }
  return context;
};
