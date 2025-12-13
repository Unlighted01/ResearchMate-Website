import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { Input } from "../shared/UIComponents";
import { Mail, Lock, Check, X } from "lucide-react";

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

interface SignupProps {
  useToast: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
    ToastComponent: React.ReactNode;
  };
}

const SignupPage: React.FC<SignupProps> = ({ useToast }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const { showToast } = useToast();
  const navigate = useNavigate();

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

  // Password validation
  const passwordChecks = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains uppercase", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase", met: /[a-z]/.test(password) },
    { label: "Contains number", met: /\d/.test(password) },
  ];

  const passwordStrength = passwordChecks.filter((c) => c.met).length;
  const strengthColors = ["#FF3B30", "#FF9500", "#FFCC00", "#34C759"];
  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }

    setLoading(true);
    localStorage.setItem(
      "researchmate_remember",
      rememberMe ? "true" : "false"
    );

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Account created! Check your email to verify.", "success");
      setTimeout(() => navigate("/login"), 2000);
    }
    setLoading(false);
  };

  const handleOAuthSignup = async (provider: "google" | "github") => {
    setLoading(true);
    localStorage.setItem(
      "researchmate_remember",
      rememberMe ? "true" : "false"
    );
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/#/auth/callback` },
    });
    if (error) {
      showToast(error.message, "error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] dark:bg-black px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-2xl font-bold text-white">R</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Create your account
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Start organizing your research today
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 shadow-xl shadow-gray-200/50 dark:shadow-black/50 border border-gray-200/50 dark:border-gray-800/50">
          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => handleOAuthSignup("google")}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <GoogleIcon />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Google
              </span>
            </button>
            <button
              onClick={() => handleOAuthSignup("github")}
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
          <form onSubmit={handleSignup} className="space-y-4">
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

              {/* Password Strength */}
              {password.length > 0 && (
                <div className="mt-3 space-y-3">
                  {/* Strength Bar */}
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex-1 h-1 rounded-full transition-colors duration-300"
                        style={{
                          backgroundColor:
                            i < passwordStrength
                              ? strengthColors[passwordStrength - 1]
                              : "#E5E5EA",
                        }}
                      />
                    ))}
                  </div>

                  {/* Strength Label */}
                  <div className="flex justify-between items-center">
                    <span
                      className="text-xs font-medium"
                      style={{
                        color:
                          passwordStrength > 0
                            ? strengthColors[passwordStrength - 1]
                            : "#8E8E93",
                      }}
                    >
                      {passwordStrength > 0
                        ? strengthLabels[passwordStrength - 1]
                        : "Enter a password"}
                    </span>
                  </div>

                  {/* Requirements */}
                  <div className="grid grid-cols-2 gap-2">
                    {passwordChecks.map((check, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 text-xs ${
                          check.met ? "text-[#34C759]" : "text-gray-400"
                        }`}
                      >
                        {check.met ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />
                        )}
                        {check.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

            {/* Terms */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              By creating an account, you agree to our{" "}
              <a href="#" className="text-[#007AFF] hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-[#007AFF] hover:underline">
                Privacy Policy
              </a>
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-[#007AFF] hover:text-[#0066DD] font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
