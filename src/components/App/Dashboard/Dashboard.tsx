// ============================================
// DASHBOARD PAGE - Apple Design
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { supabase } from "../../../services/supabaseClient";
import {
  Button,
  Card,
  Badge,
  Modal,
  SearchInput,
} from "../../shared/ui";
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
  FolderPlus,
  FolderOpen,
  Check,
  BookOpen,
} from "lucide-react";
import { TrashIcon, CopyIcon, ExternalLinkIcon, DownloadIcon } from "../../icons";
import {
  getAllItems,
  deleteItem,
  updateItem,
  subscribeToItems,
  StorageItem,
} from "../../../services/storageService";
import {
  getAllCollections,
  addItemToCollection,
  moveItemsToCollection,
  Collection,
} from "../../../services/collectionsService";
import { generateItemSummary } from "../../../services/geminiService";
import SmartPenScanModal from "../SmartPenScanModal";
import ConfirmDialog from "../../shared/ConfirmDialog";
import {
  SkeletonDashboardGrid,
  SkeletonDashboardList,
} from "../../shared/SkeletonLoader";
import {
  useKeyboardShortcuts,
  COMMON_SHORTCUTS,
} from "../../../hooks/useKeyboardShortcuts";
import KeyboardShortcutsModal from "../../shared/KeyboardShortcutsModal";
import BulkActions from "../../shared/BulkActions";
import AdvancedSearchFilter, {
  SearchFilters,
} from "../../shared/AdvancedSearchFilter";
import { exportItems } from "../../../utils/export";
import { generateMarkdownTemplate } from "../../../utils/markdownGenerator";
import { useRef } from "react";
import { useNotifications } from "../../../context/NotificationContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const stripMarkdown = (text: string) =>
  text
    .replace(/^#{1,6} /gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\|.*\|/g, "")
    .replace(/^[-*+] /gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-]{3,}\s*$/gm, "")
    .trim();

const isMarkdown = (text: string) => /^#{1,3} |\n#{1,3} |\|.+\|/.test(text);

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
  const navigate = useNavigate();
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSmartPenScan, setSelectedSmartPenScan] = useState<StorageItem | null>(null);
  const [isSummarizingSmartPen, setIsSummarizingSmartPen] = useState(false);
  const [isSummarizingItem, setIsSummarizingItem] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchOffset, setFetchOffset] = useState(0);
  const PAGE_SIZE = 100;
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    return (
      (localStorage.getItem("researchMate_viewMode") as "grid" | "list") ||
      "grid"
    );
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    itemId: string | null;
    isDeleting: boolean;
  }>({ isOpen: false, itemId: null, isDeleting: false });

  // Bulk operations
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Collections state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [collectionActionType, setCollectionActionType] = useState<
    "single" | "bulk" | null
  >(null);

  // Modals
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Filters
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilters>({});

  const { showToast } = useToast();
  const { addNotification } = useNotifications();

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
      handler: () => {
        setViewMode((prev) => {
          const next = prev === "grid" ? "list" : "grid";
          localStorage.setItem("researchMate_viewMode", next);
          return next;
        });
      },
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
      const data = await getAllItems(PAGE_SIZE, 0);
      setItems(data);
      setFetchOffset(PAGE_SIZE);
      setHasMore(data.length === PAGE_SIZE);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error("Failed to fetch items:", error);
      showToast("Failed to load items", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, PAGE_SIZE]);

  const loadMoreItems = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await getAllItems(PAGE_SIZE, fetchOffset);
      setItems((prev) => [...prev, ...data]);
      setFetchOffset((prev) => prev + PAGE_SIZE);
      setHasMore(data.length === PAGE_SIZE);
    } catch (error) {
      showToast("Failed to load more items", "error");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, fetchOffset, PAGE_SIZE, showToast]);

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
            addNotification(
              "sync",
              `New item "${payload.new!.sourceTitle || "Untitled"}" synced from ${payload.new!.deviceSource || "web"}`,
            );
          } else if (payload.eventType === "UPDATE" && payload.new) {
            setItems((prev) =>
              prev.map((item) =>
                item.id === payload.new!.id ? payload.new! : item,
              ),
            );
            setLastSyncTime(syncTime);
          } else if (payload.eventType === "DELETE" && payload.old) {
            setItems((prev) =>
              prev.filter((item) => item.id !== payload.old!.id),
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

  const fetchCollections = useCallback(async () => {
    try {
      const data = await getAllCollections();
      setCollections(data);
    } catch (error) {
      console.error("Failed to fetch collections:", error);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleGenerateSummary = async (item: StorageItem) => {
    if (isSummarizingItem) return;
    setIsSummarizingItem(true);
    showToast("Generating AI summary...", "info");
    try {
      const result = await generateItemSummary(item.id, item.text || item.ocrText || "");
      if (result.ok && result.summary) {
        const updated = { ...item, aiSummary: result.summary };
        setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
        setSelectedItem(updated);
        showToast("Summary generated!", "success");
        addNotification(
          "summary",
          `AI summary generated for "${item.sourceTitle || "Untitled"}"`,
        );
      } else {
        showToast(`Failed to generate summary: ${result.error || result.reason}`, "error");
      }
    } catch (error) {
      showToast("Failed to generate summary", "error");
    } finally {
      setIsSummarizingItem(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setConfirmDialog({ isOpen: true, itemId: id, isDeleting: false });
  };

  const handleColorChange = async (item: StorageItem, color: string) => {
    try {
      const newColor = item.color === color ? undefined : (color as any);
      const updates = { color: newColor };
      await updateItem(item.id, updates);
      
      // Update local state
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, ...updates } : i))
      );
      
      if (selectedItem?.id === item.id) {
        setSelectedItem((prev) => (prev ? { ...prev, ...updates } : null));
      }
      
      showToast("Color updated!", "success");
    } catch (err) {
      showToast("Failed to update color", "error");
    }
  };

  const confirmDeleteItem = async () => {
    if (!confirmDialog.itemId) return;

    setConfirmDialog((prev) => ({ ...prev, isDeleting: true }));

    try {
      await deleteItem(confirmDialog.itemId);
      setItems((prev) =>
        prev.filter((item) => item.id !== confirmDialog.itemId),
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
        deleteItem(id),
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

  const handleBulkExport = async (format: "json" | "csv" | "md" | "pdf") => {
    if (selectedItems.size === 0) {
      showToast("No items selected for export", "error");
      return;
    }

    const itemsToExport = items.filter((item) => selectedItems.has(item.id));

    try {
      if (format === "pdf") {
        showToast("Generating PDF...", "info");
      }
      await exportItems(itemsToExport, format);
      showToast(
        `Exported ${itemsToExport.length} items to ${format.toUpperCase()}`,
        "success",
      );
    } catch (error) {
      showToast(`Export failed: ${(error as Error).message}`, "error");
    }
  };

  const handleShare = async (item: StorageItem) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.sourceTitle || "Research Note",
          text: item.aiSummary || item.text || item.ocrText,
          url: item.sourceUrl,
        });
      } else {
        const textToCopy = `${item.sourceTitle || "Research Note"}\n\n${
          item.aiSummary || item.text || item.ocrText
        }\n\n${item.sourceUrl || ""}`;
        await navigator.clipboard.writeText(textToCopy);
        showToast("Copied to clipboard for sharing", "success");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        showToast("Failed to share item", "error");
      }
    }
  };

  const handleCopyMarkdown = async (item: StorageItem) => {
    try {
      const mdContent = generateMarkdownTemplate(item);
      await navigator.clipboard.writeText(mdContent);
      showToast("Markdown copied to clipboard!", "success");
    } catch (e) {
      showToast("Failed to copy markdown", "error");
    }
  };

  const handleAddToCollection = async (collectionId: string) => {
    try {
      if (collectionActionType === "single" && selectedItem) {
        await addItemToCollection(selectedItem.id, collectionId);
        showToast("Added to collection", "success");
      } else if (collectionActionType === "bulk" && selectedItems.size > 0) {
        await moveItemsToCollection(Array.from(selectedItems), collectionId);
        showToast(`Added ${selectedItems.size} items to collection`, "success");
        setSelectedItems(new Set());
      }
      setShowCollectionModal(false);
    } catch (error) {
      showToast("Failed to add to collection", "error");
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
        advancedFilters.deviceSource?.includes(item.deviceSource || ""),
      );
    }

    if (advancedFilters.hasAiSummary !== undefined) {
      filtered = filtered.filter((item) =>
        advancedFilters.hasAiSummary ? !!item.aiSummary : !item.aiSummary,
      );
    }

    if (advancedFilters.tags && advancedFilters.tags.length > 0) {
      filtered = filtered.filter((item) =>
        advancedFilters.tags?.some((tag) => item.tags?.includes(tag)),
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

  // ── Import handlers ──────────────────────────────────────────────────
  const importImageFile = async (file: File): Promise<void> => {
    const base64DataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const response = await fetch("/api/ocr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ image: base64DataUrl, includeSummary: false }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Failed to extract text from image");
    }

    const data = await response.json();
    if (!data.ocrText?.trim()) throw new Error("No readable text found in image.");

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("items").insert({
      user_id: user?.id,
      text: data.ocrText.trim(),
      source_title: file.name,
      device_source: "smart_pen",
      ocr_confidence: data.ocrConfidence ?? null,
    });
    if (error) throw error;
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsImporting(true);
    let successCount = 0;
    const errors: string[] = [];

    const { data: { user } } = await supabase.auth.getUser();

    for (const file of files) {
      try {
        if (file.name.toLowerCase().endsWith(".pdf")) {
          showToast(`Extracting text from "${file.name}"...`, "info");
          const pdfjsLib = await import("pdfjs-dist");
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
          const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map((item: any) => item.str).join(" ") + "\n\n";
          }
          const cleanText = fullText.trim();
          if (!cleanText) throw new Error("No readable text found in PDF.");
          const { error } = await supabase.from("items").insert({
            user_id: user?.id,
            text: cleanText,
            source_title: file.name.replace(/\.pdf$/i, ""),
            device_source: "web",
          });
          if (error) throw error;
          successCount++;
        } else if (file.type.startsWith("image/")) {
          showToast(`Running OCR on "${file.name}"...`, "info");
          await importImageFile(file);
          successCount++;
        } else if (file.name.toLowerCase().endsWith(".json")) {
          const parsed = JSON.parse(await file.text());
          if (!Array.isArray(parsed)) throw new Error("Invalid JSON format.");
          for (const item of parsed) {
            const { error } = await supabase.from("items").insert({
              user_id: user?.id,
              text: item.text,
              source_url: item.source_url,
              source_title: item.source_title,
              tags: item.tags,
              ai_summary: item.ai_summary,
              device_source: "web",
            });
            if (!error) successCount++;
          }
        } else {
          errors.push(`"${file.name}": unsupported format`);
        }
      } catch (err: any) {
        errors.push(`"${file.name}": ${err.message}`);
      }
    }

    if (successCount > 0) showToast(`Imported ${successCount} item(s)!`, "success");
    if (errors.length > 0) showToast(`${errors.length} file(s) failed.`, "error");
    setIsImporting(false);
    e.target.value = "";
  };
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ========== HEADER ========== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="theme-title text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
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
          <button
            onClick={() => importFileRef.current?.click()}
            disabled={isImporting}
            className="theme-btn theme-btn-primary flex items-center gap-2 px-4 py-2.5 bg-[#007AFF] hover:bg-[#0066DD] text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isImporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {isImporting ? "Importing..." : "Import"}
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept=".json,.pdf,image/*"
            multiple
            className="hidden"
            onChange={handleImport}
          />
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
            className="theme-search theme-input w-full pl-11 pr-4 py-3 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition-all"
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
            className="theme-surface theme-btn theme-btn-outline flex items-center gap-2 px-4 py-3 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
              onClick={() => {
                setViewMode("grid");
                localStorage.setItem("researchMate_viewMode", "grid");
              }}
              aria-label="Grid view"
              className={`p-2 rounded-lg transition-colors ${viewMode === "grid"
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                  : "text-gray-400 hover:text-gray-600"
                }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setViewMode("list");
                localStorage.setItem("researchMate_viewMode", "list");
              }}
              aria-label="List view"
              className={`p-2 rounded-lg transition-colors ${viewMode === "list"
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-stagger">
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
            className="theme-surface glass-card hover-lift rounded-xl p-4 animate-fade-up"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {stat.label}
            </p>
            <p className="theme-stat text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ============================================ */}
      {/* COLLECTIONS MODAL */}
      {/* This is where the Modal component would be if it were present */}
      {/* For example: */}
      {/* <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div>
          Modal Content Here
        </div>
      </Modal> */}

      {/* ========== CONTENT ========== */}
      {loading ? (
        viewMode === "grid" ? (
          <SkeletonDashboardGrid count={8} />
        ) : (
          <SkeletonDashboardList count={8} />
        )
      ) : filteredItems.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 px-4 animate-fade-up">
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
              <button className="flex items-center gap-2 px-6 py-3 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-full transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95 hover-lift">
                <Chrome className="w-5 h-5" />
                Get Extension
              </button>
            </a>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-stagger">
          {filteredItems.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: Math.min(idx * 0.05, 0.3),
                ease: [0.25, 0.1, 0.25, 1],
              }}
              whileHover={{
                y: -6,
                boxShadow: "0 16px 40px -8px rgba(0, 122, 255, 0.15)",
              }}
              onClick={() => {
                if (item.deviceSource === "smart_pen") {
                  setSelectedSmartPenScan(item);
                } else {
                  setSelectedItem(item);
                  setIsModalOpen(true);
                }
              }}
              className={`group relative glass-card rounded-2xl p-5 flex flex-col h-[240px] transition-all duration-300 hover:border-[#007AFF]/30
                ${
                  item.color === "yellow" ? "border-l-[4px] border-l-[#FBBF24] bg-amber-50/10 dark:bg-amber-900/10" :
                  item.color === "green" ? "border-l-[4px] border-l-[#34D399] bg-emerald-50/10 dark:bg-emerald-900/10" :
                  item.color === "blue" ? "border-l-[4px] border-l-[#60A5FA] bg-blue-50/10 dark:bg-blue-900/10" :
                  item.color === "red" ? "border-l-[4px] border-l-[#F87171] bg-red-50/10 dark:bg-red-900/10" :
                  item.color === "purple" ? "border-l-[4px] border-l-[#A78BFA] bg-purple-50/10 dark:bg-purple-900/10" : ""
                }
                ${selectedItems.has(item.id)
                  ? "ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
                  : ""
                } cursor-pointer`}
            >
              {/* Checkbox — bottom-left, away from AI badge */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItemSelection(item.id);
                }}
                className={`absolute bottom-3 left-3 z-10 p-1 rounded-lg border bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm transition-all duration-200 ${
                  selectedItems.has(item.id) || selectedItems.size > 0
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100"
                } ${
                  selectedItems.has(item.id)
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/40"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                }`}
                aria-label={
                  selectedItems.has(item.id) ? "Deselect item" : "Select item"
                }
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors dark:border-gray-600 ${
                    selectedItems.has(item.id)
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {selectedItems.has(item.id) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
              </button>

              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: `${getSourceColor(
                      item.deviceSource || "web",
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
                  {(() => { const t = item.aiSummary || item.text || item.ocrText || ""; return isMarkdown(t) ? stripMarkdown(t) : t; })()}
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
            </motion.div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-200/50 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 flex flex-col w-full max-w-full overflow-hidden">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.deviceSource === "smart_pen") {
                  setSelectedSmartPenScan(item);
                } else {
                  setSelectedItem(item);
                  setIsModalOpen(true);
                }
              }}
              className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group 
                ${
                  item.color === "yellow" ? "border-l-[4px] border-l-[#FBBF24] bg-amber-50/10 dark:bg-amber-900/10" :
                  item.color === "green" ? "border-l-[4px] border-l-[#34D399] bg-emerald-50/10 dark:bg-emerald-900/10" :
                  item.color === "blue" ? "border-l-[4px] border-l-[#60A5FA] bg-blue-50/10 dark:bg-blue-900/10" :
                  item.color === "red" ? "border-l-[4px] border-l-[#F87171] bg-red-50/10 dark:bg-red-900/10" :
                  item.color === "purple" ? "border-l-[4px] border-l-[#A78BFA] bg-purple-50/10 dark:bg-purple-900/10" : ""
                }
                ${selectedItems.has(item.id)
                  ? "bg-blue-50/50 dark:bg-blue-900/10"
                  : ""
                } cursor-pointer`}
            >
              {/* Leftmost Checkbox + Icon Container for Mobile */}
              <div className="flex items-center gap-4 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleItemSelection(item.id);
                  }}
                  className={`flex-shrink-0 z-10 transition-all duration-200 ${selectedItems.has(item.id) || selectedItems.size > 0
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                    }`}
                  aria-label={
                    selectedItems.has(item.id) ? "Deselect item" : "Select item"
                  }
                >
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors dark:border-gray-600 ${selectedItems.has(item.id)
                        ? "bg-blue-600 border-blue-600"
                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-400"
                      }`}
                  >
                    {selectedItems.has(item.id) && (
                      <Check className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                </button>

                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `${getSourceColor(
                      item.deviceSource || "web",
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
              </div>

              {/* Text Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                  {item.sourceTitle || "Untitled Research"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {(() => { const t = item.aiSummary || item.text || item.ocrText || ""; return isMarkdown(t) ? stripMarkdown(t) : t; })()}
                </p>
              </div>

              {/* Footer / Actions */}
              <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0 mt-2 sm:mt-0">
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

      {/* ========== LOAD MORE ========== */}
      {hasMore && !loading && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={loadMoreItems}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </button>
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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyMarkdown(selectedItem)}
                      aria-label="Copy as Markdown"
                      title="Copy as Markdown"
                      className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-[#3A3A3C] border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-type-2"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M2.5 15h3"/><path d="M4 13v6"/><path d="M9 13v6"/><path d="M11 16l-2-3"/><path d="M11 19l-2-3"/><path d="M16 13v6"/><path d="M14 15h3"/></svg>
                      Markdown
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedItem.text || "");
                        showToast("Copied to clipboard!", "success");
                      }}
                      aria-label="Copy to clipboard"
                      title="Copy Raw Text"
                      className="p-1.5 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-lg transition-colors border border-transparent"
                    >
                      <CopyIcon size={16} />
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-h-[300px] overflow-y-auto">
                  {(() => {
                    const t = selectedItem.text || selectedItem.ocrText || "";
                    return isMarkdown(t) ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => <h1 className="text-base font-bold text-gray-900 dark:text-white mt-3 mb-1 border-b border-gray-200 dark:border-gray-700 pb-1">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-sm font-bold text-blue-900 dark:text-blue-300 mt-2 mb-1">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2 mb-0.5">{children}</h3>,
                          p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                          strong: ({ children }) => <strong className="font-bold text-gray-900 dark:text-white">{children}</strong>,
                          em: ({ children }) => <em className="italic text-gray-500 dark:text-gray-400">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-2">{children}</ol>,
                          blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 dark:border-gray-600 pl-3 italic text-gray-500 dark:text-gray-400 text-xs my-1">{children}</blockquote>,
                          hr: () => <hr className="border-gray-200 dark:border-gray-700 my-2" />,
                          table: ({ children }) => <div className="overflow-x-auto my-2"><table className="w-full text-xs border-collapse">{children}</table></div>,
                          thead: ({ children }) => <thead className="bg-blue-50 dark:bg-blue-900/30">{children}</thead>,
                          th: ({ children }) => <th className="border border-gray-200 dark:border-gray-700 px-2 py-1 font-semibold text-gray-900 dark:text-white text-left">{children}</th>,
                          td: ({ children }) => <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 align-top">{children}</td>,
                        }}
                      >
                        {t}
                      </ReactMarkdown>
                    ) : (
                      <span className="whitespace-pre-wrap">{t}</span>
                    );
                  })()}
                </div>
              </div>

              {/* Highlight Color Picker */}
              <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-xl p-4">
                <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                  Highlight Color
                </h4>
                <div className="flex items-center gap-3">
                  {[
                    { name: "yellow", hex: "#FBBF24" },
                    { name: "green", hex: "#34D399" },
                    { name: "blue", hex: "#60A5FA" },
                    { name: "red", hex: "#F87171" },
                    { name: "purple", hex: "#A78BFA" },
                  ].map((c) => (
                    <button
                      key={c.name}
                      onClick={() => handleColorChange(selectedItem, c.name)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        selectedItem.color === c.name
                          ? "border-gray-900 dark:border-white scale-110 shadow-sm"
                          : "border-transparent hover:scale-110"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={`Mark as ${c.name}`}
                    />
                  ))}
                  {selectedItem.color && (
                    <button
                      onClick={() => handleColorChange(selectedItem, "")}
                      className="ml-auto text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors uppercase font-bold tracking-tighter"
                    >
                      Clear
                    </button>
                  )}
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
                      disabled={isSummarizingItem}
                      className="w-full py-2.5 bg-[#007AFF] hover:bg-[#0066DD] text-white text-sm font-medium rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSummarizingItem ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Generating...
                        </>
                      ) : (
                        "Generate Summary"
                      )}
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
                <button
                  onClick={() => handleShare(selectedItem)}
                  className="w-full flex items-center gap-3 p-3 bg-white dark:bg-[#2C2C2E] rounded-xl hover:bg-gray-50 dark:hover:bg-[#3A3A3C] transition-colors"
                >
                  <div className="w-9 h-9 bg-[#5856D6]/10 rounded-lg flex items-center justify-center">
                    <Share2 className="w-4 h-4 text-[#5856D6]" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Share Research
                  </span>
                </button>
                <button
                  onClick={() => {
                    setCollectionActionType("single");
                    setShowCollectionModal(true);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-white dark:bg-[#2C2C2E] rounded-xl hover:bg-gray-50 dark:hover:bg-[#3A3A3C] transition-colors"
                >
                  <div className="w-9 h-9 bg-[#8B5CF6]/10 rounded-lg flex items-center justify-center">
                    <FolderPlus className="w-4 h-4 text-[#8B5CF6]" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Add to Collection
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

      {/* ========== SMART PEN SCAN MODAL ========== */}
      <SmartPenScanModal
        scan={selectedSmartPenScan}
        onClose={() => setSelectedSmartPenScan(null)}
        onUpdate={(id, updates) => {
          setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
          if (selectedSmartPenScan?.id === id) {
            setSelectedSmartPenScan((prev) => prev ? { ...prev, ...updates } : null);
          }
        }}
        onDelete={(id) => handleDeleteItem(id)}
        onGenerateSummary={async (scan) => {
          setIsSummarizingSmartPen(true);
          await handleGenerateSummary(scan);
          setIsSummarizingSmartPen(false);
        }}
        onRunOCR={async (scan) => {
          if (!scan.imageUrl) return;
          try {
            const response = await fetch("/api/ocr", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: scan.imageUrl, includeSummary: true }),
            });
            if (!response.ok) throw new Error((await response.json()).error || "OCR failed");
            const result = await response.json();
            const updates = {
              text: result.ocrText,
              ocrText: result.ocrText,
              aiSummary: result.aiSummary || undefined,
            };
            await updateItem(scan.id, updates);
            setItems((prev) => prev.map((i) => (i.id === scan.id ? { ...i, ...updates } : i)));
            setSelectedSmartPenScan((prev) => prev ? { ...prev, ...updates } : null);
            showToast("Text extracted!", "success");
          } catch (err) {
            showToast(err instanceof Error ? err.message : "OCR failed", "error");
          }
        }}
        isSummarizing={isSummarizingSmartPen}
      />

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
        onBulkAddToCollection={() => {
          setCollectionActionType("bulk");
          setShowCollectionModal(true);
        }}
        isDeleting={isBulkDeleting}
      />

      {/* Select Collection Modal */}
      <Modal
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
        title={
          collectionActionType === "bulk"
            ? `Add ${selectedItems.size} items to Collection`
            : "Add to Collection"
        }
      >
        <div className="max-h-96 overflow-y-auto space-y-2">
          {collections.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No collections found. Create one in the Collections tab.
            </div>
          ) : (
            collections.map((col) => (
              <button
                key={col.id}
                onClick={() => handleAddToCollection(col.id)}
                className="w-full flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-md transition-all text-left group"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${col.color}20` }}
                >
                  <FolderPlus
                    className="w-5 h-5 transition-transform group-hover:scale-110"
                    style={{ color: col.color }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                    {col.name}
                  </h4>
                  <p className="text-xs text-gray-500 truncate">
                    {col.description || "No description"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </Modal>

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
