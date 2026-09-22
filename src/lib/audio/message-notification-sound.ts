/**
 * Selectable message notification sounds (Web Audio — original recreations).
 */

export const NOTIFICATION_SOUNDS = [
  {
    id: "fiverr_chime",
    label: "Fiverr Chime",
    description: "Soft marketplace ping",
  },
  {
    id: "soft_bell",
    label: "Soft Bell",
    description: "Gentle two-tone bell",
  },
  {
    id: "bright_ding",
    label: "Bright Ding",
    description: "Quick high sparkle",
  },
  {
    id: "warm_pulse",
    label: "Warm Pulse",
    description: "Low warm double tap",
  },
  {
    id: "crystal_tap",
    label: "Crystal Tap",
    description: "Clear crystalline click",
  },
] as const;

export type NotificationSoundId = (typeof NOTIFICATION_SOUNDS)[number]["id"];

export const DEFAULT_NOTIFICATION_SOUND: NotificationSoundId = "fiverr_chime";

const SOUND_STORAGE_KEY = "ut_notification_sound";

export function isNotificationSoundId(value: string | null | undefined): value is NotificationSoundId {
  return NOTIFICATION_SOUNDS.some((s) => s.id === value);
}

export function getStoredNotificationSound(): NotificationSoundId {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_SOUND;
  try {
    const raw = localStorage.getItem(SOUND_STORAGE_KEY);
    if (isNotificationSoundId(raw)) return raw;
  } catch {
    // ignore
  }
  return DEFAULT_NOTIFICATION_SOUND;
}

export function setStoredNotificationSound(id: NotificationSoundId) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

type PluckFn = (
  freq: number,
  start: number,
  dur: number,
  peak: number,
  type?: OscillatorType
) => void;

function withAudioContext(play: (ctx: AudioContext, now: number, pluck: PluckFn) => void) {
  if (typeof window === "undefined") return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.55, now);
    master.connect(ctx.destination);

    function pluck(
      freq: number,
      start: number,
      dur: number,
      peak: number,
      type: OscillatorType = "triangle"
    ) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(freq * 3.2, start);
      filter.Q.setValueAtTime(0.7, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + dur + 0.08);
    }

    play(ctx, now, pluck);
    void ctx.resume();
    setTimeout(() => {
      void ctx.close();
    }, 1100);
  } catch {
    // Autoplay / unsupported — ignore
  }
}

function playFiverrChime(_ctx: AudioContext, now: number, pluck: PluckFn) {
  pluck(523.25, now, 0.09, 0.12, "sine");
  pluck(784.0, now + 0.045, 0.16, 0.28, "triangle");
  pluck(1046.5, now + 0.095, 0.22, 0.2, "sine");
  pluck(1568.0, now + 0.11, 0.12, 0.07, "sine");
}

function playSoftBell(_ctx: AudioContext, now: number, pluck: PluckFn) {
  pluck(659.25, now, 0.28, 0.22, "sine");
  pluck(880.0, now + 0.12, 0.32, 0.18, "sine");
  pluck(1318.5, now + 0.18, 0.2, 0.08, "triangle");
}

function playBrightDing(_ctx: AudioContext, now: number, pluck: PluckFn) {
  pluck(988.0, now, 0.08, 0.3, "triangle");
  pluck(1480.0, now + 0.04, 0.14, 0.22, "sine");
  pluck(1976.0, now + 0.08, 0.1, 0.1, "sine");
}

function playWarmPulse(_ctx: AudioContext, now: number, pluck: PluckFn) {
  pluck(220.0, now, 0.18, 0.28, "sine");
  pluck(330.0, now + 0.08, 0.2, 0.2, "triangle");
  pluck(440.0, now + 0.2, 0.16, 0.14, "sine");
}

function playCrystalTap(_ctx: AudioContext, now: number, pluck: PluckFn) {
  pluck(1174.7, now, 0.06, 0.25, "sine");
  pluck(1760.0, now + 0.03, 0.1, 0.16, "triangle");
  pluck(2349.3, now + 0.06, 0.08, 0.08, "sine");
}

const PLAYERS: Record<NotificationSoundId, (ctx: AudioContext, now: number, pluck: PluckFn) => void> = {
  fiverr_chime: playFiverrChime,
  soft_bell: playSoftBell,
  bright_ding: playBrightDing,
  warm_pulse: playWarmPulse,
  crystal_tap: playCrystalTap,
};

/**
 * Play a notification sound. Uses `soundId` when provided, otherwise the
 * user's stored preference (localStorage), otherwise the default chime.
 */
export function playMessageNotificationSound(soundId?: string | null) {
  const id: NotificationSoundId = isNotificationSoundId(soundId)
    ? soundId
    : getStoredNotificationSound();

  withAudioContext(PLAYERS[id]);
}
