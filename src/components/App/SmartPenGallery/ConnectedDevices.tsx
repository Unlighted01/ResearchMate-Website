// ============================================
// CONNECTED DEVICES - Paired Smart Pen panel
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Wifi, X } from "lucide-react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

export interface PairedPen {
  pen_id: string;
  paired_at: string;
}

interface ConnectedDevicesProps {
  pairedPens: PairedPen[];
  formatDate: (date: string | Date, includeTime?: boolean) => string;
  onUnpair: (penId: string) => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const ConnectedDevices: React.FC<ConnectedDevicesProps> = ({
  pairedPens,
  formatDate,
  onUnpair,
}) => {
  if (pairedPens.length === 0) return null;

  return (
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
              onClick={() => onUnpair(pen.pen_id)}
              className="p-1 hover:bg-green-200 dark:hover:bg-green-800 rounded-lg transition-colors"
              title="Disconnect"
            >
              <X className="w-3 h-3 text-green-600" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default ConnectedDevices;
