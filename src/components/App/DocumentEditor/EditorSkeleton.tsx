// ============================================
// EditorSkeleton.tsx - Loading State
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";

// ============================================
// PART 2: COMPONENT
// ============================================

const EditorSkeleton: React.FC = () => {
  return (
    <div className="flex h-full animate-fade-in-up">
      {/* Sidebar skeleton */}
      <div className="w-60 border-r border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="h-10 skeleton rounded-xl" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 skeleton rounded-xl" />
        ))}
      </div>

      {/* Editor skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="h-12 border-b border-gray-200 dark:border-gray-700 skeleton" />
        <div className="flex-1 p-8 space-y-4">
          <div className="h-8 w-64 skeleton rounded-lg" />
          <div className="h-4 w-full skeleton rounded" />
          <div className="h-4 w-5/6 skeleton rounded" />
          <div className="h-4 w-4/6 skeleton rounded" />
          <div className="h-4 w-full skeleton rounded mt-6" />
          <div className="h-4 w-3/4 skeleton rounded" />
        </div>
      </div>
    </div>
  );
};

// ============================================
// PART 3: EXPORTS
// ============================================

export default EditorSkeleton;
