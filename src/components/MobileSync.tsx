// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { 
  Camera, 
  Loader2, 
  CheckCircle, 
  Folder, 
  FileText, 
  ChevronRight,
  Sparkles,
  Smartphone
} from "lucide-react";

// ============================================
// PART 2: COMPONENT DEFINITION & STATE
// ============================================

const MobileSync: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState("Mobile Scanner");

  // Inputs
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [customTitle, setCustomTitle] = useState("");

  // Scans history queue
  const [history, setHistory] = useState<{ id: string; url: string; title: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "compressing" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // ============================================
  // PART 3: PAIRING & DATA FETCHING
  // ============================================

  useEffect(() => {
    const verifyPairing = async () => {
      if (!uid || !token) {
        setErrorMessage("Invalid pairing parameters.");
        setVerifying(false);
        setTimeout(() => navigate("/login"), 3000);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("smart-pen", {
          body: {
            action: "verify-sync-token",
            token: token,
          },
        });

        if (error || !data?.success) {
          setErrorMessage(data?.error || "Pairing code expired or invalid.");
          setVerifying(false);
          setTimeout(() => navigate("/login"), 3500);
          return;
        }

        setUserId(data.user_id);
        setDeviceName(data.device_name || "Mobile Scanner");
        setVerified(true);

        // Fetch User Collections
        const { data: cols } = await supabase
          .from("collections")
          .select("id, name")
          .eq("user_id", data.user_id)
          .order("name", { ascending: true });

        if (cols) {
          setCollections(cols);
          if (cols.length > 0) {
            setSelectedCollectionId(cols[0].id);
          }
        }
      } catch (err) {
        console.error("Pairing verification exception:", err);
        setErrorMessage("Network error during pairing verification.");
        setTimeout(() => navigate("/login"), 3000);
      } finally {
        setVerifying(false);
      }
    };

    verifyPairing();
  }, [uid, token, navigate]);

  // ============================================
  // PART 4: CANVAS COMPRESSION HELPER
  // ============================================

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDimension = 2048; // Preserves handwriting crispness

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress as high-quality JPEG
          const dataUrl = canvas.toDataURL("image/jpeg", 0.80);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // ============================================
  // PART 5: IMAGE CAPTURE HANDLER
  // ============================================

  const handleCaptureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    setUploadStatus("compressing");

    try {
      // Downscale if >5MB or dimensions are massive
      const base64Payload = await compressImage(file);
      setUploadStatus("sending");

      const titleToSend = customTitle.trim() || `Scan ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      const { data, error } = await supabase.functions.invoke("smart-pen", {
        body: {
          action: "mobile-upload",
          image: base64Payload,
          user_id: userId,
          title: titleToSend,
          collection_id: selectedCollectionId || null,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || "Mobile upload failed.");
      }

      setHistory((prev) => [
        {
          id: data.item_id,
          url: data.image_url,
          title: titleToSend,
        },
        ...prev,
      ]);
      setCustomTitle("");
      setUploadStatus("success");
      setTimeout(() => setUploadStatus("idle"), 2500);

    } catch (err: any) {
      console.error("Upload error:", err);
      setErrorMessage(err.message || "An unexpected error occurred during upload.");
      setUploadStatus("error");
      setTimeout(() => setUploadStatus("idle"), 4000);
    } finally {
      setUploading(false);
      // Reset input value so same file can be scanned sequentially
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ============================================
  // PART 6: PORTRAIT LAYOUT RENDER
  // ============================================

  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <Smartphone className="w-12 h-12 text-blue-400 animate-bounce mb-4" />
        <h2 className="text-xl font-bold mb-2">Connecting to Desktop...</h2>
        <p className="text-slate-400 text-sm">Please wait while we establish a secure sync link.</p>
        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mt-6" />
      </div>
    );
  }

  if (errorMessage && !verified) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 bg-red-900/40 text-red-400 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
        </div>
        <h2 className="text-xl font-bold mb-2">Connection Failed</h2>
        <p className="text-red-400 text-sm">{errorMessage}</p>
        <p className="text-slate-500 text-xs mt-6">Redirecting back to login screen...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 max-w-md mx-auto relative overflow-x-hidden font-sans">
      
      {/* Top paired info */}
      <header className="flex justify-between items-center py-4 px-2 border-b border-slate-900 shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Paired</span>
        </div>
        <div className="text-right">
          <h1 className="text-sm font-bold text-slate-200">{deviceName}</h1>
          <p className="text-[10px] text-slate-500">Secure sync portal</p>
        </div>
      </header>

      {/* Main Form Fields */}
      <main className="flex-1 py-6 space-y-6 overflow-y-auto pr-1">
        
        {/* Title configuration */}
        <section className="space-y-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Page Title (Optional)</label>
          <div className="relative">
            <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="e.g. Lecture Notes Page 1 (defaults to Date)"
              className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 transition-all"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />
          </div>
        </section>

        {/* Collection Selector */}
        <section className="space-y-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">File Under Collection</label>
          <div className="relative">
            <Folder className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 appearance-none cursor-pointer"
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
            >
              <option value="">None (General Inbox)</option>
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none rotate-90" />
          </div>
        </section>

        {/* Huge Capture Button Trigger */}
        <section className="pt-4 flex flex-col items-center justify-center">
          <button
            onClick={handleCaptureClick}
            disabled={uploading}
            className="w-48 h-48 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 disabled:opacity-40 disabled:pointer-events-none text-white flex flex-col items-center justify-center shadow-xl shadow-blue-900/10 active:scale-95 transition-all border-4 border-slate-900 hover:border-slate-850"
            title="Scan handwritten notebook page"
          >
            {uploading ? (
              <Loader2 className="w-12 h-12 animate-spin text-white" />
            ) : (
              <Camera className="w-12 h-12 text-white" />
            )}
            <span className="text-xs font-bold uppercase tracking-widest mt-3">
              {uploading ? "Uploading..." : "Scan Page"}
            </span>
          </button>

          {/* Inline Upload States */}
          <div className="mt-4 text-center min-h-[24px]">
            {uploadStatus === "compressing" && (
              <p className="text-xs text-blue-400 font-semibold animate-pulse">Downsizing scanned image payload...</p>
            )}
            {uploadStatus === "sending" && (
              <p className="text-xs text-indigo-400 font-semibold animate-pulse">Uploading and executing Gemini OCR...</p>
            )}
            {uploadStatus === "success" && (
              <p className="text-xs text-emerald-400 font-bold flex items-center justify-center gap-1.5 animate-bounce">
                <CheckCircle className="w-4 h-4" /> Upload synced to desktop!
              </p>
            )}
            {uploadStatus === "error" && (
              <p className="text-xs text-red-400 font-bold px-4">{errorMessage || "Upload failed."}</p>
            )}
          </div>
        </section>

        {/* Sync details info block */}
        <section className="bg-slate-900/50 border border-slate-900 rounded-2xl p-4 flex gap-3.5 items-start">
          <div className="p-2 bg-indigo-900/30 rounded-xl text-indigo-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">Centralized Cloud OCR</h4>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              Notebook pages are sent directly to your workspace. Gemini extracts all handwriting in full markdown syntax and runs AI auto-indexing.
            </p>
          </div>
        </section>

        {/* Scanned History List */}
        {history.length > 0 && (
          <section className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Uploaded in this session</h3>
            <div className="grid grid-cols-3 gap-2.5">
              {history.map((scan) => (
                <div key={scan.id} className="bg-slate-900 rounded-xl border border-slate-900 overflow-hidden flex flex-col group relative">
                  <img
                    src={scan.url}
                    alt={scan.title}
                    className="w-full aspect-[4/5] object-cover"
                  />
                  <div className="p-1.5 bg-slate-950/80 absolute bottom-0 left-0 right-0">
                    <p className="text-[9px] text-slate-300 font-medium truncate">{scan.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* Injected environment camera picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default MobileSync;
