// ============================================
// SettingsPage.tsx - Settings Page Compositor
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { useSettingsData } from "./useSettingsData";
import AccountTab from "./AccountTab";
import AppearanceTab from "./AppearanceTab";
import NotificationsTab from "./NotificationsTab";
import AiPrivacyTab from "./AiPrivacyTab";
import DataTab from "./DataTab";
import LibraryTab from "./LibraryTab";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface SettingsPageProps {
  useToast: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
  };
}

// ============================================
// PART 3: MAIN COMPONENT
// ============================================

const SettingsPage: React.FC<SettingsPageProps> = ({ useToast }) => {
  const { showToast } = useToast();

  // ---------- PART 3A: HOOK DATA ----------

  const {
    user,
    loading,
    activeTab,
    setActiveTab,
    tabs,
    theme,
    setTheme,
    visualTheme,
    setVisualTheme,
    emailNotifications,
    setEmailNotifications,
    weeklyDigest,
    setWeeklyDigest,
    aiSuggestions,
    setAiSuggestions,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordLoading,
    backendStatus,
    importLoading,
    stats,
    customApiKey,
    setCustomApiKey,
    showApiKey,
    setShowApiKey,
    handlePasswordChange,
    handleSaveApiKey,
    handleRemoveApiKey,
    handleExport,
    handleImport,
    handleDeleteAccount,
    getTimeUntilReset,
  } = useSettingsData(showToast);

  // ---------- PART 3B: LOADING STATE ----------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // ---------- PART 3C: RENDER ----------

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="theme-title text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-500 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Tab Navigation */}
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

      {/* Active Tab Content */}
      {activeTab === "account" && (
        <AccountTab
          user={user}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          passwordLoading={passwordLoading}
          handlePasswordChange={handlePasswordChange}
          handleDeleteAccount={handleDeleteAccount}
        />
      )}

      {activeTab === "appearance" && (
        <AppearanceTab
          theme={theme}
          setTheme={setTheme}
          visualTheme={visualTheme}
          setVisualTheme={setVisualTheme}
          showToast={showToast}
        />
      )}

      {activeTab === "notifications" && (
        <NotificationsTab
          emailNotifications={emailNotifications}
          setEmailNotifications={setEmailNotifications}
          weeklyDigest={weeklyDigest}
          setWeeklyDigest={setWeeklyDigest}
          aiSuggestions={aiSuggestions}
          setAiSuggestions={setAiSuggestions}
        />
      )}

      {activeTab === "ai-privacy" && (
        <AiPrivacyTab
          stats={stats}
          backendStatus={backendStatus}
          customApiKey={customApiKey}
          setCustomApiKey={setCustomApiKey}
          showApiKey={showApiKey}
          setShowApiKey={setShowApiKey}
          handleSaveApiKey={handleSaveApiKey}
          handleRemoveApiKey={handleRemoveApiKey}
          getTimeUntilReset={getTimeUntilReset}
        />
      )}

      {activeTab === "data" && (
        <DataTab
          importLoading={importLoading}
          handleExport={handleExport}
          handleImport={handleImport}
        />
      )}

      {activeTab === "library" && <LibraryTab showToast={showToast} />}
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default SettingsPage;
