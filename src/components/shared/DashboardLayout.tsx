// ============================================
// DashboardLayout.tsx - Apple-style dashboard layout
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationContext";
import CommandPalette from "./CommandPalette";
import ClockWidget from "./ClockWidget";
import { motion, AnimatePresence } from "motion/react";
import {
  Table2,
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  PenTool,
  Calculator,
  Settings,
  LogOut,
  Menu,
  Bell,
  User,
  Search,
  Laptop,
  Smartphone,
  Quote,
  FileEdit,
  FileText,
  ChevronLeft,
  BookOpen,
  Timer,
  Sliders,
  GraduationCap,
  BrainCircuit,
} from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { getAllItems, subscribeToItems } from "../../services/storageService";

// ============================================
// PART 2: CONSTANTS
// ============================================

// Grouped sidebar nav matching the core workstations:
// Dashboard, Document Studio, Study & Review, AI Assistant (Settings is pinned to bottom nav)
const NAV_GROUPS: {
  label: string;
  items: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    path: string;
    badge?: string;
  }[];
}[] = [
  {
    label: "Main Navigation",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/app/dashboard" },
      { icon: FileText, label: "Document Studio", path: "/app/research" },
      { icon: BrainCircuit, label: "Study & Review", path: "/app/review", badge: "AI" },
      { icon: MessageSquare, label: "AI Assistant", path: "/app/assistant" },
    ],
  },
];

// Flat list for legacy usages (profile dropdown quick-links etc).
const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

// ============================================
// PART 3: HELPER FUNCTIONS
// ============================================

const getActivityIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    sync: <Laptop className="w-4 h-4 text-[#34C759]" />,
    summary: <MessageSquare className="w-4 h-4 text-[#007AFF]" />,
    collection: <FolderOpen className="w-4 h-4 text-[#AF52DE]" />,
    citation: <Quote className="w-4 h-4 text-[#FF9500]" />,
    login: <User className="w-4 h-4 text-[#8E8E93]" />,
  };
  return icons[type] || <Bell className="w-4 h-4" />;
};

const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// ============================================
// PART 4: COMPONENT
// ============================================

interface DashboardLayoutProps {
  children: React.ReactNode;
  useToast?: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
  };
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  useToast,
}) => {
  const { showToast } = useToast ? useToast() : { showToast: undefined };
  const { visualTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showClockWidget, setShowClockWidget] = useState(
    () => localStorage.getItem("showClockWidget") !== "false",
  );
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const {
    notifications: activities,
    unreadCount,
    markAllAsRead,
    addNotification,
  } = useNotifications();

  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isCollapsed = sidebarCollapsed && !isMobile;
  const isBubbleTheme = false;
  const isGlassTheme = visualTheme === "glass";

  // ---------- PART 4A: EFFECTS ----------

  // Load user and sidebar state and generate AI suggestion
  useEffect(() => {
    const isGuest = localStorage.getItem("rm_guest_mode") === "true";
    
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user && !isGuest) {
        navigate("/");
      } else {
        setUser(data.user);
        if (data.user) {
          addNotification(
            "login",
            `Welcome back, ${data.user.email?.split("@")[0] || "researcher"}!`,
          );
          
          // Generate AI recommendation/suggestion based on saved items
          getAllItems(50).then((items) => {
            if (items && items.length > 0) {
              const itemWithoutSummary = items.find((item) => !item.aiSummary);
              if (itemWithoutSummary) {
                addNotification(
                  "info",
                  `💡 AI Recommendation: Try summarizing "${itemWithoutSummary.sourceTitle || "Untitled"}" to extract key insights.`,
                );
              } else {
                const randomItem = items[Math.floor(Math.random() * items.length)];
                addNotification(
                  "info",
                  `💡 AI Tip: Use the Editor to draft a report referencing "${randomItem.sourceTitle || "Untitled"}".`,
                );
              }
            } else {
              addNotification(
                "info",
                "💡 Get Started: Save a webpage or upload a PDF to build your library!",
              );
            }
          }).catch(() => {});
        }
      }
    });

    const savedState = localStorage.getItem("researchmate_sidebar_collapsed");
    if (savedState === "true") {
      setSidebarCollapsed(true);
    }
  }, [navigate, addNotification]);

  // Global Realtime Activity Notifications Listener
  useEffect(() => {
    let unsubscribeItems: (() => void) | null = null;
    let syncChannel: any = null;

    const setupGlobalRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      // 1. Listen to item creations
      unsubscribeItems = subscribeToItems(userId, (payload) => {
        if (payload.eventType === "INSERT" && payload.new) {
          const device = payload.new.deviceSource || "web";
          let message = `New item "${payload.new.sourceTitle || "Untitled"}" saved to library.`;
          
          if (device === "extension") {
            message = `New paper ingested: "${payload.new.sourceTitle || "Untitled"}"`;
          } else if (device === "mobile_scanner" || device === "mobile") {
            message = `New document scanned and saved via Mobile Sync: "${payload.new.sourceTitle || "Untitled"}"`;
          } else if (device === "tablet_sync") {
            message = `New tablet sync note saved: "${payload.new.sourceTitle || "Untitled"}"`;
          }
          
          addNotification("sync", message);
          if (showToast) showToast("New item synced!", "success");
        }
      });

      // 2. Listen to mobile connection & scans
      const channel = supabase.channel(`user-sync:${userId}`);
      channel
        .on("broadcast", { event: "mobile-connected" }, () => {
          addNotification("sync", "Mobile scanner connected successfully.");
          if (showToast) showToast("Mobile scanner connected!", "success");
        })
        .on("broadcast", { event: "new-scan" }, () => {
          addNotification("sync", "New scan synced from mobile device.");
          if (showToast) showToast("New note synced from mobile!", "success");
        })
        .subscribe();
      
      syncChannel = channel;
    };

    setupGlobalRealtime();

    return () => {
      if (unsubscribeItems) unsubscribeItems();
      if (syncChannel) supabase.removeChannel(syncChannel);
    };
  }, [addNotification, showToast]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest(".notifications-dropdown") &&
        !target.closest(".notifications-trigger")
      ) {
        setNotificationsOpen(false);
      }
      if (
        !target.closest(".profile-dropdown") &&
        !target.closest(".profile-trigger")
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cmd+K keyboard shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Listen for clock widget toggle from settings
  useEffect(() => {
    const handleClockToggle = () => {
      setShowClockWidget(localStorage.getItem("showClockWidget") !== "false");
    };
    window.addEventListener("clockWidgetToggle", handleClockToggle);
    return () =>
      window.removeEventListener("clockWidgetToggle", handleClockToggle);
  }, []);

  // ---------- PART 4B: HANDLERS ----------

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("rm_guest_mode");
    navigate("/");
  };

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("researchmate_sidebar_collapsed", String(newState));
  };

  // ---------- PART 4C: RENDER ----------

  return (
    <div className="min-h-screen flex font-sans relative overflow-hidden bg-[#FAFBFD] dark:bg-slate-950 text-slate-900 dark:text-slate-100 theme-page theme-dashboard">
      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ========== SIDEBAR ========== */}
      <motion.aside
        animate={{
          width: isCollapsed ? 76 : 260
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`
          fixed top-3 bottom-3 left-3 z-30
          overflow-hidden
          rounded-2xl border border-slate-200/80 dark:border-slate-800
          bg-white dark:bg-slate-950 shadow-xs
          transition-transform duration-300 ease-in-out
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-[calc(100%+2rem)]"}
          lg:translate-x-0
        `}
      >
        <div className="h-full flex flex-col">
          {/* Header: Logo */}
          <div
            className={`h-14 flex items-center border-b border-slate-100 dark:border-slate-800/80 ${
              isCollapsed ? "justify-center px-2" : "px-4"
            }`}
          >
            <Link
              to="/app/dashboard"
              className={`flex items-center gap-2.5 ${
                isCollapsed ? "justify-center" : ""
              }`}
            >
              <img
                src="/logo.svg"
                alt="Logo"
                className="w-7 h-7 shrink-0"
              />
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-baseline gap-2 overflow-hidden whitespace-nowrap"
                  >
                    <span className="font-title text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                      ResearchMate
                    </span>
                    <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200/40 dark:border-indigo-800/40">
                      STUDIO
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
          </div>

          {/* Navigation */}
          <nav
            className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2.5 space-y-3"
            aria-label="Primary"
          >
            {NAV_GROUPS.map((group, groupIdx) => (
              <div key={group.label} className={groupIdx === 0 ? "" : "pt-1"}>
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1 mb-1 whitespace-nowrap"
                    >
                      {group.label}
                    </motion.div>
                  )}
                </AnimatePresence>
                {isCollapsed && groupIdx > 0 && (
                  <div className="mx-2 my-2 h-px border-t border-slate-100 dark:border-slate-800" />
                )}
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          onClick={() => setMobileSidebarOpen(false)}
                          className={`
                            flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium
                            transition-colors duration-150 relative group
                            ${
                              isActive
                                ? "bg-slate-100 dark:bg-slate-800/80 text-slate-950 dark:text-slate-50 font-semibold"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/60"
                            }
                            ${isCollapsed ? "justify-center px-2" : ""}
                          `}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-indigo-600 dark:bg-indigo-400 rounded-r-full" />
                          )}
                          <item.icon
                            className={`w-4 h-4 flex-shrink-0 transition-colors ${
                              isActive
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                            }`}
                          />
                          {!isCollapsed && (
                            <div className="flex-1 flex items-center justify-between min-w-0">
                              <span className="truncate">{item.label}</span>
                              {item.badge && (
                                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Tooltip */}
                          {isCollapsed && (
                            <div className="absolute left-full ml-2 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-900 text-white shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none whitespace-nowrap z-50">
                              {item.label}
                            </div>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {/* Divider */}
            <div className="theme-divider my-2 h-px border-t" />

            {/* Bottom Nav */}
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setCommandPaletteOpen(true)}
                  className={`
                    theme-sidebar-item theme-hover-surface
                    flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                    transition-all duration-200 group relative
                    ${isCollapsed ? "justify-center" : ""}
                  `}
                >
                  <Search className="theme-nav-icon w-5 h-5 flex-shrink-0" />
                  <AnimatePresence mode="wait">
                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className="flex-1 flex justify-between items-center min-w-0 whitespace-nowrap"
                      >
                        <span className="text-sm font-medium theme-muted-text">
                          Search
                        </span>
                        <kbd className="theme-kbd px-1.5 py-0.5 rounded text-[10px]">
                          ⌘K
                        </kbd>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {isCollapsed && (
                    <div className="theme-tooltip absolute left-full ml-3 px-3 py-1.5 text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-x-1 group-hover:scale-100 scale-95 origin-left transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] pointer-events-none whitespace-nowrap z-50">
                      Search (⌘K)
                    </div>
                  )}
                </button>
              </li>
              <li>
                <Link
                  to="/app/settings"
                  onClick={() => setMobileSidebarOpen(false)}
                  style={location.pathname === "/app/settings" ? { background: "transparent", boxShadow: "none" } : undefined}
                  className={`
                    theme-sidebar-item
                    flex items-center gap-3 px-3 py-2.5 rounded-xl
                    transition-all duration-200 group relative
                    ${
                      location.pathname === "/app/settings"
                        ? "theme-sidebar-item-active text-cyan-600 dark:text-cyan-400 font-semibold"
                        : "theme-hover-surface text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }
                    ${isCollapsed ? "justify-center" : ""}
                  `}
                >
                  {location.pathname === "/app/settings" && (
                    <motion.div
                      layoutId="activeSidebarNavIndicator"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                      className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-violet-500/10 dark:from-cyan-500/15 dark:via-indigo-500/10 dark:to-violet-500/15 rounded-xl border border-cyan-500/20 dark:border-cyan-400/30 shadow-[0_0_15px_rgba(6,182,212,0.12)] z-0 animate-pulse-soft"
                    />
                  )}
                  <Settings className={`w-5 h-5 flex-shrink-0 relative z-10 transition-colors duration-300 ${location.pathname === "/app/settings" ? "text-cyan-500 dark:text-cyan-400" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"}`} />
                  <AnimatePresence mode="wait">
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className={`text-sm font-medium whitespace-nowrap relative z-10 ${
                          location.pathname === "/app/settings"
                            ? ""
                            : "theme-muted-text"
                        }`}
                      >
                        Settings
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {isCollapsed && (
                    <div className="theme-tooltip absolute left-full ml-3 px-3 py-1.5 text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-x-1 group-hover:scale-100 scale-95 origin-left transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] pointer-events-none whitespace-nowrap z-50">
                      Settings
                    </div>
                  )}
                </Link>
              </li>
            </ul>

            {/* Pipeline Status (only when expanded) */}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="mt-3 mb-1 mx-1 overflow-hidden"
                >
                  <div className="rounded-xl p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Workstation Sync
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-sans">
                      <span className="flex items-center gap-1.5">
                        <Laptop className="w-3.5 h-3.5 text-slate-400" />
                        Desktop Workstation
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">Ready</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </nav>

          {/* Collapse Toggle */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={toggleSidebar}
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              className={`
                hidden lg:flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium
                text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/60
                transition-colors
                ${sidebarCollapsed ? "justify-center" : ""}
              `}
            >
              <ChevronLeft
                className={`w-4 h-4 transition-transform duration-200 ${
                  sidebarCollapsed ? "rotate-180" : ""
                }`}
              />
              {!sidebarCollapsed && (
                <span className="text-xs">Collapse Sidebar</span>
              )}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* ========== MAIN CONTENT ========== */}
      <div
        className={`
          flex-1 flex flex-col min-h-screen min-w-0
          transition-all duration-300
          ${sidebarCollapsed ? "lg:ml-[108px]" : "lg:ml-[292px]"}
          p-3 sm:p-4 lg:p-6
        `}
      >
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/85 dark:bg-[#0d1017]/85 backdrop-blur-md rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs mb-3 sm:mb-4 lg:mb-6">
          <div className="h-13 sm:h-14 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-3 sm:gap-4">
            {/* Left: Mobile Menu + Search */}
            <div className="flex items-center gap-4 flex-1">
              <button
                className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Search - Hide on Dashboard to avoid duplication */}
              {location.pathname !== "/app/dashboard" && (
                <div
                  className={`
                  relative flex-1 max-w-md transition-all duration-300
                  ${searchFocused ? "max-w-lg" : ""}
                `}
                >
                  <Search className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search library, notes, matrices..."
                    className="w-full pl-10 pr-12 py-2 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                  />
                  <div className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs">
                    <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500">
                      ⌘K
                    </kbd>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {/* Real-time Sync activity badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-medium select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="hidden sm:inline">SYNCED</span>
              </div>

              {/* Restrained Action Bar (Timer + Notifications + Profile) */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
                {/* Clock & Pomodoro Quick Toggle */}
                <button
                  onClick={() => {
                    const nextState = !(localStorage.getItem("showClockWidget") !== "false");
                    setShowClockWidget(nextState);
                    localStorage.setItem("showClockWidget", String(nextState));
                    window.dispatchEvent(new Event("clockWidgetToggle"));
                    if (showToast) {
                      showToast(
                        nextState ? "Workstation timer displayed" : "Workstation timer hidden",
                        "info",
                      );
                    }
                  }}
                  aria-label="Toggle Clock & Pomodoro Widget"
                  title={showClockWidget ? "Hide Workstation Timer" : "Show Workstation Timer"}
                  className={`p-2 rounded-md transition-colors relative flex items-center justify-center ${
                    showClockWidget
                      ? "text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Timer className="w-4 h-4" />
                </button>

                {/* Notifications */}
                <div className="relative flex items-center justify-center">
                  <button
                    onClick={() => {
                      setNotificationsOpen(!notificationsOpen);
                      setProfileOpen(false);
                    }}
                    aria-label="Notifications"
                    className="notifications-trigger p-2 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors relative flex items-center justify-center"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  <AnimatePresence>
                    {notificationsOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.15 }}
                        className="notifications-dropdown absolute right-[-50px] sm:right-0 top-full mt-2 w-80 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden z-30"
                      >
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/50">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 font-title text-sm">
                            Activity & Updates
                          </h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900">
                          {activities.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                              <Bell className="w-6 h-6 text-slate-400 mx-auto mb-2 opacity-50" />
                              <p className="text-xs text-slate-500">
                                No recent activity
                              </p>
                            </div>
                          ) : (
                            activities.map((activity) => (
                              <div
                                key={activity.id}
                                className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors ${
                                  !activity.read ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                                }`}
                              >
                                <div className="flex gap-3 items-start">
                                  <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-600 dark:text-slate-400 mt-0.5">
                                    {getActivityIcon(activity.type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                                      {activity.message}
                                    </p>
                                    <p className="text-[10px] font-mono text-slate-400 mt-1">
                                      {formatTimeAgo(activity.time)}
                                    </p>
                                  </div>
                                  {!activity.read && (
                                    <div className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full flex-shrink-0 mt-1.5" />
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 self-center mx-0.5" />

                {/* Profile */}
                <div className="relative flex items-center justify-center">
                  <button
                    onClick={() => {
                      setProfileOpen(!profileOpen);
                      setNotificationsOpen(false);
                    }}
                    aria-label="User profile menu"
                    className="profile-trigger flex items-center gap-2 p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-md bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center text-xs font-semibold overflow-hidden">
                      {user?.identities?.[0]?.identity_data?.avatar_url ? (
                        <img
                          src={user.identities[0].identity_data.avatar_url}
                          alt="User"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        user?.email?.charAt(0).toUpperCase() || (
                          <User className="w-3 h-3" />
                        )
                      )}
                    </div>
                  </button>

                  {/* Profile Dropdown */}
                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.15 }}
                        className="profile-dropdown absolute right-0 top-full mt-2 w-64 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden z-30"
                      >
                        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
                          {localStorage.getItem("rm_guest_mode") === "true" ? (
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-md bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center text-sm font-semibold font-mono">
                                  G
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                    Guest Workstation
                                  </p>
                                  <p className="text-[10px] font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                    Ephemeral Session
                                  </p>
                                </div>
                              </div>
                              <Link
                                to="/signup"
                                className="block w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium text-center rounded-lg transition-colors shadow-xs"
                              >
                                Create Free Account
                              </Link>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-md bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
                                {user?.identities?.[0]?.identity_data?.avatar_url ? (
                                  <img
                                    src={user.identities[0].identity_data.avatar_url}
                                    alt={user.email}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  user?.email?.charAt(0).toUpperCase() || "U"
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                                  {user?.email}
                                </p>
                                <span className="inline-block mt-0.5 text-[10px] font-mono font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-900">
                                  Academic Tier
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-1.5 space-y-0.5">
                          {NAV_ITEMS.map((item) => (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                            >
                              <item.icon className="w-3.5 h-3.5 text-slate-400" />
                              <span>{item.label}</span>
                            </Link>
                          ))}
                        </div>
                        <div className="p-1.5 border-t border-slate-200 dark:border-slate-800 space-y-0.5">
                          <Link
                            to="/app/settings"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                          >
                            <Settings className="w-3.5 h-3.5 text-slate-400" />
                            <span>Settings</span>
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors w-full"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full">
          <div key={location.pathname} className="page-transition-enter h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Clock Widget */}
      <ClockWidget
        isVisible={showClockWidget}
        onClose={() => {
          setShowClockWidget(false);
          localStorage.setItem("showClockWidget", "false");
        }}
      />

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="theme-overlay fixed inset-0 z-20 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
