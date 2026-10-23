// ============================================
// CLOCK & POMODORO & TIMED PRACTICE WIDGET
// Glassmorphism Progress Bar Clock, Focus Timer & Exam Pacer
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
  Target,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Calculator,
  Plus,
  Minus,
  AlertTriangle,
  Flame,
  Check,
} from "lucide-react";
import {
  calculateExamPace,
  computePacerMetrics,
  formatPacerTime,
  EXAM_PACER_PRESETS,
} from "../../services/practicePacerService";

interface ClockWidgetProps {
  isVisible?: boolean;
  onClose?: () => void;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

export type WidgetTab = "clock" | "pomodoro" | "practice";
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
  const [activeTab, setActiveTab] = useState<WidgetTab>(
    () => (localStorage.getItem("clockWidgetDefaultMode") as WidgetTab) || "clock",
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

  // ---------- TIMED PRACTICE (EXAM PACER) STATE ----------
  const [practicePace, setPracticePace] = useState<number>(() => {
    const val = parseInt(localStorage.getItem("practicePaceSeconds") || "67", 10);
    return isNaN(val) || val <= 0 ? 67 : val;
  });
  const [practiceTotalQuestions, setPracticeTotalQuestions] = useState<number>(() => {
    const val = parseInt(localStorage.getItem("practiceTotalQuestions") || "150", 10);
    return isNaN(val) || val <= 0 ? 150 : val;
  });
  const [autoAdvance, setAutoAdvance] = useState<boolean>(
    () => localStorage.getItem("practiceAutoAdvance") === "true",
  );
  const [currentQuestion, setCurrentQuestion] = useState<number>(1);
  const [practiceTimeLeft, setPracticeTimeLeft] = useState<number>(practicePace);
  const [overtimeSeconds, setOvertimeSeconds] = useState<number>(0);
  const [isPracticeRunning, setIsPracticeRunning] = useState<boolean>(false);
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);
  const [sessionTotalElapsed, setSessionTotalElapsed] = useState<number>(0);
  const [showPracticeConfig, setShowPracticeConfig] = useState<boolean>(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);

  // Calculator helper inputs
  const [calcItems, setCalcItems] = useState<number>(150);
  const [calcHours, setCalcHours] = useState<number>(3);
  const [calcBufferMin, setCalcBufferMin] = useState<number>(12.5);

  const practiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Audio tone for pace warning and urgency
  const playPaceBeep = useCallback(
    (isUrgent = false) => {
      if (!soundEnabled) return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const audioCtx = new AudioCtx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = isUrgent ? "triangle" : "sine";
        osc.frequency.setValueAtTime(isUrgent ? 880 : 523.25, audioCtx.currentTime);
        gain.gain.setValueAtTime(isUrgent ? 0.3 : 0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (isUrgent ? 0.35 : 0.15));
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + (isUrgent ? 0.35 : 0.15));
      } catch (e) {
        console.warn("Audio chime error:", e);
      }
    },
    [soundEnabled],
  );

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

  // Timed Practice countdown effect
  useEffect(() => {
    if (!isPracticeRunning) {
      if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
      return;
    }

    practiceTimerRef.current = setInterval(() => {
      setSessionTotalElapsed((prev) => prev + 1);

      setPracticeTimeLeft((prevLeft) => {
        if (prevLeft > 1) {
          if (prevLeft === 6) playPaceBeep(false); // 5s warning tick
          return prevLeft - 1;
        }

        if (prevLeft === 1) {
          // Just hit 0s
          playPaceBeep(true);
          if (autoAdvance) {
            setQuestionTimes((prev) => [...prev, practicePace]);
            setCurrentQuestion((prevQ) => {
              if (prevQ >= practiceTotalQuestions) {
                setIsPracticeRunning(false);
                playCompletionChime();
                return prevQ;
              }
              return prevQ + 1;
            });
            setOvertimeSeconds(0);
            return practicePace;
          }
          return 0;
        }

        // prevLeft is 0, in overtime
        setOvertimeSeconds((ot) => ot + 1);
        return 0;
      });
    }, 1000);

    return () => {
      if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
    };
  }, [
    isPracticeRunning,
    autoAdvance,
    practicePace,
    practiceTotalQuestions,
    playPaceBeep,
    playCompletionChime,
  ]);

  // Listen for settings events
  useEffect(() => {
    const handleFormatChange = () => {
      setUse24Hour(localStorage.getItem("clockFormat") !== "12");
    };

    const handleSettingsChange = () => {
      const newPos = localStorage.getItem("clockWidgetPosition") || position;
      setWidgetPosition(newPos);

      const newDefaultMode =
        (localStorage.getItem("clockWidgetDefaultMode") as WidgetTab) || "clock";
      setActiveTab(newDefaultMode);

      setUse24Hour(localStorage.getItem("clockFormat") !== "12");
      setSoundEnabled(localStorage.getItem("pomodoroSoundEnabled") !== "false");

      const w = parseInt(localStorage.getItem("pomodoroWorkDuration") || "25", 10);
      const s = parseInt(localStorage.getItem("pomodoroShortBreakDuration") || "5", 10);
      const l = parseInt(localStorage.getItem("pomodoroLongBreakDuration") || "15", 10);

      setWorkMin(isNaN(w) ? 25 : w);
      setShortMin(isNaN(s) ? 5 : s);
      setLongMin(isNaN(l) ? 15 : l);

      const pPace = parseInt(localStorage.getItem("practicePaceSeconds") || "67", 10);
      const pTotal = parseInt(localStorage.getItem("practiceTotalQuestions") || "150", 10);
      const pAuto = localStorage.getItem("practiceAutoAdvance") === "true";

      if (!isNaN(pPace) && pPace > 0) setPracticePace(pPace);
      if (!isNaN(pTotal) && pTotal > 0) setPracticeTotalQuestions(pTotal);
      setAutoAdvance(pAuto);
    };

    window.addEventListener("clockFormatChange", handleFormatChange);
    window.addEventListener("pomodoroSettingsChange", handleSettingsChange);
    window.addEventListener("practiceSettingsChange", handleSettingsChange);
    window.addEventListener("clockWidgetToggle", handleSettingsChange);

    return () => {
      window.removeEventListener("clockFormatChange", handleFormatChange);
      window.removeEventListener("pomodoroSettingsChange", handleSettingsChange);
      window.removeEventListener("practiceSettingsChange", handleSettingsChange);
      window.removeEventListener("clockWidgetToggle", handleSettingsChange);
    };
  }, [position]);

  // Reset Pomodoro on mode change
  const handleModeSwitch = (mode: PomoMode) => {
    setPomoMode(mode);
    setIsRunning(false);
    setTimeLeft(getDurationForMode(mode));
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getDurationForMode(pomoMode));
  };

  // Practice Handlers
  const handleNextProblem = useCallback(() => {
    const timeSpent = practicePace - practiceTimeLeft + overtimeSeconds;
    const actualSpent = Math.max(1, timeSpent);
    setQuestionTimes((prev) => [...prev, actualSpent]);

    if (currentQuestion >= practiceTotalQuestions) {
      setIsPracticeRunning(false);
      playCompletionChime();
    } else {
      setCurrentQuestion((prev) => prev + 1);
      setPracticeTimeLeft(practicePace);
      setOvertimeSeconds(0);
    }
  }, [
    practicePace,
    practiceTimeLeft,
    overtimeSeconds,
    currentQuestion,
    practiceTotalQuestions,
    playCompletionChime,
  ]);

  const handlePrevProblem = useCallback(() => {
    if (currentQuestion > 1) {
      setCurrentQuestion((prev) => prev - 1);
      setQuestionTimes((prev) => prev.slice(0, -1));
      setPracticeTimeLeft(practicePace);
      setOvertimeSeconds(0);
    }
  }, [currentQuestion, practicePace]);

  const handleResetPractice = useCallback(() => {
    setIsPracticeRunning(false);
    setCurrentQuestion(1);
    setPracticeTimeLeft(practicePace);
    setOvertimeSeconds(0);
    setQuestionTimes([]);
    setSessionTotalElapsed(0);
  }, [practicePace]);

  const handleUpdatePace = useCallback(
    (newPace: number) => {
      const clamped = Math.max(5, Math.min(600, newPace));
      setPracticePace(clamped);
      localStorage.setItem("practicePaceSeconds", String(clamped));
      if (!isPracticeRunning && overtimeSeconds === 0) {
        setPracticeTimeLeft(clamped);
      }
    },
    [isPracticeRunning, overtimeSeconds],
  );

  const handleUpdateTotalQuestions = useCallback((total: number) => {
    const clamped = Math.max(1, Math.min(500, total));
    setPracticeTotalQuestions(clamped);
    localStorage.setItem("practiceTotalQuestions", String(clamped));
  }, []);

  const handleToggleAutoAdvance = useCallback((checked: boolean) => {
    setAutoAdvance(checked);
    localStorage.setItem("practiceAutoAdvance", String(checked));
  }, []);

  // Spacebar shortcut to advance question
  useEffect(() => {
    if (activeTab !== "practice") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.code === "Space") {
        e.preventDefault();
        if (!isPracticeRunning && currentQuestion === 1 && questionTimes.length === 0) {
          setIsPracticeRunning(true);
        } else {
          handleNextProblem();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeTab,
    isPracticeRunning,
    currentQuestion,
    questionTimes.length,
    handleNextProblem,
  ]);

  if (!isVisible) return null;

  // Position classes map
  const positionClasses: Record<string, string> = {
    "top-right": "top-16 sm:top-20 right-3 sm:right-6",
    "top-left": "top-16 sm:top-20 left-3 sm:left-6",
    "bottom-right": "bottom-4 sm:bottom-6 right-3 sm:right-6",
    "bottom-left": "bottom-4 sm:bottom-6 left-3 sm:left-6",
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
  const pomoProgressPct =
    pomoTotalSecs > 0 ? ((pomoTotalSecs - timeLeft) / pomoTotalSecs) * 100 : 0;

  const formatPomoTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const modeTheme = {
    work: { color: "#007AFF", label: "Focus", icon: Zap, gradient: "from-blue-500 to-indigo-600" },
    shortBreak: {
      color: "#34C759",
      label: "Short Break",
      icon: Coffee,
      gradient: "from-emerald-500 to-teal-600",
    },
    longBreak: {
      color: "#5856D6",
      label: "Long Break",
      icon: Coffee,
      gradient: "from-violet-500 to-purple-600",
    },
  }[pomoMode];

  const ModeIcon = modeTheme.icon;

  // Timed Practice Telemetry
  const practiceMetrics = computePacerMetrics(
    practicePace,
    practiceTotalQuestions,
    questionTimes,
  );
  const isPracticeOvertime = overtimeSeconds > 0;
  const practiceFraction = practicePace > 0 ? practiceTimeLeft / practicePace : 0;
  const practiceProgressPct = isPracticeOvertime ? 100 : Math.max(0, (1 - practiceFraction) * 100);

  // Dynamic Ring Color for Practice
  const getPracticeRingColor = () => {
    if (isPracticeOvertime) return "#EF4444";
    if (practiceTimeLeft <= 10) return "#F43F5E";
    if (practiceTimeLeft <= 20) return "#F59E0B";
    return "#0EA5E9";
  };

  return (
    <div
      className={`fixed ${currentPosClass} z-40 animate-fade-in-up transition-all duration-300`}
      style={{ animationDuration: "0.3s" }}
    >
      {/* Glassmorphism Container */}
      <div className="relative backdrop-blur-2xl bg-white/95 dark:bg-slate-900/95 rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden p-4 sm:p-5 w-[calc(100vw-1.5rem)] max-w-[345px] transition-all">
        {/* Glow Gradients */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-[#007AFF]/20 via-[#5856D6]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-tr from-[#34C759]/15 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Top Header: Tabs & Actions */}
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-white/10">
          {/* Tabs Switcher */}
          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("clock")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
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
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "pomodoro"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Pomo</span>
            </button>
            <button
              onClick={() => setActiveTab("practice")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "practice"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Practice</span>
            </button>
          </div>

          {/* Sound & Close Actions */}
          <div className="flex items-center gap-1">
            {(activeTab === "pomodoro" || activeTab === "practice") && (
              <button
                onClick={() => {
                  const nextSound = !soundEnabled;
                  setSoundEnabled(nextSound);
                  localStorage.setItem("pomodoroSoundEnabled", String(nextSound));
                }}
                className="p-1.5 rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-gray-500 dark:text-gray-400 transition-colors"
                title={soundEnabled ? "Mute audio cues" : "Enable audio cues"}
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
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
                  <div
                    className="flex items-center gap-1 mb-0.5"
                    style={{ color: modeTheme.color }}
                  >
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

        {/* ============================================ */}
        {/* TAB 3: TIMED PRACTICE / EXAM PACER VIEW     */}
        {/* ============================================ */}
        {activeTab === "practice" && (
          <div className="animate-fade-in space-y-3">
            {/* Top Subheader: Question Counter & Pace Config Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-900 dark:text-white font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/20">
                  Q {currentQuestion} / {practiceTotalQuestions}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                  {Math.round((currentQuestion / practiceTotalQuestions) * 100)}%
                </span>
              </div>

              {/* Settings / Modifier Trigger */}
              <button
                onClick={() => setShowPracticeConfig(!showPracticeConfig)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium transition-all ${
                  showPracticeConfig
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
                title="Modify Target Pace & Exam Parameters"
              >
                <Sliders className="w-3 h-3" />
                <span className="font-mono font-bold">{practicePace}s/Q</span>
              </button>
            </div>

            {/* Quick Settings Drawer (Collapsible) */}
            {showPracticeConfig && (
              <div className="p-3 bg-gray-50/90 dark:bg-slate-800/80 rounded-2xl border border-gray-200/80 dark:border-white/10 space-y-3 animate-fade-in text-xs">
                {/* Target Pace Header & Stepper */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                      Target Pace (Sec / Problem)
                    </span>
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-gray-200 dark:border-slate-700">
                      <button
                        onClick={() => handleUpdatePace(practicePace - 1)}
                        className="p-1 text-gray-500 hover:text-gray-800 dark:hover:text-white"
                        title="-1 second"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min={5}
                        max={600}
                        value={practicePace}
                        onChange={(e) => handleUpdatePace(parseInt(e.target.value, 10) || 67)}
                        className="w-10 text-center font-mono font-bold bg-transparent text-gray-900 dark:text-white focus:outline-none text-xs"
                      />
                      <button
                        onClick={() => handleUpdatePace(practicePace + 1)}
                        className="p-1 text-gray-500 hover:text-gray-800 dark:hover:text-white"
                        title="+1 second"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Pace Preset Chips */}
                  <div className="flex flex-wrap gap-1">
                    {EXAM_PACER_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          handleUpdatePace(preset.paceSeconds);
                          handleUpdateTotalQuestions(preset.questions);
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                          practicePace === preset.paceSeconds &&
                          practiceTotalQuestions === preset.questions
                            ? "bg-amber-500 text-white font-bold shadow-xs"
                            : "bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:border-amber-400"
                        }`}
                        title={preset.description}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Problems Stepper */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-white/5">
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    Total Problems Target
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[50, 100, 150, 170].map((count) => (
                      <button
                        key={count}
                        onClick={() => handleUpdateTotalQuestions(count)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                          practiceTotalQuestions === count
                            ? "bg-indigo-600 text-white"
                            : "bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700"
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto-Advance Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-white/5">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-[11px]">
                      Auto-Advance on 0s
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Move to next item vs count overtime in red
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleAutoAdvance(!autoAdvance)}
                    className={`w-9 h-5 rounded-full transition-colors relative ${
                      autoAdvance ? "bg-amber-500" : "bg-gray-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        autoAdvance ? "translate-x-4.5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Calculator Accordion Button */}
                <div className="pt-2 border-t border-gray-200/60 dark:border-white/5">
                  <button
                    onClick={() => setShowCalculator(!showCalculator)}
                    className="w-full flex items-center justify-between py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    <span className="flex items-center gap-1">
                      <Calculator className="w-3 h-3" />
                      <span>Exam Pace Calculator (CSC / Custom)</span>
                    </span>
                    <span>{showCalculator ? "▲" : "▼"}</span>
                  </button>

                  {/* Calculator Inline Form */}
                  {showCalculator && (
                    <div className="mt-2 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-500/20 space-y-2">
                      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                        <div>
                          <label className="text-gray-400 block mb-0.5">Problems</label>
                          <input
                            type="number"
                            value={calcItems}
                            onChange={(e) => setCalcItems(parseInt(e.target.value, 10) || 150)}
                            className="w-full p-1 rounded border border-gray-200 dark:border-slate-700 bg-transparent font-mono text-center"
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 block mb-0.5">Hours</label>
                          <input
                            type="number"
                            step="0.1"
                            value={calcHours}
                            onChange={(e) => setCalcHours(parseFloat(e.target.value) || 3)}
                            className="w-full p-1 rounded border border-gray-200 dark:border-slate-700 bg-transparent font-mono text-center"
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 block mb-0.5">Buffer (m)</label>
                          <input
                            type="number"
                            value={calcBufferMin}
                            onChange={(e) => setCalcBufferMin(parseFloat(e.target.value) || 0)}
                            className="w-full p-1 rounded border border-gray-200 dark:border-slate-700 bg-transparent font-mono text-center"
                          />
                        </div>
                      </div>

                      {/* Calculated Pace Result */}
                      {(() => {
                        const calculatedPace = calculateExamPace({
                          totalQuestions: calcItems,
                          totalHours: calcHours,
                          bufferMinutes: calcBufferMin,
                        });
                        return (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-gray-600 dark:text-gray-300">
                              Calculated:{" "}
                              <strong className="text-amber-600 dark:text-amber-400 font-mono text-xs">
                                {calculatedPace}s / problem
                              </strong>
                            </span>
                            <button
                              onClick={() => {
                                handleUpdatePace(calculatedPace);
                                handleUpdateTotalQuestions(calcItems);
                                setShowPracticeConfig(false);
                              }}
                              className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold transition-colors"
                            >
                              Apply
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Circular Timer & Countdown */}
            <div className="flex flex-col items-center py-0.5">
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
                    stroke={getPracticeRingColor()}
                    strokeWidth="6"
                    strokeDasharray={351.8}
                    strokeDashoffset={351.8 - (351.8 * practiceProgressPct) / 100}
                    strokeLinecap="round"
                    className={`transition-all duration-1000 ease-linear ${
                      isPracticeOvertime ? "animate-pulse" : ""
                    }`}
                  />
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {isPracticeOvertime ? (
                    <>
                      <div className="flex items-center gap-1 mb-0.5 text-rose-500">
                        <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          Over Pace
                        </span>
                      </div>
                      <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                        +{overtimeSeconds}s
                      </span>
                      <span className="text-[10px] text-gray-400">Target: {practicePace}s</span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 mb-0.5 text-amber-500">
                        <Target className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          Q {currentQuestion} Pace
                        </span>
                      </div>
                      <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white font-mono tabular-nums">
                        {formatPacerTime(practiceTimeLeft)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {practicePace}s budget
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Primary Action Controls */}
              <div className="flex items-center justify-center gap-2 mt-2 w-full">
                {/* Prev Question */}
                <button
                  onClick={handlePrevProblem}
                  disabled={currentQuestion <= 1}
                  className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:pointer-events-none transition-colors rounded-xl bg-gray-100 dark:bg-slate-800"
                  title="Previous Question"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Reset Session / Question */}
                <button
                  onClick={handleResetPractice}
                  className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-xl bg-gray-100 dark:bg-slate-800"
                  title="Restart Practice Drill"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Play / Pause Timer */}
                <button
                  onClick={() => setIsPracticeRunning(!isPracticeRunning)}
                  className={`w-10 h-10 flex items-center justify-center rounded-full text-white shadow-md transition-transform hover:scale-105 active:scale-95 ${
                    isPracticeRunning
                      ? "bg-slate-700 hover:bg-slate-800"
                      : "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/30"
                  }`}
                  title={isPracticeRunning ? "Pause Pacer" : "Start Pacer"}
                >
                  {isPracticeRunning ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" />
                  )}
                </button>

                {/* Next Problem (Primary Button) */}
                <button
                  onClick={handleNextProblem}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-white font-bold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                  title="Record item and advance (Shortcut: Spacebar)"
                >
                  <span>Next Problem</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Pacing Telemetry & Live Banked Buffer */}
            <div className="pt-2.5 border-t border-gray-100 dark:border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 font-medium">
                  <Flame className="w-3 h-3 text-amber-500" />
                  <span>
                    Avg:{" "}
                    <strong className="text-gray-900 dark:text-white font-mono">
                      {practiceMetrics.averageSecondsPerQuestion !== null
                        ? `${practiceMetrics.averageSecondsPerQuestion}s`
                        : `${practicePace}s`}
                    </strong>
                  </span>
                </span>

                {practiceMetrics.averageSecondsPerQuestion !== null ? (
                  <span
                    className={`font-bold font-mono text-[10px] px-1.5 py-0.5 rounded ${
                      practiceMetrics.isAheadOfPace
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {practiceMetrics.isAheadOfPace
                      ? `+${practiceMetrics.paceDifferenceSeconds}s buffer banked`
                      : `${Math.abs(practiceMetrics.paceDifferenceSeconds!)}s behind target`}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400">Spacebar = Next Q</span>
                )}
              </div>

              {/* Total Session Time & Overall Exam Budget Bar */}
              <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                <span>Elapsed: {formatPacerTime(sessionTotalElapsed)}</span>
                <span>
                  Budget: {formatPacerTime(practiceTotalQuestions * practicePace)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClockWidget;
