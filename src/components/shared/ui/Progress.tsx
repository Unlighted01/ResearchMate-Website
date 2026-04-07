// ============================================
// Progress.tsx - Progress bar component
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface ProgressProps {
  value: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

// ============================================
// PART 3: COMPONENT
// ============================================

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = "md",
  className = "",
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizes = {
    sm: "h-1",
    md: "h-2",
  };

  return (
    <div
      className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${sizes[size]} ${className}`}
    >
      <div
        className="h-full bg-[#007AFF] rounded-full transition-all duration-300 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
