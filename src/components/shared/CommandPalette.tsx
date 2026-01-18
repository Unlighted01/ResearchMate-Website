// ============================================
// COMMAND PALETTE (Spotlight Search)
// Opens with Cmd+K / Ctrl+K
// ============================================

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  BarChart2,
  Settings,
  Quote,
  PenTool,
  FileText,
  ArrowRight,
  Command,
} from "lucide-react";
import { getAllItems, StorageItem } from "../../services/storageService";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

// Navigation actions
const navigationActions = [
  {
    id: "dashboard",
    label: "Go to Dashboard",
    icon: LayoutDashboard,
    path: "/app/dashboard",
  },
  {
    id: "collections",
    label: "Go to Collections",
    icon: FolderOpen,
    path: "/app/collections",
  },
  {
    id: "ai-assistant",
    label: "Go to AI Assistant",
    icon: MessageSquare,
    path: "/app/ai-assistant",
  },
  {
    id: "citations",
    label: "Go to Citations",
    icon: Quote,
    path: "/app/citations",
  },
  {
    id: "smart-pen",
    label: "Go to Smart Pen",
    icon: PenTool,
    path: "/app/smart-pen",
  },
  {
    id: "statistics",
    label: "Go to Statistics",
    icon: BarChart2,
    path: "/app/statistics",
  },
  {
    id: "settings",
    label: "Go to Settings",
    icon: Settings,
    path: "/app/settings",
  },
];

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<StorageItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  // Load items when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      document.body.style.overflow = "hidden";
      getAllItems().then(setItems).catch(console.error);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Filter navigation actions
  const filteredActions = useMemo(() => {
    if (!query.trim()) return navigationActions;
    const lowerQuery = query.toLowerCase();
    return navigationActions.filter((action) =>
      action.label.toLowerCase().includes(lowerQuery)
    );
  }, [query]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return items
      .filter(
        (item) =>
          item.sourceTitle?.toLowerCase().includes(lowerQuery) ||
          item.text?.toLowerCase().includes(lowerQuery) ||
          item.aiSummary?.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 5); // Limit to 5 results
  }, [query, items]);

  // Combined results
  const allResults = useMemo(() => {
    return [
      ...filteredActions.map((a) => ({ type: "action" as const, data: a })),
      ...filteredItems.map((i) => ({ type: "item" as const, data: i })),
    ];
  }, [filteredActions, filteredItems]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, allResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && allResults[selectedIndex]) {
        e.preventDefault();
        handleSelect(allResults[selectedIndex]);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, allResults, selectedIndex, onClose]);

  const handleSelect = useCallback(
    (result: (typeof allResults)[0]) => {
      if (result.type === "action") {
        navigate(result.data.path);
      } else {
        // Navigate to dashboard with item selected (could enhance later)
        navigate("/app/dashboard");
      }
      onClose();
    },
    [navigate, onClose]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Command Palette Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 top-[15%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl z-50"
          >
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-800 overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  placeholder="Search items or type a command..."
                  autoFocus
                  className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none text-base"
                />
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-400 text-xs">
                  <Command className="w-3 h-3" />
                  <span>K</span>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close command palette"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Results */}
              <div className="max-h-[50vh] overflow-y-auto p-2">
                {allResults.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400 text-sm">No results found</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Navigation Section */}
                    {filteredActions.length > 0 && (
                      <>
                        <p className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Navigation
                        </p>
                        {filteredActions.map((action, idx) => {
                          const Icon = action.icon;
                          const isSelected = idx === selectedIndex;
                          return (
                            <motion.button
                              key={action.id}
                              onClick={() =>
                                handleSelect({ type: "action", data: action })
                              }
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                                isSelected
                                  ? "bg-[#007AFF] text-white"
                                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="flex-1 text-sm font-medium">
                                {action.label}
                              </span>
                              <ArrowRight
                                className={`w-4 h-4 ${isSelected ? "opacity-100" : "opacity-0"}`}
                              />
                            </motion.button>
                          );
                        })}
                      </>
                    )}

                    {/* Items Section */}
                    {filteredItems.length > 0 && (
                      <>
                        <p className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider mt-2">
                          Research Items
                        </p>
                        {filteredItems.map((item, idx) => {
                          const actualIdx = filteredActions.length + idx;
                          const isSelected = actualIdx === selectedIndex;
                          return (
                            <motion.button
                              key={item.id}
                              onClick={() =>
                                handleSelect({ type: "item", data: item })
                              }
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                                isSelected
                                  ? "bg-[#007AFF] text-white"
                                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                              }`}
                            >
                              <FileText className="w-4 h-4" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {item.sourceTitle || "Untitled"}
                                </p>
                                <p
                                  className={`text-xs truncate ${isSelected ? "text-white/70" : "text-gray-400"}`}
                                >
                                  {item.aiSummary?.slice(0, 60) ||
                                    item.text?.slice(0, 60) ||
                                    "No content"}
                                  ...
                                </p>
                              </div>
                              <ArrowRight
                                className={`w-4 h-4 ${isSelected ? "opacity-100" : "opacity-0"}`}
                              />
                            </motion.button>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#141414] text-xs text-gray-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      ↑
                    </kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      ↓
                    </kbd>
                    <span className="ml-1">Navigate</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      ↵
                    </kbd>
                    <span className="ml-1">Select</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      esc
                    </kbd>
                    <span className="ml-1">Close</span>
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
