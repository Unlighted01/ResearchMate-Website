// ============================================
// Select.tsx - Apple-style select dropdown
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

// ============================================
// PART 3: COMPONENT
// ============================================

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  label,
  className = "",
}) => (
  <div className={`w-full ${className}`}>
    {label && (
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
    )}
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full px-4 py-3 pr-10
          theme-input
          bg-gray-100 dark:bg-[#2C2C2E]
          border-0
          rounded-xl
          text-gray-900 dark:text-white
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:bg-white dark:focus:bg-[#3A3A3C]
          appearance-none
          cursor-pointer
        `}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  </div>
);
