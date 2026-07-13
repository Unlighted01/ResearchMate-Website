// ============================================
// SMART PEN & MOBILE/TABLET SYNC COMPONENT
// Dual-Tab pairing for phone scanners, tablet notes, and hardware smart pens
// ============================================

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { PenTool, Check, Loader2, X, Wifi, Smartphone, Tablet, Upload } from "lucide-react";
import { supabase } from "../../services/supabaseClient";

interface SmartPenPairingProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userId: string;
}

// Supabase config - sourced from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SmartPenPairing: React.FC<SmartPenPairingProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState<"scanner" | "tablet" | "pen">("scanner");
  
  // Tab 1: Scanner (QR) States
  const [token, setToken] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // Tab 2: Tablet States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [tabletErrorMessage, setTabletErrorMessage] = useState("");

  // Tab 3: Pen (Legacy) States
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [pairedPenId, setPairedPenId] = useState("");

  // ============================================
  // TAB 1: SCANNER GENERATOR & REALTIME CONNECT
  // ============================================
  
  useEffect(() => {
    if (isOpen && activeTab === "scanner" && userId && !token) {
      const fetchToken = async () => {
        setTokenLoading(true);
        try {
          const { data, error } = await supabase.functions.invoke("smart-pen", {
            body: {
              action: "generate-sync-token",
              user_id: userId,
            },
          });
          
          if (!error && data?.success) {
            setToken(data.token);
            const pairingUrl = `${window.location.origin}/#/mobile-sync?uid=${userId}&token=${data.token}`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=2&data=${encodeURIComponent(pairingUrl)}`;
            setQrCodeUrl(qrUrl);
          } else {
            setStatus("error");
            setErrorMessage("Failed to generate secure sync token.");
          }
        } catch (err) {
          console.error("Token generation error:", err);
          setStatus("error");
          setErrorMessage("Failed to establish secure session.");
        } finally {
          setTokenLoading(false);
        }
      };
      
      fetchToken();
    }
  }, [isOpen, activeTab, userId, token]);

  // Realtime pairing connection listener
  useEffect(() => {
    if (!userId || !isOpen || activeTab !== "scanner") return;

    const channel = supabase.channel(`user-sync:${userId}`);
    channel
      .on("broadcast", { event: "mobile-connected" }, () => {
        setStatus("success");
        setTimeout(() => {
          onSuccess?.();
          handleClose();
        }, 1500);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isOpen, activeTab]);

  // ============================================
  // TAB 2: TABLET DROPZONE HANDLERS
  // ============================================
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setTabletErrorMessage("Only image files (JPG, PNG, WebP) are supported.");
      setUploadStatus("error");
      return;
    }

    await uploadTabletImages(imageFiles);
  };

  const handleUploadAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setTabletErrorMessage("Only image files (JPG, PNG, WebP) are supported.");
      setUploadStatus("error");
      return;
    }

    await uploadTabletImages(imageFiles);
  };

  const uploadTabletImages = async (files: File[]) => {
    setUploadStatus("uploading");
    setTabletErrorMessage("");

    try {
      for (const file of files) {
        // Read file as base64
        const base64DataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });

        // Invoke Edge Function
        const { data, error } = await supabase.functions.invoke("smart-pen", {
          body: {
            action: "mobile-upload",
            image: base64DataUrl,
            user_id: userId,
            title: file.name,
            device_source: "tablet_sync",
          },
        });

        if (error || !data?.success) {
          throw new Error(data?.error || "Tablet sync failed.");
        }
      }

      setUploadStatus("success");
      onSuccess?.();
      setTimeout(() => {
        setUploadStatus("idle");
      }, 3000);

    } catch (err: any) {
      console.error("Tablet upload error:", err);
      setTabletErrorMessage(err.message || "Failed to upload tablet notes.");
      setUploadStatus("error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ============================================
  // TAB 3: LEGACY PEN CODE HANDLERS
  // ============================================

  const handleCodeChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-input-${index + 1}`);
      nextInput?.focus();
    }

    if (value && index === 5 && newCode.every((c) => c !== "")) {
      handleSubmit(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split("");
      setCode(newCode);
      handleSubmit(pasted);
    }
  };

  const handleSubmit = async (codeString?: string) => {
    const finalCode = codeString || code.join("");
    if (finalCode.length !== 6) {
      setErrorMessage("Please enter all 6 digits");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/smart-pen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: "confirm",
          code: finalCode,
          user_id: userId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setPairedPenId(data.pen_id);
        setTimeout(() => {
          onSuccess?.();
          handleClose();
        }, 1500);
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Invalid or expired code");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage("Connection failed. Please try again.");
      console.error("Pairing error:", err);
    }
  };

  // ============================================
  // STATE MANAGEMENT UTILS
  // ============================================

  const resetForm = () => {
    setCode(["", "", "", "", "", ""]);
    setStatus("idle");
    setErrorMessage("");
    setPairedPenId("");
    setToken("");
    setQrCodeUrl("");
    setUploadStatus("idle");
    setTabletErrorMessage("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-scale-in border border-slate-200/50 dark:border-slate-800/50">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                {activeTab === "scanner" ? (
                  <Smartphone className="w-6 h-6" />
                ) : activeTab === "tablet" ? (
                  <Tablet className="w-6 h-6" />
                ) : (
                  <PenTool className="w-6 h-6" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold">Mobile & Tablet Sync</h2>
                <p className="text-white/80 text-sm">Capture analog and tablet notes</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="px-6 pt-5">
          <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/30 dark:border-slate-700/30">
            <button
              onClick={() => {
                resetForm();
                setActiveTab("scanner");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "scanner"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              Scanner
            </button>
            <button
              onClick={() => {
                resetForm();
                setActiveTab("tablet");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "tablet"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
              }`}
            >
              <Tablet className="w-4 h-4" />
              Tablet
            </button>
            <button
              onClick={() => {
                resetForm();
                setActiveTab("pen");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "pen"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
              }`}
            >
              <PenTool className="w-4 h-4" />
              Pen
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="p-6">
          
          {status === "success" ? (
            /* Connected/Paired Success Screen */
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-in">
                <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-950 dark:text-white mb-2">
                Successfully Synced!
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Your device is now securely connected to your ResearchMate workspace.
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <>
              {/* SCANNER TAB */}
              {activeTab === "scanner" && (
                <div className="text-center flex flex-col items-center justify-center py-4">
                  {tokenLoading ? (
                    <div className="w-44 h-44 flex flex-col items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/40">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                      <p className="text-xs text-slate-400">Securing token...</p>
                    </div>
                  ) : qrCodeUrl ? (
                    <div className="w-44 h-44 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-1 shadow-inner bg-white flex items-center justify-center">
                      <img src={qrCodeUrl} alt="Pairing QR Code" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-44 h-44 flex flex-col items-center justify-center gap-2 border border-red-500/20 rounded-2xl bg-red-50/10 text-red-500">
                      <p className="text-xs font-semibold">Failed to load QR</p>
                    </div>
                  )}

                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mt-5 mb-1">
                    Scan to Pair Phone
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-[280px] mx-auto mb-4">
                    Scan the QR code with your smartphone camera to open the mobile capture portal.
                  </p>
                  
                  <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/5 border border-indigo-500/10 rounded-full text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                    <span>Waiting for connection...</span>
                  </div>
                </div>
              )}

              {/* TABLET TAB */}
              {activeTab === "tablet" && (
                <div className="space-y-4">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleUploadAreaClick}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                      isDragging
                        ? "border-indigo-500 bg-indigo-50/10"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 hover:border-slate-400 dark:hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                    <Upload className="w-9 h-9 mx-auto text-indigo-500 mb-3 animate-bounce" />
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">
                      Drag & Drop Tablet Notes
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed max-w-[220px] mx-auto">
                      Supports JPG, PNG, or WebP. Dropped notes run AI handwriting OCR.
                    </p>
                  </div>

                  {uploadStatus === "uploading" && (
                    <div className="flex flex-col items-center justify-center gap-2 py-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                      <p className="text-[11px] text-indigo-500 font-semibold animate-pulse">Uploading and executing Gemini OCR...</p>
                    </div>
                  )}

                  {uploadStatus === "success" && (
                    <p className="text-[11px] text-emerald-500 font-bold text-center py-2 flex items-center justify-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Scanned tablet notes uploaded!
                    </p>
                  )}

                  {uploadStatus === "error" && (
                    <p className="text-[11px] text-red-500 font-semibold text-center py-2">
                      {tabletErrorMessage || "Failed to upload tablet notes."}
                    </p>
                  )}
                </div>
              )}

              {/* PEN TAB */}
              {activeTab === "pen" && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 mb-4">
                    <Wifi className="w-4 h-4" />
                    <span className="text-xs">
                      Enter the code shown on your Smart Pen
                    </span>
                  </div>

                  {/* Code Inputs */}
                  <div
                    className="flex justify-center gap-2 mb-4"
                    onPaste={handlePaste}
                  >
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        id={`code-input-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        autoFocus={index === 0}
                        className={`w-11 h-12 text-center text-xl font-bold rounded-xl border-2 
                          ${
                            status === "error"
                              ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                              : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40"
                          }
                          text-gray-900 dark:text-white
                          focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20
                          transition-all`}
                        disabled={status === "loading"}
                      />
                    ))}
                  </div>

                  {/* Error message */}
                  {status === "error" && (
                    <p className="text-red-500 text-xs mb-4">
                      {errorMessage}
                    </p>
                  )}

                  {/* Instructions */}
                  <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 text-left text-xs mb-4 border border-slate-200/50 dark:border-slate-800/30">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                      How to find the code:
                    </h4>
                    <ol className="text-slate-400 space-y-1">
                      <li>1. Power on your Smart Pen</li>
                      <li>2. Connect to the same WiFi network</li>
                      <li>
                        3. Open{" "}
                        <span className="font-mono text-indigo-500">
                          192.168.x.x
                        </span>{" "}
                        in browser
                      </li>
                      <li>4. The 6-digit code appears at the top</li>
                    </ol>
                  </div>

                  <button
                    onClick={() => handleSubmit()}
                    disabled={status === "loading" || code.some((c) => c === "")}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2
                      ${
                        code.every((c) => c !== "")
                          ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg active:scale-98"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                      }`}
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Pairing...
                      </>
                    ) : (
                      <>
                        <PenTool className="w-4 h-4" />
                        Pair Device
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
};

export default SmartPenPairing;
