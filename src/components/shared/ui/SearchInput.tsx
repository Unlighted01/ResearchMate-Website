// ============================================
// SearchInput.tsx - Apple Spotlight-style search
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { X } from "lucide-react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  value?: string;
}

// ============================================
// PART 3: COMPONENT
// ============================================

export const SearchInput: React.FC<SearchInputProps> = ({
  onClear,
  value,
  className = "",
  ...props
}) => (
  <div className="relative">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>
    <input
      type="text"
      value={value}
      className={`
        w-full pl-12 pr-10 py-3
        theme-input
        bg-gray-100 dark:bg-[#2C2C2E]
        border-0
        rounded-xl
        text-gray-900 dark:text-white
        placeholder-gray-500 dark:placeholder-gray-400
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:bg-white dark:focus:bg-[#3A3A3C]
        ${className}
      `}
      {...props}
    />
    {value && onClear && (
      <button
        onClick={onClear}
        aria-label="Clear search"
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    )}
  </div>
);
