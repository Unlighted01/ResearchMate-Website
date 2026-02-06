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

  if (!isVisible) return null;

  const hourRatio = time.hours / 24;
  const minuteRatio = time.minutes / 60;
  const secondRatio = time.seconds / 60;

  const formatNumber = (n: number) => n.toString().padStart(2, "0");

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
      {/* Glassmorphism Container */}
      <div className="relative backdrop-blur-xl bg-gray-900/80 dark:bg-black/80 rounded-2xl border border-gray-700/50 dark:border-white/10 shadow-2xl overflow-hidden p-5 min-w-[280px]">
        {/* Gradient Glow Effect */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-[#007AFF]/30 via-[#5856D6]/20 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-tr from-[#FF9500]/20 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Close clock"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-[#007AFF]" />
          <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
            Local Time
          </span>
        </div>

        {/* Progress Bars */}
        <div className="space-y-3 mb-4">
          {/* Hours Bar */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-white/40 uppercase">Hours</span>
              <span className="text-xs text-white/60 font-mono">
                {formatNumber(time.hours)}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
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
              <span className="text-[10px] text-white/40 uppercase">
                Minutes
              </span>
              <span className="text-xs text-white/60 font-mono">
                {formatNumber(time.minutes)}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
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
              <span className="text-[10px] text-white/40 uppercase">
                Seconds
              </span>
              <span className="text-xs text-white/60 font-mono">
                {formatNumber(time.seconds)}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${secondRatio * 100}%`,
                  background: "linear-gradient(90deg, #FF9500, #FF6B00)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Date & Time Display */}
        <div className="pt-3 border-t border-white/10">
          <div className="text-center">
            <div className="text-2xl font-light text-white tracking-wide font-mono">
              {formatNumber(time.hours)}:{formatNumber(time.minutes)}
              <span className="text-lg text-white/50">
                :{formatNumber(time.seconds)}
              </span>
            </div>
            <div className="text-sm text-white/50 mt-1">
              {MONTHS[time.month]} {time.day}, {time.year}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClockWidget;
