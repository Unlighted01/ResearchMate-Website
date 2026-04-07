// ============================================
// Toggle.tsx - Apple-style iOS toggle switch
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

// ============================================
// PART 3: COMPONENT
// ============================================

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
}) => (
  <label
    className={`inline-flex items-center gap-3 ${
      disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
    }`}
  >
    <div className="relative">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
      />
      {/* Track */}
      <div
        className={`
          w-[51px] h-[31px] rounded-full
          transition-colors duration-200
          ${checked ? "bg-[#34C759]" : "bg-gray-300 dark:bg-gray-600"}
        `}
      />
      {/* Thumb */}
      <div
        className={`
          absolute top-[2px] left-[2px]
          w-[27px] h-[27px]
          bg-white rounded-full
          shadow-[0_2px_4px_rgba(0,0,0,0.2)]
          transition-transform duration-200 ease-out
          ${checked ? "translate-x-5" : "translate-x-0"}
        `}
      />
    </div>
    {label && (
      <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
        {label}
      </span>
    )}
  </label>
);
