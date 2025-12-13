import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { Button, Card, Input } from "../shared/UIComponents";
import { Chrome, Github, Mail } from "lucide-react";

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    localStorage.setItem(
      "researchmate_remember",
      rememberMe ? "true" : "false"
    );

    const { error } = await supabase.auth.signInWithPassword({
      email,
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/#/auth/reset-password`,
    });
    if (error) showToast(error.message, "error");
    else {
      showToast("Reset link sent!", "success");
      setShowForgotPassword(false);
    }
  };

  if (checkingAuth)
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <Mail className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold dark:text-white">
              Reset Password
            </h2>
          </div>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
            />
            <Button type="submit" className="w-full">
              Send Reset Link
            </Button>
          </form>
          <button
            onClick={() => setShowForgotPassword(false)}
            className="mt-4 w-full text-center text-sm text-gray-600"
          >
            Back to Sign In
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back
          </h2>
          <p className="text-gray-500">
            Enter your credentials to access your account
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => handleOAuthLogin("google")}
            className="w-full"
          >
            <Chrome className="w-4 h-4 mr-2" /> Google
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOAuthLogin("github")}
            className="w-full"
          >
            <Github className="w-4 h-4 mr-2" /> GitHub
          </Button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-primary-600 mt-1"
            >
              Forgot password?
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-gray-300 text-primary-600"
            />
            Keep me signed in
          </label>
          <Button type="submit" className="w-full" isLoading={loading}>
            Sign In
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary-600 font-semibold">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default LoginPage;
