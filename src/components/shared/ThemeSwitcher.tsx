// ============================================
// ThemeSwitcher.tsx - One-Click Header Theme Switcher
// Allows instant toggling between Minimalist, Glass,
// Bubble, and Light / Dark / System modes.
// ============================================

import React, { useState, useRef, useEffect } from "react";
import { Palette, Sun, Moon, Monitor, Sparkles, Layers, Feather } from "lucide-react";
import { useTheme, type VisualTheme, type Theme } from "../../context/ThemeContext";
import { motion, AnimatePresence } from "motion/react";

interface ThemeSwitcherProps {
  className?: string;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ className = "" }) => {
  const { theme, setTheme, visualTheme, setVisualTheme, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const visualThemes: { id: VisualTheme; label: string; icon: React.FC<{ className?: string }>; accent: string }[] = [
    {
      id: "minimalist",
      label: "Minimalist",
      icon: Feather,
      accent: "bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900",
    },
    {
      id: "glass",
      label: "Glass",
      icon: Layers,
      accent: "bg-cyan-500 text-white shadow-[0_0_10px_rgba(34,211,238,0.5)]",
    },
    {
      id: "bubble",
      label: "Bubble",
      icon: Sparkles,
      accent: "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-[0_0_10px_rgba(232,121,249,0.5)]",
    },
  ];

  const colorModes: { id: Theme; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Switch Theme & Mode"
        title="Theme and appearance settings"
        className={`p-2 rounded-md transition-colors relative flex items-center justify-center ${
          isOpen
            ? "text-primary-600 dark:text-primary-400 bg-slate-200/80 dark:bg-slate-800"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
        }`}
      >
        <Palette className="w-4 h-4" />
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${
            visualTheme === "glass"
              ? "bg-cyan-400"
              : visualTheme === "bubble"
              ? "bg-pink-400"
              : "bg-zinc-600 dark:bg-zinc-300"
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="theme-surface absolute right-0 top-full mt-2 w-72 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl p-3 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800/80">
              <span className="font-title text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-primary-500" />
                Workstation Theme
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {visualTheme} · {isDark ? "Dark" : "Light"}
              </span>
            </div>

            {/* Visual Theme Section */}
            <div className="space-y-1.5 mb-3">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                Aesthetic Style
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50">
                {visualThemes.map((v) => {
                  const isSelected = visualTheme === v.id;
                  const Icon = v.icon;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setVisualTheme(v.id)}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all duration-150 ${
                        isSelected
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isSelected ? v.accent : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <span className="text-[11px] truncate">{v.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Mode Section */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                Color Mode
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50">
                {colorModes.map((c) => {
                  const isSelected = theme === c.id;
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setTheme(c.id)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                        isSelected
                          ? "bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-xs font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[11px]">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeSwitcher;
