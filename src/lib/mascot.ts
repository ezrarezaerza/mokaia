import type { MascotEvaluationInput, MascotStatus, MascotState, MascotPersonality } from '../types';

export interface MascotPersonalityConfig {
  id: MascotPersonality;
  name: string;
  avatarEmoji: string;
  tagline: string;
  tone: string;
  accentColor: string;
}

export const MASCOT_PERSONALITIES: MascotPersonalityConfig[] = [
  {
    id: 'zen',
    name: 'Zen Master',
    avatarEmoji: '🧘',
    tagline: 'Mindful, stoic, calming reflections',
    tone: 'grounded and peaceful',
    accentColor: '#10b981',
  },
  {
    id: 'hype',
    name: 'Hype Coach',
    avatarEmoji: '🔥',
    tagline: 'High-energy, relentless momentum & hype',
    tone: 'enthusiastic and electrifying',
    accentColor: '#f97316',
  },
  {
    id: 'pragmatic',
    name: 'Pragmatic Penny',
    avatarEmoji: '📊',
    tagline: 'Cost-per-use math & tactical logic',
    tone: 'sharp, data-backed and realistic',
    accentColor: '#3b82f6',
  },
  {
    id: 'cozy',
    name: 'Cozy Matcha',
    avatarEmoji: '🍵',
    tagline: 'Gentle warmth, guilt-free companionship',
    tone: 'warm, supportive and non-judgmental',
    accentColor: '#a855f7',
  },
];

/**
 * Psychological Evaluation Engine for the Accountability Mascot with Personality Modulation.
 */
export function evaluateMascotState(
  mascotName: string = 'Mochi',
  metrics: MascotEvaluationInput,
  personality: MascotPersonality = 'zen'
): MascotStatus {
  const {
    currentStreak,
    graceDaysRemaining,
    coolingOffPendingCount,
    coolingOffRejectedCount,
    comfortFundRemaining,
    comfortFundAllowance,
    burnRatePercentage = 50,
  } = metrics;

  // 1. Check for Critical Warning / Concern First
  if (comfortFundRemaining <= 0 && comfortFundAllowance > 0) {
    if (personality === 'hype') {
      return {
        state: 'CONCERNED',
        title: 'Comfort Fund Timeout!',
        bubbleText: `Hold up, champion! Our comfort reserve hit $0! Time to lock in and defend the baseline. Zero non-essentials today!`,
        subText: `0 of $${comfortFundAllowance.toFixed(2)} left. Take a 5-minute cooldown!`,
        expressionEmoji: '🛑',
        badge: 'Cooldown Activated',
        themeColor: '#f43f5e',
      };
    }
    if (personality === 'pragmatic') {
      return {
        state: 'CONCERNED',
        title: 'Safety Buffer Depleted',
        bubbleText: `Comfort Fund is at $0.00. Continuing discretionary spending now reduces your net emergency ratio.`,
        subText: `0 of $${comfortFundAllowance.toFixed(2)} remaining. Review upcoming obligations.`,
        expressionEmoji: '📉',
        badge: 'Micro-Budget Cap',
        themeColor: '#f43f5e',
      };
    }
    return {
      state: 'CONCERNED',
      title: 'Comfort Fund Exhausted',
      bubbleText: `Hey friend, our comfort sanctuary is empty for this cycle. Let's take a deep breath before spending on non-essentials today.`,
      subText: `0 of $${comfortFundAllowance.toFixed(2)} remaining. Need a moment to reset?`,
      expressionEmoji: '🥺',
      badge: 'Needs Gentle Rest',
      themeColor: '#f43f5e',
    };
  }

  if (coolingOffPendingCount >= 3) {
    if (personality === 'hype') {
      return {
        state: 'CONCERNED',
        title: 'Impulse Queue Loaded!',
        bubbleText: `Boom! ${coolingOffPendingCount} potential purchases trapped in the holding pen! Don't let your guard down, wait out the clock!`,
        subText: `${coolingOffPendingCount} impulses under lock & key.`,
        expressionEmoji: '🥊',
        badge: 'Holding the Line',
        themeColor: '#f59e0b',
      };
    }
    return {
      state: 'CONCERNED',
      title: 'Cooling-Off Queue Filling Up',
      bubbleText: `Whoa, we have ${coolingOffPendingCount} impulse items on hold right now! The 48-hour timer is protecting your future self. Stay strong!`,
      subText: `${coolingOffPendingCount} items locked in the holding pen.`,
      expressionEmoji: '🧐',
      badge: 'Holding Pen Busy',
      themeColor: '#f59e0b',
    };
  }

  // 2. High Triumph / Proud State
  if (coolingOffRejectedCount >= 2) {
    if (personality === 'hype') {
      return {
        state: 'PROUD',
        title: 'Impulse Destroyer!',
        bubbleText: `BOOM! You shut down ${coolingOffRejectedCount} impulse traps! That's real willpower paying compound dividends right now!`,
        subText: `${coolingOffRejectedCount} temptations defeated! Keep rolling!`,
        expressionEmoji: '⚡',
        badge: 'Willpower Beast',
        themeColor: '#10b981',
      };
    }
    if (personality === 'pragmatic') {
      return {
        state: 'PROUD',
        title: 'High-Efficiency Restraint',
        bubbleText: `Walking away from ${coolingOffRejectedCount} impulses preserved capital for timeline goals and reduced lifestyle creep.`,
        subText: `${coolingOffRejectedCount} purchases prevented from depreciating.`,
        expressionEmoji: '💎',
        badge: 'Calculated Victory',
        themeColor: '#10b981',
      };
    }
    return {
      state: 'PROUD',
      title: 'Impulse Resistance Master!',
      bubbleText: `You've walked away from ${coolingOffRejectedCount} impulse buys! That money is still working for your future dreams. I'm so proud of you!`,
      subText: `${coolingOffRejectedCount} purchases intentionally resisted!`,
      expressionEmoji: '✨',
      badge: 'Impulse Shield Active',
      themeColor: '#10b981',
    };
  }

  // 3. Cheering on Streaks
  if (currentStreak >= 5) {
    if (personality === 'hype') {
      return {
        state: 'CHEERING',
        title: `${currentStreak}-Day Streak Inferno!`,
        bubbleText: `UNSTOPPABLE! ${currentStreak} days straight! Your discipline is legendary right now. Let's keep this fire burning all month!`,
        subText: `${currentStreak} days running • ${graceDaysRemaining} grace shields ready`,
        expressionEmoji: '🔥',
        badge: 'On Pure Fire',
        themeColor: '#f97316',
      };
    }
    return {
      state: 'CHEERING',
      title: `${currentStreak}-Day Streak Heatwave!`,
      bubbleText: `Incredible dedication! ${currentStreak} days of conscious, mindful money logging! Your financial mindfulness muscle is getting seriously strong!`,
      subText: `${currentStreak} consecutive days logged • ${graceDaysRemaining} shields active`,
      expressionEmoji: '🔥',
      badge: 'On Pure Fire',
      themeColor: '#f97316',
    };
  }

  if (currentStreak >= 1) {
    return {
      state: 'CHEERING',
      title: 'Mindful Momentum!',
      bubbleText: `Every transaction logged is a vote for intentional living. You're building lasting financial peace today, ${mascotName} is right beside you!`,
      subText: `${currentStreak} day streak going strong. Keep it up!`,
      expressionEmoji: '😸',
      badge: 'Building Momentum',
      themeColor: '#38bdf8',
    };
  }

  // 4. Default / Calm Mindful State
  return {
    state: 'NEUTRAL',
    title: 'Ready for Today',
    bubbleText: `Ready to check in on our money goals? Log an expense or visit The Cooling-Off Queue whenever impulse strikes!`,
    subText: `Gentle financial awareness, zero guilt.`,
    expressionEmoji: '🌱',
    badge: 'Zen & Focused',
    themeColor: '#a855f7',
  };
}

export interface MascotDialogueOption {
  id: string;
  label: string;
  icon: string;
  response: string;
  actionType?: 'BREATHE_EXERCISE' | 'COOLING_QUEUE' | 'COMFORT_RESET' | 'STATS_CHECK';
}

/**
 * Generate interactive conversation dialogues based on personality and user state
 */
export function getMascotDialogues(
  mascotName: string,
  personality: MascotPersonality = 'zen',
  metrics: MascotEvaluationInput
): MascotDialogueOption[] {
  const isZen = personality === 'zen';
  const isHype = personality === 'hype';
  const isPragmatic = personality === 'pragmatic';

  return [
    {
      id: 'resist_urge',
      label: 'Help me resist an urge right now',
      icon: '🛡️',
      response: isHype
        ? `PAUSE RIGHT THERE! Don't let quick dopamine rob your future! Take three deep breaths with me and lock it in the Cooling-Off Queue. If you still want it in 48 hours, we talk!`
        : isPragmatic
        ? `Before you tap pay: Calculate the Cost-Per-Use. If this costs $80 and you use it 4 times, that's $20 per use. Is that worth 2 hours of your labor? Let's take a 3-breath pause.`
        : `Take a slow, deep breath in... and let it out. The urge you feel is just a passing wave. You don't have to obey it. Let's do a 3-breath mindful pause together.`,
      actionType: 'BREATHE_EXERCISE',
    },
    {
      id: 'mindful_wisdom',
      label: 'Give me a money wisdom drop',
      icon: '💡',
      response: isHype
        ? `Rule #1 of the game: You cannot lose what you do not spend on impulse! Every dollar you hold today is another ticket to ultimate freedom!`
        : isPragmatic
        ? `Compound interest works both ways. The $50 impulse buy doesn't just cost $50 today; it costs the $200 it could have grown into over 10 years.`
        : `Money is energy and attention. When you spend mindfully, you honor the time you traded for it. Enjoy your needs, savor your wants, protect your peace.`,
    },
    {
      id: 'habit_check',
      label: 'How are my habits looking?',
      icon: '📊',
      response: `You are rocking a ${metrics.currentStreak}-day active streak with ${metrics.graceDaysRemaining} grace shields ready. You've walked away from ${metrics.coolingOffRejectedCount} impulses so far! Keep this cadence!`,
      actionType: 'STATS_CHECK',
    },
    {
      id: 'comfort_reset',
      label: 'I had a stressful day today',
      icon: '🍵',
      response: isHype
        ? `We bounce back! Bad days happen to the best players. Don't stress-spend: take a walk, blast your favorite playlist, and use the Comfort Fund if you really need a treat!`
        : `I hear you. Financial guilt doesn't fix a hard day. Remember: you have a Comfort Fund designed specifically for self-care without breaking the budget. Be kind to yourself today.`,
      actionType: 'COMFORT_RESET',
    },
  ];
}

export const DEFAULT_MASCOT_PRESETS = [
  { id: 'mochi_cat', name: 'Mochi', emoji: '🐱', label: 'Zen Kitten' },
  { id: 'boba_bear', name: 'Boba', emoji: '🐻', label: 'Calm Bear' },
  { id: 'pip_penguin', name: 'Pip', emoji: '🐧', label: 'Thrifty Penguin' },
  { id: 'kiwi_bird', name: 'Kiwi', emoji: '🥝', label: 'Little Sprout' },
  { id: 'spark_fox', name: 'Spark', emoji: '🦊', label: 'Clever Fox' },
];
