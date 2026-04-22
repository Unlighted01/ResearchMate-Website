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

  const isGuest = localStorage.getItem("rm_guest_mode") === "true";
  if (!session && !isGuest) return <Navigate to="/" state={{ from: location }} replace />;
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
import DocumentEditor from "./components/App/DocumentEditor";
import { DiscoverPage } from "./components/App/Discover";
import PdfReader from "./components/App/PdfReader";
import FeedsPage from "./components/App/Feeds";
import TranscribePage from "./components/App/Transcribe";
import SupportPage from "./components/marketing/SupportPage";
import KnowledgeGraphPage from "./components/App/KnowledgeGraph/KnowledgeGraphPage";

// ============================================
// PART 5: MAIN APP COMPONENT
// ============================================

// Handles OAuth popup flow regardless of which HashRouter route matched.
// Google strips the hash fragment from redirect URIs, so the popup often
// lands on "/" (MarketingHome) instead of "/auth/callback". This component
// detects the OAuth `code` param in the URL and the `window.opener` to
// close the popup correctly after Supabase exchanges the code.
const OAuthPopupHandler: React.FC = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const isPopup = !!(window.opener && window.opener !== window);

    if (!code || !isPopup) return;

    // Show a minimal loading UI in the popup
    document.body.innerHTML = `
      <div style="
        min-height:100vh;display:flex;align-items:center;
        justify-content:center;font-family:system-ui,sans-serif;
        background:#000;color:#fff;flex-direction:column;gap:16px
      ">
        <div style="width:40px;height:40px;border:3px solid #333;
          border-top-color:#22d3ee;border-radius:50%;
          animation:spin 0.8s linear infinite"></div>
        <p style="color:#94a3b8;font-size:14px">Completing sign in...</p>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
      </div>`;

    // Wait for Supabase to exchange the code and fire SIGNED_IN
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
          subscription.unsubscribe();
          try {
            window.opener.postMessage(
              { type: "AUTH_SUCCESS", session },
              window.location.origin
            );
          } catch (_) {
            // opener may have navigated away — that's okay
          }
          window.close();
        }
      }
    );

    // Fallback: if session is already established (race condition)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        try {
          window.opener.postMessage(
            { type: "AUTH_SUCCESS", session },
            window.location.origin
          );
        } catch (_) {}
        window.close();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
};

export default function App() {
  const { showToast, ToastComponent } = useToast();

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <OAuthPopupHandler />
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
