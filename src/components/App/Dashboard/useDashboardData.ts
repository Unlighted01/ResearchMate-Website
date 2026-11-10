// ============================================
// useDashboardData.ts - Dashboard state & data fetching
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  supabase,
  isSessionKnownInvalid,
  handleAuthError,
  isAuthError,
} from "../../../services/supabaseClient";
import {
  getAllItems,
  subscribeToItems,
  StorageItem,
} from "../../../services/storageService";
import {
  getAllCollections,
  Collection,
} from "../../../services/collectionsService";
import {
  getAllExams,
  deleteExam,
  getAllFlashcardDecks,
  deleteFlashcardDeck,
  StoredExam,
  FlashcardDeckRecord,
} from "../../../services/examService";
import {
  getImportBatches,
  ImportBatch,
} from "../../../services/questionBankService";
import { deleteImportBatch } from "../../../services/questionImportService";
import { useNotifications } from "../../../context/NotificationContext";
import { SearchFilters } from "../../shared/AdvancedSearchFilter";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

export interface UseDashboardDataReturn {
  // Items
  items: StorageItem[];
  setItems: React.Dispatch<React.SetStateAction<StorageItem[]>>;
  filteredItems: StorageItem[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // View mode
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;

  // Stats
  stats: { total: number; withAiSummary: number; fromExtension: number; thisWeek: number };
  allTags: string[];

  // Collections
  collections: Collection[];
  fetchCollections: () => Promise<void>;

  // Realtime
  isRealTimeConnected: boolean;
  lastSyncTime: Date | null;

  // Selection
  selectedItem: StorageItem | null;
  setSelectedItem: (item: StorageItem | null) => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  selectedSmartPenScan: StorageItem | null;
  setSelectedSmartPenScan: React.Dispatch<React.SetStateAction<StorageItem | null>>;

  // Bulk
  selectedItems: Set<string>;
  setSelectedItems: React.Dispatch<React.SetStateAction<Set<string>>>;

  // Modals
  showKeyboardShortcuts: boolean;
  setShowKeyboardShortcuts: (show: boolean) => void;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (show: boolean) => void;
  showExportMenu: boolean;
  setShowExportMenu: (show: boolean) => void;
  showCollectionModal: boolean;
  setShowCollectionModal: (show: boolean) => void;
  collectionActionType: "single" | "bulk" | null;
  setCollectionActionType: (type: "single" | "bulk" | null) => void;

  // Import
  isImporting: boolean;
  setIsImporting: (loading: boolean) => void;
  importFileRef: React.RefObject<HTMLInputElement | null>;

  // Summarizing
  isSummarizingSmartPen: boolean;
  setIsSummarizingSmartPen: (v: boolean) => void;
  isSummarizingItem: boolean;
  setIsSummarizingItem: (v: boolean) => void;
  isBulkDeleting: boolean;
  setIsBulkDeleting: (v: boolean) => void;

  // Confirm dialog
  confirmDialog: { isOpen: boolean; itemId: string | null; isDeleting: boolean };
  setConfirmDialog: React.Dispatch<React.SetStateAction<{ isOpen: boolean; itemId: string | null; isDeleting: boolean }>>;

  // Filters
  advancedFilters: SearchFilters;
  setAdvancedFilters: (filters: SearchFilters) => void;

  // Multi-Engine Assets
  exams: StoredExam[];
  filteredExams: StoredExam[];
  decks: FlashcardDeckRecord[];
  filteredDecks: FlashcardDeckRecord[];
  batches: ImportBatch[];
  filteredBatches: ImportBatch[];
  assetTab: "all" | "exams" | "flashcards" | "bank" | "materials";
  setAssetTab: (tab: "all" | "exams" | "flashcards" | "bank" | "materials") => void;
  deleteExamAsset: (id: string, e?: React.MouseEvent) => Promise<void>;
  deleteDeckAsset: (id: string, e?: React.MouseEvent) => Promise<void>;
  deleteBatchAsset: (id: string, e?: React.MouseEvent) => Promise<void>;
  refreshAllAssets: () => Promise<void>;

  // Actions
  fetchItems: () => Promise<void>;
  loadMoreItems: () => Promise<void>;

  // Refs
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

// ============================================
// PART 3: HOOK IMPLEMENTATION
// ============================================

export function useDashboardData(
  showToast: (msg: string, type: "success" | "error" | "info") => void,
): UseDashboardDataReturn {
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

  // Multi-Engine Assets
  const [exams, setExams] = useState<StoredExam[]>([]);
  const [decks, setDecks] = useState<FlashcardDeckRecord[]>([]);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [assetTab, setAssetTab] = useState<"all" | "exams" | "flashcards" | "bank" | "materials">("all");

  const refreshAllAssets = useCallback(async () => {
    try {
      const [fetchedExams, fetchedDecks, fetchedBatches] = await Promise.all([
        getAllExams().catch(() => []),
        getAllFlashcardDecks().catch(() => []),
        getImportBatches().catch(() => []),
      ]);
      setExams(fetchedExams);
      setDecks(fetchedDecks);
      setBatches(fetchedBatches);
    } catch (err) {
      console.warn("Failed to refresh assets:", err);
    }
  }, []);

  const deleteExamAsset = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this saved exam simulation?")) return;
    await deleteExam(id);
    setExams((prev) => prev.filter((x) => x.id !== id));
    showToast("Exam simulation deleted.", "info");
  }, [showToast]);

  const deleteDeckAsset = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this saved flashcard deck?")) return;
    await deleteFlashcardDeck(id);
    setDecks((prev) => prev.filter((d) => d.id !== id));
    showToast("Flashcard deck deleted.", "info");
  }, [showToast]);

  const deleteBatchAsset = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this question bank batch? This will remove its questions.")) return;
    await deleteImportBatch(id);
    setBatches((prev) => prev.filter((b) => b.id !== id));
    showToast("Question bank batch deleted.", "info");
  }, [showToast]);

  // Initial load of multi-engine assets
  useEffect(() => {
    refreshAllAssets();
  }, [refreshAllAssets]);

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

  const { addNotification } = useNotifications();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ---------- EFFECTS ----------

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
      console.warn("Failed to fetch items, using local items:", error);
    } finally {
      setLoading(false);
    }
  }, [PAGE_SIZE]);

  const loadMoreItems = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await getAllItems(PAGE_SIZE, fetchOffset);
      setItems((prev) => [...prev, ...data]);
      setFetchOffset((prev) => prev + PAGE_SIZE);
      setHasMore(data.length === PAGE_SIZE);
    } catch (error) {
      console.warn("Failed to load more items:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, fetchOffset, PAGE_SIZE]);

  useEffect(() => {
    fetchItems();

    let unsubscribe: (() => void) | null = null;

    const setupRealTime = async () => {
      if (isSessionKnownInvalid()) {
        setIsRealTimeConnected(false);
        return;
      }

      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          if (isAuthError(error)) {
            await handleAuthError(error);
          }
          setIsRealTimeConnected(false);
          return;
        }

        if (user) {
          unsubscribe = subscribeToItems(user.id, (payload) => {
            const syncTime = new Date();

            if (payload.eventType === "INSERT" && payload.new) {
              setItems((prev) => [payload.new!, ...prev]);
              setLastSyncTime(syncTime);
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
      } catch {
        setIsRealTimeConnected(false);
      }
    };

    setupRealTime();

    return () => {
      if (unsubscribe) {
        unsubscribe();
        setIsRealTimeConnected(false);
      }
    };
  }, [fetchItems]);

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

  // ---------- COMPUTED ----------

  const filteredItems = useMemo(() => {
    let filtered = items;

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

  const filteredExams = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return exams;
    const q = debouncedSearchQuery.toLowerCase().trim();
    return exams.filter((e) =>
      e.title.toLowerCase().includes(q) ||
      (e.source_document_title && e.source_document_title.toLowerCase().includes(q)) ||
      (e.seed && e.seed.toLowerCase().includes(q))
    );
  }, [exams, debouncedSearchQuery]);

  const filteredDecks = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return decks;
    const q = debouncedSearchQuery.toLowerCase().trim();
    return decks.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      (d.source_document_title && d.source_document_title.toLowerCase().includes(q)) ||
      (d.description && d.description.toLowerCase().includes(q))
    );
  }, [decks, debouncedSearchQuery]);

  const filteredBatches = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return batches;
    const q = debouncedSearchQuery.toLowerCase().trim();
    return batches.filter((b) =>
      b.subject.toLowerCase().includes(q) ||
      b.sourceFile.toLowerCase().includes(q)
    );
  }, [batches, debouncedSearchQuery]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach((item) => {
      item.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [items]);

  const stats = useMemo(() => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return {
      total: items.length,
      withAiSummary: items.filter((i) => i.aiSummary).length,
      fromExtension: items.filter(
        (i) =>
          i.deviceSource === "smart_pen" ||
          Boolean(i.ocrText) ||
          (i.text && (i.text.includes("$") || i.text.includes("\\begin{")))
      ).length,
      thisWeek: items.filter((i) => new Date(i.createdAt) > oneWeekAgo).length,
    };
  }, [items]);

  return {
    items, setItems, filteredItems, loading, hasMore, loadingMore,
    searchQuery, setSearchQuery,
    viewMode, setViewMode,
    stats, allTags,
    collections, fetchCollections,
    isRealTimeConnected, lastSyncTime,
    selectedItem, setSelectedItem, isModalOpen, setIsModalOpen,
    selectedSmartPenScan, setSelectedSmartPenScan,
    selectedItems, setSelectedItems,
    showKeyboardShortcuts, setShowKeyboardShortcuts,
    showAdvancedFilters, setShowAdvancedFilters,
    showExportMenu, setShowExportMenu,
    showCollectionModal, setShowCollectionModal,
    collectionActionType, setCollectionActionType,
    isImporting, setIsImporting, importFileRef,
    isSummarizingSmartPen, setIsSummarizingSmartPen,
    isSummarizingItem, setIsSummarizingItem,
    isBulkDeleting, setIsBulkDeleting,
    confirmDialog, setConfirmDialog,
    advancedFilters, setAdvancedFilters,
    fetchItems, loadMoreItems,
    searchInputRef,

    // Multi-Engine Assets
    exams,
    filteredExams,
    decks,
    filteredDecks,
    batches,
    filteredBatches,
    assetTab,
    setAssetTab,
    deleteExamAsset,
    deleteDeckAsset,
    deleteBatchAsset,
    refreshAllAssets,
  };
}
