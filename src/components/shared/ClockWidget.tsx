// ============================================
// CLOCK & FOCUS HUB WIDGET - Pomodoro, DTR & Clock
// ResearchMate Design System
// ============================================

import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  Volume2,
  VolumeX,
  Calendar,
  BookOpen,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { audioService } from "../../services/audioService";
import {
  getDTREntry,
  saveDTREntry,
  exportDTRAsMarkdown,
  addPomodoroTimeToTodayDTR,
  getTodayDateString,
  DTREntry,
} from "../../services/dtrService";

interface ClockWidgetProps {
  isVisible?: boolean;
  onClose?: () => void;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

type WidgetTab = "clock" | "pomodoro" | "dtr";
type PomodoroMode = "work" | "shortBreak" | "longBreak";

const ClockWidget: React.FC<ClockWidgetProps> = ({
  isVisible = true,
  onClose,
  position = "bottom-right",
}) => {
  // Widget View Settings
  const [activeTab, setActiveTab] = useState<WidgetTab>(() => {
    return (localStorage.getItem("defaultWidgetTab") as WidgetTab) || "clock";
  });
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // --- CLOCK MODE STATE ---
  const [time, setTime] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    day: 1,
    month: 0,
    year: 2024,
  });
  const [use24Hour, setUse24Hour] = useState(
    () => localStorage.getItem("clockFormat") !== "12"
  );

  // --- POMODORO TIMER STATE ---
  const [pomoMode, setPomoMode] = useState<PomodoroMode>("work");
  const [workDuration, setWorkDuration] = useState(() =>
    Number(localStorage.getItem("pomodoroWorkDuration")) || 25
  );
  const [shortBreakDuration, setShortBreakDuration] = useState(() =>
    Number(localStorage.getItem("pomodoroShortBreakDuration")) || 5
  );
  const [longBreakDuration, setLongBreakDuration] = useState(() =>
    Number(localStorage.getItem("pomodoroLongBreakDuration")) || 15
  );

  const getModeDurationSeconds = (mode: PomodoroMode) => {
    if (mode === "work") return workDuration * 60;
    if (mode === "shortBreak") return shortBreakDuration * 60;
    return longBreakDuration * 60;
  };

  const [timeLeft, setTimeLeft] = useState(() => getModeDurationSeconds("work"));
  const [isRunning, setIsRunning] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(
    () => localStorage.getItem("pomodoroAudioEnabled") !== "false"
  );

  // --- DTR STATE ---
  const [dtrData, setDtrData] = useState<DTREntry>(() => getDTREntry());
  const [newAccomplishment, setNewAccomplishment] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [newSnippet, setNewSnippet] = useState("");

  // Update Clock Time
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

  // Listen for Clock Format change from settings
  useEffect(() => {
    const handleFormatChange = () => {
      setUse24Hour(localStorage.getItem("clockFormat") !== "12");
    };
    window.addEventListener("clockFormatChange", handleFormatChange);
    return () => window.removeEventListener("clockFormatChange", handleFormatChange);
  }, []);

  // Listen for DTR Log Updates
  useEffect(() => {
    const handleDtrUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<DTREntry>;
      if (customEvent.detail) {
        setDtrData(customEvent.detail);
      }
    };
    window.addEventListener("dtrLogUpdated", handleDtrUpdate);
    return () => window.removeEventListener("dtrLogUpdated", handleDtrUpdate);
  }, []);

  // Pomodoro Countdown Effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      // Timer finished!
      setIsRunning(false);
      if (pomoMode === "work") {
        addPomodoroTimeToTodayDTR(workDuration);
        setDtrData(getDTREntry());
        if (audioEnabled) audioService.playPomodoroCompleteRingtone();
        audioService.sendBrowserNotification(
          "🍅 Pomodoro Complete!",
          "Great job! Time for a short break."
        );
      } else {
        if (audioEnabled) audioService.playBreakCompleteRingtone();
        audioService.sendBrowserNotification(
          "☕ Break Finished!",
          "Ready to jump back into research?"
        );
      }
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, pomoMode, workDuration, audioEnabled]);

  if (!isVisible) return null;

  // --- HELPERS ---
  const formatNumber = (n: number) => n.toString().padStart(2, "0");

  const getDisplayHours = () => {
    if (use24Hour) return formatNumber(time.hours);
    const hour12 = time.hours % 12 || 12;
    return formatNumber(hour12);
  };
  const getAmPm = () => (time.hours >= 12 ? "PM" : "AM");

  const switchPomoMode = (mode: PomodoroMode) => {
    setPomoMode(mode);
    setIsRunning(false);
    setTimeLeft(getModeDurationSeconds(mode));
  };

  const togglePomoTimer = () => {
    if (!isRunning) {
      audioService.requestNotificationPermission();
    }
    setIsRunning(!isRunning);
  };

  const resetPomoTimer = () => {
    setIsRunning(false);
    setTimeLeft(getModeDurationSeconds(pomoMode));
  };

  const formatTimerSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${formatNumber(mins)}:${formatNumber(secs)}`;
  };

  // --- DTR ACTION HANDLERS ---
  const handleAddAccomplishment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccomplishment.trim()) return;
    const updated = {
      ...dtrData,
      accomplishments: [...dtrData.accomplishments, newAccomplishment.trim()],
    };
    setDtrData(updated);
    saveDTREntry(updated);
    setNewAccomplishment("");
  };

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;
    const updated = {
      ...dtrData,
      researchedTopics: [...dtrData.researchedTopics, newTopic.trim()],
    };
    setDtrData(updated);
    saveDTREntry(updated);
    setNewTopic("");
  };

  const handleAddSnippet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnippet.trim()) return;
    const updated = {
      ...dtrData,
      copiedSnippets: [...dtrData.copiedSnippets, newSnippet.trim()],
    };
    setDtrData(updated);
    saveDTREntry(updated);
    setNewSnippet("");
  };

  const removeItem = (type: "accomplishments" | "researchedTopics" | "copiedSnippets", index: number) => {
    const updatedList = [...dtrData[type]];
    updatedList.splice(index, 1);
    const updated = { ...dtrData, [type]: updatedList };
    setDtrData(updated);
    saveDTREntry(updated);
  };

  const handleCopyDTR = () => {
    const markdown = exportDTRAsMarkdown(getTodayDateString());
    navigator.clipboard.writeText(markdown);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  const positionClasses = {
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
  };

  const pomoTotalSec = getModeDurationSeconds(pomoMode);
  const pomoProgress = pomoTotalSec > 0 ? (pomoTotalSec - timeLeft) / pomoTotalSec : 0;

  return (
    <div
      className={`fixed ${positionClasses[position]} z-40 animate-fade-in-up transition-all duration-300`}
      style={{ animationDuration: "0.3s" }}
    >
      {/* Glassmorphism Container */}
      <div className="relative backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 rounded-2xl border border-gray-200/60 dark:border-white/10 shadow-2xl overflow-hidden p-4 sm:p-5 w-[300px] sm:w-[340px]">
        {/* Glow Effects */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-[#007AFF]/20 via-[#5856D6]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-tr from-[#FF9500]/15 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Top Action Bar */}
        <div className="flex items-center justify-between mb-3 border-b border-gray-200/50 dark:border-white/10 pb-2.5">
          {/* Nav Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("clock")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "clock"
                  ? "bg-white dark:bg-gray-700 text-[#007AFF] shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Clock
            </button>

            <button
              onClick={() => setActiveTab("pomodoro")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "pomodoro"
                  ? "bg-white dark:bg-gray-700 text-[#FF9500] shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <TimerIcon className="w-3.5 h-3.5" />
              Focus
            </button>

            <button
              onClick={() => setActiveTab("dtr")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "dtr"
                  ? "bg-white dark:bg-gray-700 text-[#5856D6] shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              DTR
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-gray-500 dark:text-white/70 transition-colors"
              title={isExpanded ? "Minimize" : "Expand"}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-gray-500 dark:text-white/70 transition-colors"
                title="Close widget"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: CLOCK MODE */}
        {activeTab === "clock" && isExpanded && (
          <div className="space-y-3">
            {/* Progress Bars */}
            <div className="space-y-2.5">
              {/* Hours */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                  <span>Hours</span>
                  <span className="font-mono">{formatNumber(time.hours)}</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                    style={{
                      width: `${(time.hours / 24) * 100}%`,
                      background: "linear-gradient(90deg, #007AFF, #5AC8FA)",
                    }}
                  />
                </div>
              </div>

              {/* Minutes */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                  <span>Minutes</span>
                  <span className="font-mono">{formatNumber(time.minutes)}</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                    style={{
                      width: `${(time.minutes / 60) * 100}%`,
                      background: "linear-gradient(90deg, #5856D6, #AF52DE)",
                    }}
                  />
                </div>
              </div>

              {/* Seconds */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                  <span>Seconds</span>
                  <span className="font-mono">{formatNumber(time.seconds)}</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                    style={{
                      width: `${(time.seconds / 60) * 100}%`,
                      background: "linear-gradient(90deg, #FF9500, #FF6B00)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Main Time Display */}
            <div className="pt-3 border-t border-gray-200/60 dark:border-white/10 text-center">
              <div className="text-2xl font-light text-gray-900 dark:text-white tracking-wide font-mono">
                {getDisplayHours()}:{formatNumber(time.minutes)}
                <span className="text-base text-gray-400 dark:text-white/50">
                  :{formatNumber(time.seconds)}
                </span>
                {!use24Hour && (
                  <span className="text-xs text-gray-500 dark:text-white/40 ml-1">
                    {getAmPm()}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-white/50 mt-1 flex items-center justify-center gap-1">
                <Calendar className="w-3 h-3 text-[#007AFF]" />
                {MONTHS[time.month]} {time.day}, {time.year}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: POMODORO TIMER MODE */}
        {activeTab === "pomodoro" && isExpanded && (
          <div className="space-y-3">
            {/* Mode Selectors */}
            <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl text-center">
              <button
                onClick={() => switchPomoMode("work")}
                className={`py-1 text-[11px] font-semibold rounded-lg transition-all ${
                  pomoMode === "work"
                    ? "bg-[#FF9500] text-white shadow"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Work
              </button>
              <button
                onClick={() => switchPomoMode("shortBreak")}
                className={`py-1 text-[11px] font-semibold rounded-lg transition-all ${
                  pomoMode === "shortBreak"
                    ? "bg-[#34C759] text-white shadow"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Short Break
              </button>
              <button
                onClick={() => switchPomoMode("longBreak")}
                className={`py-1 text-[11px] font-semibold rounded-lg transition-all ${
                  pomoMode === "longBreak"
                    ? "bg-[#007AFF] text-white shadow"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Long Break
              </button>
            </div>

            {/* Countdown Display with Ring */}
            <div className="relative flex flex-col items-center justify-center py-3">
              {/* Linear Progress Bar */}
              <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${pomoProgress * 100}%`,
                    background:
                      pomoMode === "work"
                        ? "linear-gradient(90deg, #FF9500, #FF3B30)"
                        : "linear-gradient(90deg, #34C759, #30B0C7)",
                  }}
                />
              </div>

              <div className="text-4xl font-semibold font-mono tracking-tight text-gray-900 dark:text-white">
                {formatTimerSeconds(timeLeft)}
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                <span>Today: <strong>{dtrData.completedPomodoros} sessions</strong></span>
                <span>({dtrData.focusMinutesCompleted} mins)</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                onClick={togglePomoTimer}
                className={`p-3 rounded-2xl transition-all text-white shadow-lg ${
                  isRunning
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-[#007AFF] hover:bg-[#0062CC]"
                }`}
                title={isRunning ? "Pause" : "Start Focus"}
              >
                {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              <button
                onClick={resetPomoTimer}
                className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                title="Reset Timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`p-2.5 rounded-xl transition-colors ${
                  audioEnabled
                    ? "bg-primary-500/10 text-primary-600 dark:text-primary-400"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                }`}
                title={audioEnabled ? "Ringtone Sound On" : "Ringtone Sound Muted"}
              >
                {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: DTR (DAILY TIME RECORD) LOG MODE */}
        {activeTab === "dtr" && isExpanded && (
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-200">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#5856D6]" /> Daily Log ({getTodayDateString()})
              </span>
              <button
                onClick={handleCopyDTR}
                className="text-[11px] text-[#007AFF] hover:underline flex items-center gap-1 font-normal"
              >
                {copiedSuccess ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copiedSuccess ? "Copied!" : "Export Markdown"}
              </button>
            </div>

            {/* 1. What I Did Today / Accomplishments */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Accomplishments
              </label>
              <form onSubmit={handleAddAccomplishment} className="flex gap-1">
                <input
                  type="text"
                  placeholder="What did you build/do today?"
                  value={newAccomplishment}
                  onChange={(e) => setNewAccomplishment(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#007AFF]"
                />
                <button
                  type="submit"
                  className="p-1 px-2 rounded-lg bg-[#007AFF] text-white text-xs hover:bg-[#0062CC]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
              <ul className="space-y-1">
                {dtrData.accomplishments.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-lg text-gray-800 dark:text-gray-200"
                  >
                    <span className="truncate flex-1">✓ {item}</span>
                    <button
                      onClick={() => removeItem("accomplishments", idx)}
                      className="text-gray-400 hover:text-red-500 ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2. Researched Topics */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-amber-500" /> Research Topics
              </label>
              <form onSubmit={handleAddTopic} className="flex gap-1">
                <input
                  type="text"
                  placeholder="What topic did you research?"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#5856D6]"
                />
                <button
                  type="submit"
                  className="p-1 px-2 rounded-lg bg-[#5856D6] text-white text-xs hover:bg-[#4845B6]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
              <ul className="space-y-1">
                {dtrData.researchedTopics.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-lg text-gray-800 dark:text-gray-200"
                  >
                    <span className="truncate flex-1">🔬 {item}</span>
                    <button
                      onClick={() => removeItem("researchedTopics", idx)}
                      className="text-gray-400 hover:text-red-500 ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. Copied Snippets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Copy className="w-3 h-3 text-[#007AFF]" /> Clippings & Notes
              </label>
              <form onSubmit={handleAddSnippet} className="flex gap-1">
                <input
                  type="text"
                  placeholder="Paste copied reference text..."
                  value={newSnippet}
                  onChange={(e) => setNewSnippet(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#007AFF]"
                />
                <button
                  type="submit"
                  className="p-1 px-2 rounded-lg bg-gray-700 text-white text-xs hover:bg-gray-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
              <ul className="space-y-1">
                {dtrData.copiedSnippets.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-lg text-gray-800 dark:text-gray-200"
                  >
                    <span className="truncate flex-1">📝 "{item}"</span>
                    <button
                      onClick={() => removeItem("copiedSnippets", idx)}
                      className="text-gray-400 hover:text-red-500 ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Collapsed Mode Compact Summary */}
        {!isExpanded && (
          <div className="flex items-center justify-between text-xs font-mono text-gray-700 dark:text-gray-300">
            <span>
              {getDisplayHours()}:{formatNumber(time.minutes)} {!use24Hour && getAmPm()}
            </span>
            <span className="text-[11px] text-gray-400">
              {dtrData.completedPomodoros} Pomo ({dtrData.focusMinutesCompleted}m)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Icon component for Timer
const TimerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="9" strokeWidth="2" />
    <path strokeLinecap="round" strokeWidth="2" d="M12 7v5l3 3" />
  </svg>
);

export default ClockWidget;
