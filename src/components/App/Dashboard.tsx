// ============================================
// DASHBOARD PAGE - Apple Design
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import {
  Button,
  Card,
  Badge,
  Modal,
  SearchInput,
} from "../shared/UIComponents";
import {
  Search,
  RefreshCw,
  Plus,
  Wifi,
  WifiOff,
  Sparkles,
  Chrome,
  Laptop,
  Smartphone,
  PenTool,
  Globe,
  Layout,
  Zap,
  Share2,
  MoreHorizontal,
  Filter,
  Grid3X3,
  List,
  Clock,
  Tag,
  HelpCircle,
} from "lucide-react";
import { TrashIcon, CopyIcon, ExternalLinkIcon, DownloadIcon } from "../icons";
import {
  getAllItems,
  deleteItem,
  updateItem,
  subscribeToItems,
  StorageItem,
} from "../../services/storageService";
import { generateSummary } from "../../services/geminiService";
import ConfirmDialog from "../shared/ConfirmDialog";
import {
  SkeletonDashboardGrid,
  SkeletonDashboardList,
} from "../shared/SkeletonLoader";
import {
  useKeyboardShortcuts,
  COMMON_SHORTCUTS,
} from "../../hooks/useKeyboardShortcuts";
import KeyboardShortcutsModal from "../shared/KeyboardShortcutsModal";
import BulkActions from "../shared/BulkActions";
import AdvancedSearchFilter, {
  SearchFilters,
} from "../shared/AdvancedSearchFilter";
import { exportItems } from "../../utils/export";
import { useRef } from "react";

// Helper for source icons
const getSourceIcon = (source: string) => {
  const icons: Record<string, React.ReactNode> = {
    extension: <Laptop className="w-4 h-4" />,
    mobile: <Smartphone className="w-4 h-4" />,
    smart_pen: <PenTool className="w-4 h-4" />,
    web: <Globe className="w-4 h-4" />,
  };
  return icons[source] || <Layout className="w-4 h-4" />;
};

const getSourceColor = (source: string) => {
  const colors: Record<string, string> = {
    extension: "#007AFF",
    mobile: "#5856D6",
    smart_pen: "#FF9500",
    web: "#34C759",
  };
  return colors[source] || "#8E8E93";
};

interface DashboardProps {
  useToast: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
  };
}

const Dashboard: React.FC<DashboardProps> = ({ useToast }) => {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    itemId: string | null;
    isDeleting: boolean;
  }>({ isOpen: false, itemId: null, isDeleting: false });

  // Bulk operations
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Modals
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Filters
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilters>({});

  const { showToast } = useToast();

  // Ref for search input (for keyboard shortcuts)
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      ...COMMON_SHORTCUTS.SEARCH,
      description: "Focus search",
      handler: () => searchInputRef.current?.focus(),
    },
    {
      ...COMMON_SHORTCUTS.REFRESH,
      description: "Refresh items",
      handler: () => {
        if (!loading) fetchItems();
      },
    },
    {
      key: "g",
      description: "Toggle grid/list view",
      handler: () => setViewMode((prev) => (prev === "grid" ? "list" : "grid")),
    },
    {
      key: "?",
      shiftKey: true,
      description: "Show keyboard shortcuts",
      handler: () => setShowKeyboardShortcuts(true),
    },
  ]);

  // Debounce search query (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  useEffect(() => {
    fetchItems();

    let unsubscribe: (() => void) | null = null;

    const setupRealTime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        unsubscribe = subscribeToItems(user.id, (payload) => {
          // Batch state updates using React 18 automatic batching
          const syncTime = new Date();

          if (payload.eventType === "INSERT" && payload.new) {
            setItems((prev) => [payload.new!, ...prev]);
            setLastSyncTime(syncTime);
            showToast("New item synced!", "success");
          } else if (payload.eventType === "UPDATE" && payload.new) {
            setItems((prev) =>
              prev.map((item) =>
                item.id === payload.new!.id ? payload.new! : item
              )
            );
            setLastSyncTime(syncTime);
          } else if (payload.eventType === "DELETE" && payload.old) {
            setItems((prev) =>
              prev.filter((item) => item.id !== payload.old!.id)
            );
            setLastSyncTime(syncTime);
          }
        });
        setIsRealTimeConnected(true);
      }
    };

    setupRealTime();

    return () => {
      if (unsubscribe) {
        unsubscribe();
        setIsRealTimeConnected(false);
      }
    };
  }, [fetchItems, showToast]);

  const handleGenerateSummary = async (item: StorageItem) => {
    showToast("Generating AI summary...", "info");
    try {
      const summary = await generateSummary(item.text || item.ocrText || "");
      if (summary) {
        await updateItem(item.id, { aiSummary: summary });
        const updated = { ...item, aiSummary: summary };
        setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
        setSelectedItem(updated);
        showToast("Summary generated!", "success");
      }
    } catch (error) {
      showToast("Failed to generate summary", "error");
    }
  };

  const handleDeleteItem = async (id: string) => {
    setConfirmDialog({ isOpen: true, itemId: id, isDeleting: false });
  };

  const confirmDeleteItem = async () => {
    if (!confirmDialog.itemId) return;

    setConfirmDialog((prev) => ({ ...prev, isDeleting: true }));

    try {
      await deleteItem(confirmDialog.itemId);
      setItems((prev) =>
        prev.filter((item) => item.id !== confirmDialog.itemId)
      );
      showToast("Item deleted successfully", "success");
      if (selectedItem?.id === confirmDialog.itemId) {
        setIsModalOpen(false);
        setSelectedItem(null);
      }
      setConfirmDialog({ isOpen: false, itemId: null, isDeleting: false });
    } catch (error) {
      showToast("Failed to delete item", "error");
      setConfirmDialog((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  // Bulk operations handlers
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAllItems = () => {
    setSelectedItems(new Set(items.map((item) => item.id)));
  };

  const deselectAllItems = () => {
    setSelectedItems(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    if (
      !confirm(`Delete ${selectedItems.size} items? This cannot be undone.`)
    ) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      const deletePromises = Array.from(selectedItems).map((id) =>
        deleteItem(id)
      );
      await Promise.all(deletePromises);
      setItems((prev) => prev.filter((item) => !selectedItems.has(item.id)));
      showToast(`${selectedItems.size} items deleted successfully`, "success");
      setSelectedItems(new Set());
    } catch (error) {
      showToast("Failed to delete some items", "error");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkExport = () => {
    if (selectedItems.size === 0) {
      showToast("No items selected for export", "error");
      return;
    }

    const itemsToExport = items.filter((item) => selectedItems.has(item.id));

    // Show export format menu (for now, default to JSON)
    try {
      exportItems(itemsToExport, "json");
      showToast(`Exported ${itemsToExport.length} items`, "success");
    } catch (error) {
      showToast("Export failed", "error");
    }
  };

  const handleApplyFilters = (filters: SearchFilters) => {
    setAdvancedFilters(filters);
  };

  // Memoize filtered items - apply search query and advanced filters
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Apply text search
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        return (
          item.text?.toLowerCase().includes(query) ||
          item.sourceTitle?.toLowerCase().includes(query) ||
          item.tags?.some((tag) => tag.toLowerCase().includes(query))
        );
      });
    }

    // Apply advanced filters
    if (advancedFilters.dateRange?.start || advancedFilters.dateRange?.end) {
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.createdAt);
        const start = advancedFilters.dateRange?.start
          ? new Date(advancedFilters.dateRange.start)
          : null;
        const end = advancedFilters.dateRange?.end
          ? new Date(advancedFilters.dateRange.end)
          : null;

        if (start && itemDate < start) return false;
        if (end && itemDate > end) return false;
        return true;
      });
    }

    if (
      advancedFilters.deviceSource &&
      advancedFilters.deviceSource.length > 0
    ) {
      filtered = filtered.filter((item) =>
        advancedFilters.deviceSource?.includes(item.deviceSource || "")
      );
    }

    if (advancedFilters.hasAiSummary !== undefined) {
      filtered = filtered.filter((item) =>
        advancedFilters.hasAiSummary ? !!item.aiSummary : !item.aiSummary
      );
    }

    if (advancedFilters.tags && advancedFilters.tags.length > 0) {
      filtered = filtered.filter((item) =>
        advancedFilters.tags?.some((tag) => item.tags?.includes(tag))
      );
    }

    return filtered;
  }, [items, debouncedSearchQuery, advancedFilters]);

  // Get all unique tags for filter dropdown
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach((item) => {
      item.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [items]);

  // Memoize stats calculations - only recalculate when items change
  const stats = useMemo(() => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return {
      total: items.length,
      withAiSummary: items.filter((i) => i.aiSummary).length,
      fromExtension: items.filter((i) => i.deviceSource === "extension").length,
      thisWeek: items.filter((i) => new Date(i.createdAt) > oneWeekAgo).length,
    };
  }, [items]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ========== HEADER ========== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
          <div className="flex items-center gap-3 mt-1">
            {isRealTimeConnected ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#34C759]">
                <span className="w-1.5 h-1.5 bg-[#34C759] rounded-full animate-pulse" />
                Real-time sync active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <WifiOff className="w-3 h-3" />
                Connecting...
              </span>
            )}
            {lastSyncTime && (
              <span className="text-xs text-gray-400">
                Last synced {lastSyncTime.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowKeyboardShortcuts(true)}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              if (!loading) fetchItems();
            }}
            disabled={loading}
            aria-label="Refresh items"
            className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link to="/app/settings">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-[#007AFF] hover:bg-[#0066DD] text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-95">
              <Plus className="w-4 h-4" />
              Import
            </button>
          </Link>
        </div>
      </div>

      {/* ========== SEARCH & FILTERS ========== */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search research items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition-all"
            aria-label="Search research items"
            aria-describedby="search-hint"
          />
          <span id="search-hint" className="sr-only">
            Press Ctrl+K or Cmd+K to focus search
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvancedFilters(true)}
            className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            aria-label="Advanced filters"
          >
            <Filter className="w-4 h-4" />
            Filter
            {(advancedFilters.dateRange ||
              advancedFilters.deviceSource?.length ||
              advancedFilters.hasAiSummary !== undefined ||
              advancedFilters.tags?.length) && (
              <span className="ml-1 w-2 h-2 bg-purple-500 rounded-full" />
            )}
          </button>
          <div className="flex bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              aria-label="List view"
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "list"
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========== STATS BAR ========== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Items", value: stats.total, color: "#007AFF" },
          {
            label: "With AI Summary",
            value: stats.withAiSummary,
            color: "#5856D6",
          },
          {
            label: "From Extension",
            value: stats.fromExtension,
            color: "#34C759",
          },
          {
            label: "This Week",
            value: stats.thisWeek,
            color: "#FF9500",
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-[#1C1C1E] rounded-xl p-4 border border-gray-200/50 dark:border-gray-800"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {stat.label}
            </p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ========== CONTENT ========== */}
      {loading ? (
        viewMode === "grid" ? (
          <SkeletonDashboardGrid count={8} />
        ) : (
          <SkeletonDashboardList count={8} />
        )
      ) : filteredItems.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-20 h-20 bg-gradient-to-br from-[#007AFF]/10 to-[#5856D6]/10 rounded-3xl flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-[#007AFF]" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {searchQuery ? "No results found" : "Start your research journey"}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-8">
            {searchQuery
              ? "Try adjusting your search terms"
              : "Install the browser extension to capture content from any website instantly."}
          </p>
          {!searchQuery && (
            <a
              href="https://chromewebstore.google.com/detail/researchmate/decekloddlffcnegkfbkfngkjikfchoh"
              target="_blank"
              rel="noopener noreferrer"
            >
              <button className="flex items-center gap-2 px-6 py-3 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-full transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95">
                <Chrome className="w-5 h-5" />
                Get Extension
              </button>
            </a>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-animate">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setSelectedItem(item);
                setIsModalOpen(true);
              }}
              className="group relative bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-gray-200/50 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20 hover:-translate-y-0.5 flex flex-col h-[240px]"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: `${getSourceColor(
                      item.deviceSource || "web"
                    )}15`,
                  }}
                >
                  <span
                    style={{
                      color: getSourceColor(item.deviceSource || "web"),
                    }}
                  >
                    {getSourceIcon(item.deviceSource || "web")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {item.aiSummary && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white text-[10px] font-semibold rounded-full">
                      <Zap className="w-3 h-3" />
                      AI
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 leading-snug">
                  {item.sourceTitle || "Untitled Research"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
                  {item.aiSummary || item.text || item.ocrText}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {item.tags.length}
                    </span>
                  </div>
                )}
              </div>

              {/* Delete Button (on hover) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteItem(item.id);
                }}
                aria-label="Delete item"
                className="absolute top-3 right-3 p-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-[#FF3B30] rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <TrashIcon size={16} dangerHover />
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-200/50 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setSelectedItem(item);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors group"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: `${getSourceColor(
                    item.deviceSource || "web"
                  )}15`,
                }}
              >
                <span
                  style={{ color: getSourceColor(item.deviceSource || "web") }}
                >
                  {getSourceIcon(item.deviceSource || "web")}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                  {item.sourceTitle || "Untitled Research"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {item.aiSummary || item.text || item.ocrText}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {item.aiSummary && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white text-[10px] font-semibold rounded-full">
                    <Zap className="w-3 h-3" />
                    AI
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteItem(item.id);
                  }}
                  aria-label="Delete item"
                  className="p-2 text-gray-400 hover:text-[#FF3B30] rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <TrashIcon size={16} dangerHover />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========== DETAIL MODAL ========== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedItem?.sourceTitle || "Research Detail"}
        size="xl"
      >
        {selectedItem && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Content Card */}
              <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Content
                  </h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedItem.text || "");
                      showToast("Copied to clipboard!", "success");
                    }}
                    aria-label="Copy to clipboard"
                    className="p-1.5 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-lg transition-colors"
                  >
                    <CopyIcon size={16} />
                  </button>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-h-[300px] overflow-y-auto">
                  {selectedItem.text || selectedItem.ocrText}
                </div>
              </div>

              {/* Image Preview */}
              {selectedItem.imageUrl && (
                <img
                  src={selectedItem.imageUrl}
                  alt="Source"
                  className="rounded-xl w-full object-cover border border-gray-200 dark:border-gray-700"
                />
              )}

              {/* Tags */}
              {selectedItem.tags && selectedItem.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-[#F5F5F7] dark:bg-[#2C2C2E] text-gray-600 dark:text-gray-400 text-sm rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* AI Summary Card */}
              <div className="bg-gradient-to-br from-[#007AFF]/10 via-[#5856D6]/10 to-[#AF52DE]/10 dark:from-[#007AFF]/20 dark:via-[#5856D6]/20 dark:to-[#AF52DE]/20 rounded-xl p-5 border border-[#007AFF]/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    AI Summary
                  </h4>
                </div>
                {selectedItem.aiSummary ? (
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {selectedItem.aiSummary}
                  </p>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-4">
                      No AI summary generated yet.
                    </p>
                    <button
                      onClick={() => handleGenerateSummary(selectedItem)}
                      className="w-full py-2.5 bg-[#007AFF] hover:bg-[#0066DD] text-white text-sm font-medium rounded-xl transition-all active:scale-[0.98]"
                    >
                      Generate Summary
                    </button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Actions
                </h4>
                {selectedItem.sourceUrl && (
                  <a
                    href={selectedItem.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 bg-white dark:bg-[#2C2C2E] rounded-xl hover:bg-gray-50 dark:hover:bg-[#3A3A3C] transition-colors"
                  >
                    <div className="w-9 h-9 bg-[#007AFF]/10 rounded-lg flex items-center justify-center">
                      <ExternalLinkIcon size={16} color="#007AFF" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Open Original Source
                    </span>
                  </a>
                )}
                <button className="w-full flex items-center gap-3 p-3 bg-white dark:bg-[#2C2C2E] rounded-xl hover:bg-gray-50 dark:hover:bg-[#3A3A3C] transition-colors">
                  <div className="w-9 h-9 bg-[#5856D6]/10 rounded-lg flex items-center justify-center">
                    <Share2 className="w-4 h-4 text-[#5856D6]" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Share Research
                  </span>
                </button>
                <button
                  onClick={() => handleDeleteItem(selectedItem.id)}
                  className="w-full flex items-center gap-3 p-3 bg-white dark:bg-[#2C2C2E] rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <div className="w-9 h-9 bg-[#FF3B30]/10 rounded-lg flex items-center justify-center">
                    <TrashIcon size={16} color="#FF3B30" dangerHover />
                  </div>
                  <span className="text-sm font-medium text-[#FF3B30]">
                    Delete Item
                  </span>
                </button>
              </div>

              {/* Metadata */}
              <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-xl p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Source</span>
                    <span className="text-gray-900 dark:text-white capitalize">
                      {selectedItem.deviceSource || "Web"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(selectedItem.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Updated</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(selectedItem.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() =>
          setConfirmDialog({ isOpen: false, itemId: null, isDeleting: false })
        }
        onConfirm={confirmDeleteItem}
        title="Delete Item"
        message="Are you sure you want to delete this research item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={confirmDialog.isDeleting}
      />

      {/* Bulk Actions Bar */}
      <BulkActions
        selectedCount={selectedItems.size}
        totalCount={filteredItems.length}
        onSelectAll={selectAllItems}
        onDeselectAll={deselectAllItems}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleBulkExport}
        isDeleting={isBulkDeleting}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      {/* Advanced Search Filters Modal */}
      <AdvancedSearchFilter
        isOpen={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        onApply={handleApplyFilters}
        availableTags={allTags}
      />
    </div>
  );
};

export default Dashboard;
