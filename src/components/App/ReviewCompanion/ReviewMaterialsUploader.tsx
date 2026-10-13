// ============================================
// REVIEW MATERIALS UPLOADER - Multi-format Study Ingest
// Supports PDF, DOCX (Word), PNG/JPEG images, and Camera STEM Math OCR
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
} from "lucide-react";
import { addItem } from "../../../services/storageService";
import { runMathOcr, generateItemSummary } from "../../../services/geminiService";
import LatexRenderer from "../../shared/LatexRenderer";

interface ReviewMaterialsUploaderProps {
  onMaterialUploaded?: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const ReviewMaterialsUploader: React.FC<ReviewMaterialsUploaderProps> = ({
  onMaterialUploaded,
  showToast,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Math OCR result modal
  const [ocrResult, setOcrResult] = useState<{
    latex: string;
    explanation: string;
    imageUrl?: string;
  } | null>(null);
  const [copiedLatex, setCopiedLatex] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle file uploads (PDF, DOCX, PNG/JPG)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
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
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          const text = result.value.trim();

          if (!text) {
            showToast(`No text found in ${filename}`, "error");
            continue;
          }

          // Generate executive summary via Gemini
          const summary = await generateItemSummary(text);

          await addItem({
            sourceTitle: filename.replace(".docx", ""),
            text,
            aiSummary: summary,
            deviceSource: "web",
            tags: ["word-doc", "review-material"],
            color: "blue",
          });
          successCount++;
        } else if (extension === "pdf") {
          // Store PDF metadata & excerpt
          const reader = new FileReader();
          await new Promise<void>((resolve, reject) => {
            reader.onload = async () => {
              try {
                const base64 = reader.result as string;
                await addItem({
                  sourceTitle: filename.replace(".pdf", ""),
                  text: `Uploaded PDF review document: ${filename}`,
                  deviceSource: "web",
                  tags: ["pdf", "lecture-notes"],
                  color: "purple",
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
        } else if (["png", "jpg", "jpeg"].includes(extension || "")) {
          // Image / blackboard photo / diagram
          const reader = new FileReader();
          await new Promise<void>((resolve, reject) => {
            reader.onload = async () => {
              try {
                const base64 = reader.result as string;
                // Run math/text OCR on image
                const ocr = await runMathOcr(base64);

                await addItem({
                  sourceTitle: filename.replace(/\.[^/.]+$/, ""),
                  text: ocr.latex || `Visual study note from ${filename}`,
                  ocrText: ocr.latex,
                  aiSummary: ocr.explanation,
                  imageUrl: base64,
                  deviceSource: "web",
                  tags: ["visual-note", "math-ocr"],
                  color: "green",
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
          // Text / markdown fallback
          const text = await file.text();
          await addItem({
            sourceTitle: filename,
            text,
            deviceSource: "web",
            tags: ["study-notes"],
            color: "yellow",
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
      showToast(`Successfully ingested ${successCount} study material(s)!`, "success");
      if (onMaterialUploaded) onMaterialUploaded();
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
      showToast("Could not access camera. Please check permissions.", "error");
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
    setStatusText("Running Gemini Math OCR on captured formula...");

    try {
      const ocr = await runMathOcr(base64);
      setOcrResult({
        latex: ocr.latex,
        explanation: ocr.explanation,
        imageUrl: base64,
      });

      // Also save to library
      await addItem({
        sourceTitle: "Camera STEM Math Derivation",
        text: ocr.latex,
        ocrText: ocr.latex,
        aiSummary: ocr.explanation,
        imageUrl: base64,
        deviceSource: "camera",
        tags: ["stem-math", "camera-capture"],
        color: "green",
      });

      showToast("Formula captured & digitized into LaTeX!", "success");
      if (onMaterialUploaded) onMaterialUploaded();
    } catch (err: any) {
      showToast("Math OCR failed: " + err.message, "error");
    } finally {
      setIsProcessing(false);
      setStatusText("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload & Capture Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Multi-format File Ingest */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="group relative bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500/70 dark:hover:border-indigo-500/70 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all shadow-xs hover:shadow-sm"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.png,.jpg,.jpeg,.txt,.md"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-title">
            Upload Review Materials
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs font-sans leading-relaxed">
            Drag & drop or browse <strong>PDFs</strong>, <strong>Word (.docx)</strong>, or <strong>Images (.png, .jpg)</strong> of lecture slides and papers.
          </p>
          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">PDF</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Word .docx</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Images</span>
          </div>
        </div>

        {/* Card 2: Camera STEM Math OCR */}
        <div
          onClick={startCamera}
          className="group relative bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500/70 dark:hover:border-emerald-500/70 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all shadow-xs hover:shadow-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-title flex items-center gap-1.5">
            <span>Scan STEM Math & Formulas</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">Live OCR</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs font-sans leading-relaxed">
            Snap a photo of scratch paper, textbook equations, or whiteboards to extract live <strong>LaTeX</strong> and <strong>SymPy</strong> code.
          </p>
          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">KaTeX Math</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Python SymPy</span>
          </div>
        </div>
      </div>

      {/* Processing Status Banner */}
      {isProcessing && (
        <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-indigo-900 dark:text-indigo-200">
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-mono">{statusText || "Processing materials..."}</span>
        </div>
      )}

      {/* Live Camera View Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white font-title">
                  Align Math Formula or Scratch Notes
                </h3>
              </div>
              <button
                onClick={stopCamera}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              {/* Aiming Reticle */}
              <div className="absolute inset-8 border border-white/40 rounded-xl pointer-events-none flex items-center justify-center">
                <span className="text-[11px] font-mono text-white/70 bg-black/40 px-2 py-0.5 rounded">
                  Center equation inside frame
                </span>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between bg-slate-950">
              <button
                onClick={stopCamera}
                className="px-3.5 py-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
              >
                <Camera className="w-4 h-4" />
                Capture & Run OCR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OCR Result Preview Modal */}
      {ocrResult && (
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white font-title">
                Digitized Math Formula
              </h4>
            </div>
            <button
              onClick={() => setOcrResult(null)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              Dismiss
            </button>
          </div>

          {/* KaTeX live render */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200/60 dark:border-slate-800 overflow-x-auto text-center">
            <LatexRenderer latex={ocrResult.latex} />
          </div>

          {/* Explanation */}
          {ocrResult.explanation && (
            <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
              {ocrResult.explanation}
            </p>
          )}

          {/* Copy actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => {
                navigator.clipboard.writeText(ocrResult.latex);
                setCopiedLatex(true);
                setTimeout(() => setCopiedLatex(false), 2000);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-md text-xs font-mono transition-colors"
            >
              {copiedLatex ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLatex ? "Copied LaTeX!" : "Copy LaTeX"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewMaterialsUploader;
