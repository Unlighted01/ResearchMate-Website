import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

const OfflineDetector: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(false);
  const [justWentOnline, setJustWentOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setJustWentOnline(true);
      setShowNotification(true);

      // Hide "back online" notification after 3 seconds
      setTimeout(() => {
        setShowNotification(false);
        setJustWentOnline(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification(true);
      setJustWentOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Show notification immediately if offline
    if (!navigator.onLine) {
      setShowNotification(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't show anything if online and not just went online
  if (isOnline && !showNotification) {
    return null;
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
        showNotification
          ? 'translate-y-0 opacity-100'
          : '-translate-y-4 opacity-0 pointer-events-none'
      }`}
      role="alert"
      aria-live="assertive"
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-md border ${
          isOnline
            ? 'bg-green-50/90 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50/90 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}
      >
        {isOnline ? (
          <>
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Back online
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                Connection restored
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                You're offline
              </p>
              <p className="text-xs text-red-700 dark:text-red-300">
                Some features may be unavailable
              </p>
            </div>
            <button
              onClick={() => setShowNotification(false)}
              className="ml-2 p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
              aria-label="Dismiss notification"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineDetector;
