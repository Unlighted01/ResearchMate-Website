// ============================================
// AUDIO SERVICE - Web Audio API Ringtone Synthesizer
// ResearchMate Focus & Productivity System
// ============================================

class AudioService {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Play a clean, pleasant multi-tone chime ringtone for Pomodoro completion
   */
  public playPomodoroCompleteRingtone(volume = 0.5): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Melody notes: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.50Hz)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const durations = [0.15, 0.15, 0.15, 0.4];

      notes.forEach((freq, index) => {
        const startTime = now + index * 0.15;
        const duration = durations[index];

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch (e) {
      console.warn("Audio playback not allowed or failed", e);
    }
  }

  /**
   * Play a soft dual-tone chime for Break completion
   */
  public playBreakCompleteRingtone(volume = 0.5): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Gentle G5 to C5 chime
      const notes = [783.99, 523.25];

      notes.forEach((freq, index) => {
        const startTime = now + index * 0.2;
        const duration = 0.3;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume * 0.7, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch (e) {
      console.warn("Audio playback failed", e);
    }
  }

  /**
   * Play a subtle reminder ringtone for DTR daily log
   */
  public playDTRReminderRingtone(volume = 0.5): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Double ping
      [659.25, 880].forEach((freq, index) => {
        const startTime = now + index * 0.12;
        const duration = 0.25;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume * 0.6, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch (e) {
      console.warn("Audio playback failed", e);
    }
  }

  /**
   * Request native browser notification permission
   */
  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }
    if (Notification.permission === "granted") return true;
    if (Notification.permission !== "denied") {
      const result = await Notification.requestPermission();
      return result === "granted";
    }
    return false;
  }

  /**
   * Send a browser desktop notification across tabs / system
   */
  public sendBrowserNotification(title: string, body: string, icon?: string): void {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: icon || "/favicon.ico",
          tag: "researchmate-alert",
        });
      } catch (e) {
        console.warn("Could not display browser notification", e);
      }
    }
  }
}

export const audioService = new AudioService();
