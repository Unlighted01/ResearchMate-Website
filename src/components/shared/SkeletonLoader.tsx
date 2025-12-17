import React from 'react';

// ============================================
// SKELETON COMPONENTS
// ============================================

/**
 * Base skeleton component for generic placeholders
 */
export const Skeleton: React.FC<{
  className?: string;
  width?: string;
  height?: string;
}> = ({ className = '', width, height }) => {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
};

/**
 * Skeleton for text lines
 */
export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 3, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
};

/**
 * Skeleton for a card
 */
export const SkeletonCard: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  return (
    <div
      className={`bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800 ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton className="h-5 w-3/4 mb-3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
      <SkeletonText lines={2} />
      <div className="flex items-center gap-2 mt-4">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
};

/**
 * Skeleton for dashboard items grid
 */
export const SkeletonDashboardGrid: React.FC<{
  count?: number;
}> = ({ count = 6 }) => {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

/**
 * Skeleton for dashboard items list
 */
export const SkeletonDashboardList: React.FC<{
  count?: number;
}> = ({ count = 5 }) => {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#1C1C1E] rounded-xl p-4 border border-gray-200/50 dark:border-gray-800"
          aria-hidden="true"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <SkeletonText lines={1} className="w-full" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="w-8 h-8 rounded-lg ml-4" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton for collection cards
 */
export const SkeletonCollection: React.FC<{
  count?: number;
}> = ({ count = 4 }) => {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800"
          aria-hidden="true"
        >
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-5 w-1/2 mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton for statistics page
 */
export const SkeletonStatistics: React.FC = () => {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      {/* Stats cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800"
            aria-hidden="true"
          >
            <Skeleton className="h-4 w-1/2 mb-3" />
            <Skeleton className="h-8 w-1/3 mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800" aria-hidden="true">
        <Skeleton className="h-6 w-1/4 mb-6" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>

      {/* Table placeholder */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800" aria-hidden="true">
        <Skeleton className="h-6 w-1/4 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-10 w-1/4" />
              <Skeleton className="h-10 w-1/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton for AI Assistant chat
 */
export const SkeletonChat: React.FC = () => {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
          aria-hidden="true"
        >
          <div className={`max-w-[80%] ${i % 2 === 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-gray-800'} rounded-2xl p-4`}>
            <SkeletonText lines={2} />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Full page loading skeleton
 */
export const SkeletonPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in-up" aria-busy="true" aria-live="polite">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <SkeletonDashboardGrid />
    </div>
  );
};

export default {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonDashboardGrid,
  SkeletonDashboardList,
  SkeletonCollection,
  SkeletonStatistics,
  SkeletonChat,
  SkeletonPage,
};
