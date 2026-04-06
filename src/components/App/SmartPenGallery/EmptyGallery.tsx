// ============================================
// EMPTY GALLERY - Empty state with onboarding
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { PenTool, Plus } from "lucide-react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface EmptyGalleryProps {
  searchQuery: string;
  onPairPen: () => void;
}

// ============================================
// PART 3: CONSTANTS
// ============================================

const SETUP_STEPS = [
  "Power on your ResearchMate Smart Pen",
  "Connect to the pen's WiFi and open its web interface",
  "Click 'Pair New Pen' and enter the 6-digit code",
  "Start scanning - notes sync automatically!",
];

// ============================================
// PART 4: COMPONENT
// ============================================

const EmptyGallery: React.FC<EmptyGalleryProps> = ({
  searchQuery,
  onPairPen,
}) => {
  return (
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
            onClick={onPairPen}
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
              {SETUP_STEPS.map((step, idx) => (
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
  );
};

// ============================================
// PART 5: EXPORTS
// ============================================

export default EmptyGallery;
