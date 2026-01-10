// ============================================
// SMART PEN PAIRING COMPONENT
// ============================================

import React, { useState } from "react";
import { PenTool, Check, Loader2, X, Wifi } from "lucide-react";

interface SmartPenPairingProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

// Supabase config - same as your config.h
const SUPABASE_URL = "https://jxevjkzojfbywxvtcwtl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZXZqa3pvamZieXd4dnRjd3RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDc4MzEsImV4cCI6MjA3NTQ4MzgzMX0.hZL-wGTcmD9H0bsmj_jqzZ2iw1GZyJM5X14meIRKgNQ";

const SmartPenPairing: React.FC<SmartPenPairingProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [pairedPenId, setPairedPenId] = useState("");

  const handleCodeChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-input-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-submit when all 6 digits entered
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

  const resetForm = () => {
    setCode(["", "", "", "", "", ""]);
    setStatus("idle");
    setErrorMessage("");
    setPairedPenId("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FF9500] to-[#FF6B00] p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <PenTool className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Pair Smart Pen</h2>
                <p className="text-white/80 text-sm">Connect your device</p>
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

        {/* Content */}
        <div className="p-6">
          {status === "success" ? (
            /* Success State */
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Successfully Paired!
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Your smart pen is now connected to your account.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
                Device ID: {pairedPenId}
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-gradient-to-r from-[#FF9500] to-[#FF6B00] text-white font-semibold rounded-xl hover:shadow-lg transition-all"
              >
                Done
              </button>
            </div>
          ) : (
            /* Code Entry State */
            <>
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 mb-4">
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm">
                    Enter the code shown on your Smart Pen
                  </span>
                </div>

                {/* Code Input */}
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
                      className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 
                        ${
                          status === "error"
                            ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                            : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                        }
                        text-gray-900 dark:text-white
                        focus:border-[#FF9500] focus:outline-none focus:ring-2 focus:ring-[#FF9500]/20
                        transition-all`}
                      disabled={status === "loading"}
                    />
                  ))}
                </div>

                {/* Error Message */}
                {status === "error" && (
                  <p className="text-red-500 text-sm mb-4">{errorMessage}</p>
                )}

                {/* Instructions */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-left">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">
                    How to find the code:
                  </h4>
                  <ol className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                    <li>1. Power on your Smart Pen</li>
                    <li>2. Connect to the pen's WiFi network</li>
                    <li>3. Open the pen's web interface in your browser</li>
                    <li>4. The 6-digit code appears at the top</li>
                  </ol>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={() => handleSubmit()}
                disabled={status === "loading" || code.some((c) => c === "")}
                className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2
                  ${
                    code.every((c) => c !== "")
                      ? "bg-gradient-to-r from-[#FF9500] to-[#FF6B00] text-white hover:shadow-lg"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                  }`}
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Pairing...
                  </>
                ) : (
                  <>
                    <PenTool className="w-5 h-5" />
                    Pair Device
                  </>
                )}
              </button>

              {/* Reset Link */}
              {status === "error" && (
                <button
                  onClick={resetForm}
                  className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Try again
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartPenPairing;
