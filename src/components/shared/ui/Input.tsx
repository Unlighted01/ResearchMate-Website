// ============================================
// Input.tsx - Apple-style input component
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

// ============================================
// PART 3: COMPONENT
// ============================================

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = "",
  ...props
}) => (
  <div className="w-full">
    {label && (
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
    )}
    <div className="relative">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </div>
      )}
      <input
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
          ${icon ? "pl-11" : ""}
          ${error ? "ring-2 ring-red-500/50" : ""}
          ${className}
        `}
        {...props}
      />
    </div>
    {error && (
      <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
        <span className="w-1 h-1 bg-red-500 rounded-full" />
        {error}
      </p>
    )}
  </div>
);
