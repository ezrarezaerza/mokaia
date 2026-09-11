/**
 * Zero-Dependency Web Audio API Sound Synthesizer Engine
 * 
 * Generates crisp, modern, pleasant harmonic tones using native browser oscillators.
 * Zero external audio downloads, zero network latency, full offline compatibility.
 */

class SoundFxEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mokaia_sound_enabled');
      this.soundEnabled = stored !== 'false';
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('mokaia_sound_enabled', enabled ? 'true' : 'false');
    }
  }

  private getContext(): AudioContext | null {
    if (!this.soundEnabled) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // Ignored if user hasn't interacted yet
      });
    }

    return this.ctx;
  }

  /**
   * Crisp, bright double-tone (B5 -> E6) for logging a transaction or saving money
   */
  public playCoinSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      // First bell note: 987.77 Hz (B5)
      osc1.frequency.setValueAtTime(987.77, now);
      // Quickly transitions to higher chime: 1318.51 Hz (E6)
      osc1.frequency.setValueAtTime(1318.51, now + 0.08);

      // Harmony overtone
      osc2.frequency.setValueAtTime(1975.53, now + 0.08);

      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(0.18, now + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Ultra-short mechanical tick (15ms) for the Reward Spinner rotation
   */
  public playTickSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1250, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.02);

      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.025);
    } catch {
      // Fallback
    }
  }

  /**
   * Calming, grounding major chord swell for sending items to the Cooling-Off Queue
   */
  public playImpulseSavedSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // C5 (523.25), E5 (659.25), G5 (783.99)
      const freqs = [523.25, 659.25, 783.99];

      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.05);

        gain.gain.setValueAtTime(0.001, now + idx * 0.05);
        gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.05 + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + 0.6);
      });
    } catch {
      // Fallback
    }
  }

  /**
   * Resonant double chime when letting go of an impulse ("I don't need this anymore")
   */
  public playRejectImpulseSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Triumphant G5 -> C6 chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(783.99, now);
      osc1.frequency.setValueAtTime(1046.50, now + 0.12);

      osc2.frequency.setValueAtTime(1567.98, now + 0.12);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.12);
      osc1.stop(now + 0.65);
      osc2.stop(now + 0.65);
    } catch {
      // Fallback
    }
  }

  /**
   * Dual pitch-slide unlock chime for The Comfort Fund
   */
  public playUnlockSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // Fallback
    }
  }

  /**
   * Ascending 4-note fanfare shimmer for Level Up and Rank promotions
   */
  public playFanfareSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Arpeggio: C5 (523), E5 (659), G5 (784), C6 (1046.5), E6 (1318)
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = i === notes.length - 1 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.09);

        const startTime = now + i * 0.09;
        const duration = i === notes.length - 1 ? 0.75 : 0.35;

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch {
      // Fallback
    }
  }

  /**
   * Sparkle sound for claiming a treat or spinning reward
   */
  public playClaimTreatSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [659.25, 830.61, 987.77, 1318.51];

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        const start = now + idx * 0.06;
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.12, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.45);
      });
    } catch {
      // Fallback
    }
  }

  /**
   * Protective forcefield chime for Grace Shield interaction
   */
  public playShieldSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.3);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // Fallback
    }
  }

  /**
   * Playful arpeggiated chirp for Accountability Mascot greeting and conversation
   */
  public playMascotChirpSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.045);

        gain.gain.setValueAtTime(0.001, now + i * 0.045);
        gain.gain.linearRampToValueAtTime(0.1, now + i * 0.045 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.045 + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.045);
        osc.stop(now + i * 0.045 + 0.18);
      });
    } catch {
      // Fallback
    }
  }

  /**
   * Deep soothing resonance hum for calm breathing exercises with the mascot
   */
  public playMascotPurrSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(246.94, now + 0.4);
      osc.frequency.linearRampToValueAtTime(220, now + 0.8);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.2);
      gain.gain.linearRampToValueAtTime(0.0001, now + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.8);
    } catch {
      // Fallback
    }
  }

  /**
   * Heroic victory fanfare for conquering an impulse buy in The Cooling-Off Queue
   */
  public playImpulseVictorySound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Staccato triumph: G4 -> C5 -> E5 -> G5
      const notes = [
        { freq: 392.0, time: 0, dur: 0.12 },
        { freq: 523.25, time: 0.11, dur: 0.12 },
        { freq: 659.25, time: 0.22, dur: 0.14 },
        { freq: 783.99, time: 0.35, dur: 0.45 },
      ];

      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, now + n.time);

        gain.gain.setValueAtTime(0.001, now + n.time);
        gain.gain.linearRampToValueAtTime(0.18, now + n.time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + n.time);
        osc.stop(now + n.time + n.dur);
      });
    } catch {
      // Fallback
    }
  }
}

export const soundFx = new SoundFxEngine();
