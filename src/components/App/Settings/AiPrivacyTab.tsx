// ============================================
// AiPrivacyTab.tsx - AI & Privacy Settings Tab
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Zap, Key, Eye, EyeOff, Wifi, WifiOff, Shield, Clock } from "lucide-react";
import { Button, Card } from "../../shared/ui";
import type { SettingsStats } from "./useSettingsData";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface AiPrivacyTabProps {
  stats: SettingsStats;
  backendStatus: "checking" | "online" | "offline";
  customApiKey: string;
  setCustomApiKey: (v: string) => void;
  showApiKey: boolean;
  setShowApiKey: (v: boolean) => void;
  handleSaveApiKey: () => Promise<void>;
  handleRemoveApiKey: () => Promise<void>;
  getTimeUntilReset: () => string;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const AiPrivacyTab: React.FC<AiPrivacyTabProps> = ({
  stats,
  backendStatus,
  customApiKey,
  setCustomApiKey,
  showApiKey,
  setShowApiKey,
  handleSaveApiKey,
  handleRemoveApiKey,
  getTimeUntilReset,
}) => {
  return (
    <div className="space-y-6">
      {/* Credits Card */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-100 dark:border-blue-800">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <Zap className="w-5 h-5" /> AI Credits
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          Your remaining balance for AI features
        </p>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">
            {stats.ai_credits}
          </span>
          <span className="text-gray-500 mb-1">credits remaining</span>
        </div>
        {/* Low Credit Warning with Reset Timer */}
        {stats.ai_credits < 20 && (
          <div className="mt-4 flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg border border-orange-100 dark:border-orange-900">
            <Clock className="w-4 h-4" />
            <span>
              Free refills in <strong>{getTimeUntilReset()}</strong>{" "}
              (Midnight UTC)
            </span>
          </div>
        )}
      </Card>

      {/* Backend Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary-600" /> AI Backend Status
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          ResearchMate uses a local backend server for AI features
        </p>

        <div
          className={`flex items-center gap-3 p-4 rounded-xl ${
            backendStatus === "online"
              ? "bg-green-50 dark:bg-green-900/20"
              : backendStatus === "offline"
                ? "bg-red-50 dark:bg-red-900/20"
                : "bg-gray-50 dark:bg-gray-800"
          }`}
        >
          {backendStatus === "online" ? (
            <Wifi className="w-6 h-6 text-green-600" />
          ) : backendStatus === "offline" ? (
            <WifiOff className="w-6 h-6 text-red-600" />
          ) : (
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          )}
          <div>
            <p
              className={`font-semibold ${
                backendStatus === "online"
                  ? "text-green-700 dark:text-green-400"
                  : backendStatus === "offline"
                    ? "text-red-700 dark:text-red-400"
                    : "text-gray-700 dark:text-gray-400"
              }`}
            >
              {backendStatus === "online"
                ? "Backend Online"
                : backendStatus === "offline"
                  ? "Backend Offline"
                  : "Checking..."}
            </p>
            <p className="text-sm text-gray-500">
              {backendStatus === "online"
                ? "AI features are fully functional"
                : backendStatus === "offline"
                  ? "Start backend with: npm run dev in researchmate-backend"
                  : "Connecting to API..."}
            </p>
          </div>
        </div>
      </Card>

      {/* Personal API Key (BYOK) */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Key className="w-5 h-5 text-primary-600" /> Personal API Key
          (Power User)
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          Bring your own Gemini API Key to bypass the free daily limits.
          Your key is stored locally on your device.
        </p>

        <div className="space-y-4">
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={customApiKey}
              onChange={(e) => setCustomApiKey(e.target.value)}
              placeholder="AIz..."
              className="w-full pl-4 pr-12 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-mono text-sm"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSaveApiKey} disabled={!customApiKey}>
              Save Key
            </Button>
            <Button
              variant="outline"
              onClick={handleRemoveApiKey}
              disabled={
                !customApiKey && !localStorage.getItem("custom_gemini_key_set")
              }
            >
              Remove Key
            </Button>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            Get a free key from{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-500 hover:underline"
            >
              Google AI Studio
            </a>
            .
          </p>
        </div>
      </Card>

      {/* Privacy */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-600" /> Privacy
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          Your data privacy settings
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <p className="font-medium text-gray-900 dark:text-white">
              Data Processing
            </p>
            <p className="text-sm text-gray-500 mt-1">
              We process your research text locally or via our secure
              backend. We do not use your data for training AI models.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default AiPrivacyTab;
