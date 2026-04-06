// ============================================
// Button.tsx - Apple-style button component
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Loader2 } from "lucide-react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

// ============================================
// PART 3: COMPONENT
// ============================================

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading,
  className = "",
  ...props
}) => {
  const baseStyles = `
    inline-flex items-center justify-center font-medium
    transition-all duration-200 ease-out
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-[0.97] active:shadow-none
  `;

  const variants = {
    primary: `
      theme-btn theme-btn-primary
      bg-[#007AFF] hover:bg-[#0066DD] text-white
      shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,122,255,0.25)]
      hover:shadow-[0_2px_4px_rgba(0,0,0,0.1),0_8px_20px_rgba(0,122,255,0.35)]
    `,
    secondary: `
      theme-btn theme-btn-secondary
      bg-gray-100 dark:bg-gray-800
      text-gray-900 dark:text-white
      hover:bg-gray-200 dark:hover:bg-gray-700
    `,
    ghost: `
      theme-btn theme-btn-ghost
      bg-transparent
      text-gray-600 dark:text-gray-300
      hover:bg-gray-100 dark:hover:bg-gray-800
    `,
    outline: `
      theme-btn theme-btn-outline
      bg-transparent
      border border-gray-300 dark:border-gray-600
      text-gray-900 dark:text-white
      hover:bg-gray-50 dark:hover:bg-gray-800
    `,
    destructive: `
      theme-btn theme-btn-destructive
      bg-red-500 hover:bg-red-600 text-white
      shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(239,68,68,0.25)]
    `,
  };

  const sizes = {
    sm: "px-4 py-2 text-sm gap-1.5",
    md: "px-5 py-2.5 text-sm gap-2",
    lg: "px-8 py-3.5 text-base gap-2",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};
