// ============================================
// GALLERY HEADER - Smart Pen Gallery Header
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { PenTool, Plus, RefreshCw } from "lucide-react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface GalleryHeaderProps {
  scanCount: number;
  onPairPen: () => void;
  onRefresh: () => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const GalleryHeader: React.FC<GalleryHeaderProps> = ({
  scanCount,
  onPairPen,
  onRefresh,
}) => {
  return (
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
          onClick={onPairPen}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF9500] to-[#FF6B00] text-white rounded-xl font-medium hover:shadow-lg hover:shadow-orange-500/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          Pair New Pen
        </button>
        <button
          onClick={onRefresh}
          className="p-2 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <div className="px-4 py-2 bg-[#FF9500]/10 rounded-xl">
          <span className="text-sm font-semibold text-[#FF9500]">
            {scanCount} {scanCount === 1 ? "scan" : "scans"}
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default GalleryHeader;
