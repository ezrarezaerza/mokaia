// Core domain types for Expense Tracker (Phase 1 & Phase 2: Behavioral Guardrails)

export type TransactionType = 'EXPENSE' | 'INCOME';

export type SyncStatus = 'pending' | 'synced' | 'failed' | 'pending_delete';

export type MindfulTag = 'NEED' | 'WANT' | 'SAVING' | 'INVESTMENT';

export type EmotionalMood =
  | 'BORED'
  | 'STRESSED'
  | 'CELEBRATING'
  | 'FOMO'
  | 'TREAT_MYSELF'
  | 'CALM';

export type MascotPersonality = 'zen' | 'hype' | 'pragmatic' | 'cozy';

export type QueueStatus = 'ACTIVE' | 'LOCKED' | 'APPROVED' | 'REJECTED';

export type RewardType =
  | 'DIGITAL_EXP'
  | 'DIGITAL_SHIELD'
  | 'DIGITAL_THEME'
  | 'DIGITAL_TICKET'
  | 'REAL_WORLD_TREAT';

export type RewardClaimStatus = 'UNCLAIMED' | 'REDEEMED';

export interface LocalUser {
  id: string; // UUIDv4
  email: string;
  username: string;
  token?: string;
  comfortFundAllowance: number; // default $25/mo
  comfortFundRemaining: number;
  comfortFundResetDate: string; // ISO 8601 UTC
  comfortFundUnlocked: boolean; // intentional unlock for the session/month
  // Phase 3: Progression, Ranks & Streaks
  exp: number;
  level: number;
  lastCelebratedLevel?: number; // Highest level already acknowledged in celebration modal
  currentStreak: number;
  longestStreak: number;
  graceDays: number; // Consumable shields protecting streaks
  lastActiveDate: string | null; // Local calendar date formatted YYYY-MM-DD
  userTimezone: string;
  activeTheme: string;
  spinnerTickets: number;
  // Phase 4: Accountability Mascot & Visual Assets
  mascotName?: string;
  mascotAvatarUrl?: string | null;
  mascotBlobKey?: string | null;
  mascotPersonality?: MascotPersonality;
  preferredCurrency?: 'IDR' | 'USD' | 'EUR' | 'GBP' | 'SGD' | 'MYR' | 'JPY' | 'AUD';
  preferredLocale?: string;
  preferredLanguage?: LanguageCode;
  createdAt: string; // ISO 8601 UTC
}

export type LanguageCode = 'id' | 'en';

export interface LocalCategory {
  id: string; // UUIDv4
  userId: string;
  name: string;
  icon: string; // UTF-8 Emoji safe
  color: string;
  isCustom: boolean;
  syncStatus?: SyncStatus;
  isDeleted?: boolean; // Tombstone deletion pattern
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
}

export interface LocalTransaction {
  id: string; // UUIDv4 client generated
  userId: string;
  categoryId: string;
  amount: number;
  type: TransactionType;
  description: string;
  date: string; // ISO 8601 UTC
  syncStatus: SyncStatus;
  isDeleted?: boolean; // Tombstone deletion pattern (CRITICAL)
  mindfulTag: MindfulTag;
  emotionalMood?: EmotionalMood;
  notes?: string;
  // Phase 2: Behavioral Guardrails & Cooling-Off State Machine
  queueStatus: QueueStatus; // 'ACTIVE' | 'LOCKED' | 'APPROVED' | 'REJECTED'
  lockedUntil?: string | null; // ISO 8601 UTC timestamp
  isComfortFund?: boolean; // Assigned to unlocked micro-budget
  costPerUse?: number | null; // Calculated cost per estimated use
  estimatedUses?: number | null; // Target usage count (e.g. 100 wears)
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
}

export interface SyncQueueItem {
  id: string;
  entityType: 'transaction' | 'category' | 'debt' | 'payment';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  payload: any;
  attempts: number;
  lastAttempt?: string;
  error?: string;
  createdAt: string; // ISO 8601 UTC
}

export interface AuthSession {
  user: LocalUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isOffline: boolean;
}

export interface SyncResult {
  pushedCount: number;
  pulledCount: number;
  failedCount: number;
  errors: string[];
}

// Local Data Aggregation Models (Computed directly from Dexie)
export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
}

export interface MonthlyBurnRateStats {
  monthName: string;
  totalMonthlyExpense: number;
  dailyBurnRate: number;
  projectedMonthlyBurn: number;
  daysElapsedInMonth: number;
  totalDaysInMonth: number;
  mindfulBreakdown: {
    need: number;
    want: number;
    saving: number;
    investment: number;
  };
}

// Phase 3: Reward Inventory Model (Stored in Dexie and Postgres)
export interface LocalReward {
  id: string; // UUIDv4
  userId: string;
  rewardType: RewardType;
  title: string;
  description: string;
  icon: string; // Emoji
  rewardValue?: string | null; // e.g. theme key, EXP amount, or custom prize label
  status: RewardClaimStatus; // 'UNCLAIMED' | 'REDEEMED'
  claimedAt?: string | null; // ISO 8601 UTC
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
  syncStatus?: SyncStatus;
  isDeleted?: boolean;
}

// Phase 3: Theme Definitions
export interface ThemeDefinition {
  id: string;
  name: string;
  tagline: string;
  unlockedAtLevel: number;
  previewColors: string[];
  icon: string;
}

// Phase 3: Timezone-Aware Streak Check Result
export interface StreakCheckResult {
  previousStreak: number;
  newStreak: number;
  shieldConsumed: boolean;
  streakBroken: boolean;
  isConsecutiveDay: boolean;
  isSameDay: boolean;
  graceDaysRemaining: number;
  expAwarded: number;
  todayLocalStr: string;
}

// Phase 3: Level Rank Tier Definition
export interface RankTier {
  name: string;
  minLevel: number;
  maxLevel: number;
  badge: string;
  color: string;
}

// Phase 4: The Collection Vault (Inventory of owned items)
export interface LocalVaultItem {
  id: string; // UUIDv4
  userId: string;
  name: string;
  purchasePrice: number;
  category: string;
  photoUrl: string; // Base64 data URL (compressed via HTML5 canvas) or Vercel Blob URL
  blobKey?: string | null; // Cloud key once synced to Vercel Blob
  notes?: string;
  acquisitionDate: string; // ISO 8601 UTC
  estimatedUses?: number | null;
  currentUses: number;
  costPerUse?: number | null;
  syncStatus?: SyncStatus;
  isDeleted?: boolean;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
}

// Phase 4: Timeline Funds (Date-bound sinking funds)
export interface LocalTimelineFund {
  id: string; // UUIDv4
  userId: string;
  title: string;
  description?: string;
  icon: string; // Emoji
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // ISO 8601 UTC
  categoryTag?: string;
  isCompleted: boolean;
  syncStatus?: SyncStatus;
  isDeleted?: boolean;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
}

export interface LocalTimelineAllocation {
  id: string; // UUIDv4
  fundId: string;
  amount: number;
  source: 'DIRECT' | 'COMFORT_FUND' | 'TRANSACTION';
  note?: string;
  allocatedAt: string; // ISO 8601 UTC
}

// Phase 4: Accountability Mascot State Engine
export type MascotState = 'PROUD' | 'CONCERNED' | 'CHEERING' | 'NEUTRAL';

export interface MascotEvaluationInput {
  currentStreak: number;
  graceDaysRemaining: number;
  coolingOffPendingCount: number;
  coolingOffRejectedCount: number; // Self-control victories
  coolingOffApprovedCount: number;
  comfortFundRemaining: number;
  comfortFundAllowance: number;
  monthlyExpense: number;
  burnRatePercentage?: number;
}

export interface MascotStatus {
  state: MascotState;
  title: string;
  bubbleText: string;
  subText: string;
  expressionEmoji: string;
  badge: string;
  themeColor: string;
}

// Phase 4: Milestone Share Card Configuration
export type MilestoneCardType =
  | 'STREAK_ACHIEVEMENT'
  | 'COOLING_OFF_VICTORY'
  | 'RANK_LEVEL_UP'
  | 'TIMELINE_FUND_GOAL'
  | 'VAULT_ITEM_MILESTONE'
  | 'DEBT_CONQUERED';

export interface MilestoneShareCardData {
  type: MilestoneCardType;
  username: string;
  level: number;
  rankName: string;
  rankBadge: string;
  headline: string;
  subHeadline: string;
  metricValue: string;
  metricLabel: string;
  mascotName: string;
  mascotEmoji: string;
  mascotAvatarUrl?: string | null;
  dateFormatted: string;
  highlightTag: string;
}

// Phase 2: EXP Transparency & Audit Log
export type ExpCategoryTag =
  | 'STREAK'
  | 'IMPULSE_SAVED'
  | 'MINDFUL_SPEND'
  | 'REWARD_SPIN'
  | 'TIMELINE_FUND'
  | 'VAULT'
  | 'LEVEL_UP'
  | 'DEBT_PAYMENT'
  | 'DEBT_CONQUERED';

export interface LocalExpEvent {
  id: string; // UUIDv4
  userId: string;
  amount: number;
  reason: string;
  categoryTag: ExpCategoryTag;
  createdAt: string; // ISO 8601 UTC
}

// Phase 5: Debt & Liabilities Unified Command Center Types
export type DebtType =
  | 'BNPL'             // Buy Now Pay Later (Klarna, Affirm, Afterpay, 4-pay)
  | 'IOU_OWED'         // Money I owe to a friend/peer (informal liability)
  | 'IOU_RECEIVABLE'   // Money a friend owes me (informal asset/receivable)
  | 'CREDIT_CARD'      // Revolving credit card balance with APR
  | 'LOAN_MORTGAGE';   // Fixed amortized loan, auto loan, or mortgage

export type RepaymentFrequency = 'ONE_OFF' | 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY';

export type DebtStatus = 'ACTIVE' | 'PAID_OFF';

export interface LocalDebt {
  id: string; // UUIDv4
  userId: string;
  name: string;
  debtType: DebtType;
  totalAmount: number; // Initial principal / total order sum
  remainingBalance: number; // Current unpaid balance
  interestRate: number; // APR % (0 for BNPL/IOU, e.g. 22.4 for credit cards)
  minimumPayment: number; // Minimum monthly / cycle installment
  counterpartyName?: string; // Friend's name or Bank/Provider (e.g., "Sarah", "Klarna", "Chase")
  dueDate?: string; // Next payment due date (YYYY-MM-DD or ISO)
  frequency: RepaymentFrequency;
  installmentCount?: number; // Total installment chunks (e.g. 4 for PayLater)
  installmentsPaid?: number; // Number of installments completed
  notes?: string;
  status: DebtStatus;
  syncStatus?: SyncStatus;
  isDeleted?: boolean; // Tombstone deletion
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
}

export interface LocalDebtPayment {
  id: string; // UUIDv4
  debtId: string;
  userId: string;
  amount: number;
  principalAmount?: number;
  interestAmount?: number;
  paymentDate: string; // ISO 8601 UTC
  notes?: string;
  syncedToLedger?: boolean; // True if an expense was recorded in transactions table
  syncStatus?: SyncStatus;
  createdAt: string; // ISO 8601 UTC
}

export type DebtPayoffStrategy = 'SNOWBALL' | 'AVALANCHE';


