// Phase 3: The Gamified Loop - Gamification Engine & Anti-Cheese Virtual Economy

import type { ThemeDefinition, RankTier, RewardType } from '../types';

export const LEVEL_THRESHOLDS: number[] = [
  0,      // Level 1: Impulse Novice
  100,    // Level 2
  250,    // Level 3: Unlocks Emerald Sanctuary Theme
  450,    // Level 4: Mindful Saver Rank
  700,    // Level 5
  1000,   // Level 6: Unlocks Cyberpunk Neon Theme + Free Spin Ticket
  1350,   // Level 7
  1750,   // Level 8: Budget Tactician Rank
  2200,   // Level 9
  2700,   // Level 10: Unlocks Champagne Gold Theme
  3300,   // Level 11
  4000,   // Level 12
  4800,   // Level 13: Impulse Warden Rank
  5700,   // Level 14
  6700,   // Level 15: Unlocks Sunset Solstice Theme
  8000,   // Level 16
  9500,   // Level 17
  11200,  // Level 18
  13100,  // Level 19
  15200,  // Level 20+: Zen Capitalist Rank
];

export const RANKS: RankTier[] = [
  { name: 'Impulse Novice', minLevel: 1, maxLevel: 3, badge: '🌱', color: '#10b981' },
  { name: 'Mindful Saver', minLevel: 4, maxLevel: 7, badge: '⚡', color: '#3b82f6' },
  { name: 'Budget Tactician', minLevel: 8, maxLevel: 12, badge: '🛡️', color: '#8b5cf6' },
  { name: 'Impulse Warden', minLevel: 13, maxLevel: 19, badge: '👑', color: '#f59e0b' },
  { name: 'Zen Capitalist', minLevel: 20, maxLevel: 999, badge: '💎', color: '#ec4899' },
];

export const AVAILABLE_THEMES: ThemeDefinition[] = [
  {
    id: 'cyber_slate',
    name: 'Cyber Slate',
    tagline: 'Default dark tech precision',
    unlockedAtLevel: 1,
    previewColors: ['#0f172a', '#1e293b', '#3b82f6', '#10b981'],
    icon: '⚡',
  },
  {
    id: 'emerald_sanctuary',
    name: 'Emerald Sanctuary',
    tagline: 'Calming forest bio-finance',
    unlockedAtLevel: 3,
    previewColors: ['#041a14', '#0a2e22', '#10b981', '#34d399'],
    icon: '🌿',
  },
  {
    id: 'cyberpunk_neon',
    name: 'Cyberpunk Neon',
    tagline: 'Electric violet & synthwave amber',
    unlockedAtLevel: 6,
    previewColors: ['#120520', '#220b38', '#d946ef', '#f59e0b'],
    icon: '🔮',
  },
  {
    id: 'champagne_gold',
    name: 'Champagne Gold',
    tagline: 'Luxury executive minimalism',
    unlockedAtLevel: 10,
    previewColors: ['#14110b', '#262015', '#eab308', '#fef08a'],
    icon: '🥂',
  },
  {
    id: 'sunset_solstice',
    name: 'Sunset Solstice',
    tagline: 'Twilight dusk with warm coral glow',
    unlockedAtLevel: 15,
    previewColors: ['#1a0c18', '#2d142a', '#f43f5e', '#fb923c'],
    icon: '🌅',
  },
];

export interface SpinnerSlice {
  id: string;
  label: string;
  sublabel: string;
  rewardType: RewardType;
  icon: string;
  color: string;
  textColor: string;
  rewardValue?: string;
}

export const DEFAULT_SPINNER_SLICES: SpinnerSlice[] = [
  {
    id: 'coffee',
    label: 'Artisan Coffee',
    sublabel: 'Real-World Treat',
    rewardType: 'REAL_WORLD_TREAT',
    icon: '☕',
    color: '#3b82f6',
    textColor: '#ffffff',
    rewardValue: 'Specialty Coffee / Tea',
  },
  {
    id: 'shield',
    label: '+1 Grace Shield',
    sublabel: 'Streak Protection',
    rewardType: 'DIGITAL_SHIELD',
    icon: '🛡️',
    color: '#10b981',
    textColor: '#ffffff',
    rewardValue: '1',
  },
  {
    id: 'cheat_meal',
    label: 'Guilt-Free Meal',
    sublabel: 'Real-World Treat',
    rewardType: 'REAL_WORLD_TREAT',
    icon: '🍕',
    color: '#f59e0b',
    textColor: '#0f172a',
    rewardValue: 'Guilt-Free Dinner / Takeout',
  },
  {
    id: 'exp_boost',
    label: '+150 EXP Surge',
    sublabel: 'Progression Boost',
    rewardType: 'DIGITAL_EXP',
    icon: '✨',
    color: '#8b5cf6',
    textColor: '#ffffff',
    rewardValue: '150',
  },
  {
    id: 'gaming_hour',
    label: '1h Guilt-Free Gaming',
    sublabel: 'Real-World Treat',
    rewardType: 'REAL_WORLD_TREAT',
    icon: '🎮',
    color: '#06b6d4',
    textColor: '#0f172a',
    rewardValue: '1 Hour Dedicated Free Time / Gaming',
  },
  {
    id: 'ticket',
    label: '+1 Spin Ticket',
    sublabel: 'Extra Turn',
    rewardType: 'DIGITAL_TICKET',
    icon: '🎟️',
    color: '#ec4899',
    textColor: '#ffffff',
    rewardValue: '1',
  },
  {
    id: 'cinema_pass',
    label: 'Movie Night Pass',
    sublabel: 'Real-World Treat',
    rewardType: 'REAL_WORLD_TREAT',
    icon: '🎬',
    color: '#14b8a6',
    textColor: '#ffffff',
    rewardValue: 'Movie or Streaming Night Treat',
  },
  {
    id: 'mystery_luxury',
    label: 'Mystery Perk',
    sublabel: '+200 EXP & Treat',
    rewardType: 'REAL_WORLD_TREAT',
    icon: '💎',
    color: '#e11d48',
    textColor: '#ffffff',
    rewardValue: 'Choice Dessert or Favorite Treat',
  },
];

// Anti-Cheese EXP Rules: strictly bounded immutable events
export const EXP_RULES = {
  DAILY_LOGIN: 25,              // Max once per local calendar day
  REJECT_IMPULSE: 150,          // Resisting an impulse buy in Cooling-Off Queue (+150 EXP surge + Spin Ticket)
  MINDFUL_LOGGING: 15,          // Logging with thoughtful tag / Cost-Per-Use
  STREAK_7_DAY_MILESTONE: 100,  // Every 7 consecutive days
  WHEEL_SPIN_BONUS: 150,        // Digital wheel win
};

export function getLevelFromExp(exp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (exp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

export function getExpProgress(exp: number) {
  const currentLevel = getLevelFromExp(exp);
  const currentLevelBaseExp = LEVEL_THRESHOLDS[currentLevel - 1] ?? 0;
  const nextLevelExp = LEVEL_THRESHOLDS[currentLevel] ?? (currentLevelBaseExp + currentLevel * 1000);
  const expInLevel = Math.max(0, exp - currentLevelBaseExp);
  const expNeeded = Math.max(1, nextLevelExp - currentLevelBaseExp);
  const percent = Math.min(100, Math.max(0, (expInLevel / expNeeded) * 100));

  return {
    currentLevel,
    currentLevelBaseExp,
    nextLevelExp,
    expInLevel,
    expNeeded,
    percent,
  };
}

export function getRankForLevel(level: number): RankTier {
  return RANKS.find((r) => level >= r.minLevel && level <= r.maxLevel) || RANKS[0];
}
