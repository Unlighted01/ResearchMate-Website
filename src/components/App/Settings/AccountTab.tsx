// ============================================
// AccountTab.tsx - Account Settings Tab & PayMongo Subscription Suite
// ============================================

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Lock,
  AlertTriangle,
  User,
  Crown,
  Sparkles,
  CheckCircle2,
  Zap,
  CreditCard,
  Loader2,
  ExternalLink,
  Shield,
} from "lucide-react";
import { Button, Card, Input } from "../../shared/ui";
import { TrashIcon } from "../../icons";
import type { SettingsStats } from "./useSettingsData";
import { initiateStudentProCheckout, verifyPaymentSession } from "../../../services/paymongoService";

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
  onRefreshStats,
  showToast,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordLoading,
  handlePasswordChange,
  handleDeleteAccount,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "verifying" | "success" | "cancelled">("idle");

  const isPro = stats?.plan === "student_pro" && stats?.subscription_status === "active";

  // Check for PayMongo return parameters or pending session
  useEffect(() => {
    const payment = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");
    const hasPendingSession = typeof window !== "undefined" && Boolean(localStorage.getItem("researchmate_pending_checkout_session"));

    if (payment === "success" || (hasPendingSession && !isPro)) {
      setVerificationStatus("verifying");
      const idToVerify = sessionId && sessionId !== "{CHECKOUT_SESSION_ID}" ? sessionId : undefined;

      verifyPaymentSession(idToVerify).then(async (res) => {
        if (res.ok && res.paid) {
          setVerificationStatus("success");
          if (showToast) {
            showToast("🎉 Payment Successful! Welcome to Student Pro.", "success");
          }
          if (onRefreshStats) {
            await onRefreshStats();
          }
        } else {
          setVerificationStatus("idle");
          if (payment === "success" && showToast) {
            showToast("Payment status: " + (res.message || "Pending confirmation"), "info");
          }
        }
        // Clean URL params cleanly
        if (payment) {
          searchParams.delete("payment");
          searchParams.delete("session_id");
          setSearchParams(searchParams, { replace: true });
        }
      });
    } else if (payment === "cancelled") {
      setVerificationStatus("cancelled");
      if (showToast) {
        showToast("Payment was cancelled. You can upgrade anytime.", "info");
      }
      searchParams.delete("payment");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, showToast, onRefreshStats, isPro]);

  const handleManualVerify = async () => {
    setVerificationStatus("verifying");
    try {
      const res = await verifyPaymentSession();
      if (res.ok && res.paid) {
        setVerificationStatus("success");
        if (showToast) {
          showToast("🎉 Payment Verified! Welcome to Student Pro.", "success");
        }
        if (onRefreshStats) {
          await onRefreshStats();
        }
      } else {
        setVerificationStatus("idle");
        if (showToast) {
          showToast(res.message || "No completed payment found yet.", "info");
        }
      }
    } catch (err: any) {
      setVerificationStatus("idle");
      if (showToast) {
        showToast(err?.message || "Failed to verify payment.", "error");
      }
    }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      await initiateStudentProCheckout();
    } catch (err: any) {
      setIsUpgrading(false);
      if (showToast) {
        showToast(err?.message || "Failed to initiate PayMongo checkout", "error");
      } else {
        alert(err?.message || "Failed to initiate PayMongo checkout");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment Success or Cancelled Alert Banner */}
      {verificationStatus === "verifying" && (
        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600 shrink-0" />
          <div className="text-xs font-sans">
            <strong>Verifying PayMongo transaction...</strong> Confirming your Student Pro subscription.
          </div>
        </div>
      )}

      {verificationStatus === "success" && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs font-sans">
            <strong>Payment Verified!</strong> You are now a <strong>Student Pro</strong> member. Enjoy unlimited high-speed AI queries and 4-step STEM derivations!
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Subscription & Membership Card (PayMongo)                     */}
      {/* ------------------------------------------------------------- */}
      <Card className="p-6 overflow-hidden relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-white font-title">
              <Crown className="w-5 h-5 text-amber-500" />
              Membership & Subscription
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
              Powered by PayMongo (GCash, Maya, Visa, Mastercard, GrabPay)
            </p>
          </div>

          <div>
            {isPro ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Student Pro (Active)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Free Student Plan
              </span>
            )}
          </div>
        </div>

        {isPro ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-purple-500/10 border border-emerald-500/30">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Active Student Pro Perks Unlocked
              </h4>
              <ul className="text-xs text-slate-700 dark:text-slate-300 mt-2 space-y-1.5 font-sans">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Unlimited high-speed AI queries & LaTeX derivations
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Claude 3.5 Sonnet & DeepSeek-R1 Math Reasoner access
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 2,000,000 token context window for large textbooks & PDFs
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Full Mock Exam Generator & active-recall diagnostic suite
                </li>
              </ul>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Billing Cycle: Monthly (₱199.00 / month)</span>
              <span>Gateway: PayMongo Philippines</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current Free Plan */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current Plan</span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">Free Student Tier</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    50 daily free AI credits. You can also paste your own free Google Gemini key in the AI & Privacy tab for unlimited personal use.
                  </p>
                </div>
                <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
                  Daily Credits: <strong>{stats?.ai_credits ?? 50} remaining</strong>
                </div>
              </div>

              {/* Upgrade to Student Pro via PayMongo */}
              <div className="p-4 rounded-xl border-2 border-indigo-500/50 bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-white dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900 space-y-3 flex flex-col justify-between relative">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                    <span className="text-xs font-mono text-slate-400">Cancel anytime</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-title">₱199</span>
                    <span className="text-xs text-slate-500">/ month ($4.99)</span>
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 mt-2.5 space-y-1 font-sans">
                    <li className="flex items-center gap-1.5">✓ Unlimited high-speed AI queries</li>
                    <li className="flex items-center gap-1.5">✓ DeepSeek-R1 & Claude 3.5 reasoning</li>
                    <li className="flex items-center gap-1.5">✓ 2M Token context window for giant PDFs</li>
                  </ul>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleUpgrade}
                    disabled={isUpgrading}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isUpgrading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Connecting to PayMongo...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Upgrade via PayMongo (₱199)</span>
                      </>
                    )}
                  </button>

                  {/* Payment Methods Pill Strip */}
                  <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-1">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">GCash</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">Maya</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">Cards</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">GrabPay</span>
                  </div>

                  {/* Manual Payment Verification Link */}
                  <div className="text-center pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                    <button
                      type="button"
                      onClick={handleManualVerify}
                      disabled={verificationStatus === "verifying"}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline inline-flex items-center justify-center gap-1.5 font-medium cursor-pointer transition-colors"
                    >
                      {verificationStatus === "verifying" ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-indigo-600 dark:text-indigo-400" />
                          <span>Checking PayMongo status...</span>
                        </>
                      ) : (
                        <span>Already paid? Click here to verify & activate Pro &rarr;</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7-Day Student Satisfaction Guarantee & Refund Policy */}
        <div className="mt-4 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs text-slate-600 dark:text-slate-400 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>7-Day Student Satisfaction Guarantee & Refund Policy</span>
          </div>
          <p className="leading-relaxed">
            Not satisfied with ResearchMate Student Pro? Request a 100% full refund within <strong>7 days</strong> of subscribing with no hassle. Refunds are credited directly back to your original payment method (GCash, Maya, or Card) via PayMongo. Cancel anytime from this tab — your Pro perks remain active until the end of your billing cycle.
          </p>
          <p className="text-[11px] font-mono text-slate-500">
            For refund inquiries or billing assistance, reach out directly to support at <strong>support@researchmate.app</strong> or <strong>netnetku21@gmail.com</strong>.
          </p>
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
