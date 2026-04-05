// ============================================
// AccountTab.tsx - Account Settings Tab
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Lock, AlertTriangle, User } from "lucide-react";
import { Button, Card, Input } from "../../shared/ui";
import { TrashIcon } from "../../icons";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface AccountTabProps {
  user: any;
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
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default AccountTab;
