/**
 * Haptic Feedback Manager (Navigator.vibrate)
 * 
 * Provides tactile sensory reinforcement for mobile touch interactions,
 * physics-based wheel ticks, level-up celebrations, and mindful unlocks.
 */

class HapticsManager {
  private hapticsEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mokaia_haptics_enabled');
      this.hapticsEnabled = stored !== 'false';
    }
  }

  public isEnabled(): boolean {
    return this.hapticsEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.hapticsEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('mokaia_haptics_enabled', enabled ? 'true' : 'false');
    }
  }

  private trigger(pattern: number | number[]): void {
    if (!this.hapticsEnabled) return;
    if (typeof window === 'undefined') return;

    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignored on unsupported environments
      }
    }
  }

  /**
   * Ultra-light tap for button clicks and toggles
   */
  public lightTap(): void {
    this.trigger(10);
  }

  /**
   * Micro-tick for wheel rotation ticks
   */
  public wheelTick(): void {
    this.trigger(6);
  }

  /**
   * Satisfying double-pulse for successfully logging a transaction or saving an impulse
   */
  public successPulse(): void {
    this.trigger([15, 40, 25]);
  }

  /**
   * Distinctive mechanical tactile pattern for unlocking The Comfort Fund
   */
  public unlockHaptic(): void {
    this.trigger([25, 40, 45]);
  }

  /**
   * Extended celebratory sequence for Level Up and Rank advancements
   */
  public levelUpCelebration(): void {
    this.trigger([30, 50, 40, 50, 70, 60, 100]);
  }

  /**
   * Shield interaction feedback
   */
  public shieldHaptic(): void {
    this.trigger([20, 35, 20]);
  }
}

export const haptics = new HapticsManager();
