// ============================================
// AppearanceTab.tsx - Appearance Settings Tab
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Palette, Sun, Moon, Monitor, Clock } from "lucide-react";
import { Card, Select, Toggle } from "../../shared/ui";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface AppearanceTabProps {
  theme: string;
  setTheme: (t: "light" | "dark" | "system") => void;
  visualTheme: string;
  setVisualTheme: (t: "minimalist" | "glass") => void;
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
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary-600" /> Theme
        </h3>
        <p className="text-gray-500 text-sm mb-6">
          Choose how ResearchMate looks to you
        </p>
        <div className="mb-6">
          <Select
            label="Visual Theme"
            value={visualTheme}
            onChange={(value) =>
              setVisualTheme(value as "minimalist" | "glass")
            }
            options={[
              { value: "minimalist", label: "Minimalist (Default)" },
              { value: "glass", label: "Glass" },
            ]}
          />
          <p className="text-xs text-gray-500 mt-2">
            Applies across dashboard, auth pages, and shared layouts.
          </p>
        </div>

        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
          Color Mode
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              id: "light",
              label: "Light",
              icon: Sun,
              desc: "Clean and bright",
            },
            {
              id: "dark",
              label: "Dark",
              icon: Moon,
              desc: "Easy on the eyes",
            },
            {
              id: "system",
              label: "System",
              icon: Monitor,
              desc: "Match your device",
            },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => setTheme(option.id as "light" | "dark" | "system")}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                theme === option.id
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <option.icon
                className={`w-8 h-8 mb-3 ${
                  theme === option.id ? "text-primary-600" : "text-gray-400"
                }`}
              />
              <p
                className={`font-semibold ${
                  theme === option.id
                    ? "text-primary-600"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                {option.label}
              </p>
              <p className="text-xs text-gray-500 mt-1">{option.desc}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Preview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Preview</h3>
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary-500"></div>
            <div>
              <div className="h-3 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-2 w-16 bg-gray-200 dark:bg-gray-700 rounded mt-1"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-2 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
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

