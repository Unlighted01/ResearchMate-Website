// ============================================
// DASHBOARD HEADER - Academic Library Workstation Header
// ============================================

import React from "react";
import { Link } from "react-router-dom";
import {
  RefreshCw,
  Plus,
  HelpCircle,
  WifiOff,
  Table2,
} from "lucide-react";

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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-title tracking-tight">
          Library Overview
        </h1>
        <div className="flex items-center gap-3 mt-1 text-xs">
          {isRealTimeConnected ? (
            <span className="inline-flex items-center gap-1.5 font-mono text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-mono text-slate-400">
              <WifiOff className="w-3 h-3" />
              Connecting...
            </span>
          )}
          {lastSyncTime && (
            <span className="font-mono text-slate-400">
              Updated {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Quick link to Option A Literature Matrix */}
        <Link
          to="/app/literature-matrix"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
        >
          <Table2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Literature Matrix</span>
        </Link>

        <button
          onClick={onShowShortcuts}
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <button
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh items"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>

        <button
          onClick={() => importFileRef.current?.click()}
          disabled={isImporting}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-850 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors shadow-xs disabled:opacity-60"
        >
          {isImporting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          <span>{isImporting ? "Importing..." : "Import Sources"}</span>
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

export default DashboardHeader;
