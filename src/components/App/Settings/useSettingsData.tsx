// ============================================
// useSettingsData.tsx - Settings Page Custom Hook
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useState, useEffect } from "react";
import {
  User,
  Bell,
  Palette,
  Shield,
  Database,
  Library,
} from "lucide-react";
import { supabase } from "../../../services/supabaseClient";
import { useTheme } from "../../../context/ThemeContext";
import {
  importImageFile,
  importPdfFile,
  importJsonFile,
} from "../../../services/importService";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

type ShowToast = (msg: string, type: "success" | "error" | "info") => void;

export interface TabDefinition {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
}

export interface SettingsStats {
  items: number;
  collections: number;
  summaries: number;
  ai_credits: number;
}

export interface UseSettingsDataReturn {
  // User & loading
  user: any;
  loading: boolean;

  // Tab
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs: TabDefinition[];

  // Theme
  theme: string;
  setTheme: (t: "light" | "dark" | "system") => void;
  visualTheme: string;
  setVisualTheme: (t: "minimalist" | "bubble" | "glass") => void;

  // Notifications
  emailNotifications: boolean;
  setEmailNotifications: (v: boolean) => void;
  weeklyDigest: boolean;
  setWeeklyDigest: (v: boolean) => void;
  aiSuggestions: boolean;
  setAiSuggestions: (v: boolean) => void;

  // Password
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  passwordLoading: boolean;

  // Backend
  backendStatus: "checking" | "online" | "offline";

  // Import
  importLoading: boolean;

  // Stats
  stats: SettingsStats;

  // API Key
  customApiKey: string;
  setCustomApiKey: (v: string) => void;
  showApiKey: boolean;
  setShowApiKey: (v: boolean) => void;

  // Handlers
  handlePasswordChange: () => Promise<void>;
  handleSaveApiKey: () => Promise<void>;
  handleRemoveApiKey: () => Promise<void>;
  handleExport: (format: "json" | "txt" | "csv") => Promise<void>;
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDeleteAccount: () => Promise<void>;
  getTimeUntilReset: () => string;
}

// ============================================
// PART 3: CONSTANTS — TAB DEFINITIONS
// ============================================

const TABS: TabDefinition[] = [
  { id: "account", label: "Account", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "ai-privacy", label: "AI & Privacy", icon: Shield },
  { id: "data", label: "Data", icon: Database },
  { id: "library", label: "Book Search", icon: Library },
];

// ============================================
// PART 4: HOOK
// ============================================

export const useSettingsData = (showToast: ShowToast): UseSettingsDataReturn => {
  // ---------- PART 4A: STATE ----------

  const [activeTab, setActiveTab] = useState("account");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Theme state from context
  const { theme, setTheme, visualTheme, setVisualTheme } = useTheme();

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
  const [stats, setStats] = useState<SettingsStats>({
    items: 0,
    collections: 0,
    summaries: 0,
    ai_credits: 0,
  });

  // API Key State
  const [customApiKey, setCustomApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // ---------- PART 4B: EFFECTS ----------

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
        const response = await fetch("/api/chat", { method: "OPTIONS" });
        setBackendStatus(response.ok ? "online" : "offline");
      } catch {
        setBackendStatus("offline");
      }
    };
    checkBackend();
  }, []);

  // Load API Key Check (Note: we can't read HttpOnly cookie, so we just show if it's "set" based on a flag or assume blank if not explicitly saved here)
  useEffect(() => {
    const isSet = localStorage.getItem("custom_gemini_key_set");
    if (isSet) setCustomApiKey("********"); // Hide the actual value since it's in a cookie
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

  // ---------- PART 4C: HELPERS ----------

  // Credit Reset Timer Logic
  const getTimeUntilReset = (): string => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCHours(24, 0, 0, 0); // Next Midnight UTC
    const diff = tomorrow.getTime() - now.getTime();

    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    return `${hours}h ${minutes}m`;
  };

  // ---------- PART 4D: HANDLERS ----------

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

  // Save API Key via Secure Cookie
  const handleSaveApiKey = async () => {
    // Validate Gemini key format: must start with "AIz" and be 35+ chars
    if (!customApiKey.startsWith("AIz") || customApiKey.length < 35) {
      showToast(
        "Invalid key format. Gemini keys start with 'AIz' and are 39+ characters.",
        "error",
      );
      return;
    }
    try {
      const response = await fetch("/api/set-custom-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: customApiKey }),
      });
      if (!response.ok) throw new Error("Failed to save API key securely");
      localStorage.setItem("custom_gemini_key_set", "true");
      showToast("Personal API Key saved securely!", "success");
      setCustomApiKey("********");
    } catch (e) {
      showToast("Failed to save key.", "error");
    }
  };

  const handleRemoveApiKey = async () => {
    try {
      const response = await fetch("/api/set-custom-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "" }),
      });
      if (!response.ok) throw new Error("Failed to remove API key securely");
      localStorage.removeItem("custom_gemini_key_set");
      setCustomApiKey("");
      showToast("Personal API Key removed.", "info");
    } catch (e) {
      showToast("Failed to remove key.", "error");
    }
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

  // Handle data import — supports multiple files and mixed formats (json, pdf, jpg, png)
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setImportLoading(true);
    let successCount = 0;
    const errors: string[] = [];

    for (const file of files) {
      try {
        if (file.name.toLowerCase().endsWith(".pdf")) {
          showToast(`Extracting text from "${file.name}"...`, "info");
          await importPdfFile(file, user?.id);
          successCount++;
        } else if (file.type.startsWith("image/")) {
          showToast(`Running OCR on "${file.name}"...`, "info");
          await importImageFile(file);
          successCount++;
        } else if (file.name.toLowerCase().endsWith(".json")) {
          const count = await importJsonFile(file, user?.id);
          successCount += count;
        } else {
          errors.push(`"${file.name}": unsupported format`);
        }
      } catch (err: any) {
        errors.push(`"${file.name}": ${err.message}`);
      }
    }

    if (successCount > 0)
      showToast(`Imported ${successCount} item(s) successfully!`, "success");
    if (errors.length > 0)
      showToast(`${errors.length} file(s) failed to import.`, "error");
    setImportLoading(false);
    e.target.value = "";
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.",
    );

    if (confirmed) {
      const input = window.prompt(
        'Type "DELETE" to confirm account deletion:',
      );
      if (input === "DELETE") {
        await supabase.from("items").delete().eq("user_id", user?.id);
        await supabase.from("collections").delete().eq("user_id", user?.id);
        await supabase.auth.signOut();
        showToast(
          "Account data deleted. You have been signed out.",
          "success",
        );
        window.location.href = "/";
      }
    }
  };

  // ============================================
  // PART 5: RETURN
  // ============================================

  return {
    // User & loading
    user,
    loading,

    // Tab
    activeTab,
    setActiveTab,
    tabs: TABS,

    // Theme
    theme,
    setTheme,
    visualTheme,
    setVisualTheme,

    // Notifications
    emailNotifications,
    setEmailNotifications,
    weeklyDigest,
    setWeeklyDigest,
    aiSuggestions,
    setAiSuggestions,

    // Password
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordLoading,

    // Backend
    backendStatus,

    // Import
    importLoading,

    // Stats
    stats,

    // API Key
    customApiKey,
    setCustomApiKey,
    showApiKey,
    setShowApiKey,

    // Handlers
    handlePasswordChange,
    handleSaveApiKey,
    handleRemoveApiKey,
    handleExport,
    handleImport,
    handleDeleteAccount,
    getTimeUntilReset,
  };
};
