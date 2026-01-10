// ============================================
// PAIR SMART PEN PAGE - Enter 6-digit code
// ============================================

import React, { useState } from "react";
import { PenTool, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "../../services/supabaseClient";

const PairSmartPen = () => {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const handlePair = async () => {
    if (code.length !== 6) {
      setStatus("error");
      setMessage("Please enter a 6-digit code");
      return;
    }

    setStatus("loading");
    setMessage("Pairing...");

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus("error");
        setMessage("Please sign in first");
        return;
      }

      // Call pen-pair function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-pen`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: "confirm",
            code: code,
            user_id: user.id,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setMessage("Smart Pen paired successfully!");
      } else {
        setStatus("error");
        setMessage(data.error || "Pairing failed");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Connection error. Please try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-200/50 dark:border-gray-800 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#FF9500] to-[#FF6B00] rounded-2xl flex items-center justify-center mb-4">
            <PenTool className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Pair Smart Pen
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Enter the 6-digit code shown on your Smart Pen
          </p>
        </div>

        {/* Code Input */}
        <div className="mb-6">
          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="w-full text-center text-4xl font-bold tracking-[0.5em] py-4 bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-[#FF9500] transition-colors"
            disabled={status === "loading" || status === "success"}
          />
        </div>

        {/* Pair Button */}
        <button
          onClick={handlePair}
          disabled={
            code.length !== 6 || status === "loading" || status === "success"
          }
          className="w-full py-4 bg-gradient-to-r from-[#FF9500] to-[#FF6B00] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === "loading" && <Loader2 className="w-5 h-5 animate-spin" />}
          {status === "success" ? "Paired!" : "Pair Smart Pen"}
        </button>

        {/* Status Message */}
        {message && (
          <div
            className={`mt-4 p-4 rounded-xl flex items-center gap-2 ${
              status === "success"
                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                : status === "error"
                ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            {status === "success" && <CheckCircle className="w-5 h-5" />}
            {status === "error" && <AlertCircle className="w-5 h-5" />}
            <span>{message}</span>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            How to find your code:
          </h3>
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
            <li>Connect your Smart Pen to WiFi</li>
            <li>Open the pen's web interface</li>
            <li>The 6-digit code is displayed at the top</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default PairSmartPen;
