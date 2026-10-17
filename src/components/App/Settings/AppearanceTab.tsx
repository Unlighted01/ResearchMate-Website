// ============================================
// AppearanceTab.tsx - Appearance Settings Tab
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Palette, Sun, Moon, Monitor, Clock, Timer, Zap, Feather, Layers, Sparkles, Check } from "lucide-react";
import { Card, Toggle } from "../../shared/ui";
import { ResearchMateLogo } from "../../shared/ResearchMateLogo";
import { type VisualTheme } from "../../../context/ThemeContext";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface AppearanceTabProps {
  theme: string;
  setTheme: (t: "light" | "dark" | "system") => void;
  visualTheme: VisualTheme;
  setVisualTheme: (t: VisualTheme) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const AppearanceTab: React.FC<AppearanceTabProps> = ({
  theme,
  setTheme,
  visualTheme,
  setVisualTheme,
  showToast,
}) => {
  const visualThemeOptions: {
    id: VisualTheme;
    name: string;
    tagline: string;
    icon: React.FC<{ className?: string }>;
    accentPill: string;
    swatchBg: string;
    swatchBorder: string;
  }[] = [
    {
      id: "minimalist",
      name: "Minimalist",
      tagline: "Editorial precision, stark monochrome & cobalt hairlines",
      icon: Feather,
      accentPill: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
      swatchBg: "bg-white dark:bg-[#121215]",
      swatchBorder: "border-slate-300 dark:border-zinc-700",
    },
    {
      id: "glass",
      name: "Glass",
      tagline: "Frosted acrylic, specular highlights & cyan aurora glow",
      icon: Layers,
      accentPill: "bg-cyan-500 text-white shadow-[0_0_10px_rgba(34,211,238,0.5)]",
      swatchBg: "bg-cyan-50/70 dark:bg-cyan-950/40 backdrop-blur-md",
      swatchBorder: "border-cyan-300/80 dark:border-cyan-500/40",
    },
    {
      id: "bubble",
      name: "Bubble",
      tagline: "Organic curves, soft lavender velvet & electric magenta",
      icon: Sparkles,
      accentPill: "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-[0_0_10px_rgba(232,121,249,0.5)]",
      swatchBg: "bg-purple-50/80 dark:bg-[#1A0B2E]/70",
      swatchBorder: "border-purple-300/80 dark:border-purple-500/40",
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary-600" /> Workspace Theme
        </h3>
        <p className="text-gray-500 text-sm mb-6">
          Customize the aesthetic personality and color mode of your workstation
        </p>

        {/* Visual Themes Grid */}
        <div className="mb-8">
          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            Aesthetic Family
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {visualThemeOptions.map((opt) => {
              const isSelected = visualTheme === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    setVisualTheme(opt.id);
                    showToast(`Theme changed to ${opt.name}`, "info");
                  }}
                  className={`relative p-5 rounded-2xl border-2 transition-all duration-200 text-left flex flex-col justify-between overflow-hidden group ${
                    isSelected
                      ? "border-primary-500 shadow-md ring-2 ring-primary-500/20 bg-primary-50/30 dark:bg-primary-950/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/50 dark:bg-slate-900/40"
                  }`}
                >
                  {/* Selected check badge */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}

                  <div>
                    {/* Header icon & pill */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        isSelected ? opt.accentPill : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-title font-semibold text-base text-slate-900 dark:text-slate-100">
                        {opt.name}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                      {opt.tagline}
                    </p>
                  </div>

                  {/* Swatch Preview Bar */}
                  <div className={`h-8 w-full rounded-xl border ${opt.swatchBorder} ${opt.swatchBg} flex items-center px-3 gap-2 overflow-hidden`}>
                    <div className="w-3 h-3 rounded-full bg-current opacity-70" />
                    <div className="h-1.5 w-12 rounded-full bg-current opacity-40" />
                    <div className="h-1.5 w-6 rounded-full bg-current opacity-25" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Mode Selection */}
        <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          Color Mode
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              id: "light",
              label: "Light",
              icon: Sun,
              desc: "Crisp and luminous day contrast",
            },
            {
              id: "dark",
              label: "Dark",
              icon: Moon,
              desc: "Deep obsidian ease for late-night focus",
            },
            {
              id: "system",
              label: "System",
              icon: Monitor,
              desc: "Automatically adapts to device appearance",
            },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => {
                setTheme(option.id as "light" | "dark" | "system");
                showToast(`Color mode set to ${option.label}`, "info");
              }}
              className={`p-4 sm:p-5 rounded-2xl border-2 transition-all text-left ${
                theme === option.id
                  ? "border-primary-500 bg-primary-50/40 dark:bg-primary-900/20 shadow-md ring-2 ring-primary-500/20"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/40 dark:bg-slate-900/40"
              }`}
            >
              <option.icon
                className={`w-6 h-6 mb-2.5 ${
                  theme === option.id ? "text-primary-600 dark:text-primary-400" : "text-slate-400"
                }`}
              />
              <p
                className={`font-semibold text-sm ${
                  theme === option.id
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-slate-900 dark:text-white"
                }`}
              >
                {option.label}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{option.desc}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Live Dynamic Theme Preview Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Workstation Preview
          </h3>
          <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
            Active: {visualTheme} · {theme}
          </span>
        </div>

        <div className="theme-surface p-5 rounded-2xl border transition-all duration-300">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-3">
              <ResearchMateLogo size={36} />
              <div>
                <span className="font-title text-base font-semibold text-slate-900 dark:text-slate-100 block">
                  ResearchMate Workstation
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Dynamic vector mark synced with {visualTheme} aesthetic
                </span>
              </div>
            </div>

            <button className="theme-btn-primary px-3.5 py-1.5 text-xs font-medium rounded-lg transition-transform active:scale-95">
              Action Button
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Paper Index
              </span>
              <span className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-mono">
                128 Sources
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Syntheses
              </span>
              <span className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-mono">
                94 Complete
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Formulary Rubric
              </span>
              <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                Active 4-Step
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Clock & Pomodoro Widget Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Timer className="w-5 h-5 text-primary-600" /> Clock & Pomodoro Widget
        </h3>
        <p className="text-gray-500 text-sm mb-6">
          Customize your floating productivity clock and focus timer
        </p>

        {/* Enable / Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl mb-6">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              Show Floating Widget
            </p>
            <p className="text-sm text-gray-500">
              Glassmorphism floating clock and Pomodoro timer
            </p>
          </div>
          <Toggle
            checked={localStorage.getItem("showClockWidget") !== "false"}
            onChange={(checked) => {
              localStorage.setItem("showClockWidget", String(checked));
              window.dispatchEvent(new Event("clockWidgetToggle"));
              showToast(
                checked ? "Clock & Pomodoro widget enabled" : "Widget disabled",
                "info",
              );
            }}
          />
        </div>

        {/* Default View & Screen Position */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Default Mode */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Default Widget Tab
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "clock", label: "Clock", icon: Clock },
                { id: "pomodoro", label: "Pomodoro", icon: Timer },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    localStorage.setItem("clockWidgetDefaultMode", item.id);
                    window.dispatchEvent(new Event("pomodoroSettingsChange"));
                    showToast(`Default view set to ${item.label}`, "info");
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium text-sm transition-all ${
                    (localStorage.getItem("clockWidgetDefaultMode") || "clock") === item.id
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-semibold"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Screen Position */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Screen Position
            </label>
            <select
              value={localStorage.getItem("clockWidgetPosition") || "bottom-right"}
              onChange={(e) => {
                localStorage.setItem("clockWidgetPosition", e.target.value);
                window.dispatchEvent(new Event("pomodoroSettingsChange"));
                showToast(`Widget position set to ${e.target.value.replace("-", " ")}`, "info");
              }}
              className="w-full p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:border-primary-500 transition-all"
            >
              <option value="bottom-right">Bottom Right (Default)</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="top-right">Top Right</option>
              <option value="top-left">Top Left</option>
            </select>
          </div>
        </div>

        {/* Time Format */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            Time Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "24", label: "24 Hour", example: "16:20" },
              { id: "12", label: "12 Hour", example: "4:20 PM" },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  localStorage.setItem("clockFormat", option.id);
                  window.dispatchEvent(new Event("clockFormatChange"));
                  showToast(`Clock format set to ${option.label}`, "info");
                }}
                className={`p-3.5 rounded-xl border-2 transition-all text-left ${
                  (localStorage.getItem("clockFormat") || "24") === option.id
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <p
                  className={`font-semibold text-sm ${
                    (localStorage.getItem("clockFormat") || "24") === option.id
                      ? "text-primary-600"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {option.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">
                  {option.example}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Pomodoro Timer Durations */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" /> Pomodoro Timer Durations
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Focus Duration */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Focus Duration
              </label>
              <select
                value={localStorage.getItem("pomodoroWorkDuration") || "25"}
                onChange={(e) => {
                  localStorage.setItem("pomodoroWorkDuration", e.target.value);
                  window.dispatchEvent(new Event("pomodoroSettingsChange"));
                  showToast(`Focus time set to ${e.target.value} minutes`, "info");
                }}
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-semibold"
              >
                <option value="15">15 Minutes</option>
                <option value="20">20 Minutes</option>
                <option value="25">25 Minutes (Default)</option>
                <option value="30">30 Minutes</option>
                <option value="45">45 Minutes</option>
                <option value="60">60 Minutes</option>
              </select>
            </div>

            {/* Short Break */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Short Break
              </label>
              <select
                value={localStorage.getItem("pomodoroShortBreakDuration") || "5"}
                onChange={(e) => {
                  localStorage.setItem("pomodoroShortBreakDuration", e.target.value);
                  window.dispatchEvent(new Event("pomodoroSettingsChange"));
                  showToast(`Short break set to ${e.target.value} minutes`, "info");
                }}
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-semibold"
              >
                <option value="3">3 Minutes</option>
                <option value="5">5 Minutes (Default)</option>
                <option value="10">10 Minutes</option>
                <option value="15">15 Minutes</option>
              </select>
            </div>

            {/* Long Break */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Long Break
              </label>
              <select
                value={localStorage.getItem("pomodoroLongBreakDuration") || "15"}
                onChange={(e) => {
                  localStorage.setItem("pomodoroLongBreakDuration", e.target.value);
                  window.dispatchEvent(new Event("pomodoroSettingsChange"));
                  showToast(`Long break set to ${e.target.value} minutes`, "info");
                }}
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-semibold"
              >
                <option value="10">10 Minutes</option>
                <option value="15">15 Minutes (Default)</option>
                <option value="20">20 Minutes</option>
                <option value="30">30 Minutes</option>
              </select>
            </div>
          </div>

          {/* Sound Alert Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">
                Timer Completion Audio Chime
              </p>
              <p className="text-xs text-gray-500">
                Play a gentle dual-tone audio chime when a focus or break session finishes
              </p>
            </div>
            <Toggle
              checked={localStorage.getItem("pomodoroSoundEnabled") !== "false"}
              onChange={(checked) => {
                localStorage.setItem("pomodoroSoundEnabled", String(checked));
                window.dispatchEvent(new Event("pomodoroSettingsChange"));
                showToast(
                  checked ? "Timer chime sound enabled" : "Timer chime sound muted",
                  "info",
                );
              }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default AppearanceTab;

