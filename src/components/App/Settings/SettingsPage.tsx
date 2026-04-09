// ============================================
// SETTINGS PAGE - Orchestrates tabs & hook
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle2, AlertTriangle, Bell } from "lucide-react";

import { useSettingsData } from "./useSettingsData";
import AccountTab from "./AccountTab";
import AppearanceTab from "./AppearanceTab";
import NotificationsTab from "./NotificationsTab";
import AiPrivacyTab from "./AiPrivacyTab";
import DataTab from "./DataTab";
import LibraryTab from "./LibraryTab";

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
// PART 3: MAIN COMPONENT
// ============================================

const SettingsPage: React.FC = () => {
  const { showToast, ToastComponent } = useToast();
  const data = useSettingsData(showToast);

  // ---------- PART 3A: LOADING STATE ----------
  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // ---------- PART 3B: RENDER ----------
  return (
    <div className="max-w-4xl mx-auto">
      {ToastComponent}

      {/* Header */}
      <div className="mb-8">
        <h1 className="theme-title text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-500 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
        {data.tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => data.setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              data.activeTab === tab.id
                ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {data.activeTab === "account" && (
        <AccountTab
          user={data.user}
          newPassword={data.newPassword}
          setNewPassword={data.setNewPassword}
          confirmPassword={data.confirmPassword}
          setConfirmPassword={data.setConfirmPassword}
          passwordLoading={data.passwordLoading}
          handlePasswordChange={data.handlePasswordChange}
          handleDeleteAccount={data.handleDeleteAccount}
        />
      )}

      {data.activeTab === "appearance" && (
        <AppearanceTab
          theme={data.theme}
          setTheme={data.setTheme}
          visualTheme={data.visualTheme}
          setVisualTheme={data.setVisualTheme}
          showToast={showToast}
        />
      )}

      {data.activeTab === "notifications" && (
        <NotificationsTab
          emailNotifications={data.emailNotifications}
          setEmailNotifications={data.setEmailNotifications}
          weeklyDigest={data.weeklyDigest}
          setWeeklyDigest={data.setWeeklyDigest}
          aiSuggestions={data.aiSuggestions}
          setAiSuggestions={data.setAiSuggestions}
        />
      )}

      {data.activeTab === "ai-privacy" && (
        <AiPrivacyTab
          stats={data.stats}
          backendStatus={data.backendStatus}
          customApiKey={data.customApiKey}
          setCustomApiKey={data.setCustomApiKey}
          showApiKey={data.showApiKey}
          setShowApiKey={data.setShowApiKey}
          handleSaveApiKey={data.handleSaveApiKey}
          handleRemoveApiKey={data.handleRemoveApiKey}
          getTimeUntilReset={data.getTimeUntilReset}
        />
      )}

      {data.activeTab === "data" && (
        <DataTab
          importLoading={data.importLoading}
          handleExport={data.handleExport}
          handleImport={data.handleImport}
        />
      )}

      {data.activeTab === "library" && <LibraryTab showToast={showToast} />}
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default SettingsPage;
