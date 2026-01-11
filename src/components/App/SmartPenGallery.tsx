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
  Check,
  X,
  Wifi,
  WifiOff,
  Trash2,
} from "lucide-react";
import { getAllItems, StorageItem } from "../../services/storageService";
import { Modal } from "../shared/UIComponents";
import SmartPenPairing from "../shared/SmartPenPairing";
import { getCurrentUser } from "../../services/supabaseClient";

// Supabase config
const SUPABASE_URL = "https://jxevjkzojfbywxvtcwtl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZXZqa3pvamZieXd4dnRjd3RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDc4MzEsImV4cCI6MjA3NTQ4MzgzMX0.hZL-wGTcmD9H0bsmj_jqzZ2iw1GZyJM5X14meIRKgNQ";

// Toast component
interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: "bg-gradient-to-r from-green-500 to-green-600",
    error: "bg-gradient-to-r from-red-500 to-red-600",
    info: "bg-gradient-to-r from-blue-500 to-blue-600",
  }[type];

  const Icon = type === "success" ? Check : type === "error" ? X : Zap;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 ${bgColor} text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-up`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Paired device type
interface PairedPen {
  pen_id: string;
  paired_at: string;
}

const SmartPenGallery = () => {
  const [scans, setScans] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<StorageItem | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPairing, setShowPairing] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [pairedPens, setPairedPens] = useState<PairedPen[]>([]);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

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

  const loadScans = async () => {
    setLoading(true);
    const items = await getAllItems();
    setScans(items.filter((i) => i.deviceSource === "smart_pen"));
    setLoading(false);
  };

  const loadPairedPens = async (uid: string) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/smart-pen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: "list", user_id: uid }),
      });
      const data = await response.json();
      if (data.success) {
        setPairedPens(data.pens || []);
      }
    } catch (err) {
      console.error("Failed to load paired pens:", err);
    }
  };

  const unpairPen = async (penId: string) => {
    if (!confirm(`Disconnect pen ${penId.substring(0, 15)}...?`)) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/smart-pen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: "unpair", pen_id: penId }),
      });
      const data = await response.json();
      if (data.success) {
        setPairedPens(pairedPens.filter((p) => p.pen_id !== penId));
        showToast("Device disconnected", "info");
      } else {
        showToast("Failed to disconnect", "error");
      }
    } catch (err) {
      showToast("Connection error", "error");
    }
  };

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
  };

  const handlePairingSuccess = () => {
    setShowPairing(false);
    showToast("Smart Pen connected successfully!", "success");
    if (userId) loadPairedPens(userId);
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
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

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
            Your handwritten notes, digitized with OCR
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
                  {new Date(pen.paired_at).toLocaleDateString()}
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
                  <button className="px-4 py-2 bg-white text-gray-900 text-sm font-medium rounded-full hover:bg-gray-100 transition-colors">
                    View Details
                  </button>
                </div>

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
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(scan.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-200/50 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {filteredScans.map((scan) => (
            <div
              key={scan.id}
              onClick={() => setSelectedScan(scan)}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
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
                  {scan.ocrText?.substring(0, 100) || "No OCR text available"}
                </p>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {scan.aiSummary && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white text-[10px] font-semibold rounded-full">
                    <Zap className="w-3 h-3" />
                    AI
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {new Date(scan.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========== DETAIL MODAL ========== */}
      <Modal
        isOpen={!!selectedScan}
        onClose={() => setSelectedScan(null)}
        title={selectedScan?.sourceTitle || "Scan Details"}
        size="lg"
      >
        {selectedScan && (
          <div className="space-y-6">
            {/* Image */}
            {selectedScan.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <img
                  src={selectedScan.imageUrl}
                  alt="Scan"
                  className="w-full object-contain max-h-[400px]"
                />
              </div>
            )}

            {/* OCR Text */}
            <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-[#FF9500]" />
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  OCR Text
                </h4>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {selectedScan.ocrText || "No text extracted"}
              </p>
            </div>

            {/* AI Summary */}
            {selectedScan.aiSummary && (
              <div className="bg-gradient-to-br from-[#007AFF]/10 via-[#5856D6]/10 to-[#AF52DE]/10 rounded-xl p-5 border border-[#007AFF]/20">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-[#007AFF]" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    AI Summary
                  </h4>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {selectedScan.aiSummary}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200 dark:border-gray-700">
              <span>
                Created {new Date(selectedScan.createdAt).toLocaleString()}
              </span>
              <span className="flex items-center gap-1.5">
                <PenTool className="w-4 h-4 text-[#FF9500]" />
                Smart Pen
              </span>
            </div>
          </div>
        )}
      </Modal>

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
