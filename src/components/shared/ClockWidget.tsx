// ============================================
// CLOCK WIDGET - Glassmorphism Progress Bar Clock
// ResearchMate Design System
// ============================================

import React, { useState, useEffect } from "react";
import { Clock, X } from "lucide-react";

interface ClockWidgetProps {
  isVisible?: boolean;
  onClose?: () => void;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const ClockWidget: React.FC<ClockWidgetProps> = ({
  isVisible = true,
  onClose,
  position = "bottom-right",
}) => {
  const [time, setTime] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    day: 1,
    month: 0,
    year: 2024,
  });
  const [use24Hour, setUse24Hour] = useState(
    () => localStorage.getItem("clockFormat") !== "12",
  );

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime({
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
        day: now.getDate(),
        month: now.getMonth(),
        year: now.getFullYear(),
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen for format changes from settings
  useEffect(() => {
    const handleFormatChange = () => {
      setUse24Hour(localStorage.getItem("clockFormat") !== "12");
    };
    window.addEventListener("clockFormatChange", handleFormatChange);
    return () =>
      window.removeEventListener("clockFormatChange", handleFormatChange);
  }, []);

  if (!isVisible) return null;

  const hourRatio = time.hours / 24;
  const minuteRatio = time.minutes / 60;
  const secondRatio = time.seconds / 60;

  const formatNumber = (n: number) => n.toString().padStart(2, "0");

  // Format hours for display
  const getDisplayHours = () => {
    if (use24Hour) return formatNumber(time.hours);
    const hour12 = time.hours % 12 || 12;
    return formatNumber(hour12);
  };

  const getAmPm = () => (time.hours >= 12 ? "PM" : "AM");

  const positionClasses = {
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-40 animate-fade-in-up`}
      style={{ animationDuration: "0.3s" }}
    >
      {/* Glassmorphism Container - Light: white glass, Dark: dark glass */}
      <div className="relative backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 rounded-2xl border border-gray-200/50 dark:border-white/10 shadow-2xl overflow-hidden p-5 min-w-[280px]">
        {/* Gradient Glow Effect */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-[#007AFF]/20 via-[#5856D6]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-tr from-[#FF9500]/15 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-gray-500/10 hover:bg-gray-500/20 transition-colors"
            title="Close clock"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-white/70" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-[#007AFF]" />
          <span className="text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">
            Local Time
          </span>
        </div>

        {/* Progress Bars */}
        <div className="space-y-3 mb-4">
          {/* Hours Bar */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400 dark:text-white/40 uppercase">
                Hours
              </span>
              <span className="text-xs text-gray-600 dark:text-white/60 font-mono">
                {formatNumber(time.hours)}
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                style={{
                  width: `${hourRatio * 100}%`,
                  background: "linear-gradient(90deg, #007AFF, #5AC8FA)",
                }}
              />
            </div>
          </div>

          {/* Minutes Bar */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400 dark:text-white/40 uppercase">
                Minutes
              </span>
              <span className="text-xs text-gray-600 dark:text-white/60 font-mono">
                {formatNumber(time.minutes)}
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                style={{
                  width: `${minuteRatio * 100}%`,
                  background: "linear-gradient(90deg, #5856D6, #AF52DE)",
                }}
              />
            </div>
          </div>

          {/* Seconds Bar */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400 dark:text-white/40 uppercase">
                Seconds
              </span>
              <span className="text-xs text-gray-600 dark:text-white/60 font-mono">
                {formatNumber(time.seconds)}
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                style={{
                  width: `${secondRatio * 100}%`,
                  background: "linear-gradient(90deg, #FF9500, #FF6B00)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Date & Time Display */}
        <div className="pt-3 border-t border-gray-200 dark:border-white/10">
          <div className="text-center">
            <div className="text-2xl font-light text-gray-900 dark:text-white tracking-wide font-mono">
              {getDisplayHours()}:{formatNumber(time.minutes)}
              <span className="text-lg text-gray-400 dark:text-white/50">
                :{formatNumber(time.seconds)}
              </span>
              {!use24Hour && (
                <span className="text-sm text-gray-500 dark:text-white/40 ml-1">
                  {getAmPm()}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-white/50 mt-1">
              {MONTHS[time.month]} {time.day}, {time.year}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClockWidget;
