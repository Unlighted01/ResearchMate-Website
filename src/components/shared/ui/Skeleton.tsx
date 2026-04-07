// ============================================
// Skeleton.tsx - Skeleton loader component
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

// ============================================
// PART 3: COMPONENT
// ============================================

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  variant = "rectangular",
  width,
  height,
}) => {
  const variantClasses = {
    text: "rounded-md",
    circular: "rounded-full",
    rectangular: "rounded-xl",
  };

  return (
    <div
      className={`skeleton ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
    />
  );
};
