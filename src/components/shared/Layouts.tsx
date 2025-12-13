import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { Button } from "./UIComponents";
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  PenTool,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  User,
  Search,
  Laptop,
  Smartphone,
  Wifi,
  Quote,
  ChevronLeft,
  Moon,
  Sun,
  Check,
} from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";

// ============================================
// PART 1: MARKETING LAYOUT (Apple-style)
// Always uses light mode regardless of user theme preference
// ============================================

export const MarketingLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Force light mode for marketing pages
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");

    // Remove dark mode for marketing pages
    root.classList.remove("dark");

    // Restore dark mode when leaving marketing pages (if it was set)
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

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-gray-900 font-sans">
      {/* Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-white/80 backdrop-blur-xl backdrop-saturate-150 border-b border-gray-200/50"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between h-12 items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
                R
              </div>
              <span className="text-base font-semibold text-gray-900">
                ResearchMate
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link
                to="/"
                className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Home
              </Link>
              <Link
                to="/products"
                className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Products
              </Link>
              <Link
                to="/team"
                className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Team
              </Link>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Link to="/login">
                <button className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5">
                  Sign In
                </button>
              </Link>
              <Link to="/signup">
                <button className="text-xs font-medium bg-[#007AFF] hover:bg-[#0066DD] text-white px-4 py-1.5 rounded-full transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95">
                  Get Started
                </button>
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-200/50 animate-slide-down">
            <div className="px-6 py-4 space-y-1">
              <Link
                to="/"
                className="block py-3 text-base font-medium text-gray-900"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/products"
                className="block py-3 text-base font-medium text-gray-900"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Products
              </Link>
              <Link
                to="/team"
                className="block py-3 text-base font-medium text-gray-900"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Team
              </Link>
              <div className="pt-4 flex gap-3">
                <Link to="/login" className="flex-1">
                  <button className="w-full py-2.5 text-sm font-medium border border-gray-300 rounded-full">
                    Sign In
                  </button>
                </Link>
                <Link to="/signup" className="flex-1">
                  <button className="w-full py-2.5 text-sm font-medium bg-[#007AFF] text-white rounded-full">
                    Get Started
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="pt-12">{children}</main>

      {/* Footer */}
      <footer className="bg-[#F5F5F7] border-t border-gray-200/50 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                  R
                </div>
                <span className="font-semibold">ResearchMate</span>
              </div>
              <p className="text-sm text-gray-500">
                Your research, everywhere.
              </p>
            </div>

            {/* Links */}
            {[
              {
                title: "Product",
                links: ["Features", "Extension", "Mobile App", "Pricing"],
              },
              {
                title: "Company",
                links: ["About", "Team", "Careers", "Press"],
              },
              {
                title: "Support",
                links: ["Help Center", "Contact", "Status", "Terms"],
              },
            ].map((section) => (
              <div key={section.title}>
                <h4 className="font-semibold text-xs text-gray-900 uppercase tracking-wider mb-4">
                  {section.title}
                </h4>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-500">
              © 2024 ResearchMate. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-xs text-gray-500 hover:text-gray-900">
                Privacy
              </a>
              <a href="#" className="text-xs text-gray-500 hover:text-gray-900">
                Terms
              </a>
              <a href="#" className="text-xs text-gray-500 hover:text-gray-900">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ============================================
// PART 2: DASHBOARD LAYOUT (Apple-style)
// ============================================

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [activities, setActivities] = useState<
    {
      id: string;
      type: "sync" | "summary" | "collection" | "citation" | "login";
      message: string;
      time: Date;
      read: boolean;
    }[]
  >([]);

  const navigate = useNavigate();
  const location = useLocation();

  // Load user and sidebar state
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate("/"); // Redirect to landing page, not login
      } else {
        setUser(data.user);
        setActivities([
          {
            id: "1",
            type: "sync",
            message: "Extension synced 2 new items",
            time: new Date(Date.now() - 1000 * 60 * 5),
            read: false,
          },
          {
            id: "2",
            type: "summary",
            message: 'AI summary generated for "Research Methods"',
            time: new Date(Date.now() - 1000 * 60 * 30),
            read: false,
          },
          {
            id: "3",
            type: "collection",
            message: 'Added item to "Thesis Research"',
            time: new Date(Date.now() - 1000 * 60 * 60 * 2),
            read: true,
          },
          {
            id: "4",
            type: "login",
            message: "Signed in from new device",
            time: new Date(Date.now() - 1000 * 60 * 60 * 24),
            read: true,
          },
        ]);
      }
    });

    const savedState = localStorage.getItem("researchmate_sidebar_collapsed");
    if (savedState === "true") {
      setSidebarCollapsed(true);
    }
  }, [navigate]);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/"); // Redirect to landing page, not login
  };

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("researchmate_sidebar_collapsed", String(newState));
  };

  const markAllAsRead = () => {
    setActivities((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  const unreadCount = activities.filter((a) => !a.read).length;

  const getActivityIcon = (type: string) => {
    const icons = {
      sync: <Wifi className="w-4 h-4 text-[#34C759]" />,
      summary: <MessageSquare className="w-4 h-4 text-[#007AFF]" />,
      collection: <FolderOpen className="w-4 h-4 text-[#AF52DE]" />,
      citation: <Quote className="w-4 h-4 text-[#FF9500]" />,
      login: <User className="w-4 h-4 text-[#8E8E93]" />,
    };
    return icons[type as keyof typeof icons] || <Bell className="w-4 h-4" />;
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

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/app/dashboard" },
    { icon: FolderOpen, label: "Collections", path: "/app/collections" },
    { icon: MessageSquare, label: "AI Assistant", path: "/app/ai-assistant" },
    { icon: Quote, label: "Citations", path: "/app/citations" },
    { icon: PenTool, label: "Smart Pen", path: "/app/smart-pen" },
    { icon: BarChart2, label: "Statistics", path: "/app/statistics" },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#000000] flex font-sans">
      {/* ========== SIDEBAR ========== */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30
          bg-white/80 dark:bg-[#1C1C1E]/80
          backdrop-blur-xl backdrop-saturate-150
          border-r border-gray-200/50 dark:border-gray-800/50
          transition-all duration-300 ease-out
          overflow-hidden
          ${sidebarCollapsed ? "w-[72px]" : "w-[260px]"}
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="h-full flex flex-col">
          {/* Header: Logo */}
          <div
            className={`h-14 flex items-center border-b border-gray-200/50 dark:border-gray-800/50 ${
              sidebarCollapsed ? "justify-center px-2" : "px-5"
            }`}
          >
            <Link
              to="/app/dashboard"
              className={`flex items-center gap-3 ${
                sidebarCollapsed ? "justify-center" : ""
              }`}
            >
              <div className="w-8 h-8 min-w-[32px] bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-blue-500/20">
                R
              </div>
              {!sidebarCollapsed && (
                <span className="text-base font-semibold text-gray-900 dark:text-white">
                  ResearchMate
                </span>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl
                        transition-all duration-200 group relative
                        ${
                          isActive
                            ? "bg-[#007AFF] text-white shadow-lg shadow-blue-500/25"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                        }
                        ${sidebarCollapsed ? "justify-center" : ""}
                      `}
                    >
                      <item.icon
                        className={`w-5 h-5 flex-shrink-0 ${
                          isActive
                            ? "text-white"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      />
                      {!sidebarCollapsed && (
                        <span
                          className={`text-sm font-medium ${
                            isActive ? "text-white" : ""
                          }`}
                        >
                          {item.label}
                        </span>
                      )}

                      {/* Tooltip */}
                      {sidebarCollapsed && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none whitespace-nowrap z-50">
                          {item.label}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Divider */}
            <div className="my-4 h-px bg-gray-200/50 dark:bg-gray-800/50" />

            {/* Bottom Nav */}
            <ul className="space-y-1">
              <li>
                <Link
                  to="/app/settings"
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl
                    transition-all duration-200 group relative
                    ${
                      location.pathname === "/app/settings"
                        ? "bg-[#007AFF] text-white shadow-lg shadow-blue-500/25"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                    }
                    ${sidebarCollapsed ? "justify-center" : ""}
                  `}
                >
                  <Settings className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="text-sm font-medium">Settings</span>
                  )}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none whitespace-nowrap z-50">
                      Settings
                    </div>
                  )}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Device Status (only when expanded) */}
          {!sidebarCollapsed && (
            <div className="px-4 pb-4">
              <div className="bg-gray-100/80 dark:bg-gray-800/50 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Devices
                </h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm">
                      <Laptop className="w-4 h-4 text-[#007AFF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        Extension
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-[#34C759] rounded-full" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm">
                      <Smartphone className="w-4 h-4 text-[#5856D6]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        Mobile
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-[#34C759] rounded-full" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm">
                      <PenTool className="w-4 h-4 text-[#FF9500]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        Smart Pen
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-[#FF3B30] rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Collapse Toggle */}
          <div className="p-3 border-t border-gray-200/50 dark:border-gray-800/50">
            <button
              onClick={toggleSidebar}
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              className={`
                hidden lg:flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                text-gray-500 dark:text-gray-400
                hover:bg-gray-100 dark:hover:bg-gray-800/50
                transition-all duration-200
                ${sidebarCollapsed ? "justify-center" : ""}
              `}
            >
              <ChevronLeft
                className={`w-5 h-5 transition-transform duration-300 ${
                  sidebarCollapsed ? "rotate-180" : ""
                }`}
              />
              {!sidebarCollapsed && (
                <span className="text-sm font-medium">Collapse</span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* ========== MAIN CONTENT ========== */}
      <div
        className={`
          flex-1 flex flex-col min-h-screen
          transition-all duration-300
          ${sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"}
        `}
      >
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[#F5F5F7]/80 dark:bg-[#000000]/80 backdrop-blur-xl backdrop-saturate-150 border-b border-gray-200/50 dark:border-gray-800/50">
          <div className="h-14 px-4 lg:px-8 flex items-center justify-between gap-4">
            {/* Left: Mobile Menu + Search */}
            <div className="flex items-center gap-4 flex-1">
              <button
                className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Search */}
              <div
                className={`
                  relative flex-1 max-w-md transition-all duration-300
                  ${searchFocused ? "max-w-lg" : ""}
                `}
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-11 pr-4 py-2 bg-gray-100 dark:bg-[#2C2C2E] border-0 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 transition-all"
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-gray-400">
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">
                    ⌘K
                  </kbd>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    setProfileOpen(false);
                  }}
                  aria-label="Notifications"
                  className="notifications-trigger p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF3B30] rounded-full" />
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <div className="notifications-dropdown absolute right-0 mt-2 w-80 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-black/50 border border-gray-200/50 dark:border-gray-800/50 overflow-hidden animate-slide-down">
                    <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-800/50 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-[#007AFF] hover:text-[#0066DD] font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {activities.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">
                            No notifications
                          </p>
                        </div>
                      ) : (
                        activities.map((activity) => (
                          <div
                            key={activity.id}
                            className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                              !activity.read
                                ? "bg-blue-50/50 dark:bg-blue-900/10"
                                : ""
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                {getActivityIcon(activity.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 dark:text-white">
                                  {activity.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {formatTimeAgo(activity.time)}
                                </p>
                              </div>
                              {!activity.read && (
                                <div className="w-2 h-2 bg-[#007AFF] rounded-full flex-shrink-0 mt-2" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile */}
              <div className="relative">
                <button
                  onClick={() => {
                    setProfileOpen(!profileOpen);
                    setNotificationsOpen(false);
                  }}
                  aria-label="User profile menu"
                  className="profile-trigger flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-full flex items-center justify-center text-white font-medium text-sm">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                </button>

                {/* Profile Dropdown */}
                {profileOpen && (
                  <div className="profile-dropdown absolute right-0 mt-2 w-64 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-black/50 border border-gray-200/50 dark:border-gray-800/50 overflow-hidden animate-slide-down">
                    <div className="px-4 py-4 border-b border-gray-200/50 dark:border-gray-800/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-full flex items-center justify-center text-white font-semibold">
                          {user?.email?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user?.email}
                          </p>
                          <p className="text-xs text-gray-500">Free Plan</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      {navItems.slice(0, 4).map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <item.icon className="w-4 h-4" />
                          <span className="text-sm">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                    <div className="p-2 border-t border-gray-200/50 dark:border-gray-800/50">
                      <Link
                        to="/app/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">{children}</main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20 lg:hidden animate-fade-in"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
    </div>
  );
};
