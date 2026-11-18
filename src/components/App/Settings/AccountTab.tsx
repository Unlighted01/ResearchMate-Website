// ============================================
// AccountTab.tsx - Account Settings & Academic Edition Status
// ============================================

import React from "react";
import {
  Lock,
  AlertTriangle,
  User,
  Sparkles,
  CheckCircle2,
  GraduationCap,
  Download,
} from "lucide-react";
import { Button, Card, Input } from "../../shared/ui";
import { TrashIcon } from "../../icons";
import type { SettingsStats } from "./useSettingsData";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface AccountTabProps {
  user: any;
  stats?: SettingsStats;
  onRefreshStats?: () => Promise<void>;
  showToast?: (msg: string, type: "success" | "error" | "info") => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  passwordLoading: boolean;
  handlePasswordChange: () => Promise<void>;
  handleDeleteAccount: () => Promise<void>;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const AccountTab: React.FC<AccountTabProps> = ({
  user,
  stats,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordLoading,
  handlePasswordChange,
  handleDeleteAccount,
}) => {
  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* Academic Edition & Data Sovereignty Card                      */}
      {/* ------------------------------------------------------------- */}
      <Card className="p-6 overflow-hidden relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-white font-title">
              <GraduationCap className="w-5 h-5 text-indigo-500" />
              Academic Edition
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
              Free and open-access for students and academic researchers
            </p>
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 100% Free Forever
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-purple-500/10 border border-emerald-500/30">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Full Academic Features Unlocked
            </h4>
            <ul className="text-xs text-slate-700 dark:text-slate-300 mt-2 space-y-1.5 font-sans">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Unmetered AI reasoning, OCR transcription & KaTeX derivations
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Access to all flagship reasoning models (Claude 3.5, Gemini 1.5/2.0, DeepSeek-R1)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Full Mock Exam Generator & active-recall diagnostic suite
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Bring Your Own Key (BYOK) support for unlimited personal quotas
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Profile Card */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-white font-title">
          <User className="w-5 h-5 text-indigo-600" /> Profile Information
        </h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
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
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-white font-title">
          <Lock className="w-5 h-5 text-indigo-600" /> Change Password
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
        <h3 className="text-lg font-semibold mb-2 text-red-600 flex items-center gap-2 font-title">
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
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default AccountTab;
