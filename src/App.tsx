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
import { MarketingLayout, DashboardLayout } from "./components/shared/Layouts";
import OfflineDetector from "./components/shared/OfflineDetector";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import { motion } from "motion/react";
import { CheckCircle2, Bell, X } from "lucide-react";

// App Pages (Authenticated)
import MarketingHome from "./components/marketing/MarketingHome";
import SettingsPage from "./components/App/SettingsPage";
import Dashboard from "./components/App/Dashboard";
import CollectionsPage from "./components/App/CollectionsPage";
// Ideally these would be in their own files too:
import CitationGenerator from "./components/App/CitationGenerator";

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
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Check if this is a popup window
      const isPopup = window.opener && window.opener !== window;

      if (session) {
        if (isPopup) {
          // Send message to parent window and close popup
          window.opener.postMessage(
            { type: "AUTH_SUCCESS", session },
            window.location.origin,
          );
          window.close();
        } else {
          navigate("/app/dashboard");
        }
      }
    };
    checkSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const isPopup = window.opener && window.opener !== window;

      if (event === "SIGNED_IN" || session) {
        if (isPopup) {
          window.opener.postMessage(
            { type: "AUTH_SUCCESS", session },
            window.location.origin,
          );
          window.close();
        } else {
          navigate("/app/dashboard");
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

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

        if (currentSession) {
          const shouldRemember = localStorage.getItem("researchmate_remember");
          const sessionActive = sessionStorage.getItem(
            "researchmate_session_active",
          );

          // Only force sign out if they explicitly did NOT want to be remembered
          // AND this is a brand new browser session.
          // Otherwise, we trust the valid Supabase session.
          if (shouldRemember !== "true" && !sessionActive) {
            await supabase.auth.signOut();
            if (mounted) {
              setSession(null);
              setLoading(false);
            }
            return;
          }

          // Mark this tab's session as active
          sessionStorage.setItem("researchmate_session_active", "true");
        }

        if (mounted) {
          setSession(currentSession);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) setLoading(false);
      }
    };
    initSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (mounted) {
        setSession(newSession);
        if (event === "SIGNED_IN" && newSession)
          sessionStorage.setItem("researchmate_session_active", "true");
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
  if (!session) return <Navigate to="/" state={{ from: location }} replace />;
  return <>{children}</>;
};

// ============================================
// PART 4: TEMPORARY PLACEHOLDERS
// ============================================
// NOTE: Please move LandingPage, LoginPage, SignupPage, AIAssistant, etc.
// to their own files in /src/components/ just like I did for Dashboard.tsx.
// For now, I assume you have them or will paste the old code back here if you don't move them.
// For the code to compile, you must either create the files or uncomment your old code here.
import LoginPage from "./components/auth/LoginPage";
import SignupPage from "./components/auth/SignupPage";
import AIAssistant from "./components/App/AIAssistant";
import Statistics from "./components/App/Statistics";
import SmartPenGallery from "./components/App/SmartPenGallery";
import PairSmartPen from "./components/App/PairSmartPen";
import SupportPage from "./components/marketing/SupportPage";

// ============================================
// PART 5: MAIN APP COMPONENT
// ============================================

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
                        <Route path="smart-pen" element={<SmartPenGallery />} />
                        <Route path="pair-pen" element={<PairSmartPen />} />
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
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
