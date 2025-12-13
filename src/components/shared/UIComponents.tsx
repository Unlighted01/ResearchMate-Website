import React from "react";
import { Loader2, X } from "lucide-react";

// ============================================
// PART 1: BUTTON COMPONENT (Apple-style)
// ============================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

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
    active:scale-[0.98]
  `;

  const variants = {
    primary: `
      bg-[#007AFF] hover:bg-[#0066DD] text-white
      shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,122,255,0.25)]
      hover:shadow-[0_2px_4px_rgba(0,0,0,0.1),0_8px_20px_rgba(0,122,255,0.35)]
      rounded-full
    `,
    secondary: `
      bg-gray-100 dark:bg-gray-800 
      text-gray-900 dark:text-white
      hover:bg-gray-200 dark:hover:bg-gray-700
      rounded-full
    `,
    ghost: `
      bg-transparent 
      text-gray-600 dark:text-gray-300
      hover:bg-gray-100 dark:hover:bg-gray-800
      rounded-xl
    `,
    outline: `
      bg-transparent 
      border border-gray-300 dark:border-gray-600
      text-gray-900 dark:text-white
      hover:bg-gray-50 dark:hover:bg-gray-800
      rounded-full
    `,
    destructive: `
      bg-red-500 hover:bg-red-600 text-white
      shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(239,68,68,0.25)]
      rounded-full
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

// ============================================
// PART 2: CARD COMPONENT (Apple-style glass)
// ============================================

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "elevated";
  hover?: boolean;
}

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
      className={`rounded-2xl ${variants[variant]} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// ============================================
// PART 3: INPUT COMPONENT (Apple-style)
// ============================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

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

// ============================================
// PART 4: BADGE COMPONENT (Apple-style pills)
// ============================================

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "blue";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  className = "",
}) => {
  const styles = {
    default: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    success:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    warning:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  return (
    <span
      className={`
        inline-flex items-center px-3 py-1 
        rounded-full text-xs font-medium
        ${styles[variant]} ${className}
      `}
    >
      {children}
    </span>
  );
};

// ============================================
// PART 5: MODAL COMPONENT (Apple-style)
// ============================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}) => {
  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`
          relative w-full ${sizes[size]}
          bg-white dark:bg-[#1C1C1E]
          rounded-2xl
          shadow-[0_24px_80px_rgba(0,0,0,0.2)]
          dark:shadow-[0_24px_80px_rgba(0,0,0,0.6)]
          animate-scale-in
          flex flex-col max-h-[85vh]
          overflow-hidden
        `}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/60 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

// ============================================
// PART 6: TEXTAREA COMPONENT (Apple-style)
// ============================================

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

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

// ============================================
// PART 7: SELECT COMPONENT (Apple-style)
// ============================================

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
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
      <select
        className={`
          w-full px-4 py-3 pr-10
          bg-gray-100 dark:bg-[#2C2C2E]
          border-0
          rounded-xl
          text-gray-900 dark:text-white
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:bg-white dark:focus:bg-[#3A3A3C]
          appearance-none cursor-pointer
          ${error ? "ring-2 ring-red-500/50" : ""}
          ${className}
        `}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
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
    {error && (
      <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
        <span className="w-1 h-1 bg-red-500 rounded-full" />
        {error}
      </p>
    )}
  </div>
);

// ============================================
// PART 8: SKELETON LOADER (Apple-style)
// ============================================

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

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

// ============================================
// PART 9: TOGGLE SWITCH (Apple-style iOS)
// ============================================

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

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

// ============================================
// PART 10: SEARCH INPUT (Apple Spotlight-style)
// ============================================

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  value?: string;
}

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
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    )}
  </div>
);

// ============================================
// PART 11: AVATAR COMPONENT
// ============================================

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

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

// ============================================
// PART 12: DIVIDER COMPONENT
// ============================================

interface DividerProps {
  className?: string;
  label?: string;
}

export const Divider: React.FC<DividerProps> = ({ className = "", label }) => (
  <div className={`relative flex items-center ${className}`}>
    <div className="flex-grow h-px bg-gray-200 dark:bg-gray-800" />
    {label && (
      <span className="flex-shrink mx-4 text-xs text-gray-500 uppercase tracking-wider">
        {label}
      </span>
    )}
    <div className="flex-grow h-px bg-gray-200 dark:bg-gray-800" />
  </div>
);

// ============================================
// PART 13: TOOLTIP COMPONENT
// ============================================

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = "top",
}) => {
  const positions = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className="relative group inline-block">
      {children}
      <div
        className={`
          absolute ${positions[position]}
          px-3 py-1.5
          bg-gray-900 dark:bg-white
          text-white dark:text-gray-900
          text-xs font-medium
          rounded-lg
          opacity-0 invisible
          group-hover:opacity-100 group-hover:visible
          transition-all duration-200
          whitespace-nowrap
          pointer-events-none
          z-50
        `}
      >
        {content}
      </div>
    </div>
  );
};

// ============================================
// PART 14: PROGRESS BAR
// ============================================

interface ProgressProps {
  value: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = "md",
  className = "",
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizes = {
    sm: "h-1",
    md: "h-2",
  };

  return (
    <div
      className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${sizes[size]} ${className}`}
    >
      <div
        className="h-full bg-[#007AFF] rounded-full transition-all duration-300 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
