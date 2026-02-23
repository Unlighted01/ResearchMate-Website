// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTheme } from "../../context/ThemeContext";
import { Button, Card, Input, Toggle } from "../shared/UIComponents";
import {
  User,
  Lock,
  Bell,
  Moon,
  Sun,
  Monitor,
  Shield,
  Database,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff,
  Palette,
  Mail,
  Zap,
  HardDrive,
  FileJson,
  FileText,
  FileSpreadsheet,
  Clock,
  Key,
  Eye,
  EyeOff,
} from "lucide-react";
import { TrashIcon } from "../icons";

// ============================================
// PART 2: TOAST COMPONENT
// ============================================

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  }[type];

  return (
    <div
      className={`fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2`}
    >
      {type === "success" && <CheckCircle2 className="w-5 h-5" />}
      {type === "error" && <AlertTriangle className="w-5 h-5" />}
      {type === "info" && <Bell className="w-5 h-5" />}
      {message}
    </div>
  );
};

const useToast = () => {
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      setToast({ message, type });
    },
    [],
  );

  const ToastComponent = toast ? (
    <Toast
      message={toast.message}
      type={toast.type}
      onClose={() => setToast(null)}
    />
  ) : null;

  return { showToast, ToastComponent };
};

// ============================================
// PART 3: SETTINGS PAGE COMPONENT
// ============================================

const SettingsPage: React.FC = () => {
  const { showToast, ToastComponent } = useToast();
  const [activeTab, setActiveTab] = useState("account");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Theme state from context
  const { theme, setTheme } = useTheme();

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState(true);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Backend status
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");

  // Import state
  const [importLoading, setImportLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    items: 0,
    collections: 0,
    summaries: 0,
    ai_credits: 0,
  });

  // API Key State
  const [customApiKey, setCustomApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // ============================================
  // PART 4: EFFECTS
  // ============================================

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    fetchUser();
  }, []);

  // Check backend status
  useEffect(() => {
    const checkBackend = async () => {
      // Always use /api since we use Vercel serverless functions
      try {
        const response = await fetch("/api/health");
        setBackendStatus(response.ok ? "online" : "offline");
      } catch {
        setBackendStatus("offline");
      }
    };
    checkBackend();
  }, []);

  // Load API Key
  useEffect(() => {
    const storedKey = localStorage.getItem("custom_gemini_key");
    if (storedKey) setCustomApiKey(storedKey);
  }, []);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;

      const { count: itemCount } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: collectionCount } = await supabase
        .from("collections")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: summaryCount } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("ai_summary", "is", null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("ai_credits")
        .eq("id", user.id)
        .maybeSingle();

      setStats({
        items: itemCount || 0,
        collections: collectionCount || 0,
        summaries: summaryCount || 0,
        ai_credits: profile?.ai_credits || 0,
      });
    };
    fetchStats();
  }, [user]);

  // Credit Reset Timer Logic
  const getTimeUntilReset = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCHours(24, 0, 0, 0); // Next Midnight UTC
    const diff = tomorrow.getTime() - now.getTime();

    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    return `${hours}h ${minutes}m`;
  };

  // ============================================
  // PART 5: HANDLERS
  // ============================================

  // Handle password change
  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Password updated successfully!", "success");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPasswordLoading(false);
  };

  // Save API Key
  const handleSaveApiKey = () => {
    localStorage.setItem("custom_gemini_key", customApiKey);
    showToast("Personal API Key saved!", "success");
  };

  const handleRemoveApiKey = () => {
    localStorage.removeItem("custom_gemini_key");
    setCustomApiKey("");
    showToast("Personal API Key removed.", "info");
  };

  // Handle data export
  const handleExport = async (format: "json" | "txt" | "csv") => {
    try {
      const { data: items } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", user?.id);

      if (!items || items.length === 0) {
        showToast("No data to export", "info");
        return;
      }

      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === "json") {
        content = JSON.stringify(items, null, 2);
        filename = `researchmate-export-${
          new Date().toISOString().split("T")[0]
        }.json`;
        mimeType = "application/json";
      } else if (format === "csv") {
        const headers = [
          "id",
          "text",
          "source_url",
          "source_title",
          "tags",
          "ai_summary",
          "device_source",
          "created_at",
        ];
        const csvRows = [headers.join(",")];
        items.forEach((item: any) => {
          const row = headers.map((h) => {
            const val = item[h];
            if (Array.isArray(val)) return `"${val.join("; ")}"`;
            if (typeof val === "string")
              return `"${val.replace(/"/g, '""').replace(/\n/g, " ")}"`;
            return val || "";
          });
          csvRows.push(row.join(","));
        });
        content = csvRows.join("\n");
        filename = `researchmate-export-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        mimeType = "text/csv";
      } else {
        content = items
          .map(
            (item: any) =>
              `${"═".repeat(50)}\nTitle: ${
                item.source_title || "Untitled"
              }\nSource: ${item.source_url || "N/A"}\nDate: ${new Date(
                item.created_at,
              ).toLocaleString()}\nTags: ${
                item.tags?.join(", ") || "None"
              }\nDevice: ${item.device_source || "Unknown"}\n${"─".repeat(
                50,
              )}\n\n${item.text}\n\n${
                item.ai_summary ? `AI Summary:\n${item.ai_summary}\n` : ""
              }`,
          )
          .join("\n\n");
        filename = `researchmate-export-${
          new Date().toISOString().split("T")[0]
        }.txt`;
        mimeType = "text/plain";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      showToast(
        `Exported ${items.length} items as ${format.toUpperCase()}`,
        "success",
      );
    } catch (error) {
      showToast("Export failed", "error");
    }
  };

  // Handle data import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    try {
      if (file.name.toLowerCase().endsWith(".pdf")) {
        // PDF Import Logic
        showToast("Extracting text from PDF...", "info");

        // Dynamically import pdfjs to avoid bloating initial load
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ");
          fullText += pageText + "\n\n";
        }

        const cleanText = fullText.trim();
        if (!cleanText) {
          throw new Error("No readable text found in PDF.");
        }

        const { error } = await supabase.from("items").insert({
          user_id: user?.id,
          text: cleanText,
          source_title: file.name.replace(/\.pdf$/i, ""),
          device_source: "web",
        });

        if (error) throw error;
        showToast(`Imported PDF "${file.name}" successfully!`, "success");
      } else {
        // Standard JSON Import Logic
        const text = await file.text();
        const items = JSON.parse(text);

        if (!Array.isArray(items)) {
          throw new Error("Invalid format");
        }

        let imported = 0;
        for (const item of items) {
          const { error } = await supabase.from("items").insert({
            user_id: user?.id,
            text: item.text,
            source_url: item.source_url,
            source_title: item.source_title,
            tags: item.tags,
            ai_summary: item.ai_summary,
            device_source: "web",
          });
          if (!error) imported++;
        }

        showToast(`Imported ${imported} items successfully!`, "success");
      }
    } catch (error) {
      showToast(`Import failed: ${(error as Error).message}`, "error");
    }
    setImportLoading(false);
    e.target.value = "";
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.",
    );

    if (confirmed) {
      const input = window.prompt('Type "DELETE" to confirm account deletion:');
      if (input === "DELETE") {
        await supabase.from("items").delete().eq("user_id", user?.id);
        await supabase.from("collections").delete().eq("user_id", user?.id);
        await supabase.auth.signOut();
        showToast("Account data deleted. You have been signed out.", "success");
        window.location.href = "/";
      }
    }
  };

  // ============================================
  // PART 6: TAB DEFINITIONS
  // ============================================

  const tabs = [
    { id: "account", label: "Account", icon: User },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "ai-privacy", label: "AI & Privacy", icon: Shield },
    { id: "data", label: "Data", icon: Database },
  ];

  // ============================================
  // PART 7: RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {ToastComponent}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-500 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ==================== ACCOUNT TAB ==================== */}
      {activeTab === "account" && (
        <div className="space-y-6">
          {/* Profile Card */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-600" /> Profile Information
            </h3>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {user?.email?.[0].toUpperCase() || "U"}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-lg">
                  {user?.user_metadata?.full_name || "ResearchMate User"}
                </p>
                <p className="text-gray-500">{user?.email}</p>
                <p className="text-gray-400 text-xs mt-1">
                  Member since {new Date(user?.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="text-gray-500 text-xs uppercase tracking-wide">
                  Email
                </span>
                <p className="font-medium text-gray-900 dark:text-white mt-1">
                  {user?.email}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="text-gray-500 text-xs uppercase tracking-wide">
                  Account ID
                </span>
                <p className="font-medium text-gray-900 dark:text-white font-mono text-xs mt-1">
                  {user?.id?.slice(0, 16)}...
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="text-gray-500 text-xs uppercase tracking-wide">
                  Auth Provider
                </span>
                <p className="font-medium text-gray-900 dark:text-white capitalize mt-1">
                  {user?.app_metadata?.provider || "Email"}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="text-gray-500 text-xs uppercase tracking-wide">
                  Last Sign In
                </span>
                <p className="font-medium text-gray-900 dark:text-white mt-1">
                  {new Date(user?.last_sign_in_at).toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          {/* Change Password */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary-600" /> Change Password
            </h3>
            <div className="space-y-4 max-w-md">
              <Input
                type="password"
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
              />
              <Input
                type="password"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
              <Button
                onClick={handlePasswordChange}
                isLoading={passwordLoading}
                disabled={!newPassword || !confirmPassword}
              >
                Update Password
              </Button>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="p-6 border-red-200 dark:border-red-900/50">
            <h3 className="text-lg font-semibold mb-2 text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Danger Zone
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              Once you delete your account, there is no going back. All your
              research items, collections, and data will be permanently deleted.
            </p>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              <TrashIcon size={16} color="white" dangerHover className="mr-2" />
              Delete Account
            </Button>
          </Card>
        </div>
      )}

      {/* ==================== APPEARANCE TAB ==================== */}
      {activeTab === "appearance" && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary-600" /> Theme
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              Choose how ResearchMate looks to you
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  id: "light",
                  label: "Light",
                  icon: Sun,
                  desc: "Clean and bright",
                },
                {
                  id: "dark",
                  label: "Dark",
                  icon: Moon,
                  desc: "Easy on the eyes",
                },
                {
                  id: "system",
                  label: "System",
                  icon: Monitor,
                  desc: "Match your device",
                },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() =>
                    setTheme(option.id as "light" | "dark" | "system")
                  }
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    theme === option.id
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <option.icon
                    className={`w-8 h-8 mb-3 ${
                      theme === option.id ? "text-primary-600" : "text-gray-400"
                    }`}
                  />
                  <p
                    className={`font-semibold ${
                      theme === option.id
                        ? "text-primary-600"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {option.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{option.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Preview */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Preview</h3>
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary-500"></div>
                <div>
                  <div className="h-3 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="h-2 w-16 bg-gray-200 dark:bg-gray-700 rounded mt-1"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-2 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </Card>

          {/* Clock Widget */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-600" /> Clock Widget
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Display a floating clock widget on your dashboard
            </p>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Show Clock Widget
                </p>
                <p className="text-sm text-gray-500">
                  Glassmorphism clock with progress bars
                </p>
              </div>
              <Toggle
                checked={localStorage.getItem("showClockWidget") === "true"}
                onChange={(checked) => {
                  localStorage.setItem("showClockWidget", String(checked));
                  window.dispatchEvent(new Event("clockWidgetToggle"));
                  showToast(
                    checked ? "Clock widget enabled" : "Clock widget disabled",
                    "info",
                  );
                }}
              />
            </div>

            {/* Time Format Selection */}
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Time Format
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "24", label: "24 Hour", example: "16:20" },
                  { id: "12", label: "12 Hour", example: "4:20 PM" },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      localStorage.setItem("clockFormat", option.id);
                      window.dispatchEvent(new Event("clockFormatChange"));
                      showToast(`Clock format set to ${option.label}`, "info");
                    }}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      (localStorage.getItem("clockFormat") || "24") ===
                      option.id
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <p
                      className={`font-semibold ${
                        (localStorage.getItem("clockFormat") || "24") ===
                        option.id
                          ? "text-primary-600"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">
                      {option.example}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ==================== NOTIFICATIONS TAB ==================== */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary-600" /> Email Notifications
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              Manage what emails you receive from us
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Email Notifications
                  </p>
                  <p className="text-sm text-gray-500">
                    Receive emails about your account activity
                  </p>
                </div>
                <Toggle
                  checked={emailNotifications}
                  onChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Weekly Digest
                  </p>
                  <p className="text-sm text-gray-500">
                    Get a weekly summary of your research activity
                  </p>
                </div>
                <Toggle checked={weeklyDigest} onChange={setWeeklyDigest} />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    AI Suggestions
                  </p>
                  <p className="text-sm text-gray-500">
                    Receive AI-powered research recommendations
                  </p>
                </div>
                <Toggle checked={aiSuggestions} onChange={setAiSuggestions} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ==================== AI & PRIVACY TAB ==================== */}
      {activeTab === "ai-privacy" && (
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
                    !customApiKey && !localStorage.getItem("custom_gemini_key")
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
      )}

      {/* ==================== DATA TAB ==================== */}
      {activeTab === "data" && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-primary-600" /> Export Data
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              Download your research data in various formats.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleExport("json")}
                className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-left group"
              >
                <FileJson className="w-8 h-8 text-gray-400 group-hover:text-primary-500 mb-3" />
                <p className="font-semibold text-gray-900 dark:text-white">
                  JSON
                </p>
                <p className="text-xs text-gray-500">
                  Full data backup for developers
                </p>
              </button>

              <button
                onClick={() => handleExport("csv")}
                className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-left group"
              >
                <FileSpreadsheet className="w-8 h-8 text-gray-400 group-hover:text-primary-500 mb-3" />
                <p className="font-semibold text-gray-900 dark:text-white">
                  CSV
                </p>
                <p className="text-xs text-gray-500">
                  Spreadsheet friendly format
                </p>
              </button>

              <button
                onClick={() => handleExport("txt")}
                className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-left group"
              >
                <FileText className="w-8 h-8 text-gray-400 group-hover:text-primary-500 mb-3" />
                <p className="font-semibold text-gray-900 dark:text-white">
                  Text File
                </p>
                <p className="text-xs text-gray-500">
                  Readable summaries and notes
                </p>
              </button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary-600" /> Import Data
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              Restore data from a JSON backup file.
            </p>

            <div className="relative">
              <input
                type="file"
                accept=".json,.pdf"
                title="Import Data"
                aria-label="Import Data"
                onChange={handleImport}
                disabled={importLoading}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2.5 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary-50 file:text-primary-700
                  hover:file:bg-primary-100
                  dark:file:bg-primary-900/30 dark:file:text-primary-400
                  transition-all cursor-pointer
                "
              />
              {importLoading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
