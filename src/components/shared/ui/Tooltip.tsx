// ============================================
// Tooltip.tsx - Tooltip component
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

// ============================================
// PART 3: COMPONENT
// ============================================

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = "top",
}) => {
  const positions = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className="relative group inline-block">
      {children}
      <div
        className={`
          absolute ${positions[position]}
          px-3 py-1.5
          bg-gray-900 dark:bg-white
          text-white dark:text-gray-900
          text-xs font-medium
          rounded-lg
          opacity-0 invisible
          group-hover:opacity-100 group-hover:visible
          transition-all duration-200
          whitespace-nowrap
          pointer-events-none
          z-50
        `}
      >
        {content}
      </div>
    </div>
  );
};
