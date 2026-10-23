// ============================================
// REVIEW MATERIALS UPLOADER - Precision Multi-Format Study Ingest
// Aesthetic: Matches Landing Page Console (Fraunces + Inter + Geist Mono)
// Supports PDF, DOCX (Word), PNG/JPEG images, and Live Camera STEM Math OCR
// ============================================

import React, { useState, useRef } from "react";
import mammoth from "mammoth";
import {
  Upload,
  FileText,
  Camera,
  Image as ImageIcon,
  Calculator,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  Copy,
  RefreshCw,
  X,
  FileCode,
  ArrowRight,
} from "lucide-react";
import { addItem } from "../../../services/storageService";
import { runMathOcr, generateSummary } from "../../../services/geminiService";
import { extractPdfContent } from "../../../services/pdfService";
import { detectQaBookLikelihood } from "../../../services/pdfQuestionImporter";
import LatexRenderer from "../../shared/LatexRenderer";
import { useNotifications } from "../../../context/NotificationContext";

interface ReviewMaterialsUploaderProps {
  onMaterialUploaded?: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const ReviewMaterialsUploader: React.FC<ReviewMaterialsUploaderProps> = ({
  onMaterialUploaded,
  showToast,
}) => {
  const { addNotification } = useNotifications();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [detectedQaBook, setDetectedQaBook] = useState<{ fileName: string; questionCount: number; confidence: number } | null>(null);

  // Math OCR result modal
  const [ocrResult, setOcrResult] = useState<{
    latex: string;
    explanation: string;
    imageUrl?: string;
  } | null>(null);
  const [copiedLatex, setCopiedLatex] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Common file processor (supports PDF, DOCX, images, markdown)
  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filename = file.name;
      const extension = filename.split(".").pop()?.toLowerCase();

      setStatusText(`Processing ${filename}...`);

      try {
        if (extension === "docx") {
          // Word document extraction via mammoth
          setStatusText(`Parsing Word document: ${filename}...`);
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          const text = result.value.trim();

          if (!text) {
            showToast(`No readable text found in ${filename}`, "error");
            continue;
          }

          // Generate executive summary via Gemini
          let summary = "";
          try {
            summary = await generateSummary(text.slice(0, 5000));
          } catch {
            summary = `Course notes extracted from ${filename}`;
          }

          await addItem({
            sourceTitle: filename.replace(/\.docx$/i, ""),
            text,
            aiSummary: summary,
            deviceSource: "web",
            tags: ["word-doc", "review-material"],
          });
          successCount++;
        } else if (extension === "pdf") {
          setStatusText(`Parsing PDF text & formulas from ${filename}...`);
          const extracted = await extractPdfContent(file);

          const qaCheck = detectQaBookLikelihood(extracted.text);
          if (qaCheck.isLikelyQa) {
            setDetectedQaBook({
              fileName: filename,
              questionCount: qaCheck.estimatedQuestionCount,
              confidence: qaCheck.sampleConfidence,
            });
          }

          await addItem({
            sourceTitle: filename.replace(/\.pdf$/i, ""),
            text: extracted.text,
            aiSummary: extracted.summary,
            deviceSource: "web",
            tags: ["pdf", "review-material"],
          });
          successCount++;
        } else if (["png", "jpg", "jpeg"].includes(extension || "")) {
          // Image / diagram / formula photo
          setStatusText(`Analyzing visual study note: ${filename}...`);
          const reader = new FileReader();
          await new Promise<void>((resolve, reject) => {
            reader.onload = async () => {
              try {
                const base64 = reader.result as string;
                let ocrLatex = "";
                let ocrExplanation = "";
                try {
                  const ocr = await runMathOcr(base64);
                  ocrLatex = ocr.latex;
                  ocrExplanation = ocr.explanation;
                } catch {}

                await addItem({
                  sourceTitle: filename.replace(/\.[^/.]+$/, ""),
                  text: ocrLatex || `Visual study note from ${filename}`,
                  ocrText: ocrLatex,
                  aiSummary: ocrExplanation,
                  imageUrl: base64,
                  deviceSource: "web",
                  tags: ["image-scan", "math-ocr"],
                });
                successCount++;
                resolve();
              } catch (err) {
                reject(err);
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        } else {
          // Markdown / plain text
          const text = await file.text();
          await addItem({
            sourceTitle: filename,
            text,
            deviceSource: "web",
            tags: ["plain-notes", "review-material"],
          });
          successCount++;
        }
      } catch (err: any) {
        console.error("Upload error:", err);
        showToast(`Failed to parse ${filename}: ${err.message}`, "error");
      }
    }

    setIsProcessing(false);
    setStatusText("");
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (successCount > 0) {
      showToast(`Ingested ${successCount} study material(s) into review corpus.`, "success");
      addNotification({
        type: "ocr_job",
        title: "Materials Ingested",
        message: `Indexed ${successCount} document(s) into review corpus. Ready for mock exams.`,
        actionUrl: "/app/review",
        actionLabel: "Review Hub",
      });
      if (onMaterialUploaded) onMaterialUploaded();
    }
  };

  // Handle file input change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) await processFiles(files);
  };

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  // Open web camera for STEM Math capture
  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access error:", err);
      showToast("Could not access camera. Please verify device permissions.", "error");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  // Capture frame from video stream
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL("image/jpeg", 0.85);
    stopCamera();

    setIsProcessing(true);
    setStatusText("Digitizing handwritten formula into LaTeX via Gemini Vision...");

    try {
      const ocr = await runMathOcr(base64);
      setOcrResult({
        latex: ocr.latex,
        explanation: ocr.explanation,
        imageUrl: base64,
      });

      // Save to library with valid device_source
      await addItem({
        sourceTitle: "Camera STEM Math Derivation",
        text: ocr.latex,
        ocrText: ocr.latex,
        aiSummary: ocr.explanation,
        imageUrl: base64,
        deviceSource: "mobile_scanner",
        tags: ["stem-math", "camera-capture"],
      });

      showToast("Formula digitized and compiled into LaTeX!", "success");
      addNotification({
        type: "ocr_job",
        title: "STEM Math OCR Complete",
        message: `Digitized handwritten equation into KaTeX (${ocr.latex.slice(0, 35)}...).`,
        actionUrl: "/app/review",
        actionLabel: "View Formula",
      });
      if (onMaterialUploaded) onMaterialUploaded();
    } catch (err: any) {
      showToast("Math OCR extraction failed: " + err.message, "error");
    } finally {
      setIsProcessing(false);
      setStatusText("");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLatex(true);
    showToast("LaTeX copied to clipboard", "success");
    setTimeout(() => setCopiedLatex(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Console Top Header */}
      <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center border border-slate-200 dark:border-slate-700">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-title tracking-tight">
              Review Materials Ingest Station
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Upload Files • Word Extraction • Live STEM Math Derivations
            </p>
          </div>
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-900 dark:text-slate-100" />
            <span>{statusText || "Processing materials..."}</span>
          </div>
        )}
      </div>

      {/* Q&A Exam Book Smart Detection Banner */}
      {detectedQaBook && (
        <div className="mx-6 mt-4 p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <span>Q&A Study Book Detected:</span>
                <span className="font-mono text-indigo-700 dark:text-indigo-300">{detectedQaBook.fileName}</span>
              </h4>
              <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 mt-0.5">
                Identified ~{detectedQaBook.questionCount} formatted questions with chapter answer keys. Import them directly into the Exam Simulator or Flashcards with $0 AI cost!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                window.location.hash = "#/app/review?tab=exams";
                setDetectedQaBook(null);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Go to Exam Importer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDetectedQaBook(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Workstation Split Body */}
      <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Workstation: Document Ingest */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-xl border transition-all p-4 sm:p-6 flex flex-col justify-between ${
            isDragging
              ? "border-slate-900 dark:border-white bg-slate-100/90 dark:bg-slate-800/90 ring-2 ring-slate-900 dark:ring-white shadow-sm"
              : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-title">
                  Digital Documents & Notes
                </h3>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Multi-Format
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed mb-4">
              Ingest lecture slides, syllabi, Word course notes, or problem set PDFs. Extracted text is indexed to ground AI practice exams and flashcard generation.
            </p>

            <div className="flex items-center gap-2 flex-wrap mb-5">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                PDF (.pdf)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                Word (.docx)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                Diagrams (.png, .jpg)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                Markdown (.md, .txt)
              </span>
            </div>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.png,.jpg,.jpeg,.txt,.md"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 text-white rounded-lg text-xs font-semibold transition-all shadow-2xs disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Select Files to Ingest</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center font-mono mt-2">
              Word documents auto-extract raw text via Mammoth parser
            </p>
          </div>
        </div>

        {/* Right Workstation: Camera STEM Math OCR */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-title">
                  Handwritten Math to LaTeX
                </h3>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                Live Vision OCR
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed mb-4">
              Point your camera at handwritten whiteboard derivations, textbook equations, or scratchpad notes. Converts raw handwriting straight into compiled LaTeX code.
            </p>

            {/* Formula Preview Pill */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 mb-5 font-mono text-xs flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Preview Target:</span>
              <span className="text-slate-700 dark:text-slate-300 font-serif italic text-sm">
                {"\\oint \\mathbf{B} \\cdot d\\boldsymbol{\\ell} = \\mu_0 I_{\\text{enc}}"}
              </span>
            </div>
          </div>

          <div>
            <button
              onClick={startCamera}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 text-white rounded-lg text-xs font-semibold transition-all shadow-2xs disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Launch Live Camera Scanner</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center font-mono mt-2">
              Gemini Vision parses handwritten symbols & structural fractions
            </p>
          </div>
        </div>
      </div>

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Live Camera View Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-slate-300" />
                <h3 className="text-sm font-semibold text-white font-title">
                  Align Math Formula or Derivation
                </h3>
              </div>
              <button
                onClick={stopCamera}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative bg-black flex items-center justify-center min-h-[300px]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-auto max-h-[380px] object-contain"
              />
              <div className="absolute inset-8 border-2 border-white/30 rounded-xl pointer-events-none flex items-center justify-center">
                <span className="text-[11px] font-mono text-white/60 bg-black/50 px-2 py-0.5 rounded">
                  Center equation within frame
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950">
              <button
                onClick={stopCamera}
                className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-slate-950 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors shadow-2xs"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Capture & Run OCR</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digitized LaTeX Result Card */}
      {ocrResult && (
        <div className="border-t border-slate-200 dark:border-slate-800 p-6 bg-slate-50/40 dark:bg-slate-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white font-title">
                Compiled LaTeX Derivation
              </h4>
            </div>
            <button
              onClick={() => setOcrResult(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-mono"
            >
              Dismiss
            </button>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            {/* KaTeX formula display */}
            <div className="py-4 text-center overflow-x-auto text-lg text-slate-900 dark:text-slate-100">
              <LatexRenderer latex={ocrResult.latex} />
            </div>

            {/* Raw LaTeX code & copy */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs border border-slate-200 dark:border-slate-800">
              <code className="text-slate-800 dark:text-slate-200 truncate mr-3">
                {ocrResult.latex}
              </code>
              <button
                onClick={() => copyToClipboard(ocrResult.latex)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs hover:text-slate-900 dark:hover:text-white shrink-0"
              >
                {copiedLatex ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLatex ? "Copied" : "Copy LaTeX"}</span>
              </button>
            </div>

            {/* Explanation */}
            {ocrResult.explanation && (
              <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                <strong className="text-slate-900 dark:text-slate-200 font-mono text-[11px] block mb-1">
                  Derivation Context:
                </strong>
                {ocrResult.explanation}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewMaterialsUploader;
