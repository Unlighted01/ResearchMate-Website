// ============================================
// SUMMARY MODAL - AI Summary Detail View
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Zap } from "lucide-react";
import { Modal } from "../../shared/ui";
import { StorageItem } from "../../../services/storageService";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface SummaryModalProps {
  selectedItem: StorageItem | null;
  onClose: () => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const SummaryModal: React.FC<SummaryModalProps> = ({
  selectedItem,
  onClose,
}) => {
  return (
    <Modal
      isOpen={!!selectedItem}
      onClose={onClose}
      title="AI Summary"
    >
      {selectedItem && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-[#007AFF]/10 via-[#5856D6]/10 to-[#AF52DE]/10 rounded-xl p-5 border border-[#007AFF]/20">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-[#007AFF]" />
              <span className="font-semibold text-gray-900 dark:text-white">
                AI Generated Summary
              </span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {selectedItem.aiSummary}
            </p>
          </div>

          <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-xl p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Original Content
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4">
              {selectedItem.text || selectedItem.ocrText}
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default SummaryModal;
