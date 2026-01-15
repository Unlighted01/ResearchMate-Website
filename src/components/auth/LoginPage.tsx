import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { Button, Card, Input } from "../shared/UIComponents";
import BubbleBackground from "../shared/BubbleBackground";
import { isValidEmail, validatePassword } from "../../../lib/validation";

import { Mail, Lock, ArrowLeft } from "lucide-react";

// Apple-style icons for OAuth
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const GitHubIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

interface LoginProps {
  useToast: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
    ToastComponent: React.ReactNode;
  };
}

const LoginPage: React.FC<LoginProps> = ({ useToast }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(
    null
  );

  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/app/dashboard";

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) navigate(from, { replace: true });
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [navigate, from]);

  // Force light mode for auth pages
  useEffect(() => {
    const root = document.documentElement;
    // Remove dark mode for auth pages
    root.classList.remove("dark");

    // Restore dark mode when leaving auth pages (if it was set)
    return () => {
      const savedTheme = localStorage.getItem("theme");
      if (
        savedTheme === "dark" ||
        (savedTheme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      ) {
        root.classList.add("dark");
      }
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    if (!isValidEmail(email)) {
      showToast("Please enter a valid email address", "error");
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      showToast(passwordValidation.errors[0], "error");
      return;
    }

    setLoading(true);
    localStorage.setItem(
      "researchmate_remember",
      rememberMe ? "true" : "false"
    );

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      showToast(error.message, "error");
      setLoading(false);
    } else {
      showToast("Welcome back!", "success");
      navigate(from, { replace: true });
    }
  };

  const handleOAuthLogin = async (provider: "google" | "github") => {
    setOauthLoading(provider);
    localStorage.setItem(
      "researchmate_remember",
      rememberMe ? "true" : "false"
    );

    // Get OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/#/auth/callback`,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      showToast(error.message, "error");
      setOauthLoading(null);
      return;
    }

    if (data?.url) {
      // Open popup window
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.url,
        "oauth_popup",
        `width=${width},height=${height},left=${left},top=${top},popup=true`
      );

      if (!popup) {
        showToast(
          "Popup was blocked. Please allow popups for this site.",
          "error"
        );
        setOauthLoading(null);
        return;
      }

      // Listen for message from popup
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === "AUTH_SUCCESS") {
          window.removeEventListener("message", handleMessage);
          setOauthLoading(null);
          showToast("Welcome back!", "success");
          navigate(from, { replace: true });
        }
      };
      window.addEventListener("message", handleMessage);

      // Check if popup is closed periodically (user cancelled)
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", handleMessage);
          setOauthLoading(null);
        }
      }, 500);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    if (!isValidEmail(resetEmail)) {
      showToast("Please enter a valid email address", "error");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      resetEmail.trim(),
      {
        redirectTo: `${window.location.origin}/#/auth/reset-password`,
      }
    );
    if (error) showToast(error.message, "error");
    else {
      showToast("Reset link sent!", "success");
      setShowForgotPassword(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] dark:bg-black">
        <div className="w-8 h-8 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Forgot Password View
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative">
        <div className="fixed inset-0 bg-[#F5F5F7] dark:bg-black z-0" />
        <BubbleBackground bubbleCount={10} />
        <div className="w-full max-w-sm content-above-bubbles">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Reset Password
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Enter your email to receive a reset link
            </p>
          </div>

          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 shadow-xl shadow-gray-200/50 dark:shadow-black/50 border border-gray-200/50 dark:border-gray-800/50">
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <Input
                type="email"
                placeholder="Email address"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                icon={<Mail className="w-5 h-5" />}
              />
              <button
                type="submit"
                className="w-full py-3 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-xl transition-all active:scale-[0.98]"
              >
                Send Reset Link
              </button>
            </form>
          </div>

          <button
            onClick={() => setShowForgotPassword(false)}
            className="flex items-center justify-center gap-2 w-full mt-6 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  // Main Login View
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* OAuth Loading Overlay */}
      {oauthLoading && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-8 shadow-2xl text-center max-w-sm mx-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              {oauthLoading === "google" ? <GoogleIcon /> : <GitHubIcon />}
            </div>
            <div className="w-8 h-8 border-3 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Signing in with {oauthLoading === "google" ? "Google" : "GitHub"}
              ...
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Complete sign-in in the popup window
            </p>
            <button
              onClick={() => setOauthLoading(null)}
              className="text-sm text-[#007AFF] hover:text-[#0066DD] font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="fixed inset-0 bg-[#F5F5F7] dark:bg-black z-0" />
      <BubbleBackground bubbleCount={10} />
      <div className="w-full max-w-sm content-above-bubbles">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-2xl font-bold text-white">R</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Sign in to continue to ResearchMate
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 shadow-xl shadow-gray-200/50 dark:shadow-black/50 border border-gray-200/50 dark:border-gray-800/50">
          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => handleOAuthLogin("google")}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <GoogleIcon />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Google
              </span>
            </button>
            <button
              onClick={() => handleOAuthLogin("github")}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <GitHubIcon />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                GitHub
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center my-6">
            <div className="flex-grow h-px bg-gray-200 dark:bg-gray-700" />
            <span className="flex-shrink mx-4 text-xs text-gray-400 uppercase">
              or
            </span>
            <div className="flex-grow h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              icon={<Mail className="w-5 h-5" />}
            />
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                icon={<Lock className="w-5 h-5" />}
              />
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-[#007AFF] hover:text-[#0066DD] mt-2 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Remember Me */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-md peer-checked:border-[#007AFF] peer-checked:bg-[#007AFF] transition-colors" />
                <svg
                  className="absolute top-0.5 left-0.5 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Keep me signed in
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-sm text-gray-500">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-[#007AFF] hover:text-[#0066DD] font-medium transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
