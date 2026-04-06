// ============================================
// Textarea.tsx - Apple-style textarea component
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

// ============================================
// PART 3: COMPONENT
// ============================================

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  className = "",
  ...props
}) => (
  <div className="w-full">
    {label && (
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
    )}
    <textarea
      className={`
        w-full px-4 py-3
        theme-input
        bg-gray-100 dark:bg-[#2C2C2E]
        border-0
        rounded-xl
        text-gray-900 dark:text-white
        placeholder-gray-500 dark:placeholder-gray-400
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:bg-white dark:focus:bg-[#3A3A3C]
        resize-none
        ${error ? "ring-2 ring-red-500/50" : ""}
        ${className}
      `}
      {...props}
    />
    {error && (
      <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
        <span className="w-1 h-1 bg-red-500 rounded-full" />
        {error}
      </p>
    )}
  </div>
);
