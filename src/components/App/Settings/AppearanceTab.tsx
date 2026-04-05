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
  setVisualTheme: (t: "minimalist" | "bubble" | "glass") => void;
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
              setVisualTheme(value as "minimalist" | "bubble" | "glass")
            }
            options={[
              { value: "minimalist", label: "Minimalist (Default)" },
              { value: "bubble", label: "Bubble" },
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

      {/* Clock Widget */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-600" /> Clock Widget
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          Display a floating clock widget on your dashboard
        </p>
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              Show Clock Widget
            </p>
            <p className="text-sm text-gray-500">
              Glassmorphism clock with progress bars
            </p>
          </div>
          <Toggle
            checked={localStorage.getItem("showClockWidget") === "true"}
            onChange={(checked) => {
              localStorage.setItem("showClockWidget", String(checked));
              window.dispatchEvent(new Event("clockWidgetToggle"));
              showToast(
                checked ? "Clock widget enabled" : "Clock widget disabled",
                "info",
              );
            }}
          />
        </div>

        {/* Time Format Selection */}
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Time Format
          </p>
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
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  (localStorage.getItem("clockFormat") || "24") === option.id
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <p
                  className={`font-semibold ${
                    (localStorage.getItem("clockFormat") || "24") === option.id
                      ? "text-primary-600"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {option.label}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  {option.example}
                </p>
              </button>
            ))}
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
