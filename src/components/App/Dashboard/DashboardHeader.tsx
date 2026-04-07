// ============================================
// DASHBOARD HEADER - Title, sync status, actions
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import {
  RefreshCw,
  Plus,
  HelpCircle,
  Wifi,
  WifiOff,
} from "lucide-react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface DashboardHeaderProps {
  isRealTimeConnected: boolean;
  lastSyncTime: Date | null;
  loading: boolean;
  isImporting: boolean;
  importFileRef: React.RefObject<HTMLInputElement | null>;
  onRefresh: () => void;
  onShowShortcuts: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  isRealTimeConnected,
  lastSyncTime,
  loading,
  isImporting,
  importFileRef,
  onRefresh,
  onShowShortcuts,
  onImport,
}) => {
  return (
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
          onClick={onShowShortcuts}
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
          className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
        <button
          onClick={onRefresh}
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
          onChange={onImport}
        />
      </div>
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default DashboardHeader;
