// ============================================
// Card.tsx - Apple-style glass card component
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "elevated";
  hover?: boolean;
}

// ============================================
// PART 3: COMPONENT
// ============================================

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  variant = "default",
  hover = false,
  ...props
}) => {
  const variants = {
    default: `
      bg-white dark:bg-[#1C1C1E]
      border border-gray-200/60 dark:border-gray-800
      shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.05)]
    `,
    glass: `
      bg-white/70 dark:bg-[#1C1C1E]/70
      backdrop-blur-xl
      border border-white/20 dark:border-gray-700/50
      shadow-[0_4px_24px_rgba(0,0,0,0.06)]
    `,
    elevated: `
      bg-white dark:bg-[#1C1C1E]
      shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)]
      dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]
    `,
  };

  const hoverStyles = hover
    ? `
      transition-all duration-300 ease-out cursor-pointer
      hover:shadow-[0_8px_24px_rgba(0,0,0,0.08),0_16px_48px_rgba(0,0,0,0.1)]
      hover:-translate-y-0.5
      dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
    `
    : "";

  return (
    <div
      className={`theme-surface rounded-2xl ${variants[variant]} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
