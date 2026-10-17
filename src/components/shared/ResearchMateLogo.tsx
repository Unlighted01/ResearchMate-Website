// ============================================
// ResearchMateLogo.tsx - Dynamic Multi-Theme Logo
// Adapts dynamically to Minimalist, Glass, and Bubble
// themes in both Light and Dark modes.
// ============================================

import React from "react";
import { useTheme, type VisualTheme } from "../../context/ThemeContext";

interface ResearchMateLogoProps {
  size?: number;
  className?: string;
  variant?: "auto" | VisualTheme;
  forceDark?: boolean;
  showText?: boolean;
  subtitle?: string;
  textClassName?: string;
}

export const ResearchMateLogo: React.FC<ResearchMateLogoProps> = ({
  size = 28,
  className = "",
  variant = "auto",
  forceDark,
  showText = false,
  subtitle = "STUDIO",
  textClassName = "",
}) => {
  // Gracefully read theme context if mounted inside ThemeProvider
  let activeTheme: VisualTheme = "minimalist";
  let activeIsDark = false;

  try {
    const themeContext = useTheme();
    activeTheme = variant === "auto" ? themeContext.visualTheme : variant;
    activeIsDark = forceDark !== undefined ? forceDark : themeContext.isDark;
  } catch {
    activeTheme = variant === "auto" ? "minimalist" : variant;
    activeIsDark = forceDark || false;
  }

  // Generate unique IDs for SVG gradients so multiple instances never clash
  const idPrefix = React.useId().replace(/:/g, "_");
  const bgGradId = `${idPrefix}_bg`;
  const specularGradId = `${idPrefix}_specular`;
  const penGradId = `${idPrefix}_pen`;

  // Define theme-specific palettes
  let squircleRadius = 24;
  let bgGradientStops: { offset: string; color: string; opacity?: number }[] = [];
  let specularStroke = "none";
  let specularStrokeWidth = 0;
  let penFill = "#ffffff";
  let penDotFill = "#ffffff";
  let bookOpacity = 0.95;
  let pagesStroke = "rgba(255, 255, 255, 0.65)";
  let outerGlow = "none";

  if (activeTheme === "minimalist") {
    squircleRadius = 20; // Crisp, sharp editorial squircle
    if (activeIsDark) {
      // Obsidian titanium with rich cobalt core
      bgGradientStops = [
        { offset: "0%", color: "#18181B" },
        { offset: "100%", color: "#09090B" },
      ];
      specularStroke = "#27272A";
      specularStrokeWidth = 1.5;
      penFill = "#3B82F6";
      penDotFill = "#60A5FA";
      bookOpacity = 0.95;
      pagesStroke = "rgba(255, 255, 255, 0.4)";
      outerGlow = "drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5))";
    } else {
      // Editorial stark onyx
      bgGradientStops = [
        { offset: "0%", color: "#18181B" },
        { offset: "100%", color: "#09090B" },
      ];
      specularStroke = "rgba(255, 255, 255, 0.15)";
      specularStrokeWidth = 1;
      penFill = "#2563EB";
      penDotFill = "#3B82F6";
      bookOpacity = 0.95;
      pagesStroke = "rgba(255, 255, 255, 0.45)";
      outerGlow = "drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15))";
    }
  } else if (activeTheme === "glass") {
    squircleRadius = 24; // Apple liquid glass curve
    if (activeIsDark) {
      // Smoked neon cyan & electric sapphire glass
      bgGradientStops = [
        { offset: "0%", color: "#0891B2" },
        { offset: "50%", color: "#0284C7" },
        { offset: "100%", color: "#1E1B4B" },
      ];
      specularStroke = "rgba(255, 255, 255, 0.35)";
      specularStrokeWidth = 1.5;
      penFill = "#22D3EE";
      penDotFill = "#67E8F9";
      bookOpacity = 0.95;
      pagesStroke = "rgba(165, 243, 252, 0.75)";
      outerGlow = "drop-shadow(0 0 14px rgba(34, 211, 238, 0.45))";
    } else {
      // Crystalline oceanic azure
      bgGradientStops = [
        { offset: "0%", color: "#0284C7" },
        { offset: "100%", color: "#06B6D4" },
      ];
      specularStroke = "rgba(255, 255, 255, 0.75)";
      specularStrokeWidth = 1.5;
      penFill = "#E0F2FE";
      penDotFill = "#0284C7";
      bookOpacity = 0.95;
      pagesStroke = "rgba(255, 255, 255, 0.75)";
      outerGlow = "drop-shadow(0 4px 14px rgba(6, 182, 212, 0.35))";
    }
  } else if (activeTheme === "bubble") {
    squircleRadius = 30; // Extra round playful organic curves
    if (activeIsDark) {
      // Cosmic velvet orchid & neon magenta
      bgGradientStops = [
        { offset: "0%", color: "#E879F9" },
        { offset: "50%", color: "#A855F7" },
        { offset: "100%", color: "#3B0764" },
      ];
      specularStroke = "rgba(255, 255, 255, 0.4)";
      specularStrokeWidth = 1.5;
      penFill = "#F472B6";
      penDotFill = "#FDE047";
      bookOpacity = 0.95;
      pagesStroke = "rgba(245, 208, 254, 0.75)";
      outerGlow = "drop-shadow(0 0 16px rgba(232, 121, 249, 0.5))";
    } else {
      // Candy sunset rose-to-lavender
      bgGradientStops = [
        { offset: "0%", color: "#F472B6" },
        { offset: "50%", color: "#A855F7" },
        { offset: "100%", color: "#6366F1" },
      ];
      specularStroke = "rgba(255, 255, 255, 0.65)";
      specularStrokeWidth = 1.5;
      penFill = "#FFFFFF";
      penDotFill = "#FDE047";
      bookOpacity = 0.95;
      pagesStroke = "rgba(255, 255, 255, 0.75)";
      outerGlow = "drop-shadow(0 6px 18px rgba(168, 85, 247, 0.35))";
    }
  }

  const svgIcon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-300 group-hover:scale-105 ${className}`}
      style={{ filter: outerGlow }}
      aria-hidden="true"
    >
      <defs>
        {/* Dynamic Background Gradient */}
        <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          {bgGradientStops.map((stop, i) => (
            <stop
              key={i}
              offset={stop.offset}
              stopColor={stop.color}
              stopOpacity={stop.opacity ?? 1}
            />
          ))}
        </linearGradient>

        {/* Specular Edge Refraction Gradient */}
        <linearGradient id={specularGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.6} />
          <stop offset="50%" stopColor="#ffffff" stopOpacity={0.1} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0.0} />
        </linearGradient>

        {/* Pen accent gradient */}
        <linearGradient id={penGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={penFill} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0.9} />
        </linearGradient>
      </defs>

      {/* Main Squircle Container */}
      <rect
        x="14"
        y="14"
        width="100"
        height="100"
        rx={squircleRadius}
        fill={`url(#${bgGradId})`}
        stroke={specularStroke}
        strokeWidth={specularStrokeWidth}
      />

      {/* Top Glass Highlight Arc for Glass/Bubble themes */}
      {(activeTheme === "glass" || activeTheme === "bubble") && (
        <path
          d={`M 15 ${14 + squircleRadius} A ${squircleRadius} ${squircleRadius} 0 0 1 ${14 + squircleRadius} 15 L ${114 - squircleRadius} 15 A ${squircleRadius} ${squircleRadius} 0 0 1 113 ${14 + squircleRadius} Q 64 32 15 ${14 + squircleRadius} Z`}
          fill={`url(#${specularGradId})`}
          opacity={0.7}
        />
      )}

      {/* Stylized Cap / Book Base & Pen Motif */}
      <g transform="translate(64, 64) scale(0.62)">
        {/* Book / Cap Foundation */}
        <path
          d="M-40 10 Q -40 30, 0 35 Q 40 30, 40 10 L 40 -10 Q 0 -5, -40 -10 Z"
          fill="#ffffff"
          fillOpacity={bookOpacity}
        />
        {/* Dynamic Pages Curve */}
        <path
          d="M-35 12 Q -35 28, 0 32 Q 35 28, 35 12"
          stroke={pagesStroke}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Pen Tip Overlay */}
        <path
          d="M0 -30 L 15 0 L 0 40 L -15 0 Z"
          fill={`url(#${penGradId})`}
        />
        {/* Pen Nib Dot */}
        <circle cx="0" cy="-30" r="5.5" fill={penDotFill} />
      </g>
    </svg>
  );

  if (!showText) {
    return svgIcon;
  }

  // Theme-aware text styles
  let subtitleBadgeClasses = "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/40 dark:border-indigo-800/40";
  if (activeTheme === "minimalist") {
    subtitleBadgeClasses = "text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/70 border-zinc-200 dark:border-zinc-700";
  } else if (activeTheme === "glass") {
    subtitleBadgeClasses = "text-cyan-600 dark:text-cyan-300 bg-cyan-50/80 dark:bg-cyan-950/40 border-cyan-200/50 dark:border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]";
  } else if (activeTheme === "bubble") {
    subtitleBadgeClasses = "text-purple-600 dark:text-purple-300 bg-purple-50/80 dark:bg-purple-950/40 border-purple-200/50 dark:border-purple-500/30";
  }

  return (
    <div className={`flex items-baseline gap-2.5 overflow-hidden whitespace-nowrap ${textClassName}`}>
      {svgIcon}
      <div className="flex items-baseline gap-2">
        <span className="font-title text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          ResearchMate
        </span>
        {subtitle && (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${subtitleBadgeClasses}`}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default ResearchMateLogo;
