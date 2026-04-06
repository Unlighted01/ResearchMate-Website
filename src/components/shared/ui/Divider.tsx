// ============================================
// Divider.tsx - Divider component
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface DividerProps {
  className?: string;
  label?: string;
}

// ============================================
// PART 3: COMPONENT
// ============================================

export const Divider: React.FC<DividerProps> = ({ className = "", label }) => (
  <div className={`relative flex items-center ${className}`}>
    <div className="flex-grow h-px bg-gray-200 dark:bg-gray-800" />
    {label && (
      <span className="flex-shrink mx-4 text-xs text-gray-500 uppercase tracking-wider">
        {label}
      </span>
    )}
    <div className="flex-grow h-px bg-gray-200 dark:bg-gray-800" />
  </div>
);
