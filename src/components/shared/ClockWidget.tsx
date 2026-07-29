// ============================================
// CLOCK & POMODORO WIDGET
// Glassmorphism Progress Bar Clock & Focus Productivity Timer
// ResearchMate Design System
// ============================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Clock,
  Timer,
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  Coffee,
  CheckCircle2,
} from "lucide-react";

interface ClockWidgetProps {
  isVisible?: boolean;
  onClose?: () => void;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

type PomoMode = "work" | "shortBreak" | "longBreak";

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
  // Widget Tab Mode
  const [activeTab, setActiveTab] = useState<"clock" | "pomodoro">(
    () => (localStorage.getItem("clockWidgetDefaultMode") as "clock" | "pomodoro") || "clock",
  );

  // Position & Format Settings
  const [widgetPosition, setWidgetPosition] = useState<string>(
    () => localStorage.getItem("clockWidgetPosition") || position,
  );
  const [use24Hour, setUse24Hour] = useState(
    () => localStorage.getItem("clockFormat") !== "12",
  );
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem("pomodoroSoundEnabled") !== "false",
  );

  // ---------- CLOCK STATE ----------
  const [time, setTime] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    day: 1,
    month: 0,
    year: 2026,
  });

  // ---------- POMODORO STATE ----------
  const [pomoMode, setPomoMode] = useState<PomoMode>("work");
  const [workMin, setWorkMin] = useState<number>(() => {
    const val = parseInt(localStorage.getItem("pomodoroWorkDuration") || "25", 10);
    return isNaN(val) ? 25 : val;
  });
  const [shortMin, setShortMin] = useState<number>(() => {
    const val = parseInt(localStorage.getItem("pomodoroShortBreakDuration") || "5", 10);
    return isNaN(val) ? 5 : val;
  });
  const [longMin, setLongMin] = useState<number>(() => {
    const val = parseInt(localStorage.getItem("pomodoroLongBreakDuration") || "15", 10);
    return isNaN(val) ? 15 : val;
  });

  const getDurationForMode = useCallback(
    (mode: PomoMode) => {
      if (mode === "work") return workMin * 60;
      if (mode === "shortBreak") return shortMin * 60;
      return longMin * 60;
    },
    [workMin, shortMin, longMin],
  );

  const [timeLeft, setTimeLeft] = useState<number>(() => getDurationForMode("work"));
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sound chime synthesizer using Web Audio API
  const playCompletionChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();

      // Note 1: D5 (587.33Hz)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.5);

      // Note 2: A5 (880Hz) after 0.2s
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2);
      gain2.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(audioCtx.currentTime + 0.2);
      osc2.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.warn("Audio chime play error:", e);
    }
  }, [soundEnabled]);

  // Real-time Clock interval
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

  // Pomodoro timer effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
      playCompletionChime();

      if (pomoMode === "work") {
        setSessionsCompleted((prev) => prev + 1);
      }
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft, pomoMode, playCompletionChime]);

  // Listen for settings events
  useEffect(() => {
    const handleFormatChange = () => {
      setUse24Hour(localStorage.getItem("clockFormat") !== "12");
    };

    const handleSettingsChange = () => {
      const newPos = localStorage.getItem("clockWidgetPosition") || position;
      setWidgetPosition(newPos);

      const newDefaultMode = (localStorage.getItem("clockWidgetDefaultMode") as "clock" | "pomodoro") || "clock";
      setActiveTab(newDefaultMode);

      setUse24Hour(localStorage.getItem("clockFormat") !== "12");
      setSoundEnabled(localStorage.getItem("pomodoroSoundEnabled") !== "false");

      const w = parseInt(localStorage.getItem("pomodoroWorkDuration") || "25", 10);
      const s = parseInt(localStorage.getItem("pomodoroShortBreakDuration") || "5", 10);
      const l = parseInt(localStorage.getItem("pomodoroLongBreakDuration") || "15", 10);

      setWorkMin(isNaN(w) ? 25 : w);
      setShortMin(isNaN(s) ? 5 : s);
      setLongMin(isNaN(l) ? 15 : l);
    };

    window.addEventListener("clockFormatChange", handleFormatChange);
    window.addEventListener("pomodoroSettingsChange", handleSettingsChange);
    window.addEventListener("clockWidgetToggle", handleSettingsChange);

    return () => {
      window.removeEventListener("clockFormatChange", handleFormatChange);
      window.removeEventListener("pomodoroSettingsChange", handleSettingsChange);
      window.removeEventListener("clockWidgetToggle", handleSettingsChange);
    };
  }, [position]);

  // Reset timer on mode change
  const handleModeSwitch = (mode: PomoMode) => {
    setPomoMode(mode);
    setIsRunning(false);
    setTimeLeft(getDurationForMode(mode));
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getDurationForMode(pomoMode));
  };

  if (!isVisible) return null;

  // Position classes map
  const positionClasses: Record<string, string> = {
    "top-right": "top-20 right-6",
    "top-left": "top-20 left-6",
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
  };

  const currentPosClass = positionClasses[widgetPosition] || positionClasses["bottom-right"];

  // Clock Ratios
  const hourRatio = time.hours / 24;
  const minuteRatio = time.minutes / 60;
  const secondRatio = time.seconds / 60;

  const formatNumber = (n: number) => n.toString().padStart(2, "0");

  const getDisplayHours = () => {
    if (use24Hour) return formatNumber(time.hours);
    const hour12 = time.hours % 12 || 12;
    return formatNumber(hour12);
  };
  const getAmPm = () => (time.hours >= 12 ? "PM" : "AM");

  // Pomodoro Progress Calc
  const pomoTotalSecs = getDurationForMode(pomoMode);
  const pomoProgressPct = pomoTotalSecs > 0 ? ((pomoTotalSecs - timeLeft) / pomoTotalSecs) * 100 : 0;

  const formatPomoTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const modeTheme = {
    work: { color: "#007AFF", label: "Focus", icon: Zap, gradient: "from-blue-500 to-indigo-600" },
    shortBreak: { color: "#34C759", label: "Short Break", icon: Coffee, gradient: "from-emerald-500 to-teal-600" },
    longBreak: { color: "#5856D6", label: "Long Break", icon: Coffee, gradient: "from-violet-500 to-purple-600" },
  }[pomoMode];

  const ModeIcon = modeTheme.icon;

  return (
    <div
      className={`fixed ${currentPosClass} z-40 animate-fade-in-up transition-all duration-300`}
      style={{ animationDuration: "0.3s" }}
    >
      {/* Glassmorphism Container */}
      <div className="relative backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90 rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden p-5 min-w-[300px] max-w-[320px] transition-all">
        {/* Glow Gradients */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-[#007AFF]/20 via-[#5856D6]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-tr from-[#34C759]/15 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Top Header: Tabs & Actions */}
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-white/10">
          {/* Tabs Switcher */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("clock")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "clock"
                  ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Clock</span>
            </button>
            <button
              onClick={() => setActiveTab("pomodoro")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "pomodoro"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Pomodoro</span>
            </button>
          </div>

          {/* Sound & Close Actions */}
          <div className="flex items-center gap-1">
            {activeTab === "pomodoro" && (
              <button
                onClick={() => {
                  const nextSound = !soundEnabled;
                  setSoundEnabled(nextSound);
                  localStorage.setItem("pomodoroSoundEnabled", String(nextSound));
                }}
                className="p-1.5 rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-gray-500 dark:text-gray-400 transition-colors"
                title={soundEnabled ? "Mute completion chime" : "Enable completion chime"}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-gray-500 dark:text-gray-400 transition-colors"
                title="Hide widget"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ============================================ */}
        {/* TAB 1: CLOCK VIEW                            */}
        {/* ============================================ */}
        {activeTab === "clock" && (
          <div className="animate-fade-in space-y-4">
            {/* Progress Bars */}
            <div className="space-y-2.5">
              {/* Hours */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-wider">
                    Hours
                  </span>
                  <span className="text-xs text-gray-700 dark:text-white/70 font-mono font-bold">
                    {formatNumber(time.hours)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                    style={{
                      width: `${hourRatio * 100}%`,
                      background: "linear-gradient(90deg, #007AFF, #5AC8FA)",
                    }}
                  />
                </div>
              </div>

              {/* Minutes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-wider">
                    Minutes
                  </span>
                  <span className="text-xs text-gray-700 dark:text-white/70 font-mono font-bold">
                    {formatNumber(time.minutes)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                    style={{
                      width: `${minuteRatio * 100}%`,
                      background: "linear-gradient(90deg, #5856D6, #AF52DE)",
                    }}
                  />
                </div>
              </div>

              {/* Seconds */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-wider">
                    Seconds
                  </span>
                  <span className="text-xs text-gray-700 dark:text-white/70 font-mono font-bold">
                    {formatNumber(time.seconds)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
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

            {/* Big Digital Clock Display */}
            <div className="pt-3 border-t border-gray-100 dark:border-white/10 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight font-mono">
                {getDisplayHours()}:{formatNumber(time.minutes)}
                <span className="text-base font-normal text-gray-400 dark:text-white/50 ml-1">
                  :{formatNumber(time.seconds)}
                </span>
                {!use24Hour && (
                  <span className="text-xs text-gray-500 dark:text-white/40 ml-1.5 font-sans font-bold">
                    {getAmPm()}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-white/50 font-medium mt-1">
                {MONTHS[time.month]} {time.day}, {time.year}
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* TAB 2: POMODORO VIEW                         */}
        {/* ============================================ */}
        {activeTab === "pomodoro" && (
          <div className="animate-fade-in space-y-4">
            {/* Mode Selection Chips */}
            <div className="flex justify-between gap-1 bg-gray-100 dark:bg-slate-800/60 p-1 rounded-xl">
              {(
                [
                  { id: "work", label: `Focus (${workMin}m)` },
                  { id: "shortBreak", label: `Break (${shortMin}m)` },
                  { id: "longBreak", label: `Long (${longMin}m)` },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleModeSwitch(m.id)}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all text-center ${
                    pomoMode === m.id
                      ? "bg-white dark:bg-slate-900 shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                  }`}
                  style={{
                    color: pomoMode === m.id ? modeTheme.color : undefined,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Circular Progress & Timer */}
            <div className="flex flex-col items-center py-1">
              <div className="relative w-32 h-32 my-1">
                <svg className="w-full h-full -rotate-90">
                  {/* Track circle */}
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-gray-100 dark:text-slate-800"
                  />
                  {/* Animated Progress circle */}
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke={modeTheme.color}
                    strokeWidth="6"
                    strokeDasharray={351.8}
                    strokeDashoffset={351.8 - (351.8 * pomoProgressPct) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1 mb-0.5" style={{ color: modeTheme.color }}>
                    <ModeIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {modeTheme.label}
                    </span>
                  </div>
                  <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white font-mono tabular-nums">
                    {formatPomoTime(timeLeft)}
                  </span>
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex items-center justify-center gap-4 mt-2">
                <button
                  onClick={handleResetTimer}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-xl bg-gray-100 dark:bg-slate-800"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`w-11 h-11 flex items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95 bg-gradient-to-r ${modeTheme.gradient}`}
                  style={{ boxShadow: `0 6px 16px ${modeTheme.color}40` }}
                  title={isRunning ? "Pause" : "Start"}
                >
                  {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
              </div>
            </div>

            {/* Sessions Completed Counter */}
            <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5 text-[11px] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Focus Completed Today</span>
              </span>
              <span className="font-bold text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {sessionsCompleted}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClockWidget;
