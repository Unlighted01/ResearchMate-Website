import React from 'react';
import { AlertTriangle, AlertCircle, XCircle, RefreshCw, Info } from 'lucide-react';

// ============================================
// ERROR MESSAGE COMPONENT
// ============================================

export type ErrorType = 'error' | 'warning' | 'info' | 'network';

interface ErrorMessageProps {
  title?: string;
  message: string;
  type?: ErrorType;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryText?: string;
  className?: string;
  showIcon?: boolean;
}

/**
 * User-friendly error message component
 * Displays errors with appropriate styling and actions
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  message,
  type = 'error',
  onRetry,
  onDismiss,
  retryText = 'Try Again',
  className = '',
  showIcon = true,
}) => {
  const config = {
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      iconColor: 'text-red-500',
      titleColor: 'text-red-900 dark:text-red-100',
      textColor: 'text-red-700 dark:text-red-300',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      iconColor: 'text-yellow-500',
      titleColor: 'text-yellow-900 dark:text-yellow-100',
      textColor: 'text-yellow-700 dark:text-yellow-300',
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-500',
      titleColor: 'text-blue-900 dark:text-blue-100',
      textColor: 'text-blue-700 dark:text-blue-300',
    },
    network: {
      icon: AlertCircle,
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
      iconColor: 'text-orange-500',
      titleColor: 'text-orange-900 dark:text-orange-100',
      textColor: 'text-orange-700 dark:text-orange-300',
    },
  };

  const style = config[type];
  const Icon = style.icon;

  return (
    <div
      className={`${style.bgColor} ${style.borderColor} border rounded-xl p-4 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {showIcon && (
          <div className="flex-shrink-0">
            <Icon className={`w-5 h-5 ${style.iconColor}`} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`text-sm font-semibold ${style.titleColor} mb-1`}>
              {title}
            </h3>
          )}
          <p className={`text-sm ${style.textColor}`}>{message}</p>

          {(onRetry || onDismiss) && (
            <div className="flex items-center gap-2 mt-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${style.titleColor} bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border ${style.borderColor} rounded-lg transition-colors`}
                  aria-label={retryText}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {retryText}
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className={`text-xs font-medium ${style.textColor} hover:underline`}
                  aria-label="Dismiss"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>

        {onDismiss && !onRetry && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 p-1 ${style.textColor} hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors`}
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Helper function to get user-friendly error messages
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'Network error. Please check your internet connection and try again.';
    }

    // Auth errors
    if (error.message.includes('auth') || error.message.includes('unauthorized')) {
      return 'Authentication failed. Please sign in again.';
    }

    // Timeout errors
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }

    // Generic error message
    return error.message || 'An unexpected error occurred. Please try again.';
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Inline error component for forms
 */
export const InlineError: React.FC<{ message: string; className?: string }> = ({
  message,
  className = '',
}) => {
  if (!message) return null;

  return (
    <p className={`text-sm text-red-600 dark:text-red-400 mt-1 ${className}`} role="alert">
      {message}
    </p>
  );
};

export default ErrorMessage;
