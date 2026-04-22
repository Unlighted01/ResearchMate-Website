// ============================================
// FocusTimer.tsx - Pomodoro Productivity Timer
// ============================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, RotateCcw, Timer, Coffee, Zap } from "lucide-react";

type TimerMode = "work" | "shortBreak" | "longBreak";

const MODES: Record<TimerMode, { label: string; minutes: number; color: string; icon: any }> = {
  work: { label: "Focus", minutes: 25, color: "#007AFF", icon: Zap },
  shortBreak: { label: "Short Break", minutes: 5, color: "#34C759", icon: Coffee },
  longBreak: { label: "Long Break", minutes: 15, color: "#5856D6", icon: Coffee },
};

const FocusTimer: React.FC = () => {
  const [mode, setMode] = useState<TimerMode>("work");
  const [timeLeft, setTimeLeft] = useState(MODES.work.minutes * 60);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = MODES[mode].minutes * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggle = () => setIsActive(!isActive);

  const handleReset = useCallback(() => {
    setIsActive(false);
    setTimeLeft(MODES[mode].minutes * 60);
  }, [mode]);

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(MODES[newMode].minutes * 60);
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Optional: Play sound or show notification
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const ModeIcon = MODES[mode].icon;

  return (
    <div className="p-4 bg-white dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm mx-2 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ModeIcon className="w-4 h-4" style={{ color: MODES[mode].color }} />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {MODES[mode].label}
          </span>
        </div>
        <div className="flex gap-1">
          {(Object.keys(MODES) as TimerMode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`w-2 h-2 rounded-full transition-all ${
                mode === m ? "scale-125 shadow-sm" : "opacity-30 hover:opacity-100"
              }`}
              style={{ backgroundColor: MODES[m].color }}
              title={MODES[m].label}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32 mb-4">
          {/* Progress Ring */}
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="60"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-gray-100 dark:text-gray-800"
            />
            <circle
              cx="64"
              cy="64"
              r="60"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={377}
              strokeDashoffset={377 - (377 * progress) / 100}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear"
              style={{ color: MODES[mode].color }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white tabular-nums">
              {formatTime(timeLeft)}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">remaining</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={handleToggle}
            className="w-12 h-12 flex items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            style={{ backgroundColor: MODES[mode].color, boxShadow: `0 8px 16px ${MODES[mode].color}33` }}
          >
            {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
          </button>
          <div className="w-5 h-5" /> {/* Spacer to center the play button */}
        </div>
      </div>
    </div>
  );
};

export default FocusTimer;
