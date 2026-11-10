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
  rightElement?: React.ReactNode;
}

// ============================================
// PART 3: COMPONENT
// ============================================

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  rightElement,
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
          bg-slate-100/90 dark:bg-slate-800/80
          border border-slate-200 dark:border-slate-700
          rounded-xl
          text-slate-900 dark:text-slate-100
          placeholder-slate-400 dark:placeholder-slate-500
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800
          ${icon ? "pl-11" : ""}
          ${rightElement ? "pr-11" : ""}
          ${error ? "ring-2 ring-red-500/50 border-red-500" : ""}
          ${className}
        `}
        {...props}
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 flex items-center justify-center">
          {rightElement}
        </div>
      )}
    </div>
    {error && (
      <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
        <span className="w-1 h-1 bg-red-500 rounded-full" />
        {error}
      </p>
    )}
  </div>
);
