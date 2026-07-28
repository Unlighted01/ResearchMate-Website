// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { supabase } from "./services/supabaseClient";

// Context
import { ThemeProvider } from "./context/ThemeContext";
import { NotificationProvider } from "./context/NotificationContext";

// Components & Layouts
import { MarketingLayout } from "./components/shared/MarketingLayout";
import { DashboardLayout } from "./components/shared/DashboardLayout";
import OfflineDetector from "./components/shared/OfflineDetector";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import { motion } from "motion/react";
import { CheckCircle2, Bell, X } from "lucide-react";


// App Pages (Authenticated)
import MarketingHome from "./components/marketing/MarketingHome";
import SettingsPage from "./components/App/Settings";
import Dashboard from "./components/App/Dashboard";
import CollectionsPage from "./components/App/CollectionsPage";
import { CitationGenerator } from "./components/App/Citations";

// ============================================
// PART 2: TOAST NOTIFICATION COMPONENT
// ============================================

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = 3000;
    const interval = 30;
    const decrement = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - decrement;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onClose]);

  const config = {
    success: {
      bg: "bg-gradient-to-r from-green-500 to-emerald-600",
      icon: <CheckCircle2 className="w-5 h-5" />,
      progressColor: "bg-white/30",
    },
    error: {
      bg: "bg-gradient-to-r from-red-500 to-rose-600",
      icon: <span className="text-lg">⚠️</span>,
      progressColor: "bg-white/30",
    },
    info: {
      bg: "bg-gradient-to-r from-blue-500 to-indigo-600",
      icon: <Bell className="w-5 h-5" />,
      progressColor: "bg-white/30",
    },
  }[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed bottom-4 right-4 ${config.bg} text-white px-5 py-3 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[280px]`}
    >
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
        >
          {config.icon}
        </motion.div>
        <span className="font-medium text-sm">{message}</span>
        <button
          onClick={onClose}
          className="ml-auto p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Close toast"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
        <motion.div
          className={config.progressColor}
          initial={{ width: "100%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.03, ease: "linear" }}
          style={{ height: "100%" }}
        />
      </div>
    </motion.div>
  );
};

export const useToast = () => {
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

  // Memoize Toast component - only recalculate when toast changes
  const ToastComponent = useMemo(() => {
    return toast ? (
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(null)}
      />
    ) : null;
  }, [toast]);

  return { showToast, ToastComponent };
};

// ============================================
// PART 3: AUTH WRAPPER & CALLBACK
// ============================================

const AuthCallback = () => {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let handled = false;
    const isPopup = !!(window.opener && window.opener !== window);

    const handleSuccess = (session: any) => {
      if (handled) return;
      handled = true;
      sessionStorage.setItem("researchmate_session_active", "true");
      localStorage.setItem("researchmate_remember", "true");

      // Clean search query parameters (e.g., ?code=...) from URL
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
      }

      if (isPopup) {
        try {
          window.opener.postMessage(
            { type: "AUTH_SUCCESS", session },
            window.location.origin
          );
        } catch (_) {}
        window.close();
      } else {
        navigate("/app/dashboard", { replace: true });
      }
    };

    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (session) {
          handleSuccess(session);
        } else if (error) {
          console.error("Auth session error:", error.message);
          setErrorMsg(error.message);
        }
      } catch (e: any) {
        console.error("Auth exception:", e);
        setErrorMsg(e?.message || "Authentication error occurred.");
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        handleSuccess(session);
      }
    });

    // 3-second safety fallback: if no session, clean URL and navigate to login
    const timeout = setTimeout(() => {
      if (!handled) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            handleSuccess(session);
          } else {
            if (window.location.search) {
              window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
            }
            navigate("/login", { replace: true });
          }
        });
      }
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="text-center max-w-sm p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            !
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Sign In Issue
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            {errorMsg}
          </p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="w-full py-2.5 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">
          Completing sign in...
        </p>
      </div>
    </div>
  );
};

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    const initSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (currentSession && mounted) {
          sessionStorage.setItem("researchmate_session_active", "true");
          setSession(currentSession);
        }
      } catch (err) {
        console.error("RequireAuth session init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (mounted) {
        setSession(newSession);
        if (newSession) {
          sessionStorage.setItem("researchmate_session_active", "true");
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );

  const isGuest = localStorage.getItem("rm_guest_mode") === "true";
  if (!session && !isGuest) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
};

// ============================================
// PART 4: TEMPORARY PLACEHOLDERS
// ============================================
import LoginPage from "./components/auth/LoginPage";
import SignupPage from "./components/auth/SignupPage";
import AIAssistant from "./components/App/AIAssistant";
import Statistics from "./components/App/Statistics";
import SmartPenGallery from "./components/App/SmartPenGallery";
import PairSmartPen from "./components/App/PairSmartPen";
import DocumentEditor from "./components/App/DocumentEditor";
import { DiscoverPage } from "./components/App/Discover";
import PdfReader from "./components/App/PdfReader";
import FeedsPage from "./components/App/Feeds";
import TranscribePage from "./components/App/Transcribe";
import SupportPage from "./components/marketing/SupportPage";
import KnowledgeGraphPage from "./components/App/KnowledgeGraph/KnowledgeGraphPage";

export default function App() {
  const { showToast, ToastComponent } = useToast();

  return (
    <ErrorBoundary>
      <ThemeProvider>
        {ToastComponent}
        <OfflineDetector />
        <NotificationProvider>
          <HashRouter>
            <Routes>
              {/* Public Routes - Single Page Marketing */}
              <Route
                path="/"
                element={
                  <MarketingLayout>
                    <MarketingHome />
                  </MarketingLayout>
                }
              />
              {/* Redirects for old routes */}
              <Route
                path="/products"
                element={<Navigate to="/#products" replace />}
              />
              <Route path="/team" element={<Navigate to="/#team" replace />} />
              <Route path="/support" element={<SupportPage />} />

              <Route
                path="/login"
                element={
                  <LoginPage useToast={() => ({ showToast, ToastComponent })} />
                }
              />
              <Route
                path="/signup"
                element={
                  <SignupPage
                    useToast={() => ({ showToast, ToastComponent })}
                  />
                }
              />
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Private Routes */}
              <Route
                path="/app/*"
                element={
                  <RequireAuth>
                    <DashboardLayout>
                      <Routes>
                        <Route
                          path="dashboard"
                          element={
                            <Dashboard
                              useToast={() => ({ showToast, ToastComponent })}
                            />
                          }
                        />
                        <Route
                          path="discover"
                          element={
                            <DiscoverPage
                              useToast={() => ({ showToast, ToastComponent })}
                            />
                          }
                        />
                        <Route
                          path="collections"
                          element={
                            <CollectionsPage
                              useToast={() => ({ showToast, ToastComponent })}
                            />
                          }
                        />
                        <Route
                          path="ai-assistant"
                          element={
                            <AIAssistant
                              useToast={() => ({ showToast, ToastComponent })}
                            />
                          }
                        />
                        <Route
                          path="citations"
                          element={<CitationGenerator />}
                        />
                        <Route
                          path="editor"
                          element={<DocumentEditor />}
                        />
                        <Route
                          path="pdf-reader"
                          element={<PdfReader />}
                        />
                        <Route path="feeds" element={<FeedsPage />} />
                        <Route path="transcribe" element={<TranscribePage />} />
                        <Route
                          path="smart-pen"
                          element={
                            <SmartPenGallery
                              useToast={() => ({ showToast, ToastComponent })}
                            />
                          }
                        />
                        <Route path="pair-pen" element={<PairSmartPen />} />
                        <Route path="statistics" element={<Statistics />} />
                        <Route path="graph" element={<KnowledgeGraphPage />} />
                        <Route
                          path="settings"
                          element={
                            <SettingsPage />
                          }
                        />
                      </Routes>
                    </DashboardLayout>
                  </RequireAuth>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
