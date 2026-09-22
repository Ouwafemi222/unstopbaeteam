/**
 * Short Fiverr-style notification chime (original Web Audio recreation —
 * not Fiverr's copyrighted asset). Bright two-note ping.
 */
export function playMessageNotificationSound() {
  if (typeof window === "undefined") return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    function tone(freq: number, start: number, duration: number, gainPeak: number) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    }

    // Classic messenger-style ascending ping
    tone(880, now, 0.14, 0.22);
    tone(1174.66, now + 0.11, 0.18, 0.18);

    // Soft overtone
    tone(1760, now + 0.12, 0.1, 0.06);

    void ctx.resume();
    setTimeout(() => {
      void ctx.close();
    }, 800);
  } catch {
    // Autoplay / unsupported — ignore
  }
}
