// ============================================
// StatsSkeleton - Loading State Skeleton
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";

// ============================================
// PART 2: COMPONENT
// ============================================

const StatsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="h-8 w-48 skeleton rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 h-28 skeleton"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 h-80 skeleton" />
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 h-80 skeleton" />
      </div>
    </div>
  );
};

// ============================================
// PART 3: EXPORTS
// ============================================

export default StatsSkeleton;
