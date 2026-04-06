// ============================================
// Badge.tsx - Apple-style pill badge component
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "blue";
  className?: string;
}

// ============================================
// PART 3: COMPONENT
// ============================================

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  className = "",
}) => {
  const styles = {
    default: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    success:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    warning:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  return (
    <span
      className={`
        inline-flex items-center px-3 py-1
        rounded-full text-xs font-medium
        ${styles[variant]} ${className}
      `}
    >
      {children}
    </span>
  );
};
