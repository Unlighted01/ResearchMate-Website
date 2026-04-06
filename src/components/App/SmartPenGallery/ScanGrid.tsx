// ============================================
// SCAN GRID - Grid and list view for scan cards
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { FileText, Zap, Calendar, Loader2 } from "lucide-react";
import { StorageItem } from "../../../services/storageService";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface ScanGridProps {
  scans: StorageItem[];
  viewMode: "grid" | "list";
  extractingId: string | null;
  formatDate: (date: string | Date, includeTime?: boolean) => string;
  onSelectScan: (scan: StorageItem) => void;
  onExtractText: (e: React.MouseEvent, scan: StorageItem) => void;
}

// ============================================
// PART 3: SUB-COMPONENTS
// ============================================

// ---------- PART 3A: GRID CARD ----------

interface ScanGridCardProps {
  scan: StorageItem;
  extractingId: string | null;
  formatDate: (date: string | Date, includeTime?: boolean) => string;
  onSelectScan: (scan: StorageItem) => void;
  onExtractText: (e: React.MouseEvent, scan: StorageItem) => void;
}

const ScanGridCard: React.FC<ScanGridCardProps> = ({
  scan,
  extractingId,
  formatDate,
  onSelectScan,
  onExtractText,
}) => (
  <div
    onClick={() => onSelectScan(scan)}
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
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(scan.createdAt)}
        </div>
        {scan.imageUrl && !scan.ocrText && !scan.text && (
          <button
            onClick={(e) => onExtractText(e, scan)}
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
);

// ---------- PART 3B: LIST ROW ----------

interface ScanListRowProps {
  scan: StorageItem;
  extractingId: string | null;
  formatDate: (date: string | Date, includeTime?: boolean) => string;
  onSelectScan: (scan: StorageItem) => void;
  onExtractText: (e: React.MouseEvent, scan: StorageItem) => void;
}

const ScanListRow: React.FC<ScanListRowProps> = ({
  scan,
  extractingId,
  formatDate,
  onSelectScan,
  onExtractText,
}) => (
  <div
    onClick={() => onSelectScan(scan)}
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
          onClick={(e) => onExtractText(e, scan)}
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
      <span className="text-xs text-gray-400">{formatDate(scan.createdAt)}</span>
    </div>
  </div>
);

// ============================================
// PART 4: MAIN COMPONENT
// ============================================

const ScanGrid: React.FC<ScanGridProps> = ({
  scans,
  viewMode,
  extractingId,
  formatDate,
  onSelectScan,
  onExtractText,
}) => {
  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {scans.map((scan) => (
          <ScanGridCard
            key={scan.id}
            scan={scan}
            extractingId={extractingId}
            formatDate={formatDate}
            onSelectScan={onSelectScan}
            onExtractText={onExtractText}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-200/50 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 flex flex-col w-full max-w-full overflow-hidden">
      {scans.map((scan) => (
        <ScanListRow
          key={scan.id}
          scan={scan}
          extractingId={extractingId}
          formatDate={formatDate}
          onSelectScan={onSelectScan}
          onExtractText={onExtractText}
        />
      ))}
    </div>
  );
};

// ============================================
// PART 5: EXPORTS
// ============================================

export default ScanGrid;
