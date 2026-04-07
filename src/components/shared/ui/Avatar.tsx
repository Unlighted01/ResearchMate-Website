// ============================================
// Avatar.tsx - Avatar component
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

// ============================================
// PART 3: COMPONENT
// ============================================

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  fallback,
  size = "md",
  className = "",
}) => {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  };

  return (
    <div
      className={`
        ${sizes[size]}
        rounded-full
        bg-gradient-to-br from-[#007AFF] to-[#5856D6]
        flex items-center justify-center
        text-white font-semibold
        overflow-hidden
        ring-2 ring-white dark:ring-gray-900
        ${className}
      `}
    >
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        fallback?.charAt(0).toUpperCase()
      )}
    </div>
  );
};
