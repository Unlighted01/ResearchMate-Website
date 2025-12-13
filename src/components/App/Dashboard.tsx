// ============================================
// PART 1: DASHBOARD PAGE
// ============================================

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { Button, Card, Badge, Modal } from "../shared/UIComponents";
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
  Trash2,
  Copy,
  Zap,
  Share2,
  Download,
} from "lucide-react";
import {
  getAllItems,
  deleteItem,
  updateItem,
  subscribeToItems,
  StorageItem,
} from "../../services/storageService";
import { generateSummary } from "../../services/geminiService";

// Helper for icons
const getSourceIcon = (source: string) => {
  switch (source) {
    case "extension":
      return <Laptop className="w-4 h-4" />;
    case "mobile":
      return <Smartphone className="w-4 h-4" />;
    case "smart_pen":
      return <PenTool className="w-4 h-4" />;
    case "web":
      return <Globe className="w-4 h-4" />;
    default:
      return <Layout className="w-4 h-4" />;
  }
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
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const { showToast } = useToast();

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
    const setupRealTime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const unsubscribe = subscribeToItems(user.id, (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            setItems((prev) => [payload.new!, ...prev]);
            showToast("New item synced!", "success");
            setLastSyncTime(new Date());
          } else if (payload.eventType === "UPDATE" && payload.new) {
            setItems((prev) =>
              prev.map((item) =>
                item.id === payload.new!.id ? payload.new! : item
              )
            );
            setLastSyncTime(new Date());
          } else if (payload.eventType === "DELETE" && payload.old) {
            setItems((prev) =>
              prev.filter((item) => item.id !== payload.old!.id)
            );
            setLastSyncTime(new Date());
          }
        });
        setIsRealTimeConnected(true);
        return () => {
          unsubscribe();
          setIsRealTimeConnected(false);
        };
      }
    };
    const cleanup = setupRealTime();
    return () => {
      cleanup.then((fn) => fn && fn());
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
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      showToast("Item deleted", "success");
      if (selectedItem?.id === id) {
        setIsModalOpen(false);
        setSelectedItem(null);
      }
    } catch (error) {
      showToast("Failed to delete item", "error");
    }
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.text?.toLowerCase().includes(query) ||
      item.sourceTitle?.toLowerCase().includes(query) ||
      item.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 font-medium">
            {isRealTimeConnected ? (
              <span className="flex items-center gap-1.5 text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                <Wifi className="w-3 h-3" /> Real-time active
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-gray-400">
                <WifiOff className="w-3 h-3" /> Connecting...
              </span>
            )}
            {lastSyncTime && (
              <span className="opacity-60">
                • Synced {lastSyncTime.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchItems}
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </Button>
          <Link to="/app/settings">
            <Button size="sm" className="shadow-lg shadow-primary-500/20">
              <Plus className="w-4 h-4 mr-2" /> Import
            </Button>
          </Link>
        </div>
      </div>

      {/* --- SEARCH & STATS --- */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search across all your research..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-primary-500 text-base outline-none dark:text-white placeholder-gray-400 transition-all hover:shadow-md"
          />
        </div>

        {/* Quick Stats Mini-Cards */}
        <div className="flex gap-4 overflow-x-auto pb-2 lg:pb-0">
          <div className="bg-white dark:bg-gray-800 px-6 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 min-w-[140px] flex flex-col justify-center">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Total Items
            </span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {items.length}
            </span>
          </div>
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 px-6 py-3 rounded-2xl shadow-lg shadow-primary-500/20 min-w-[140px] flex flex-col justify-center text-white">
            <span className="text-xs font-semibold text-primary-100 uppercase tracking-wider">
              AI Summaries
            </span>
            <span className="text-2xl font-bold">
              {items.filter((i) => i.aiSummary).length}
            </span>
          </div>
        </div>
      </div>

      {/* --- CONTENT GRID --- */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-56 bg-gray-100 dark:bg-gray-800/50 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-800">
          {searchQuery ? (
            <>
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                No results found
              </h3>
              <p className="text-gray-500 mt-2">
                We couldn't find anything matching "{searchQuery}"
              </p>
              <Button
                variant="ghost"
                className="mt-4"
                onClick={() => setSearchQuery("")}
              >
                Clear Search
              </Button>
            </>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-primary-50 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-primary-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Start your research journey
              </h3>
              <p className="text-gray-500 mb-8">
                Install the extension to capture content from any website
                instantly.
              </p>
              <div className="flex gap-4 justify-center">
                <Button>
                  <Chrome className="w-4 h-4 mr-2" /> Get Extension
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setSelectedItem(item);
                setIsModalOpen(true);
              }}
              className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-[280px]"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-4">
                <div
                  className={`p-2 rounded-lg ${
                    item.deviceSource === "smart_pen"
                      ? "bg-orange-50 text-orange-600 dark:bg-orange-900/20"
                      : "bg-gray-50 text-gray-600 dark:bg-gray-700/50"
                  }`}
                >
                  {getSourceIcon(item.deviceSource || "web")}
                </div>
                {item.aiSummary && (
                  <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" /> AI
                  </span>
                )}
              </div>

              {/* Content Preview */}
              <div className="flex-1 overflow-hidden">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 leading-snug">
                  {item.sourceTitle || "Untitled Research"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-4 leading-relaxed">
                  {item.aiSummary || item.text || item.ocrText}
                </p>
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between text-xs text-gray-400">
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                <div className="flex gap-1">
                  {item.tags?.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Hover Actions */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteItem(item.id);
                }}
                className="absolute top-4 right-4 p-2 bg-white dark:bg-gray-800 text-red-500 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                aria-label="Delete item"
                title="Delete item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* --- DETAIL MODAL --- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedItem?.sourceTitle || "Research Detail"}
        size="xl"
      >
        {selectedItem && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Raw Content
                  </h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedItem.text || "");
                      showToast("Copied!", "success");
                    }}
                    className="text-primary-600 hover:bg-primary-50 p-1.5 rounded-md transition-colors"
                    aria-label="Copy content to clipboard"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {selectedItem.text || selectedItem.ocrText}
                </div>
              </div>

              {selectedItem.imageUrl && (
                <img
                  src={selectedItem.imageUrl}
                  alt="Source"
                  className="rounded-xl w-full object-cover border border-gray-200 dark:border-gray-700"
                />
              )}
            </div>

            <div className="space-y-6">
              {/* AI Section */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <div className="flex items-center gap-2 mb-4 text-indigo-700 dark:text-indigo-300 font-semibold">
                  <Zap className="w-5 h-5" /> AI Analysis
                </div>
                {selectedItem.aiSummary ? (
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                    {selectedItem.aiSummary}
                  </p>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-3">
                      No summary generated yet.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleGenerateSummary(selectedItem)}
                      className="w-full"
                    >
                      Generate Summary
                    </Button>
                  </div>
                )}
              </div>

              {/* Actions List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Actions
                </h4>
                {selectedItem.sourceUrl && (
                  <a
                    href={selectedItem.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700 group"
                  >
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-md text-blue-600">
                      <Globe className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Open Original Source
                    </span>
                  </a>
                )}
                <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-left">
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-md text-purple-600">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Share Research
                  </span>
                </button>
                <button
                  onClick={() => handleDeleteItem(selectedItem.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors border border-transparent hover:border-red-100 text-left"
                >
                  <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-md text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-red-600">
                    Delete Permanently
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Dashboard;
