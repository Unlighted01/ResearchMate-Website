// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================
import TeamPage from "./components/TeamPage";
import ProductsPage from "./components/ProductsPage";
import SettingsPage from "./components/SettingsPage";
import { ThemeProvider } from "./context/ThemeContext";
import React, { useState, useEffect, useCallback } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import { MarketingLayout, DashboardLayout } from "./components/Layouts";
import { supabase } from "./services/supabaseClient";
import { Button, Card, Input, Badge, Modal } from "./components/UIComponents";
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  Smartphone,
  PenTool,
  Layout as LayoutIcon,
  Github,
  Search as SearchIcon,
  Filter,
  RefreshCw,
  Plus,
  Globe,
  FolderOpen,
  MoreVertical,
  Calendar,
  Download,
  Share2,
  Trash2,
  Mic,
  Image as ImageIcon,
  Laptop,
  Chrome,
  Lock,
  Wifi,
  WifiOff,
  Bell,
  Edit2,
  X,
  FolderPlus,
  ChevronLeft,
  Copy,
  Quote,
  BookOpen,
  FileText,
  Mail,
  Sparkles,
  FileUp,
} from "lucide-react";
import {
  generateSummary,
  generateChatResponse,
} from "./services/geminiService";
import {
  getAllItems,
  addItem,
  deleteItem,
  updateItem,
  subscribeToItems,
  StorageItem,
} from "./services/storageService";
import {
  getAllCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  getItemsInCollection,
  addItemToCollection,
  removeItemFromCollection,
  Collection as CollectionType,
  COLLECTION_COLORS,
} from "./services/collectionsService";
import CitationGenerator from "./components/CitationGenerator";
import { ResearchItem, Collection, ChatMessage, DeviceSource } from "./types";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

// ============================================
// PART 2: TOAST NOTIFICATION COMPONENT
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
      className={`fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up flex items-center gap-2`}
    >
      {type === "success" && <CheckCircle2 className="w-5 h-5" />}
      {type === "error" && <span>âŒ</span>}
      {type === "info" && <Bell className="w-5 h-5" />}
      {message}
    </div>
  );
};

// Toast hook for easy usage
const useToast = () => {
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      setToast({ message, type });
    },
    []
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
// PART 3: AUTH CALLBACK
// ============================================

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        navigate("/app/dashboard");
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || session) {
        navigate("/app/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Completing Sign In...
        </h2>
        <p className="text-gray-500 mt-2">
          Please wait while we verify your credentials.
        </p>
      </div>
    </div>
  );
};

// ============================================
// PART 4: LANDING PAGE
// ============================================

const LandingPage = () => {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          // User is logged in, redirect to dashboard
          navigate("/app/dashboard", { replace: true });
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [navigate]);

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-20 pb-20">
      {/* Hero */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-200 via-gray-50 to-gray-50 dark:from-primary-900/20 dark:via-gray-950 dark:to-gray-950 -z-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <Badge className="mb-6 px-4 py-1 text-sm bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
            New: Smart Pen Integration Available ðŸš€
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600 pb-2">
            Your Research,
            <br />
            Everywhere
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto">
            Capture, organize, and understand your research across all your
            devices with AI-powered insights. The ecosystem for modern
            researchers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login">
              <Button size="lg" className="rounded-full px-8 w-full sm:w-auto">
                Try Web App
              </Button>
            </Link>
            <Link to="/products">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 w-full sm:w-auto"
              >
                Download Extension
              </Button>
            </Link>
          </div>

          <div className="mt-20 relative mx-auto max-w-5xl">
            <div className="aspect-video rounded-xl bg-gray-900/5 dark:bg-white/10 p-2 backdrop-blur-sm border border-gray-200 dark:border-gray-800 shadow-2xl">
              <div className="w-full h-full bg-white dark:bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src="https://picsum.photos/1200/800"
                  alt="Dashboard Preview"
                  className="w-full h-full object-cover opacity-90"
                />
              </div>
            </div>
            <div className="absolute -top-10 -left-10 w-24 h-24 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            Everything you need to master your research
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Powerful features designed for students, academics, and
            professionals.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: Zap,
              title: "AI-Powered Summaries",
              desc: "Get instant 2-3 sentence summaries of any research text.",
            },
            {
              icon: Smartphone,
              title: "Multi-device Access",
              desc: "Browser extension, mobile app, web platform, and smart pen.",
            },
            {
              icon: PenTool,
              title: "Smart Pen Integration",
              desc: "Handwritten notes digitized with OCR technology instantly.",
            },
            {
              icon: LayoutIcon,
              title: "Smart Organization",
              desc: "AI-generated tags and collections keep everything organized.",
            },
            {
              icon: CheckCircle2,
              title: "Real-time Sync",
              desc: "Your research automatically syncs across all devices.",
            },
            {
              icon: Lock,
              title: "Secure & Private",
              desc: "End-to-end encryption and GDPR compliant.",
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center text-primary-600 mb-4">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

// ============================================
// PART 5: LOGIN PAGE
// ============================================

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [rememberMe, setRememberMe] = useState(true); // Default to staying signed in
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const { showToast, ToastComponent } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Get where the user was trying to go (if redirected from RequireAuth)
  const from = (location.state as any)?.from?.pathname || "/app/dashboard";

  // Redirect to dashboard if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          navigate(from, { replace: true });
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [navigate, from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Store remember preference
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

    // Store remember preference before OAuth redirect
    localStorage.setItem(
      "researchmate_remember",
      rememberMe ? "true" : "false"
    );

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/#/auth/callback`,
      },
    });
    if (error) {
      showToast(error.message, "error");
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      showToast("Please enter your email address", "error");
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/#/auth/reset-password`,
    });

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Password reset link sent! Check your email.", "success");
      setShowForgotPassword(false);
      setResetEmail("");
    }
    setResetLoading(false);
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Forgot Password Modal
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        {ToastComponent}
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Reset Password
            </h2>
            <p className="text-gray-500 mt-2">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <Button type="submit" className="w-full" isLoading={resetLoading}>
              Send Reset Link
            </Button>
          </form>

          <button
            onClick={() => setShowForgotPassword(false)}
            className="mt-4 w-full text-center text-sm text-gray-600 hover:text-primary-600"
          >
            ← Back to Sign In
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      {ToastComponent}
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back
          </h2>
          <p className="text-gray-500">
            Enter your credentials to access your account
          </p>
        </div>

        {/* OAuth Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOAuthLogin("google")}
            disabled={loading}
            className="w-full"
          >
            <Chrome className="w-4 h-4 mr-2" /> Google
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOAuthLogin("github")}
            disabled={loading}
            className="w-full"
          >
            <Github className="w-4 h-4 mr-2" /> GitHub
          </Button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300 dark:border-gray-700"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">
              Or continue with email
            </span>
          </div>
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
              className="text-sm text-primary-600 hover:text-primary-700 mt-1"
            >
              Forgot password?
            </button>
          </div>

          {/* Keep me signed in checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Keep me signed in
            </span>
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

// ============================================
// PART 6: SIGNUP PAGE
// ============================================

// Password strength calculator
const getPasswordStrength = (
  password: string
): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", color: "bg-orange-500" };
  if (score <= 3) return { score, label: "Good", color: "bg-yellow-500" };
  if (score <= 4) return { score, label: "Strong", color: "bg-green-500" };
  return { score, label: "Very Strong", color: "bg-green-600" };
};

const SignupPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { showToast, ToastComponent } = useToast();
  const navigate = useNavigate();

  const passwordStrength = getPasswordStrength(password);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    setLoading(true);

    // Store remember preference for when they confirm and log in
    localStorage.setItem(
      "researchmate_remember",
      rememberMe ? "true" : "false"
    );

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast(
        "Account created! Check your email for the confirmation link.",
        "success"
      );
      // Optionally redirect to a "check your email" page
      setTimeout(() => navigate("/login"), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      {ToastComponent}
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create an account
          </h2>
          <p className="text-gray-500">Start managing your research today</p>
        </div>
        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <div>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required
            />
            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        level <= passwordStrength.score
                          ? passwordStrength.color
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
                <p
                  className={`text-xs ${
                    passwordStrength.score <= 1
                      ? "text-red-500"
                      : passwordStrength.score <= 2
                      ? "text-orange-500"
                      : passwordStrength.score <= 3
                      ? "text-yellow-600"
                      : "text-green-500"
                  }`}
                >
                  {passwordStrength.label} password
                  {passwordStrength.score < 3 && (
                    <span className="text-gray-400 ml-1">
                      — Try adding{" "}
                      {!/[A-Z]/.test(password) ? "uppercase, " : ""}
                      {!/\d/.test(password) ? "numbers, " : ""}
                      {!/[^a-zA-Z0-9]/.test(password) ? "symbols" : ""}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Keep me signed in checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Keep me signed in
            </span>
          </label>

          <Button type="submit" className="w-full" isLoading={loading}>
            Sign Up
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-primary-600 font-semibold">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
};

// ============================================
// PART 7: DASHBOARD PAGE (WITH REAL-TIME SYNC)
// ============================================

const Dashboard = () => {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { showToast, ToastComponent } = useToast();

  // Fetch items from storage service
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllItems();
      setItems(data);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error("Failed to fetch items:", error);
      showToast("Failed to load items", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Setup real-time subscription
  useEffect(() => {
    fetchItems();

    // Get current user for real-time subscription
    const setupRealTime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        console.log("ðŸ”Œ Setting up real-time sync for user:", user.id);

        // Subscribe to real-time changes
        const unsubscribe = subscribeToItems(user.id, (payload) => {
          console.log("ðŸ“¡ Real-time event:", payload.eventType);

          if (payload.eventType === "INSERT" && payload.new) {
            // New item added (likely from extension!)
            setItems((prev) => [payload.new!, ...prev]);
            showToast(
              `New item synced from ${payload.new.deviceSource || "device"}!`,
              "success"
            );
            setLastSyncTime(new Date());
          } else if (payload.eventType === "UPDATE" && payload.new) {
            // Item updated
            setItems((prev) =>
              prev.map((item) =>
                item.id === payload.new!.id ? payload.new! : item
              )
            );
            setLastSyncTime(new Date());
          } else if (payload.eventType === "DELETE" && payload.old) {
            // Item deleted
            setItems((prev) =>
              prev.filter((item) => item.id !== payload.old!.id)
            );
            setLastSyncTime(new Date());
          }
        });

        setIsRealTimeConnected(true);

        // Cleanup on unmount
        return () => {
          console.log("ðŸ”Œ Disconnecting real-time sync");
          unsubscribe();
          setIsRealTimeConnected(false);
        };
      }
    };

    const cleanup = setupRealTime();
    return () => {
      cleanup.then((fn) => fn && fn());
    };
  }, [fetchItems, showToast]);

  // Get device source icon
  const getSourceIcon = (source: string) => {
    switch (source) {
      case "extension":
        return <Laptop className="w-4 h-4" />;
      case "mobile":
        return <Smartphone className="w-4 h-4" />;
      case "smart_pen":
        return <PenTool className="w-4 h-4" />;
      case "web":
        return <Globe className="w-4 h-4" />;
      default:
        return <LayoutIcon className="w-4 h-4" />;
    }
  };

  // Generate AI summary for an item
  const handleGenerateSummary = async (item: StorageItem) => {
    showToast("Generating AI summary...", "info");
    try {
      const summary = await generateSummary(item.text || item.ocrText || "");
      if (summary) {
        // Update item with summary
        await updateItem(item.id, { aiSummary: summary });
        const updated = { ...item, aiSummary: summary };
        setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
        setSelectedItem(updated);
        showToast("Summary generated!", "success");
      }
    } catch (error) {
      console.error("Summary generation failed:", error);
      showToast("Failed to generate summary", "error");
    }
  };

  // Delete an item
  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await deleteItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      showToast("Item deleted", "success");
      if (selectedItem?.id === id) {
        setIsModalOpen(false);
        setSelectedItem(null);
      }
    } catch (error) {
      console.error("Delete failed:", error);
      showToast("Failed to delete item", "error");
    }
  };

  // Filter items by search query
  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.text?.toLowerCase().includes(query) ||
      item.sourceTitle?.toLowerCase().includes(query) ||
      item.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  return (
    <div>
      {ToastComponent}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            {isRealTimeConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span>Real-time sync active</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-gray-400" />
                <span>Connecting...</span>
              </>
            )}
            {lastSyncTime && (
              <span className="text-gray-400">
                â€¢ Last sync: {lastSyncTime.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchItems}
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Link to="/app/settings">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Import Notes
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search your research..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm outline-none"
          />
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {items.length}
          </div>
          <div className="text-sm text-gray-500">Total Items</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {items.filter((i) => i.deviceSource === "extension").length}
          </div>
          <div className="text-sm text-gray-500">From Extension</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {items.filter((i) => i.aiSummary).length}
          </div>
          <div className="text-sm text-gray-500">With AI Summary</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {new Set(items.flatMap((i) => i.tags || [])).size}
          </div>
          <div className="text-sm text-gray-500">Unique Tags</div>
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"
            ></div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16">
          {searchQuery ? (
            // Search empty state
            <>
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <SearchIcon className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No matching items
              </h3>
              <p className="text-gray-500 mb-4">
                Try a different search term or clear your search
              </p>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            </>
          ) : (
            // Empty dashboard state
            <>
              <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-12 h-12 text-primary-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Welcome to ResearchMate!
              </h3>
              <p className="text-gray-500 max-w-md mx-auto mb-8">
                Start capturing your research by highlighting text on any
                webpage. Your saved items will appear here, synced in real-time.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="https://chromewebstore.google.com/detail/researchmate/decekloddlffcnegkfbkfngkjikfchoh"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="lg">
                    <Chrome className="w-5 h-5 mr-2" />
                    Get Chrome Extension
                  </Button>
                </a>
                <Link to="/products">
                  <Button variant="outline" size="lg">
                    <Plus className="w-5 h-5 mr-2" />
                    Learn More
                  </Button>
                </Link>
              </div>
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Chrome className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                    1. Install Extension
                  </h4>
                  <p className="text-sm text-gray-500">
                    Add our Chrome extension to your browser
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <FileUp className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                    2. Highlight & Save
                  </h4>
                  <p className="text-sm text-gray-500">
                    Select text and click save on any page
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <RefreshCw className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                    3. Sync Everywhere
                  </h4>
                  <p className="text-sm text-gray-500">
                    Access your research from any device
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:border-primary-400 transition-all hover:shadow-lg group relative"
            >
              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteItem(item.id);
                }}
                className="absolute top-2 right-2 p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                aria-label="Delete item"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div
                onClick={() => {
                  setSelectedItem(item);
                  setIsModalOpen(true);
                }}
                className="h-full flex flex-col p-4"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <Badge
                    variant={
                      item.deviceSource === "smart_pen" ? "warning" : "default"
                    }
                    className="capitalize flex items-center gap-1"
                  >
                    {getSourceIcon(item.deviceSource || "web")}
                    {(item.deviceSource || "web").replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-lg mb-2 line-clamp-1 text-gray-900 dark:text-white">
                  {item.sourceTitle || "Untitled Research"}
                </h3>

                {/* Content */}
                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-4 flex-1">
                  {item.aiSummary ? (
                    <span className="italic text-primary-600 dark:text-primary-400">
                      AI: {item.aiSummary}
                    </span>
                  ) : (
                    item.text || item.ocrText
                  )}
                </p>

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-auto">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300"
                      >
                        #{tag}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="text-xs text-gray-400">
                        +{item.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Research Detail"
        size="xl"
      >
        {selectedItem && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase">
                    Original Content
                  </h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        selectedItem.text || selectedItem.ocrText || ""
                      );
                      showToast("Text copied to clipboard!", "success");
                    }}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Copy text"
                    aria-label="Copy text"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm leading-relaxed max-h-60 overflow-y-auto">
                  {selectedItem.text || selectedItem.ocrText}
                </div>
              </div>

              {selectedItem.imageUrl && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                    Source Image
                  </h4>
                  <img
                    src={selectedItem.imageUrl}
                    alt="Scan"
                    className="rounded-lg w-full object-cover"
                  />
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  Metadata
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Source:</span>{" "}
                    {selectedItem.sourceUrl ? (
                      <a
                        href={selectedItem.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        {selectedItem.sourceTitle || "Link"}
                      </a>
                    ) : (
                      selectedItem.sourceTitle || "N/A"
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500">Date:</span>{" "}
                    {new Date(selectedItem.createdAt).toLocaleString()}
                  </div>
                  <div>
                    <span className="text-gray-500">Device:</span>{" "}
                    <span className="capitalize">
                      {(selectedItem.deviceSource || "web").replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div className="bg-primary-50 dark:bg-primary-900/10 p-6 rounded-xl border border-primary-100 dark:border-primary-900/20">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-primary-900 dark:text-primary-100 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> AI Summary
                  </h4>
                  <div className="flex gap-2">
                    {selectedItem.aiSummary && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            selectedItem.aiSummary || ""
                          );
                          showToast("Summary copied to clipboard!", "success");
                        }}
                        className="p-1.5 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                        title="Copy summary"
                        aria-label="Copy summary"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    {!selectedItem.aiSummary && (
                      <Button
                        size="sm"
                        onClick={() => handleGenerateSummary(selectedItem)}
                      >
                        Generate
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 min-h-[4rem]">
                  {selectedItem.aiSummary ||
                    "No summary generated yet. Click generate to analyze this text."}
                </p>
              </div>

              {/* Tags */}
              {selectedItem.tags && selectedItem.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                    Tags
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {selectedItem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  Actions
                </h4>
                <div className="flex flex-col space-y-2">
                  {selectedItem.sourceUrl && (
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() =>
                        window.open(selectedItem.sourceUrl, "_blank")
                      }
                    >
                      <Globe className="w-4 h-4 mr-2" /> Open Source
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      const shareText = `${
                        selectedItem.sourceTitle || "Research"
                      }\n\n${
                        selectedItem.aiSummary || selectedItem.text || ""
                      }\n\nSource: ${selectedItem.sourceUrl || "N/A"}`;
                      if (navigator.share) {
                        navigator.share({
                          title: selectedItem.sourceTitle || "Research",
                          text: shareText,
                          url: selectedItem.sourceUrl || undefined,
                        });
                      } else {
                        navigator.clipboard.writeText(shareText);
                        showToast("Content copied for sharing!", "success");
                      }
                    }}
                  >
                    <Share2 className="w-4 h-4 mr-2" /> Share Research
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      // Create text content for export
                      const content = `
${selectedItem.sourceTitle || "Untitled Research"}
${"=".repeat(50)}

ORIGINAL CONTENT:
${selectedItem.text || selectedItem.ocrText || "N/A"}

${selectedItem.aiSummary ? `AI SUMMARY:\n${selectedItem.aiSummary}\n` : ""}
METADATA:
- Source: ${selectedItem.sourceUrl || "N/A"}
- Date: ${new Date(selectedItem.createdAt).toLocaleString()}
- Device: ${(selectedItem.deviceSource || "web").replace("_", " ")}
${
  selectedItem.tags && selectedItem.tags.length > 0
    ? `- Tags: ${selectedItem.tags.join(", ")}`
    : ""
}

CITATIONS:
APA: ${selectedItem.sourceTitle || "Untitled"}. (${new Date(
                        selectedItem.createdAt
                      ).getFullYear()}). Retrieved from ${
                        selectedItem.sourceUrl || "N/A"
                      }
MLA: "${selectedItem.sourceTitle || "Untitled"}." Web. ${new Date(
                        selectedItem.createdAt
                      ).toLocaleDateString()}. <${
                        selectedItem.sourceUrl || "N/A"
                      }>.
                      `.trim();

                      // Create and download file
                      const blob = new Blob([content], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${(
                        selectedItem.sourceTitle || "research"
                      ).replace(/[^a-z0-9]/gi, "_")}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      showToast("Research exported!", "success");
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" /> Export to Text
                  </Button>
                  <Button
                    variant="destructive"
                    className="justify-start"
                    onClick={() => handleDeleteItem(selectedItem.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Item
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ============================================
// PART 8: AI SUMMARIZATION ASSISTANT
// ============================================

const AIAssistant = () => {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { showToast, ToastComponent } = useToast();

  // Fetch items on mount
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const data = await getAllItems();
        setItems(data);
      } catch (error) {
        console.error("Failed to fetch items:", error);
      }
      setLoading(false);
    };
    fetchItems();
  }, []);

  // Filter items
  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.text?.toLowerCase().includes(query) ||
      item.sourceTitle?.toLowerCase().includes(query) ||
      item.aiSummary?.toLowerCase().includes(query)
    );
  });

  // Items without summaries
  const itemsWithoutSummary = filteredItems.filter((item) => !item.aiSummary);
  const itemsWithSummary = filteredItems.filter((item) => item.aiSummary);

  // Generate summary for an item
  const handleSummarize = async (item: StorageItem) => {
    if (!item.text && !item.ocrText) {
      showToast("No content to summarize", "error");
      return;
    }

    setSummarizing(true);
    try {
      const summary = await generateSummary(item.text || item.ocrText || "");
      if (summary) {
        await updateItem(item.id, { aiSummary: summary });
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, aiSummary: summary } : i))
        );
        setSelectedItem({ ...item, aiSummary: summary });
        showToast("Summary generated successfully!", "success");
      }
    } catch (error) {
      console.error("Summary generation failed:", error);
      showToast("Failed to generate summary", "error");
    }
    setSummarizing(false);
  };

  // Summarize all items without summaries
  const handleSummarizeAll = async () => {
    if (itemsWithoutSummary.length === 0) {
      showToast("All items already have summaries!", "info");
      return;
    }

    showToast(`Summarizing ${itemsWithoutSummary.length} items...`, "info");
    setSummarizing(true);

    let successCount = 0;
    for (const item of itemsWithoutSummary.slice(0, 10)) {
      // Limit to 10 at a time
      try {
        const summary = await generateSummary(item.text || item.ocrText || "");
        if (summary) {
          await updateItem(item.id, { aiSummary: summary });
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, aiSummary: summary } : i
            )
          );
          successCount++;
        }
      } catch (error) {
        console.error(`Failed to summarize item ${item.id}:`, error);
      }
    }

    setSummarizing(false);
    showToast(`Generated ${successCount} summaries!`, "success");
  };

  return (
    <div className="space-y-6">
      {ToastComponent}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary-600" />
            AI Summarization
          </h1>
          <p className="text-gray-500 mt-1">
            Generate AI-powered summaries for your research items
          </p>
        </div>
        <Button
          onClick={handleSummarizeAll}
          disabled={summarizing || itemsWithoutSummary.length === 0}
        >
          {summarizing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Summarizing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Summarize All ({itemsWithoutSummary.length})
            </>
          )}
        </Button>
      </div>

      {/* Info Banner */}
      <Card className="p-4 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Zap className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-primary-900 dark:text-primary-100">
              About AI Summarization
            </h3>
            <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
              This tool generates concise 2-3 sentence summaries of your
              research items using AI. It's designed specifically for
              summarization â€” for other AI features, check out the Citation
              Generator's AI extraction tool.
            </p>
          </div>
        </div>
      </Card>

      {/* Search */}
      <div className="relative max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search items to summarize..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm outline-none"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {items.length}
          </div>
          <div className="text-sm text-gray-500">Total Items</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {itemsWithSummary.length}
          </div>
          <div className="text-sm text-gray-500">Summarized</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {itemsWithoutSummary.length}
          </div>
          <div className="text-sm text-gray-500">Need Summary</div>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Items Needing Summary */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            Need Summary ({itemsWithoutSummary.length})
          </h2>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : itemsWithoutSummary.length === 0 ? (
              <Card className="p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  All items have been summarized!
                </p>
              </Card>
            ) : (
              itemsWithoutSummary.map((item) => (
                <Card
                  key={item.id}
                  className="p-4 hover:border-primary-400 transition-colors cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <h4 className="font-medium text-gray-900 dark:text-white line-clamp-1">
                    {item.sourceTitle || "Untitled"}
                  </h4>
                  <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                    {item.text || item.ocrText || "No content"}
                  </p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSummarize(item);
                      }}
                      disabled={summarizing}
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Summarize
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Items With Summary */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Summarized ({itemsWithSummary.length})
          </h2>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {itemsWithSummary.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-gray-500">No summaries yet</p>
              </Card>
            ) : (
              itemsWithSummary.map((item) => (
                <Card
                  key={item.id}
                  className="p-4 hover:border-green-400 transition-colors cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <h4 className="font-medium text-gray-900 dark:text-white line-clamp-1">
                    {item.sourceTitle || "Untitled"}
                  </h4>
                  <p className="text-sm text-green-600 dark:text-green-400 line-clamp-2 mt-1 italic">
                    "{item.aiSummary}"
                  </p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <Badge variant="success">Summarized</Badge>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.sourceTitle || "Research Item"}
        size="lg"
      >
        {selectedItem && (
          <div className="space-y-4">
            {/* Original Content */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                Original Content
              </h4>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm max-h-48 overflow-y-auto">
                {selectedItem.text || selectedItem.ocrText || "No content"}
              </div>
            </div>

            {/* AI Summary */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                AI Summary
              </h4>
              {selectedItem.aiSummary ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-green-800 dark:text-green-200">
                    {selectedItem.aiSummary}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-orange-800 dark:text-orange-200 mb-3">
                    No summary generated yet.
                  </p>
                  <Button
                    onClick={() => handleSummarize(selectedItem)}
                    disabled={summarizing}
                  >
                    {summarizing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Generate Summary
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Source:</span>
                <a
                  href={selectedItem.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-600 hover:underline ml-2 break-all"
                >
                  {selectedItem.sourceUrl || "N/A"}
                </a>
              </div>
              <div>
                <span className="text-gray-500">Date:</span>
                <span className="ml-2">
                  {new Date(selectedItem.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ============================================
// PART 9: STATISTICS PAGE
// ============================================

const Statistics = () => {
  const [stats, setStats] = useState({
    total: 0,
    bySource: { extension: 0, mobile: 0, smart_pen: 0, web: 0 },
    weeklyData: [] as { name: string; count: number }[],
  });

  useEffect(() => {
    const loadStats = async () => {
      const items = await getAllItems();

      // Calculate stats
      const bySource = { extension: 0, mobile: 0, smart_pen: 0, web: 0 };
      const weeklyMap: Record<string, number> = {};

      items.forEach((item) => {
        // By source
        const source = (item.deviceSource || "web") as keyof typeof bySource;
        if (source in bySource) {
          bySource[source]++;
        }

        // By day (last 7 days)
        const date = new Date(item.createdAt);
        const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
        weeklyMap[dayName] = (weeklyMap[dayName] || 0) + 1;
      });

      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weeklyData = days.map((day) => ({
        name: day,
        count: weeklyMap[day] || 0,
      }));

      setStats({
        total: items.length,
        bySource,
        weeklyData,
      });
    };

    loadStats();
  }, []);

  const pieData = [
    { name: "Extension", value: stats.bySource.extension, color: "#4F46E5" },
    { name: "Mobile", value: stats.bySource.mobile, color: "#06B6D4" },
    { name: "Smart Pen", value: stats.bySource.smart_pen, color: "#F59E0B" },
    { name: "Web", value: stats.bySource.web, color: "#10B981" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Research Statistics</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-gray-500 text-sm">Total Items</span>
          <div className="text-3xl font-bold">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <span className="text-gray-500 text-sm">From Extension</span>
          <div className="text-3xl font-bold">{stats.bySource.extension}</div>
        </Card>
        <Card className="p-4">
          <span className="text-gray-500 text-sm">From Mobile</span>
          <div className="text-3xl font-bold">{stats.bySource.mobile}</div>
        </Card>
        <Card className="p-4">
          <span className="text-gray-500 text-sm">From Web</span>
          <div className="text-3xl font-bold">{stats.bySource.web}</div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Weekly Activity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weeklyData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                <YAxis stroke="#888888" fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Source Breakdown</h3>
          <div className="h-64">
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 text-sm mt-4">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: d.color }}
                      ></div>
                      <span>{d.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No data yet
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ============================================
// PART 10: SMART PEN GALLERY
// ============================================

const SmartPenGallery = () => {
  const [scans, setScans] = useState<StorageItem[]>([]);

  useEffect(() => {
    const loadScans = async () => {
      const items = await getAllItems();
      setScans(items.filter((item) => item.deviceSource === "smart_pen"));
    };
    loadScans();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Smart Pen Scans</h1>

      {scans.length === 0 ? (
        <div className="text-center py-12">
          <PenTool className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No scans yet
          </h3>
          <p className="text-gray-500">
            Connect your Smart Pen to start capturing handwritten notes
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {scans.map((scan) => (
            <Card
              key={scan.id}
              className="overflow-hidden group cursor-pointer"
            >
              <div className="aspect-[3/4] bg-gray-100 relative">
                {scan.imageUrl ? (
                  <img
                    src={scan.imageUrl}
                    alt="Scan"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PenTool className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="secondary" size="sm">
                    View OCR
                  </Button>
                </div>
              </div>
              <div className="p-3">
                <h4 className="font-semibold text-sm truncate">
                  {scan.sourceTitle || "Untitled Scan"}
                </h4>
                <p className="text-xs text-gray-500">
                  {new Date(scan.createdAt).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// PART 11: COLLECTIONS PAGE (FULL IMPLEMENTATION)
// ============================================

const CollectionsPage = () => {
  const [collections, setCollections] = useState<CollectionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] =
    useState<CollectionType | null>(null);
  const [viewingCollection, setViewingCollection] =
    useState<CollectionType | null>(null);
  const [collectionItems, setCollectionItems] = useState<StorageItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const { showToast, ToastComponent } = useToast();

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState("#4F46E5");

  // Fetch all collections
  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllCollections();
      setCollections(data);
    } catch (error) {
      console.error("Failed to fetch collections:", error);
      showToast("Failed to load collections", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Open create modal
  const handleOpenCreate = () => {
    setFormName("");
    setFormDescription("");
    setFormColor("#4F46E5");
    setIsCreateModalOpen(true);
  };

  // Create collection
  const handleCreate = async () => {
    if (!formName.trim()) {
      showToast("Please enter a collection name", "error");
      return;
    }

    try {
      const newCollection = await createCollection({
        name: formName,
        description: formDescription,
        color: formColor,
      });
      setCollections((prev) => [newCollection, ...prev]);
      setIsCreateModalOpen(false);
      showToast("Collection created!", "success");
    } catch (error) {
      console.error("Failed to create collection:", error);
      showToast("Failed to create collection", "error");
    }
  };

  // Open edit modal
  const handleOpenEdit = (collection: CollectionType) => {
    setSelectedCollection(collection);
    setFormName(collection.name);
    setFormDescription(collection.description);
    setFormColor(collection.color);
    setIsEditModalOpen(true);
  };

  // Update collection
  const handleUpdate = async () => {
    if (!selectedCollection || !formName.trim()) return;

    try {
      const updated = await updateCollection(selectedCollection.id, {
        name: formName,
        description: formDescription,
        color: formColor,
      });
      setCollections((prev) =>
        prev.map((c) =>
          c.id === updated.id ? { ...updated, itemCount: c.itemCount } : c
        )
      );
      setIsEditModalOpen(false);
      showToast("Collection updated!", "success");
    } catch (error) {
      console.error("Failed to update collection:", error);
      showToast("Failed to update collection", "error");
    }
  };

  // Delete collection
  const handleDelete = async (collection: CollectionType) => {
    if (
      !confirm(
        `Delete "${collection.name}"? Items will be moved out of this collection.`
      )
    )
      return;

    try {
      await deleteCollection(collection.id);
      setCollections((prev) => prev.filter((c) => c.id !== collection.id));
      showToast("Collection deleted", "success");
    } catch (error) {
      console.error("Failed to delete collection:", error);
      showToast("Failed to delete collection", "error");
    }
  };

  // View collection items
  const handleViewCollection = async (collection: CollectionType) => {
    setViewingCollection(collection);
    setLoadingItems(true);
    try {
      const items = await getItemsInCollection(collection.id);
      // Transform items to match StorageItem format
      const transformedItems: StorageItem[] = items.map((item) => ({
        id: item.id,
        text: item.text || "",
        tags: item.tags || [],
        note: item.note || "",
        sourceUrl: item.source_url || "",
        sourceTitle: item.source_title || "",
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        aiSummary: item.ai_summary || "",
        deviceSource: item.device_source || "web",
        collectionId: item.collection_id,
      }));
      setCollectionItems(transformedItems);
    } catch (error) {
      console.error("Failed to fetch collection items:", error);
      showToast("Failed to load items", "error");
    } finally {
      setLoadingItems(false);
    }
  };

  // Remove item from collection
  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItemFromCollection(itemId);
      setCollectionItems((prev) => prev.filter((item) => item.id !== itemId));
      // Update item count in collections list
      if (viewingCollection) {
        setCollections((prev) =>
          prev.map((c) =>
            c.id === viewingCollection.id
              ? { ...c, itemCount: (c.itemCount || 1) - 1 }
              : c
          )
        );
      }
      showToast("Item removed from collection", "success");
    } catch (error) {
      console.error("Failed to remove item:", error);
      showToast("Failed to remove item", "error");
    }
  };

  // Back to collections list
  const handleBackToList = () => {
    setViewingCollection(null);
    setCollectionItems([]);
  };

  // Get source icon
  const getSourceIcon = (source: string) => {
    switch (source) {
      case "extension":
        return <Laptop className="w-4 h-4" />;
      case "mobile":
        return <Smartphone className="w-4 h-4" />;
      case "smart_pen":
        return <PenTool className="w-4 h-4" />;
      case "web":
        return <Globe className="w-4 h-4" />;
      default:
        return <LayoutIcon className="w-4 h-4" />;
    }
  };

  // Viewing a specific collection
  if (viewingCollection) {
    return (
      <div>
        {ToastComponent}

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleBackToList}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Back to collections"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: viewingCollection.color }}
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {viewingCollection.name}
            </h1>
            {viewingCollection.description && (
              <p className="text-gray-500 text-sm">
                {viewingCollection.description}
              </p>
            )}
          </div>
          <Badge className="ml-2">{collectionItems.length} items</Badge>
        </div>

        {/* Items Grid */}
        {loadingItems ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : collectionItems.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No items in this collection
            </h3>
            <p className="text-gray-500">
              Add items from the Dashboard by clicking on an item and selecting
              this collection.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collectionItems.map((item) => (
              <Card key={item.id} className="p-4 group relative">
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="absolute top-2 right-2 p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                  title="Remove from collection"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex justify-between items-start mb-2">
                  <Badge className="capitalize flex items-center gap-1">
                    {getSourceIcon(item.deviceSource || "web")}
                    {(item.deviceSource || "web").replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-semibold mb-2 line-clamp-1">
                  {item.sourceTitle || "Untitled"}
                </h3>

                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                  {item.aiSummary || item.text}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Main collections list view
  return (
    <div>
      {ToastComponent}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Collections
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Organize your research into folders
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <FolderPlus className="w-4 h-4 mr-2" />
          New Collection
        </Button>
      </div>

      {/* Collections Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No collections yet
          </h3>
          <p className="text-gray-500 mb-4">
            Create your first collection to organize your research
          </p>
          <Button onClick={handleOpenCreate}>
            <FolderPlus className="w-4 h-4 mr-2" />
            Create Collection
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <Card
              key={collection.id}
              className="p-5 cursor-pointer hover:border-primary-400 transition-all hover:shadow-lg group relative"
              onClick={() => handleViewCollection(collection)}
            >
              {/* Action buttons */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(collection);
                  }}
                  className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(collection);
                  }}
                  className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg hover:bg-red-200"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>

              {/* Color indicator */}
              <div
                className="w-10 h-10 rounded-lg mb-4 flex items-center justify-center"
                style={{ backgroundColor: collection.color + "20" }}
              >
                <FolderOpen
                  className="w-5 h-5"
                  style={{ color: collection.color }}
                />
              </div>

              {/* Content */}
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                {collection.name}
              </h3>

              {collection.description && (
                <p className="text-gray-500 text-sm line-clamp-2 mb-3">
                  {collection.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-sm text-gray-500">
                  {collection.itemCount || 0} items
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(collection.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Collection"
      >
        <div className="space-y-4">
          <Input
            label="Collection Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g., AI Research, School Projects"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="What's this collection about?"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLLECTION_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setFormColor(color.value)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    formColor === color.value
                      ? "ring-2 ring-offset-2 ring-gray-400 scale-110"
                      : ""
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} className="flex-1">
              Create Collection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Collection"
      >
        <div className="space-y-4">
          <Input
            label="Collection Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g., AI Research, School Projects"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="What's this collection about?"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLLECTION_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setFormColor(color.value)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    formColor === color.value
                      ? "ring-2 ring-offset-2 ring-gray-400 scale-110"
                      : ""
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} className="flex-1">
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================
// PART 12: MAIN APP COMPONENT
// ============================================

// 1. Define a wrapper to protect routes
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    // Initial session check
    const initSession = async () => {
      try {
        // First, try to restore session from storage
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session restore error:", error);
        }

        // Handle "Keep me signed in" feature
        // sessionStorage clears when browser closes, localStorage persists
        // If user didn't want to stay signed in AND browser was closed (no session flag), sign out
        if (currentSession) {
          const shouldRemember = localStorage.getItem("researchmate_remember");
          const sessionActive = sessionStorage.getItem(
            "researchmate_session_active"
          );

          if (shouldRemember !== "true" && !sessionActive) {
            // Browser was closed and user didn't want to stay signed in
            console.log("Session expired (keep signed in was disabled)");
            await supabase.auth.signOut();
            if (mounted) {
              setSession(null);
              setInitialized(true);
              setLoading(false);
            }
            return;
          }

          // Mark session as active for this browser session
          sessionStorage.setItem("researchmate_session_active", "true");
        }

        if (mounted) {
          setSession(currentSession);
          setInitialized(true);
          setLoading(false);
        }
      } catch (err) {
        console.error("Session init error:", err);
        if (mounted) {
          setInitialized(true);
          setLoading(false);
        }
      }
    };

    initSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("Auth event:", event);

      if (mounted) {
        setSession(newSession);

        // When user signs in, mark session as active
        if (event === "SIGNED_IN" && newSession) {
          sessionStorage.setItem("researchmate_session_active", "true");
        }

        // When user signs out, clear session flag
        if (event === "SIGNED_OUT") {
          sessionStorage.removeItem("researchmate_session_active");
        }

        // Handle token refresh
        if (event === "TOKEN_REFRESHED") {
          console.log("Token refreshed successfully");
        }

        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Show loading only during initial load
  if (loading && !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading your session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    // Redirect to landing page if no session found, preserving the intended destination
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/"
            element={
              <MarketingLayout>
                <LandingPage />
              </MarketingLayout>
            }
          />
          <Route
            path="/products"
            element={
              <MarketingLayout>
                <ProductsPage />
              </MarketingLayout>
            }
          />
          <Route
            path="/team"
            element={
              <MarketingLayout>
                <TeamPage />
              </MarketingLayout>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Auth Callback Route */}
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Private Routes (Wrapped in RequireAuth) */}
          <Route
            path="/app/*"
            element={
              <RequireAuth>
                <DashboardLayout>
                  <Routes>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="collections" element={<CollectionsPage />} />
                    <Route path="ai-assistant" element={<AIAssistant />} />
                    <Route path="citations" element={<CitationGenerator />} />
                    <Route path="smart-pen" element={<SmartPenGallery />} />
                    <Route path="statistics" element={<Statistics />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Routes>
                </DashboardLayout>
              </RequireAuth>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}
