// ============================================
// CONFIRM DIALOG - Apple-style
// Fixed: Uses Portal to escape parent containers
// ============================================

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: "bg-[#FF3B30]/10",
      iconColor: "text-[#FF3B30]",
      buttonBg: "bg-[#FF3B30] hover:bg-[#E0352B]",
      buttonShadow: "shadow-lg shadow-red-500/25",
      Icon: Trash2,
    },
    warning: {
      iconBg: "bg-[#FF9500]/10",
      iconColor: "text-[#FF9500]",
      buttonBg: "bg-[#FF9500] hover:bg-[#E08600]",
      buttonShadow: "shadow-lg shadow-orange-500/25",
      Icon: AlertTriangle,
    },
    info: {
      iconBg: "bg-[#007AFF]/10",
      iconColor: "text-[#007AFF]",
      buttonBg: "bg-[#007AFF] hover:bg-[#0066DD]",
      buttonShadow: "shadow-lg shadow-blue-500/25",
      Icon: AlertTriangle,
    },
  };

  const styles = variantStyles[variant];
  const IconComponent = styles.Icon;

  // Use Portal to render at document.body level
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      {/* Backdrop - Clean dark overlay */}
      <div
        className="absolute inset-0 bg-black/60 animate-fade-in"
        onClick={isLoading ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.25)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.7)] max-w-sm w-full animate-scale-in overflow-hidden z-10">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="px-6 pt-12 pb-6 text-center">
          {/* Icon - Proper sizing with flex centering */}
          <div
            className={`w-16 h-16 ${styles.iconBg} rounded-full flex items-center justify-center mx-auto mb-5 flex-shrink-0`}
          >
            <IconComponent
              className={`w-7 h-7 ${styles.iconColor}`}
              strokeWidth={1.5}
            />
          </div>

          {/* Title */}
          <h2
            id="confirm-dialog-title"
            className="text-xl font-bold text-gray-900 dark:text-white mb-2"
          >
            {title}
          </h2>

          {/* Message */}
          <p
            id="confirm-dialog-description"
            className="text-gray-500 dark:text-gray-400 text-[15px] leading-relaxed mb-6"
          >
            {message}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 px-4 bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] text-gray-900 dark:text-white font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={cancelText}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 py-3 px-4 ${styles.buttonBg} ${styles.buttonShadow} text-white font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
              autoFocus
              aria-label={confirmText}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDialog;
