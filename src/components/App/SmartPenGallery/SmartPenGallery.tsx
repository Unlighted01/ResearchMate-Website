// ============================================
// SMART PEN GALLERY PAGE - Apple Design
// With Pairing, Toasts, and Device Status
// ============================================

import React, { useState, useEffect } from "react";
import {
  PenTool,
  Search,
  Filter,
  Grid3X3,
  List,
  FileText,
  Zap,
  Calendar,
  Plus,
  RefreshCw,
  Wifi,
  WifiOff,
  Trash2,
  Loader2,
  X,
  BookOpen,
} from "lucide-react";
import {
  getAllItems,
  addItem,
  deleteItem,
  updateItem,
  StorageItem,
} from "../../../services/storageService";
import { generateItemSummary } from "../../../services/geminiService";
import SmartPenPairing from "../SmartPenPairing";
import SmartPenScanModal from "../SmartPenScanModal";
import { getCurrentUser, supabase } from "../../../services/supabaseClient";
import { runOcr } from "../../../services/importService";

// Paired device type
interface PairedPen {
  pen_id: string;
  paired_at: string;
}

interface SmartPenGalleryProps {
  useToast: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
  };
}

const SmartPenGallery: React.FC<SmartPenGalleryProps> = ({ useToast }) => {
  const { showToast } = useToast();
  const [scans, setScans] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<StorageItem | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPairing, setShowPairing] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [pairedPens, setPairedPens] = useState<PairedPen[]>([]);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  useEffect(() => {
    // Get current user
    getCurrentUser().then((user) => {
      if (user) {
        setUserId(user.id);
        loadPairedPens(user.id);
      }
    });

    // Load scans
    loadScans();
  }, []);

  // Realtime subscription for device status
  useEffect(() => {
    if (!userId) return;

    console.log("🔄 Subscribing to paired_pens realtime updates...");

    const channel = supabase
      .channel("paired_pens_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "paired_pens",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("📡 Realtime update:", payload.eventType, payload);
          // Reload paired pens on any change
          loadPairedPens(userId);

          // Show toast for important events
          if (payload.eventType === "INSERT") {
            showToast("New device connected!", "success");
          } else if (payload.eventType === "DELETE") {
            showToast("Device disconnected", "info");
          }
        },
      )
      .subscribe((status) => {
        console.log("📡 Subscription status:", status);
      });

    return () => {
      console.log("🔄 Unsubscribing from paired_pens...");
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Format date with user's local timezone
  const formatDate = (date: string | Date, includeTime: boolean = false) => {
    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...(includeTime && { hour: "2-digit", minute: "2-digit" }),
    };
    return d.toLocaleString(undefined, options);
  };

  const loadScans = async () => {
    setLoading(true);
    const items = await getAllItems();
    setScans(items.filter((i) => i.deviceSource === "smart_pen"));
    setLoading(false);
  };

  const loadPairedPens = async (uid: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("smart-pen", {
        body: { action: "list", user_id: uid },
      });
      if (!error && data?.success) {
        setPairedPens(data.pens || []);
      }
    } catch (err) {
      console.error("Failed to load paired pens:", err);
    }
  };

  const unpairPen = async (penId: string) => {
    if (!confirm(`Disconnect pen ${penId.substring(0, 15)}...?`)) return;

    try {
      const { data, error } = await supabase.functions.invoke("smart-pen", {
        body: { action: "unpair", pen_id: penId },
      });
      if (!error && data?.success) {
        setPairedPens(pairedPens.filter((p) => p.pen_id !== penId));
        showToast("Device disconnected", "info");
      } else {
        showToast("Failed to disconnect", "error");
      }
    } catch (err) {
      showToast("Connection error", "error");
    }
  };

  const updateScanItem = async (
    item: StorageItem,
    updates: Partial<StorageItem>,
  ) => {
    try {
      await updateItem(item.id, updates);
      setScans((prev) =>
        prev.map((scan) =>
          scan.id === item.id ? { ...scan, ...updates } : scan,
        ),
      );
      if (selectedScan && selectedScan.id === item.id) {
        setSelectedScan({ ...selectedScan, ...updates });
      }
    } catch (error) {
      console.error("Failed to update item:", error);
      showToast("Failed to act on item.", "error");
    }
  };

  const handlePairingSuccess = () => {
    setShowPairing(false);
    showToast("Smart Pen connected successfully!", "success");
    if (userId) loadPairedPens(userId);
  };

  const handleExtractText = async (e: React.MouseEvent, scan: StorageItem) => {
    e.stopPropagation();
    if (!scan.imageUrl) return;

    setExtractingId(scan.id);
    try {
      const result = await runOcr(scan.imageUrl, true);

      await updateItem(scan.id, {
        text: result.ocrText,
        ocrText: result.ocrText,
        ocrConfidence: result.ocrConfidence ?? undefined,
        aiSummary: result.aiSummary || undefined,
      });

      showToast("Text extracted successfully!", "success");
      loadScans();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to extract text",
        "error",
      );
    } finally {
      setExtractingId(null);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedScan || (!selectedScan.text && !selectedScan.ocrText)) return;

    setSummarizingId(selectedScan.id);
    showToast("Generating AI summary...", "info");
    try {
      const result = await generateItemSummary(
        selectedScan.id,
        selectedScan.text || selectedScan.ocrText || "",
      );
      if (result.ok && result.summary) {
        const updated = { ...selectedScan, aiSummary: result.summary };
        await updateScanItem(selectedScan, { aiSummary: result.summary });
        setSelectedScan(updated);
        showToast("Summary generated!", "success");
      } else {
        showToast(
          `Failed to generate summary: ${result.error || result.reason}`,
          "error",
        );
      }
    } catch (error) {
      showToast("Failed to generate summary", "error");
    } finally {
      setSummarizingId(null);
    }
  };

  // Delete a scan item
  const deleteScan = async (scan: StorageItem) => {
    if (
      !confirm(
        `Delete "${scan.sourceTitle || "this scan"}"? This cannot be undone.`,
      )
    )
      return;

    try {
      await deleteItem(scan.id);
      setScans(scans.filter((s) => s.id !== scan.id));
      setSelectedScan(null);
      showToast("Scan deleted", "success");
    } catch (err) {
      showToast("Failed to delete scan", "error");
    }
  };

  // Batch Operations
  const handleBatchDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Delete ${selectedIds.length} items? This cannot be undone.`)) return;
    
    setLoading(true);
    try {
      await Promise.all(selectedIds.map(id => deleteItem(id)));
      setScans(scans.filter(s => !selectedIds.includes(s.id)));
      setSelectedIds([]);
      setIsSelectionMode(false);
      showToast(`${selectedIds.length} items deleted`, "success");
    } catch (err) {
      showToast("Batch deletion failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBatchOCR = async () => {
    if (!selectedIds.length) return;
    
    const scansToProcess = scans.filter(s => selectedIds.includes(s.id) && s.imageUrl && !s.ocrText);
    if (!scansToProcess.length) {
      showToast("No eligible items for OCR in selection", "info");
      return;
    }

    showToast(`Starting OCR for ${scansToProcess.length} items...`, "info");
    setExtractingId("batch"); // Use a special flag for batch
    
    let successCount = 0;
    try {
      for (const scan of scansToProcess) {
        try {
          const result = await runOcr(scan.imageUrl!, true);
          await updateItem(scan.id, {
            text: result.ocrText,
            ocrText: result.ocrText,
            ocrConfidence: result.ocrConfidence ?? undefined,
            aiSummary: result.aiSummary || undefined,
          });
          successCount++;
        } catch (e) {
          console.error(`OCR failed for ${scan.id}`, e);
        }
      }
      showToast(`Batch OCR complete: ${successCount} successful`, "success");
      loadScans();
      setSelectedIds([]);
      setIsSelectionMode(false);
    } catch (err) {
      showToast("Batch OCR encountered an error", "error");
    } finally {
      setExtractingId(null);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredScans.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredScans.map(s => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredScans = scans.filter((scan) => {
    if (!searchQuery) return true;
    return (
      scan.sourceTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scan.ocrText?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ========== HEADER ========== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FF9500] to-[#FF6B00] rounded-xl flex items-center justify-center">
              <PenTool className="w-5 h-5 text-white" />
            </div>
            Smart Pen Gallery
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Digitized with OCR
          </p>
        </div>

        {/* Actions & Stats */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPairing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF9500] to-[#FF6B00] text-white rounded-xl font-medium hover:shadow-lg hover:shadow-orange-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Pair New Pen
          </button>
          <button
            onClick={() => {
              loadScans();
              showToast("Refreshed!", "info");
            }}
            className="p-2 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="px-4 py-2 bg-[#FF9500]/10 rounded-xl">
            <span className="text-sm font-semibold text-[#FF9500]">
              {scans.length} {scans.length === 1 ? "scan" : "scans"}
            </span>
          </div>
          <button
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              setSelectedIds([]);
            }}
            className={`p-2 rounded-xl border transition-all ${
              isSelectionMode 
                ? "bg-[#FF9500] text-white border-[#FF9500]" 
                : "bg-white dark:bg-[#1C1C1E] border-gray-200/50 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
            title="Toggle Selection Mode"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========== PAIRED DEVICES ========== */}
      {pairedPens.length > 0 && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-200/50 dark:border-gray-800 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-500" />
            Connected Devices
          </h3>
          <div className="flex flex-wrap gap-2">
            {pairedPens.map((pen) => (
              <div
                key={pen.pen_id}
                className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                  {pen.pen_id.substring(0, 12)}...
                </span>
                <span className="text-xs text-green-600 dark:text-green-500">
                  {formatDate(pen.paired_at)}
                </span>
                <button
                  onClick={() => unpairPen(pen.pen_id)}
                  className="p-1 hover:bg-green-200 dark:hover:bg-green-800 rounded-lg transition-colors"
                  title="Disconnect"
                >
                  <X className="w-3 h-3 text-green-600" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== SEARCH & FILTERS ========== */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search scans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF9500]/30 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <div className="flex bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? "bg-[#FF9500]/10 text-[#FF9500]"
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
                  ? "bg-[#FF9500]/10 text-[#FF9500]"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========== CONTENT ========== */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[3/4] skeleton rounded-2xl" />
          ))}
        </div>
      ) : filteredScans.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-24 h-24 bg-gradient-to-br from-[#FF9500]/10 to-[#FF6B00]/10 rounded-3xl flex items-center justify-center mb-6">
            <PenTool className="w-12 h-12 text-[#FF9500]" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {searchQuery ? "No scans found" : "No smart pen scans yet"}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-8">
            {searchQuery
              ? "Try adjusting your search terms"
              : "Connect your smart pen to start digitizing your handwritten notes with OCR."}
          </p>

          {!searchQuery && (
            <>
              {/* Pair Button for Empty State */}
              <button
                onClick={() => setShowPairing(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF9500] to-[#FF6B00] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all mb-8"
              >
                <Plus className="w-5 h-5" />
                Pair Your Smart Pen
              </button>

              <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800 max-w-md w-full">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                  How to get started
                </h4>
                <div className="space-y-3">
                  {[
                    "Power on your ResearchMate Smart Pen",
                    "Connect to the pen's WiFi and open its web interface",
                    "Click 'Pair New Pen' and enter the 6-digit code",
                    "Start scanning - notes sync automatically!",
                  ].map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-[#FF9500]/10 rounded-full flex items-center justify-center text-xs font-bold text-[#FF9500]">
                        {idx + 1}
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {step}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-[#FF9500]/5 rounded-xl border border-[#FF9500]/20">
                  <p className="text-xs text-[#FF9500] font-medium">
                    Smart Pen integration is currently in Beta. Built with
                    ESP32-CAM.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredScans.map((scan) => (
            <div
              key={scan.id}
              onClick={() => setSelectedScan(scan)}
              className="group relative bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden border border-gray-200/50 dark:border-gray-800 hover:border-[#FF9500]/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-orange-500/10"
            >
              {/* Image/Preview */}
              <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 relative">
                {scan.imageUrl ? (
                  <img
                    src={scan.imageUrl}
                    alt="Scan"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  {!isSelectionMode && (
                    <button className="px-4 py-2 bg-white text-gray-900 text-sm font-medium rounded-full hover:bg-gray-100 transition-colors">
                      View Details
                    </button>
                  )}
                </div>

                {/* Selection Overlay */}
                {isSelectionMode && (
                  <div 
                    className="absolute inset-0 bg-black/20 z-10 flex items-start justify-start p-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(scan.id);
                    }}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedIds.includes(scan.id) 
                        ? "bg-[#FF9500] border-[#FF9500] scale-110" 
                        : "bg-white/40 border-white"
                    }`}>
                      {selectedIds.includes(scan.id) && <Plus className="w-4 h-4 text-white rotate-45" style={{ transform: 'rotate(0deg)' }} />}
                    </div>
                  </div>
                )}

                {/* AI Badge */}
                {scan.aiSummary && (
                  <div className="absolute top-3 right-3">
                    <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white text-[10px] font-semibold rounded-full">
                      <Zap className="w-3 h-3" />
                      AI
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h4 className="font-medium text-gray-900 dark:text-white truncate">
                  {scan.sourceTitle || "Untitled Scan"}
                </h4>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(scan.createdAt)}
                  </div>
                  {scan.imageUrl && !scan.ocrText && !scan.text && (
                    <button
                      onClick={(e) => handleExtractText(e, scan)}
                      disabled={extractingId === scan.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF9500]/10 text-[#FF9500] hover:bg-[#FF9500]/20 disabled:opacity-50 rounded-lg text-xs font-semibold transition-colors"
                    >
                      {extractingId === scan.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          Extract Text
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-200/50 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 flex flex-col w-full max-w-full overflow-hidden">
          {filteredScans.map((scan) => (
            <div
              key={scan.id}
              onClick={() => setSelectedScan(scan)}
              className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors w-full"
            >
              {/* Thumbnail */}
              <div className="w-16 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                {scan.imageUrl ? (
                  <img
                    src={scan.imageUrl}
                    alt="Scan"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white truncate">
                  {scan.sourceTitle || "Untitled Scan"}
                </h4>
                <p className="text-sm text-gray-500 truncate mt-1">
                  {scan.text || scan.ocrText
                    ? (scan.text || scan.ocrText)?.substring(0, 100)
                    : "No text extracted yet"}
                </p>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {scan.imageUrl && !scan.ocrText && !scan.text && (
                  <button
                    onClick={(e) => handleExtractText(e, scan)}
                    disabled={extractingId === scan.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF9500]/10 text-[#FF9500] hover:bg-[#FF9500]/20 disabled:opacity-50 rounded-lg text-xs font-semibold transition-colors mr-2"
                  >
                    {extractingId === scan.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Extracting
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        Extract
                      </>
                    )}
                  </button>
                )}
                {scan.aiSummary && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white text-[10px] font-semibold rounded-full">
                    <Zap className="w-3 h-3" />
                    AI
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {formatDate(scan.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========== BATCH ACTIONS TOOLBAR ========== */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-6 animate-slide-up backdrop-blur-xl bg-opacity-95">
          <div className="flex items-center gap-2 pr-6 border-r border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 bg-[#FF9500] rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-orange-500/20">
              {selectedIds.length}
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Selected</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleBatchOCR}
              disabled={extractingId === "batch"}
              className="flex items-center gap-2 px-4 py-2 bg-[#FF9500]/10 text-[#FF9500] hover:bg-[#FF9500]/20 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            >
              {extractingId === "batch" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running OCR...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Batch OCR
                </>
              )}
            </button>
            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 rounded-xl text-sm font-semibold transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete All
            </button>
            <div className="w-px h-6 bg-gray-100 dark:bg-gray-800 mx-1" />
            <button
              onClick={() => setSelectedIds([])}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ========== SMART PEN DETAIL MODAL ========== */}
      <SmartPenScanModal
        scan={selectedScan}
        onClose={() => setSelectedScan(null)}
        onUpdate={(id, updates) => updateScanItem({ id } as StorageItem, updates)}
        onDelete={(id) => {
          const scan = scans.find((s) => s.id === id);
          if (scan) deleteScan(scan);
        }}
        onGenerateSummary={async (scan) => {
          setSummarizingId(scan.id);
          showToast("Generating AI summary...", "info");
          try {
            const result = await generateItemSummary(
              scan.id,
              scan.text || scan.ocrText || "",
            );
            if (result.ok && result.summary) {
              await updateScanItem(scan, { aiSummary: result.summary });
              showToast("Summary generated!", "success");
            } else {
              showToast(`Failed: ${result.error || result.reason}`, "error");
            }
          } catch {
            showToast("Failed to generate summary", "error");
          } finally {
            setSummarizingId(null);
          }
        }}
        onRunOCR={async (scan) => {
          if (!scan.imageUrl) return;
          setExtractingId(scan.id);
          try {
            const result = await runOcr(scan.imageUrl, true);
            await updateScanItem(scan, {
              text: result.ocrText,
              ocrText: result.ocrText,
              ocrConfidence: result.ocrConfidence ?? undefined,
              aiSummary: result.aiSummary || undefined,
            });
            showToast("Text extracted!", "success");
            loadScans();
          } catch (err) {
            showToast(err instanceof Error ? err.message : "OCR failed", "error");
          } finally {
            setExtractingId(null);
          }
        }}
        isSummarizing={summarizingId === selectedScan?.id}
        isRunningOCR={extractingId === selectedScan?.id}
      />

      {/* ========== PAIRING MODAL ========== */}
      <SmartPenPairing
        isOpen={showPairing}
        onClose={() => setShowPairing(false)}
        onSuccess={handlePairingSuccess}
        userId={userId}
      />

    </div>
  );
};

export default SmartPenGallery;
