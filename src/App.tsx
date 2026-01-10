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

// Components & Layouts
import { MarketingLayout, DashboardLayout } from "./components/shared/Layouts";
import OfflineDetector from "./components/shared/OfflineDetector";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import { CheckCircle2, Bell } from "lucide-react";

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
      {type === "error" && <span>⚠️</span>}
      {type === "info" && <Bell className="w-5 h-5" />}
      {message}
    </div>
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
    []
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
      if (session) navigate("/app/dashboard");
    };
    checkSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || session) navigate("/app/dashboard");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
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
            "researchmate_session_active"
          );
          if (shouldRemember !== "true" && !sessionActive) {
            await supabase.auth.signOut();
            if (mounted) {
              setSession(null);
              setLoading(false);
            }
            return;
          }
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
                <SignupPage useToast={() => ({ showToast, ToastComponent })} />
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
                      <Route path="citations" element={<CitationGenerator />} />
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
      </ThemeProvider>
    </ErrorBoundary>
  );
}
