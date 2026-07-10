// ============================================
// DashboardLayout.tsx - Apple-style dashboard layout
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import BubbleBackground from "../shared/BubbleBackground";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationContext";
import CommandPalette from "./CommandPalette";
import ClockWidget from "./ClockWidget";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  PenTool,
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
  ChevronLeft,
  BookOpen,
} from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { getAllItems, subscribeToItems } from "../../services/storageService";

// ============================================
// PART 2: CONSTANTS
// ============================================

// Grouped sidebar nav. Flat list is derived below for legacy consumers.
const NAV_GROUPS: {
  label: string;
  items: { icon: React.ComponentType<{ className?: string }>; label: string; path: string }[];
}[] = [
  {
    label: "Library",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/app/dashboard" },
      { icon: FolderOpen, label: "Collections", path: "/app/collections" },
    ],
  },
  {
    label: "Reading & Capture",
    items: [
      { icon: BookOpen, label: "PDF Reader", path: "/app/pdf-reader" },
      { icon: PenTool, label: "Sync & Scanner", path: "/app/smart-pen" },
    ],
  },
  {
    label: "Write & Assist",
    items: [
      { icon: FileEdit, label: "Editor", path: "/app/editor" },
      { icon: Quote, label: "Citations", path: "/app/citations" },
      { icon: MessageSquare, label: "AI Assistant", path: "/app/ai-assistant" },
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
    () => localStorage.getItem("showClockWidget") === "true",
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
  const isBubbleTheme = visualTheme === "bubble";
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
            message = `Copied text saved via Chrome Extension: "${payload.new.sourceTitle || "Untitled"}"`;
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
      setShowClockWidget(localStorage.getItem("showClockWidget") === "true");
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
    <div
      className={`min-h-screen flex font-sans relative overflow-hidden ${
        isGlassTheme
          ? "bg-gradient-to-br from-slate-100 via-sky-50 to-blue-100 dark:from-[#020617] dark:via-[#0f172a] dark:to-[#111827]"
          : "bg-[#F5F5F7] dark:bg-[#000000]"
      } theme-page theme-dashboard`}
    >
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <BubbleBackground bubbleCount={3} enabled={isBubbleTheme} />
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* ========== SIDEBAR ========== */}
      <motion.aside
        animate={{
          width: sidebarCollapsed ? 76 : 260
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`
          theme-sidebar
          fixed top-4 bottom-4 left-4 z-30
          backdrop-blur-2xl backdrop-saturate-200
          overflow-hidden
          rounded-3xl shadow-xl border border-white/10 dark:border-white/[0.06]
          bg-[var(--glass-bg)]
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="h-full flex flex-col">
          {/* Header: Logo */}
          <div
            className={`theme-divider h-14 flex items-center border-b border-white/5 dark:border-white/[0.06] ${
              sidebarCollapsed ? "justify-center px-2" : "px-5"
            }`}
          >
            <Link
              to="/app/dashboard"
              className={`flex items-center gap-3 ${
                sidebarCollapsed ? "justify-center" : ""
              }`}
            >
              <img
                src="/logo.svg"
                alt="Logo"
                className="w-8 h-8 hover:scale-105 transition-transform"
              />
              <AnimatePresence mode="wait">
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="theme-title font-title text-base font-semibold whitespace-nowrap overflow-hidden tracking-tight text-[var(--text-primary)]"
                  >
                    ResearchMate
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </div>

          {/* Navigation */}
          <nav
            className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-3"
            aria-label="Primary"
          >
            {NAV_GROUPS.map((group, groupIdx) => (
              <div
                key={group.label}
                className={groupIdx === 0 ? "" : "mt-2"}
              >
                <AnimatePresence mode="wait">
                  {!sidebarCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="theme-sidebar-section-label font-title font-bold text-xs uppercase tracking-wider text-[var(--text-muted)] opacity-80 px-4 py-2 mt-4 whitespace-nowrap"
                    >
                      {group.label}
                    </motion.div>
                  )}
                </AnimatePresence>
                {sidebarCollapsed && groupIdx > 0 && (
                  <div className="theme-divider mx-2 my-2 h-px border-t border-white/5 dark:border-white/[0.06]" />
                )}
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          onClick={() => setMobileSidebarOpen(false)}
                          style={isActive ? { background: "transparent", boxShadow: "none" } : undefined}
                          className={`
                            theme-sidebar-item
                            flex items-center gap-3 px-3 py-2 rounded-xl
                            transition-all duration-300 group relative
                            hover:scale-[1.02] active:scale-[0.98]
                            ${
                              isActive
                                ? "theme-sidebar-item-active text-cyan-600 dark:text-cyan-400 font-semibold"
                                : "theme-hover-surface text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            }
                            ${sidebarCollapsed ? "justify-center" : ""}
                          `}
                        >
                          {isActive && (
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
                          <item.icon className={`w-5 h-5 flex-shrink-0 relative z-10 transition-colors duration-300 ${isActive ? "text-cyan-500 dark:text-cyan-400" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"}`} />
                          <AnimatePresence mode="wait">
                            {!sidebarCollapsed && (
                              <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.15 }}
                                className={`text-sm font-medium whitespace-nowrap relative z-10 ${
                                  isActive ? "" : "theme-muted-text"
                                }`}
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>

                          {/* Tooltip */}
                          {sidebarCollapsed && (
                            <div className="theme-tooltip absolute left-full ml-3 px-3 py-1.5 text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-x-1 group-hover:scale-100 scale-95 origin-left transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] pointer-events-none whitespace-nowrap z-50">
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
                    ${sidebarCollapsed ? "justify-center" : ""}
                  `}
                >
                  <Search className="theme-nav-icon w-5 h-5 flex-shrink-0" />
                  <AnimatePresence mode="wait">
                    {!sidebarCollapsed && (
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
                  {sidebarCollapsed && (
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
                    ${sidebarCollapsed ? "justify-center" : ""}
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
                    {!sidebarCollapsed && (
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
                  {sidebarCollapsed && (
                    <div className="theme-tooltip absolute left-full ml-3 px-3 py-1.5 text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-x-1 group-hover:scale-100 scale-95 origin-left transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] pointer-events-none whitespace-nowrap z-50">
                      Settings
                    </div>
                  )}
                </Link>
              </li>
            </ul>

            {/* Device Status (only when expanded) */}
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="mt-4 mb-1 mx-1 overflow-hidden"
                >
                  <div className="theme-panel-muted rounded-2xl p-3 bg-white/30 dark:bg-white/[0.01] border border-white/5 dark:border-white/[0.04] backdrop-blur-md">
                    <h4 className="theme-muted-text text-xs font-bold uppercase tracking-wider mb-2 font-title">
                      Devices
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="theme-panel-elevated w-8 h-8 rounded-lg flex items-center justify-center shadow-sm bg-white/50 dark:bg-black/30 border border-white/10 dark:border-white/[0.06]">
                          <Laptop className="w-4 h-4 text-cyan-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            Extension
                          </p>
                        </div>
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="theme-panel-elevated w-8 h-8 rounded-lg flex items-center justify-center shadow-sm bg-white/50 dark:bg-black/30 border border-white/10 dark:border-white/[0.06]">
                          <Smartphone className="w-4 h-4 text-violet-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            Mobile
                          </p>
                        </div>
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="theme-panel-elevated w-8 h-8 rounded-lg flex items-center justify-center shadow-sm bg-white/50 dark:bg-black/30 border border-white/10 dark:border-white/[0.06]">
                          <PenTool className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            Smart Pen
                          </p>
                        </div>
                        <div className="w-1.5 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </nav>

          {/* Collapse Toggle */}
          <div className="theme-divider p-3 border-t border-white/5 dark:border-white/[0.06]">
            <button
              onClick={toggleSidebar}
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              className={`
                theme-sidebar-item theme-hover-surface
                hidden lg:flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                transition-all duration-200 text-[var(--text-muted)] hover:text-[var(--text-primary)]
                ${sidebarCollapsed ? "justify-center" : ""}
              `}
            >
              <ChevronLeft
                className={`w-5 h-5 transition-transform duration-300 ${
                  sidebarCollapsed ? "rotate-180" : ""
                }`}
              />
              <AnimatePresence mode="wait">
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    Collapse
                  </motion.span>
                )}
              </AnimatePresence>
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
          p-4 lg:p-6
        `}
      >
        {/* Header */}
        <header className="theme-headerbar theme-divider sticky top-0 z-20 backdrop-blur-2xl bg-white/40 dark:bg-[#09090b]/40 rounded-2xl border border-white/10 dark:border-white/[0.05] shadow-[0_4px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.2)] mb-4 lg:mb-6">
          <div className="h-14 px-4 lg:px-6 flex items-center justify-between gap-4">
            {/* Left: Mobile Menu + Search */}
            <div className="flex items-center gap-4 flex-1">
              <button
                className="theme-icon-button theme-hover-surface lg:hidden p-2 rounded-xl transition-colors border border-white/10 dark:border-white/[0.06] bg-[var(--glass-bg)]"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5 text-[var(--text-primary)]" />
              </button>

              {/* Search - Hide on Dashboard to avoid duplication */}
              {location.pathname !== "/app/dashboard" && (
                <div
                  className={`
                  relative flex-1 max-w-md transition-all duration-300
                  ${searchFocused ? "max-w-lg" : ""}
                `}
                >
                  <Search className="text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="theme-search theme-input w-full pl-11 pr-4 py-2 rounded-xl text-sm text-[var(--text-primary)] bg-[var(--glass-bg)] border border-white/10 dark:border-white/[0.06] placeholder-gray-500/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50 transition-all shadow-inner"
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                  />
                  <div className="text-[var(--text-muted)] absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs">
                    <kbd className="theme-kbd px-1.5 py-0.5 rounded text-xs bg-black/5 dark:bg-white/5 border border-white/10 dark:border-white/[0.06]">
                      ⌘K
                    </kbd>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
              {/* Supabase Real-time Sync activity sparkler */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-sm font-semibold select-none shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-r from-cyan-400 to-emerald-400"></span>
                </span>
                <span className="hidden sm:inline font-sans">Synced</span>
              </div>

              {/* Streamlined Glass Action Bar (Notifications + Profile) */}
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/40 dark:bg-[#09090b]/40 backdrop-blur-xl border border-white/10 dark:border-white/[0.06] shadow-md z-20">
                {/* Notifications */}
                <div className="relative flex items-center justify-center">
                  <button
                    onClick={() => {
                      setNotificationsOpen(!notificationsOpen);
                      setProfileOpen(false);
                    }}
                    aria-label="Notifications"
                    className="theme-icon-button theme-hover-surface notifications-trigger p-2 rounded-xl transition-colors relative flex items-center justify-center hover:scale-[1.03] active:scale-[0.97]"
                  >
                    <Bell className="w-4 h-4 text-[var(--text-primary)]" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF3B30] rounded-full animate-pulse" />
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  <AnimatePresence>
                    {notificationsOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="theme-surface notifications-dropdown absolute right-[-50px] sm:right-0 top-full mt-3 w-80 rounded-2xl shadow-2xl border border-white/10 dark:border-white/[0.06] bg-[var(--surface-overlay)] backdrop-blur-2xl overflow-hidden"
                      >
                      <div className="theme-divider px-4 py-3 border-b border-white/5 dark:border-white/[0.06] flex items-center justify-between">
                        <h3 className="font-semibold text-[var(--text-primary)] font-title text-sm">
                          Notifications
                        </h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-cyan-500 hover:text-cyan-400 font-medium transition-colors"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {activities.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <Bell className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-60" />
                            <p className="text-sm text-[var(--text-muted)]">
                              No notifications
                            </p>
                          </div>
                        ) : (
                          activities.map((activity) => (
                            <div
                              key={activity.id}
                              className={`theme-hover-surface px-4 py-3 transition-colors ${
                                !activity.read ? "bg-cyan-500/5 dark:bg-cyan-400/5" : ""
                              }`}
                            >
                              <div className="flex gap-3">
                                <div className="theme-panel-muted w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                                  {getActivityIcon(activity.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-[var(--text-primary)]">
                                    {activity.message}
                                  </p>
                                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                    {formatTimeAgo(activity.time)}
                                  </p>
                                </div>
                                {!activity.read && (
                                  <div className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0 mt-2 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
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
                <div className="w-px h-5 bg-black/10 dark:bg-white/10 self-center mx-1" />

                {/* Profile */}
                <div className="relative flex items-center justify-center">
                  <button
                    onClick={() => {
                      setProfileOpen(!profileOpen);
                      setNotificationsOpen(false);
                    }}
                    aria-label="User profile menu"
                    className="theme-icon-button theme-hover-surface profile-trigger flex items-center gap-2 p-1 rounded-xl transition-colors hover:scale-[1.03] active:scale-[0.97]"
                  >
                    <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-xs overflow-hidden relative group/avatar shadow-[0_0_8px_rgba(99,102,241,0.2)]">
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
                      {localStorage.getItem("rm_guest_mode") === "true" && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse shadow-sm" />
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Profile Dropdown */}
                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="theme-surface profile-dropdown absolute right-0 top-full mt-2 w-64 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-black/50 border overflow-hidden"
                    >
                    <div className="theme-divider px-4 py-4 border-b">
                      {localStorage.getItem("rm_guest_mode") === "true" ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 flex items-center justify-center text-lg font-bold">
                              G
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                Guest Account
                              </p>
                              <p className="text-xs text-yellow-600 dark:text-yellow-500 font-semibold uppercase tracking-wider">
                                Limited Access
                              </p>
                            </div>
                          </div>
                          <Link
                            to="/signup"
                            className="block w-full py-2 px-3 bg-[#007AFF] hover:bg-[#0066DD] text-white text-sm font-semibold text-center rounded-lg transition-colors"
                          >
                            Sign up to save progress
                          </Link>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] text-white flex items-center justify-center text-lg font-bold overflow-hidden">
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
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {user?.email}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <span>Free Plan</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      {NAV_ITEMS.slice(0, 4).map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setProfileOpen(false)}
                          className="theme-sidebar-item theme-hover-surface flex items-center gap-3 px-3 py-2 rounded-xl transition-colors"
                        >
                          <item.icon className="w-4 h-4" />
                          <span className="text-sm">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                    <div className="theme-divider p-2 border-t">
                      <Link
                        to="/app/settings"
                        onClick={() => setProfileOpen(false)}
                        className="theme-sidebar-item theme-hover-surface flex items-center gap-3 px-3 py-2 rounded-xl transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        <span className="text-sm">Settings</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-[#FF3B30] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">Sign Out</span>
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
