import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
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
} from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";

// ============================================
// PART 1: MARKETING LAYOUT
// ============================================

export const MarketingLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white font-sans">
      <nav
        className={`fixed top-0 w-full z-40 transition-all duration-300 ${
          isScrolled
            ? "bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-tr from-primary-600 to-primary-400 rounded-lg flex items-center justify-center text-white font-bold">
                R
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-purple-600">
                ResearchMate
              </span>
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <Link
                to="/"
                className="text-sm font-medium hover:text-primary-600 transition-colors"
              >
                Home
              </Link>
              <Link
                to="/products"
                className="text-sm font-medium hover:text-primary-600 transition-colors"
              >
                Products
              </Link>
              <Link
                to="/team"
                className="text-sm font-medium hover:text-primary-600 transition-colors"
              >
                Team
              </Link>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>

            <button
              className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 w-full bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 p-4 flex flex-col space-y-4 shadow-lg">
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2"
            >
              Home
            </Link>
            <Link
              to="/products"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2"
            >
              Products
            </Link>
            <Link
              to="/team"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2"
            >
              Team
            </Link>
            <Link
              to="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block"
            >
              <Button className="w-full">Login</Button>
            </Link>
          </div>
        )}
      </nav>
      <main className="pt-16">{children}</main>
      <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500">
          <p>© 2024 ResearchMate. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

// ============================================
// PART 2: DASHBOARD LAYOUT (COLLAPSIBLE SIDEBAR)
// ============================================

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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
        navigate("/login");
      } else {
        setUser(data.user);
        // Sample activities
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

    // Load sidebar state from localStorage
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
    navigate("/");
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
    switch (type) {
      case "sync":
        return <Wifi className="w-4 h-4 text-green-500" />;
      case "summary":
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case "collection":
        return <FolderOpen className="w-4 h-4 text-purple-500" />;
      case "citation":
        return <Quote className="w-4 h-4 text-orange-500" />;
      case "login":
        return <User className="w-4 h-4 text-gray-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
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

  // Double chevron SVG for toggle button
  const ToggleIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`w-5 h-5 transition-transform duration-300 ${
        sidebarCollapsed ? "rotate-180" : ""
      }`}
      viewBox="0 -960 960 960"
      fill="currentColor"
    >
      <path d="m313-480 155 156q11 11 11.5 27.5T468-268q-11 11-28 11t-28-11L228-452q-6-6-8.5-13t-2.5-15q0-8 2.5-15t8.5-13l184-184q11-11 27.5-11.5T468-692q11 11 11 28t-11 28L313-480Zm264 0 155 156q11 11 11.5 27.5T732-268q-11 11-28 11t-28-11L492-452q-6-6-8.5-13t-2.5-15q0-8 2.5-15t8.5-13l184-184q11-11 27.5-11.5T732-692q11 11 11 28t-11 28L577-480Z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex font-sans">
      {/* ========== SIDEBAR ========== */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30
          bg-white dark:bg-gray-900
          border-r border-gray-200 dark:border-gray-800
          transition-all duration-300 ease-in-out
          overflow-hidden
          ${sidebarCollapsed ? "w-[72px]" : "w-64"}
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="h-full flex flex-col">
          {/* Header: Logo + Toggle */}
          <div
            className={`h-16 flex items-center border-b border-gray-200 dark:border-gray-800 ${
              sidebarCollapsed ? "justify-center px-2" : "justify-between px-3"
            }`}
          >
            <Link
              to="/app/dashboard"
              className={`flex items-center gap-3 overflow-hidden ${
                sidebarCollapsed ? "justify-center" : ""
              }`}
            >
              <div className="w-10 h-10 min-w-[40px] bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                R
              </div>
              {!sidebarCollapsed && (
                <span className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">
                  ResearchMate
                </span>
              )}
            </Link>

            {/* Toggle Button - Only show when expanded, moves to nav when collapsed */}
            {!sidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                className="hidden lg:flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                aria-label="Collapse sidebar"
              >
                <ToggleIcon />
              </button>
            )}
          </div>

          {/* Expand button when collapsed - placed at top of nav */}
          {sidebarCollapsed && (
            <div className="px-2 pt-3">
              <button
                onClick={toggleSidebar}
                className="hidden lg:flex items-center justify-center w-full p-3 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                aria-label="Expand sidebar"
              >
                <ToggleIcon />
              </button>
            </div>
          )}

          {/* Navigation Items */}
          <nav
            className={`flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 ${
              sidebarCollapsed ? "pt-2" : ""
            }`}
          >
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-3 rounded-lg
                        transition-all duration-200 group relative
                        ${
                          isActive
                            ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }
                        ${sidebarCollapsed ? "justify-center" : ""}
                      `}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span
                        className={`
                          font-medium whitespace-nowrap
                          transition-all duration-300
                          ${
                            sidebarCollapsed
                              ? "opacity-0 w-0 overflow-hidden"
                              : "opacity-100"
                          }
                        `}
                      >
                        {item.label}
                      </span>

                      {/* Tooltip when collapsed */}
                      {sidebarCollapsed && (
                        <div
                          className="
                          absolute left-full ml-2 px-2 py-1
                          bg-gray-900 dark:bg-gray-700 text-white text-sm
                          rounded whitespace-nowrap z-50
                          opacity-0 invisible
                          group-hover:opacity-100 group-hover:visible
                          transition-all duration-200
                          pointer-events-none
                        "
                        >
                          {item.label}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Bottom Section */}
          <div
            className={`border-t border-gray-200 dark:border-gray-800 ${
              sidebarCollapsed ? "px-2 py-3" : "p-4"
            }`}
          >
            {/* Device Status - Hidden when collapsed */}
            {!sidebarCollapsed && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                  Device Status
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600 dark:text-gray-300">
                      <Laptop className="w-4 h-4 mr-2" /> Extension
                    </div>
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600 dark:text-gray-300">
                      <Smartphone className="w-4 h-4 mr-2" /> Mobile
                    </div>
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600 dark:text-gray-300">
                      <PenTool className="w-4 h-4 mr-2" /> Smart Pen
                    </div>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Link */}
            <Link
              to="/app/settings"
              onClick={() => setMobileSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-3 rounded-lg mb-1
                transition-all duration-200 group relative
                ${
                  location.pathname === "/app/settings"
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }
                ${sidebarCollapsed ? "justify-center" : ""}
              `}
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span
                className={`font-medium whitespace-nowrap transition-all duration-300 ${
                  sidebarCollapsed
                    ? "opacity-0 w-0 overflow-hidden"
                    : "opacity-100"
                }`}
              >
                Settings
              </span>
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded whitespace-nowrap z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
                  Settings
                </div>
              )}
            </Link>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={`
                flex items-center gap-3 w-full px-3 py-3 rounded-lg
                text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10
                transition-all duration-200 group relative
                ${sidebarCollapsed ? "justify-center" : ""}
              `}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span
                className={`font-medium whitespace-nowrap transition-all duration-300 ${
                  sidebarCollapsed
                    ? "opacity-0 w-0 overflow-hidden"
                    : "opacity-100"
                }`}
              >
                Logout
              </span>
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded whitespace-nowrap z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
                  Logout
                </div>
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
          ${sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"}
        `}
      >
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search research, tags..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-lg focus:ring-2 focus:ring-primary-500 text-sm outline-none dark:text-white"
              />
            </div>
          </div>

          {/* Header Right: Notifications + Profile */}
          <div className="flex items-center space-x-4">
            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileOpen(false);
                }}
                className="notifications-trigger p-2 text-gray-400 hover:text-primary-600 transition-colors relative"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {notificationsOpen && (
                <div className="notifications-dropdown absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-primary-600 hover:text-primary-700"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {activities.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      activities.map((activity) => (
                        <div
                          key={activity.id}
                          className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0 ${
                            !activity.read
                              ? "bg-primary-50/50 dark:bg-primary-900/10"
                              : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 dark:text-white">
                                {activity.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatTimeAgo(activity.time)}
                              </p>
                            </div>
                            {!activity.read && (
                              <span className="w-2 h-2 bg-primary-500 rounded-full mt-2"></span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <Link
                      to="/app/settings"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Notification Settings
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                }}
                className="profile-trigger h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold cursor-pointer hover:opacity-90 transition-opacity"
              >
                {user?.email?.[0].toUpperCase() || "U"}
              </button>

              {profileOpen && (
                <div className="profile-dropdown absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {user?.email?.[0].toUpperCase() || "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {user?.email || "User"}
                        </p>
                        <p className="text-xs text-gray-500">Free Plan</p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Navigation */}
                  <div className="py-2">
                    <p className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">
                      Quick Access
                    </p>
                    {navItems.slice(0, 5).map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setProfileOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                          location.pathname === item.path
                            ? "text-primary-600 bg-primary-50 dark:bg-primary-900/20"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>

                  {/* Settings & Logout */}
                  <div className="py-2 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      to="/app/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </Link>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">{children}</main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
    </div>
  );
};
