// ============================================
// NotificationsTab.tsx - Notifications Settings Tab
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Mail } from "lucide-react";
import { Card, Toggle } from "../../shared/ui";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface NotificationsTabProps {
  emailNotifications: boolean;
  setEmailNotifications: (v: boolean) => void;
  weeklyDigest: boolean;
  setWeeklyDigest: (v: boolean) => void;
  aiSuggestions: boolean;
  setAiSuggestions: (v: boolean) => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const NotificationsTab: React.FC<NotificationsTabProps> = ({
  emailNotifications,
  setEmailNotifications,
  weeklyDigest,
  setWeeklyDigest,
  aiSuggestions,
  setAiSuggestions,
}) => {
  return (
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
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default NotificationsTab;
