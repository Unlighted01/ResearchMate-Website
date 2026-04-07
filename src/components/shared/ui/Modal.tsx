// ============================================
// Modal.tsx - Apple-style modal with portal
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  contentClassName?: string;
}

// ============================================
// PART 3: COMPONENT
// ============================================

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  contentClassName,
}) => {
  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]",
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`
              relative w-full ${sizes[size]}
              bg-white dark:bg-[#1C1C1E]
              rounded-2xl
              shadow-[0_24px_80px_rgba(0,0,0,0.3)]
              dark:shadow-[0_24px_80px_rgba(0,0,0,0.7)]
              flex flex-col max-h-[85vh]
              z-10
            `}
          >
            {/* Header */}
            {title && (
              <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200/60 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  aria-label="Close modal"
                  className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className={contentClassName ?? "flex-1 overflow-y-auto overscroll-contain p-6"}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
