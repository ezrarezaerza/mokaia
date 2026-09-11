import Dexie, { type Table } from 'dexie';
import { startOfMonth, endOfMonth, getDate, getDaysInMonth, format, parseISO, differenceInCalendarDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type {
  LocalCategory,
  LocalTransaction,
  LocalUser,
  LocalReward,
  SyncQueueItem,
  MindfulTag,
  TransactionType,
  CategoryBreakdownItem,
  MonthlyBurnRateStats,
  StreakCheckResult,
  LocalVaultItem,
  LocalTimelineFund,
  LocalTimelineAllocation,
  LocalExpEvent,
  ExpCategoryTag,
  EmotionalMood,
  MascotPersonality,
} from '../types';
import { getLevelFromExp, getRankForLevel, EXP_RULES } from './gamification';

export class ExpenseTrackerDB extends Dexie {
  transactions!: Table<LocalTransaction, string>;
  categories!: Table<LocalCategory, string>;
  users!: Table<LocalUser, string>;
  rewards!: Table<LocalReward, string>;
  vaultItems!: Table<LocalVaultItem, string>;
  timelineFunds!: Table<LocalTimelineFund, string>;
  timelineAllocations!: Table<LocalTimelineAllocation, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  expEvents!: Table<LocalExpEvent, string>;

  constructor() {
    super('ExpenseTrackerDB');
    this.version(1).stores({
      transactions: 'id, userId, categoryId, type, date, syncStatus, createdAt',
      categories: 'id, userId, name, isCustom',
      users: 'id, email, username',
      syncQueue: 'id, entityType, entityId, action, createdAt',
    });

    // Version 2: Strict Tombstone Deletion and Bi-Directional Conflict Resolution
    this.version(2).stores({
      transactions: 'id, userId, categoryId, type, date, syncStatus, isDeleted, createdAt, updatedAt',
      categories: 'id, userId, name, isCustom, syncStatus, isDeleted, createdAt, updatedAt',
      users: 'id, email, username',
      syncQueue: 'id, entityType, entityId, action, createdAt',
    });

    // Version 3: Phase 2 Behavioral Guardrails (Cooling-Off Queue, QueueStatus, LockedUntil)
    this.version(3).stores({
      transactions: 'id, userId, categoryId, type, date, syncStatus, isDeleted, queueStatus, lockedUntil, createdAt, updatedAt',
      categories: 'id, userId, name, isCustom, syncStatus, isDeleted, createdAt, updatedAt',
      users: 'id, email, username',
      syncQueue: 'id, entityType, entityId, action, createdAt',
    });

    // Version 4: Phase 3 The Gamified Loop (EXP, Levels, Streaks, Grace Days, Reward Inventory)
    this.version(4).stores({
      transactions: 'id, userId, categoryId, type, date, syncStatus, isDeleted, queueStatus, lockedUntil, createdAt, updatedAt',
      categories: 'id, userId, name, isCustom, syncStatus, isDeleted, createdAt, updatedAt',
      users: 'id, email, username, exp, level, currentStreak, graceDays, activeTheme',
      rewards: 'id, userId, status, rewardType, isDeleted, createdAt, updatedAt',
      syncQueue: 'id, entityType, entityId, action, createdAt',
    });

    // Version 5: Phase 4 Visual Tracking & Social Engagement (Collection Vault, Timeline Funds, Allocations)
    this.version(5).stores({
      transactions: 'id, userId, categoryId, type, date, syncStatus, isDeleted, queueStatus, lockedUntil, createdAt, updatedAt',
      categories: 'id, userId, name, isCustom, syncStatus, isDeleted, createdAt, updatedAt',
      users: 'id, email, username, exp, level, currentStreak, graceDays, activeTheme',
      rewards: 'id, userId, status, rewardType, isDeleted, createdAt, updatedAt',
      vaultItems: 'id, userId, category, isDeleted, createdAt, updatedAt',
      timelineFunds: 'id, userId, isCompleted, isDeleted, targetDate, createdAt',
      timelineAllocations: 'id, fundId, allocatedAt',
      syncQueue: 'id, entityType, entityId, action, createdAt',
    });

    // Version 6: EXP Audit History & Transparency
    this.version(6).stores({
      transactions: 'id, userId, categoryId, type, date, syncStatus, isDeleted, queueStatus, lockedUntil, createdAt, updatedAt',
      categories: 'id, userId, name, isCustom, syncStatus, isDeleted, createdAt, updatedAt',
      users: 'id, email, username, exp, level, currentStreak, graceDays, activeTheme',
      rewards: 'id, userId, status, rewardType, isDeleted, createdAt, updatedAt',
      vaultItems: 'id, userId, category, isDeleted, createdAt, updatedAt',
      timelineFunds: 'id, userId, isCompleted, isDeleted, targetDate, createdAt',
      timelineAllocations: 'id, fundId, allocatedAt',
      syncQueue: 'id, entityType, entityId, action, createdAt',
      expEvents: 'id, userId, categoryTag, createdAt',
    });

    // Version 7: Emotional Mood Tagging & Mascot Personalities
    this.version(7).stores({
      transactions: 'id, userId, categoryId, type, date, syncStatus, isDeleted, queueStatus, lockedUntil, emotionalMood, createdAt, updatedAt',
      categories: 'id, userId, name, isCustom, syncStatus, isDeleted, createdAt, updatedAt',
      users: 'id, email, username, exp, level, currentStreak, graceDays, activeTheme, mascotPersonality',
      rewards: 'id, userId, status, rewardType, isDeleted, createdAt, updatedAt',
      vaultItems: 'id, userId, category, isDeleted, createdAt, updatedAt',
      timelineFunds: 'id, userId, isCompleted, isDeleted, targetDate, createdAt',
      timelineAllocations: 'id, fundId, allocatedAt',
      syncQueue: 'id, entityType, entityId, action, createdAt',
      expEvents: 'id, userId, categoryTag, createdAt',
    });
  }
}

export const db = new ExpenseTrackerDB();

// Default lifestyle categories with icons and vibrant color accents
export const DEFAULT_CATEGORIES: Array<{ name: string; icon: string; color: string }> = [
  { name: 'Food & Dining', icon: '🍔', color: '#10b981' },
  { name: 'Coffee & Treats', icon: '☕', color: '#f59e0b' },
  { name: 'Transit & Rides', icon: '🚇', color: '#3b82f6' },
  { name: 'Groceries', icon: '🥑', color: '#84cc16' },
  { name: 'Shopping & Style', icon: '🛍️', color: '#ec4899' },
  { name: 'Tech & Gadgets', icon: '💻', color: '#8b5cf6' },
  { name: 'Entertainment & Subs', icon: '🍿', color: '#06b6d4' },
  { name: 'Wellness & Gym', icon: '🧘', color: '#14b8a6' },
  { name: 'Housing & Utilities', icon: '🏠', color: '#64748b' },
  { name: 'Salary & Income', icon: '💰', color: '#22c55e' },
];

/**
 * Seed initial categories for a newly authenticated user into Dexie.js
 */
export async function seedDefaultCategories(userId: string): Promise<LocalCategory[]> {
  const existing = await db.categories.where('userId').equals(userId).toArray();
  const nonDeleted = existing.filter((c) => !c.isDeleted);
  if (nonDeleted.length > 0) {
    return nonDeleted;
  }

  const now = new Date().toISOString();
  const categoriesToInsert: LocalCategory[] = DEFAULT_CATEGORIES.map((cat) => ({
    id: crypto.randomUUID(),
    userId,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    isCustom: false,
    syncStatus: 'pending',
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  }));

  await db.transaction('rw', db.categories, db.syncQueue, async () => {
    await db.categories.bulkPut(categoriesToInsert);
    for (const cat of categoriesToInsert) {
      await db.syncQueue.add({
        id: crypto.randomUUID(),
        entityType: 'category',
        entityId: cat.id,
        action: 'create',
        payload: cat,
        attempts: 0,
        createdAt: now,
      });
    }
  });

  return categoriesToInsert;
}

/* =========================================================================
 * TRANSACTION CRUD (Strict Offline Directives, UUIDv4, Tombstone Deletion)
 * ========================================================================= */

/**
 * Create a new Transaction locally in Dexie with client-generated UUIDv4
 */
export async function createLocalTransaction(params: {
  userId: string;
  categoryId: string;
  amount: number;
  type: TransactionType;
  description: string;
  date?: string; // ISO 8601 UTC
  mindfulTag?: MindfulTag;
  emotionalMood?: EmotionalMood;
  notes?: string;
  queueStatus?: import('../types').QueueStatus;
  lockedUntil?: string | null;
  isComfortFund?: boolean;
  costPerUse?: number | null;
  estimatedUses?: number | null;
}): Promise<LocalTransaction> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const newTx: LocalTransaction = {
    id,
    userId: params.userId,
    categoryId: params.categoryId,
    amount: Math.abs(params.amount),
    type: params.type,
    description: params.description.trim(),
    date: params.date || now,
    syncStatus: 'pending',
    isDeleted: false,
    mindfulTag: params.mindfulTag || 'WANT',
    emotionalMood: params.emotionalMood,
    notes: params.notes?.trim() || undefined,
    queueStatus: params.queueStatus || 'ACTIVE',
    lockedUntil: params.lockedUntil || null,
    isComfortFund: params.isComfortFund || false,
    costPerUse: params.costPerUse || null,
    estimatedUses: params.estimatedUses || null,
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction('rw', db.transactions, db.syncQueue, db.users, async () => {
    await db.transactions.put(newTx);
    await db.syncQueue.add({
      id: crypto.randomUUID(),
      entityType: 'transaction',
      entityId: id,
      action: 'create',
      payload: newTx,
      attempts: 0,
      createdAt: now,
    });

    // If using comfort fund, deduct remaining balance
    if (params.isComfortFund && params.type === 'EXPENSE') {
      const user = await db.users.get(params.userId);
      if (user) {
        const curRemaining = user.comfortFundRemaining ?? 25;
        const updatedRemaining = Math.max(0, curRemaining - Math.abs(params.amount));
        await db.users.put({
          ...user,
          comfortFundRemaining: Number(updatedRemaining.toFixed(2)),
        });
      }
    }
  });

  return newTx;
}

/**
 * Update an existing Transaction locally in Dexie
 */
export async function updateLocalTransaction(
  id: string,
  updates: Partial<Omit<LocalTransaction, 'id' | 'userId' | 'createdAt'>>
): Promise<LocalTransaction | null> {
  const existing = await db.transactions.get(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updatedTx: LocalTransaction = {
    ...existing,
    ...updates,
    updatedAt: now,
    syncStatus: 'pending',
  };

  await db.transaction('rw', db.transactions, db.syncQueue, async () => {
    await db.transactions.put(updatedTx);
    await db.syncQueue.add({
      id: crypto.randomUUID(),
      entityType: 'transaction',
      entityId: id,
      action: 'update',
      payload: updatedTx,
      attempts: 0,
      createdAt: now,
    });
  });

  return updatedTx;
}

/**
 * Strict Directive 2: Tombstone Deletion Pattern (CRITICAL)
 * Never hard-delete records from Dexie while offline.
 * Sets isDeleted: true and syncStatus: 'pending_delete'.
 * The sync engine reads this, deletes it from Postgres, and then hard-deletes it.
 */
export async function deleteLocalTransaction(id: string): Promise<void> {
  const tx = await db.transactions.get(id);
  if (!tx) return;

  const now = new Date().toISOString();
  const tombstonedTx: LocalTransaction = {
    ...tx,
    isDeleted: true,
    syncStatus: 'pending_delete',
    updatedAt: now,
  };

  await db.transaction('rw', db.transactions, db.syncQueue, async () => {
    await db.transactions.put(tombstonedTx);
    await db.syncQueue.add({
      id: crypto.randomUUID(),
      entityType: 'transaction',
      entityId: id,
      action: 'delete',
      payload: { id, userId: tx.userId, updatedAt: now },
      attempts: 0,
      createdAt: now,
    });
  });
}

/**
 * Hard delete transaction from Dexie once Postgres has confirmed deletion
 */
export async function purgeDeletedTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
}

/* =========================================================================
 * CATEGORY CRUD (Custom Lifestyle Tags, Full Offline CRUD, Tombstones)
 * ========================================================================= */

/**
 * Create a Custom Category in Dexie
 */
export async function createLocalCategory(params: {
  userId: string;
  name: string;
  icon?: string;
  color?: string;
}): Promise<LocalCategory> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const newCat: LocalCategory = {
    id,
    userId: params.userId,
    name: params.name.trim(),
    icon: params.icon || '🏷️',
    color: params.color || '#3b82f6',
    isCustom: true,
    syncStatus: 'pending',
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction('rw', db.categories, db.syncQueue, async () => {
    await db.categories.put(newCat);
    await db.syncQueue.add({
      id: crypto.randomUUID(),
      entityType: 'category',
      entityId: id,
      action: 'create',
      payload: newCat,
      attempts: 0,
      createdAt: now,
    });
  });

  return newCat;
}

/**
 * Update an existing Category in Dexie
 */
export async function updateLocalCategory(
  id: string,
  updates: Partial<Omit<LocalCategory, 'id' | 'userId' | 'createdAt'>>
): Promise<LocalCategory | null> {
  const existing = await db.categories.get(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updatedCat: LocalCategory = {
    ...existing,
    ...updates,
    updatedAt: now,
    syncStatus: 'pending',
  };

  await db.transaction('rw', db.categories, db.syncQueue, async () => {
    await db.categories.put(updatedCat);
    await db.syncQueue.add({
      id: crypto.randomUUID(),
      entityType: 'category',
      entityId: id,
      action: 'update',
      payload: updatedCat,
      attempts: 0,
      createdAt: now,
    });
  });

  return updatedCat;
}

/**
 * Delete a Category with Tombstone Deletion Pattern
 */
export async function deleteLocalCategory(id: string): Promise<void> {
  const cat = await db.categories.get(id);
  if (!cat) return;

  const now = new Date().toISOString();
  const tombstonedCat: LocalCategory = {
    ...cat,
    isDeleted: true,
    syncStatus: 'pending_delete',
    updatedAt: now,
  };

  await db.transaction('rw', db.categories, db.syncQueue, async () => {
    await db.categories.put(tombstonedCat);
    await db.syncQueue.add({
      id: crypto.randomUUID(),
      entityType: 'category',
      entityId: id,
      action: 'delete',
      payload: { id, userId: cat.userId, updatedAt: now },
      attempts: 0,
      createdAt: now,
    });
  });
}

/**
 * Hard delete category from Dexie once Postgres has confirmed deletion
 */
export async function purgeDeletedCategory(id: string): Promise<void> {
  await db.categories.delete(id);
}

/* =========================================================================
 * DATA AGGREGATION ENGINE (Directive 3: Computed Locally in Dexie)
 * ========================================================================= */

/**
 * Computes Total Balances, Total Inflow, Total Outflow from Dexie
 */
export async function calculateBalances(userId: string): Promise<{
  balance: number;
  inflow: number;
  outflow: number;
  count: number;
}> {
  const transactions = await db.transactions
    .where('userId')
    .equals(userId)
    .toArray();

  let inflow = 0;
  let outflow = 0;
  let count = 0;

  for (const tx of transactions) {
    if (tx.isDeleted || tx.queueStatus === 'LOCKED' || tx.queueStatus === 'REJECTED') continue;
    count++;
    if (tx.type === 'INCOME') {
      inflow += tx.amount;
    } else {
      outflow += tx.amount;
    }
  }

  return {
    balance: inflow - outflow,
    inflow,
    outflow,
    count,
  };
}

/**
 * Computes Category Spend Breakdown from Dexie (sorted descending by spend)
 */
export async function calculateCategoryBreakdown(
  userId: string,
  allTransactions?: LocalTransaction[],
  allCategories?: LocalCategory[]
): Promise<CategoryBreakdownItem[]> {
  const txList =
    allTransactions ??
    (await db.transactions.where('userId').equals(userId).toArray());
  const catList =
    allCategories ??
    (await db.categories.where('userId').equals(userId).toArray());

  const catMap = new Map<string, LocalCategory>();
  for (const c of catList) {
    if (!c.isDeleted) {
      catMap.set(c.id, c);
    }
  }

  const categoryTotals = new Map<
    string,
    { total: number; count: number; cat: LocalCategory }
  >();

  let totalExpense = 0;

  for (const tx of txList) {
    if (tx.isDeleted || tx.type !== 'EXPENSE' || tx.queueStatus === 'LOCKED' || tx.queueStatus === 'REJECTED') continue;
    totalExpense += tx.amount;

    const cat = catMap.get(tx.categoryId) || {
      id: tx.categoryId,
      userId,
      name: 'Uncategorized',
      icon: '📦',
      color: '#64748b',
      isCustom: false,
      createdAt: '',
      updatedAt: '',
    };

    const current = categoryTotals.get(cat.id) || { total: 0, count: 0, cat };
    current.total += tx.amount;
    current.count += 1;
    categoryTotals.set(cat.id, current);
  }

  const breakdown: CategoryBreakdownItem[] = [];

  for (const [id, data] of categoryTotals.entries()) {
    const percentage = totalExpense > 0 ? (data.total / totalExpense) * 100 : 0;
    breakdown.push({
      categoryId: id,
      categoryName: data.cat.name,
      categoryIcon: data.cat.icon,
      categoryColor: data.cat.color,
      totalAmount: Number(data.total.toFixed(2)),
      percentage: Number(percentage.toFixed(1)),
      transactionCount: data.count,
    });
  }

  // Sort descending by total spent
  return breakdown.sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Computes Monthly Burn Rate and Mindful Intent Stats from Dexie
 * Uses date-fns for timezone-accurate boundary checks
 */
export async function calculateMonthlyBurnRate(
  userId: string,
  targetDate: Date = new Date(),
  allTransactions?: LocalTransaction[]
): Promise<MonthlyBurnRateStats> {
  const txList =
    allTransactions ??
    (await db.transactions.where('userId').equals(userId).toArray());

  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);
  const daysInMonth = getDaysInMonth(targetDate);
  const currentDay = Math.max(1, getDate(targetDate));

  let totalMonthlyExpense = 0;
  const mindful = {
    need: 0,
    want: 0,
    saving: 0,
    investment: 0,
  };

  for (const tx of txList) {
    if (tx.isDeleted || tx.type !== 'EXPENSE' || tx.queueStatus === 'LOCKED' || tx.queueStatus === 'REJECTED') continue;

    const txDate = parseISO(tx.date);
    if (txDate >= monthStart && txDate <= monthEnd) {
      totalMonthlyExpense += tx.amount;

      switch (tx.mindfulTag) {
        case 'NEED':
          mindful.need += tx.amount;
          break;
        case 'WANT':
          mindful.want += tx.amount;
          break;
        case 'SAVING':
          mindful.saving += tx.amount;
          break;
        case 'INVESTMENT':
          mindful.investment += tx.amount;
          break;
      }
    }
  }

  const dailyBurnRate = totalMonthlyExpense / currentDay;
  const projectedMonthlyBurn = dailyBurnRate * daysInMonth;

  return {
    monthName: format(targetDate, 'MMMM yyyy'),
    totalMonthlyExpense: Number(totalMonthlyExpense.toFixed(2)),
    dailyBurnRate: Number(dailyBurnRate.toFixed(2)),
    projectedMonthlyBurn: Number(projectedMonthlyBurn.toFixed(2)),
    daysElapsedInMonth: currentDay,
    totalDaysInMonth: daysInMonth,
    mindfulBreakdown: {
      need: Number(mindful.need.toFixed(2)),
      want: Number(mindful.want.toFixed(2)),
      saving: Number(mindful.saving.toFixed(2)),
      investment: Number(mindful.investment.toFixed(2)),
    },
  };
}

/* =========================================================================
 * PHASE 2: BEHAVIORAL GUARDRAILS (Cooling-Off Queue & Comfort Fund)
 * ========================================================================= */

/**
 * Send an impulse purchase to The Cooling-Off Queue locked for 24-48 hours (strict UTC).
 */
export async function sendToCoolingOffQueue(params: {
  userId: string;
  categoryId: string;
  amount: number;
  description: string;
  coolingHours?: 24 | 48;
  mindfulTag?: MindfulTag;
  emotionalMood?: EmotionalMood;
  notes?: string;
  costPerUse?: number | null;
  estimatedUses?: number | null;
}): Promise<LocalTransaction> {
  const hours = params.coolingHours || 24;
  const nowMs = Date.now();
  const lockedUntil = new Date(nowMs + hours * 60 * 60 * 1000).toISOString();

  return await createLocalTransaction({
    userId: params.userId,
    categoryId: params.categoryId,
    amount: params.amount,
    type: 'EXPENSE',
    description: params.description,
    mindfulTag: params.mindfulTag || 'WANT',
    emotionalMood: params.emotionalMood,
    notes: params.notes,
    queueStatus: 'LOCKED',
    lockedUntil,
    costPerUse: params.costPerUse,
    estimatedUses: params.estimatedUses,
  });
}

/**
 * Approve a transaction from The Cooling-Off Queue after the lock period has elapsed.
 * Strict Anti-Cheating check: Enforces UTC timestamp verification.
 */
export async function approveCoolingOffTransaction(id: string): Promise<{ success: boolean; error?: string }> {
  const tx = await db.transactions.get(id);
  if (!tx) return { success: false, error: 'Transaction not found.' };

  if (tx.queueStatus !== 'LOCKED') {
    return { success: false, error: 'Transaction is not locked in the cooling-off queue.' };
  }

  // Anti-cheating verification: Ensure current UTC time has passed lockedUntil
  const nowUtc = Date.now();
  const lockedUntilUtc = tx.lockedUntil ? new Date(tx.lockedUntil).getTime() : 0;

  if (nowUtc < lockedUntilUtc) {
    const diffHours = ((lockedUntilUtc - nowUtc) / (1000 * 60 * 60)).toFixed(1);
    return {
      success: false,
      error: `Cooling-off lock active. Please wait ${diffHours} more hours for emotional clarity.`,
    };
  }

  await updateLocalTransaction(id, {
    queueStatus: 'APPROVED',
  });

  return { success: true };
}

export interface ImpulseVictoryResult {
  success: boolean;
  savedAmount: number;
  itemDescription: string;
  expAwarded: number;
  ticketGranted: boolean;
  totalResistedCount: number;
  totalSavedAmount: number;
}

/**
 * Reject an impulse buy from the Cooling-Off Queue (Impulse avoided, money saved!).
 * Triggers mindful victory rewards (+150 EXP Surge, +1 Spin Ticket, and celebration stats).
 */
export async function rejectCoolingOffTransaction(id: string): Promise<ImpulseVictoryResult | null> {
  const tx = await db.transactions.get(id);
  if (!tx) return null;

  await updateLocalTransaction(id, {
    queueStatus: 'REJECTED',
  });

  let expAwarded = EXP_RULES.REJECT_IMPULSE;
  let ticketGranted = false;

  if (tx.userId) {
    // Award +150 EXP surge logged with IMPULSE_SAVED category
    await awardUserExp(tx.userId, EXP_RULES.REJECT_IMPULSE, `Resisted Impulse: ${tx.description}`, 'IMPULSE_SAVED');
    // Award +1 Spin Ticket for the Reward Spinner
    await addSpinnerTickets(tx.userId, 1);
    ticketGranted = true;
  }

  // Calculate cumulative lifetime impulse resistance stats
  let totalResistedCount = 1;
  let totalSavedAmount = tx.amount;

  if (tx.userId) {
    const rejectedTxs = await db.transactions
      .where('userId')
      .equals(tx.userId)
      .filter((t) => t.queueStatus === 'REJECTED' && !t.isDeleted)
      .toArray();

    totalResistedCount = rejectedTxs.length;
    totalSavedAmount = rejectedTxs.reduce((sum, t) => sum + (t.amount || 0), 0);
  }

  return {
    success: true,
    savedAmount: tx.amount,
    itemDescription: tx.description,
    expAwarded,
    ticketGranted,
    totalResistedCount,
    totalSavedAmount,
  };
}

/**
 * Fast-forward lock timer for Dev / Demonstration preview purposes
 */
export async function devFastForwardCoolingOff(id: string): Promise<void> {
  const tx = await db.transactions.get(id);
  if (!tx) return;
  // Set lockedUntil to 5 seconds in the past
  const pastTime = new Date(Date.now() - 5000).toISOString();
  await updateLocalTransaction(id, {
    lockedUntil: pastTime,
  });
}

/**
 * Calculate total money saved through the Cooling-Off Queue
 */
export async function calculateCoolingOffSavings(userId: string): Promise<{
  savedAmount: number;
  rejectedCount: number;
  lockedCount: number;
  lockedAmount: number;
}> {
  const txs = await db.transactions.where('userId').equals(userId).toArray();
  let savedAmount = 0;
  let rejectedCount = 0;
  let lockedCount = 0;
  let lockedAmount = 0;

  for (const tx of txs) {
    if (tx.isDeleted) continue;
    if (tx.queueStatus === 'REJECTED') {
      savedAmount += tx.amount;
      rejectedCount++;
    } else if (tx.queueStatus === 'LOCKED') {
      lockedCount++;
      lockedAmount += tx.amount;
    }
  }

  return {
    savedAmount: Number(savedAmount.toFixed(2)),
    rejectedCount,
    lockedCount,
    lockedAmount: Number(lockedAmount.toFixed(2)),
  };
}

/**
 * Synchronize and return user Comfort Fund state, applying monthly reset if month rolled over.
 */
export async function syncUserComfortFund(userId: string): Promise<LocalUser | null> {
  const user = await db.users.get(userId);
  if (!user) return null;

  const now = new Date();
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  let needsUpdate = false;
  let allowance = user.comfortFundAllowance ?? 25;
  let remaining = user.comfortFundRemaining ?? allowance;
  let resetDate = user.comfortFundResetDate || currentMonthStart;
  let unlocked = user.comfortFundUnlocked ?? false;

  // Check if resetDate is from a previous month
  const lastReset = new Date(resetDate);
  if (
    now.getUTCFullYear() > lastReset.getUTCFullYear() ||
    now.getUTCMonth() > lastReset.getUTCMonth()
  ) {
    // New month! Reset comfort fund balance and lock state
    remaining = allowance;
    resetDate = currentMonthStart;
    unlocked = false;
    needsUpdate = true;
  }

  if (user.comfortFundAllowance === undefined || needsUpdate) {
    const updatedUser: LocalUser = {
      ...user,
      comfortFundAllowance: allowance,
      comfortFundRemaining: remaining,
      comfortFundResetDate: resetDate,
      comfortFundUnlocked: unlocked,
    };
    await db.users.put(updatedUser);
    return updatedUser;
  }

  return user;
}

/**
 * Intentionally unlock the Comfort Fund with physical gesture
 */
export async function unlockUserComfortFund(userId: string): Promise<LocalUser | null> {
  const user = await db.users.get(userId);
  if (!user) return null;

  const updated: LocalUser = {
    ...user,
    comfortFundUnlocked: true,
  };
  await db.users.put(updated);
  return updated;
}

/**
 * Lock the Comfort Fund back
 */
export async function lockUserComfortFund(userId: string): Promise<LocalUser | null> {
  const user = await db.users.get(userId);
  if (!user) return null;

  const updated: LocalUser = {
    ...user,
    comfortFundUnlocked: false,
  };
  await db.users.put(updated);
  return updated;
}

/**
 * Update the user's monthly Comfort Fund allowance
 */
export async function updateComfortFundAllowance(userId: string, newAllowance: number): Promise<LocalUser | null> {
  const user = await db.users.get(userId);
  if (!user) return null;

  const diff = newAllowance - (user.comfortFundAllowance ?? 25);
  const updated: LocalUser = {
    ...user,
    comfortFundAllowance: newAllowance,
    comfortFundRemaining: Math.max(0, (user.comfortFundRemaining ?? 25) + diff),
  };
  await db.users.put(updated);
  return updated;
}

// ============================================================================
// PHASE 3: THE GAMIFIED LOOP (STREAKS, EXP, REWARDS & INVENTORY)
// ============================================================================

/**
 * Detect client's local IANA timezone
 */
export function getClientTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Format today's calendar date in the specified local timezone (YYYY-MM-DD)
 */
export function getTodayLocalDateStr(timeZone: string = getClientTimezone()): string {
  try {
    return formatInTimeZone(new Date(), timeZone, 'yyyy-MM-dd');
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Timezone-Aware Streak Engine (CRITICAL):
 * Evaluates consecutive calendar days in user's timezone using date-fns-tz.
 * Automatically checks and consumes consumable "Grace Days" (Shields)
 * to retroactively protect streaks if a gap is detected upon login.
 */
export async function checkAndUpdateStreak(userId: string): Promise<StreakCheckResult> {
  const user = await db.users.get(userId);
  if (!user) {
    const tz = getClientTimezone();
    return {
      previousStreak: 0,
      newStreak: 1,
      shieldConsumed: false,
      streakBroken: false,
      isConsecutiveDay: true,
      isSameDay: false,
      graceDaysRemaining: 2,
      expAwarded: EXP_RULES.DAILY_LOGIN,
      todayLocalStr: getTodayLocalDateStr(tz),
    };
  }

  const userTimezone = user.userTimezone || getClientTimezone();
  const todayStr = getTodayLocalDateStr(userTimezone);
  const lastActiveStr = user.lastActiveDate;

  const prevStreak = user.currentStreak ?? 0;
  let currentGraceDays = user.graceDays ?? 2;
  let newStreak = prevStreak;
  let shieldConsumed = false;
  let streakBroken = false;
  let isConsecutiveDay = false;
  let isSameDay = false;
  let expAwarded = 0;

  // Case 1: First login ever or missing lastActiveDate
  if (!lastActiveStr) {
    newStreak = 1;
    isConsecutiveDay = true;
    expAwarded = EXP_RULES.DAILY_LOGIN;
  } else if (lastActiveStr === todayStr) {
    // Case 2: Already active today in client timezone -> streak preserved, daily login EXP capped
    isSameDay = true;
    newStreak = Math.max(1, prevStreak);
  } else {
    // Case 3: Compare calendar day gap
    try {
      const todayDate = parseISO(todayStr);
      const lastActiveDate = parseISO(lastActiveStr);
      const dayDiff = differenceInCalendarDays(todayDate, lastActiveDate);

      if (dayDiff === 1) {
        // Consecutive calendar day login!
        newStreak = prevStreak + 1;
        isConsecutiveDay = true;
        expAwarded = EXP_RULES.DAILY_LOGIN;

        // 7-day streak milestone reward (+100 EXP)
        if (newStreak % 7 === 0) {
          expAwarded += EXP_RULES.STREAK_7_DAY_MILESTONE;
        }
      } else if (dayDiff === 2) {
        // Missed exactly 1 day -> check for consumable Grace Day Shield!
        if (currentGraceDays > 0) {
          currentGraceDays -= 1;
          shieldConsumed = true;
          newStreak = prevStreak + 1;
          isConsecutiveDay = true;
          expAwarded = EXP_RULES.DAILY_LOGIN;
        } else {
          // No shields left -> streak resets to 1
          streakBroken = true;
          newStreak = 1;
          expAwarded = EXP_RULES.DAILY_LOGIN;
        }
      } else if (dayDiff > 2) {
        const missedDays = dayDiff - 1;
        if (currentGraceDays >= missedDays) {
          currentGraceDays -= missedDays;
          shieldConsumed = true;
          newStreak = prevStreak + 1;
          isConsecutiveDay = true;
          expAwarded = EXP_RULES.DAILY_LOGIN;
        } else {
          streakBroken = true;
          newStreak = 1;
          expAwarded = EXP_RULES.DAILY_LOGIN;
        }
      }
    } catch {
      newStreak = Math.max(1, prevStreak);
    }
  }

  // Update user in Dexie if state changed or new day active
  if (!isSameDay) {
    const updatedUser: LocalUser = {
      ...user,
      currentStreak: newStreak,
      longestStreak: Math.max(user.longestStreak ?? 0, newStreak),
      graceDays: currentGraceDays,
      lastActiveDate: todayStr,
      userTimezone,
    };
    await db.users.put(updatedUser);

    if (expAwarded > 0) {
      await awardUserExp(userId, expAwarded, 'Daily Login & Streak Preservation');
    }
  }

  return {
    previousStreak: prevStreak,
    newStreak,
    shieldConsumed,
    streakBroken,
    isConsecutiveDay,
    isSameDay,
    graceDaysRemaining: currentGraceDays,
    expAwarded,
    todayLocalStr: todayStr,
  };
}

/**
 * Anti-Cheese Economy: Award EXP and compute leveling state
 */
export async function awardUserExp(
  userId: string,
  expAmount: number,
  reason: string,
  categoryTag?: ExpCategoryTag
): Promise<{ newExp: number; newLevel: number; leveledUp: boolean; rankTitle: string; freeTicketGranted: boolean }> {
  const user = await db.users.get(userId);
  if (!user) {
    return { newExp: 0, newLevel: 1, leveledUp: false, rankTitle: 'Impulse Novice', freeTicketGranted: false };
  }

  const prevExp = user.exp ?? 0;
  const prevLevel = user.level ?? 1;
  const newExp = prevExp + expAmount;
  const newLevel = getLevelFromExp(newExp);
  const leveledUp = newLevel > prevLevel;
  const rank = getRankForLevel(newLevel);

  let tickets = user.spinnerTickets ?? 1;
  let freeTicketGranted = false;

  // Level up bonus: Award a free spin ticket on level up!
  if (leveledUp) {
    tickets += (newLevel - prevLevel);
    freeTicketGranted = true;
  }

  const updatedUser: LocalUser = {
    ...user,
    exp: newExp,
    level: newLevel,
    spinnerTickets: tickets,
  };
  await db.users.put(updatedUser);

  // Record EXP Audit History Event
  try {
    const event: LocalExpEvent = {
      id: crypto.randomUUID(),
      userId,
      amount: expAmount,
      reason,
      categoryTag: categoryTag || 'MINDFUL_SPEND',
      createdAt: new Date().toISOString(),
    };
    await db.expEvents.add(event);
  } catch (err) {
    console.warn('[EXP Engine] Failed to write expEvent:', err);
  }

  console.log(`[EXP Engine] +${expAmount} EXP (${reason}) -> Total: ${newExp} EXP (Lvl ${newLevel})`);

  return {
    newExp,
    newLevel,
    leveledUp,
    rankTitle: rank.name,
    freeTicketGranted,
  };
}

/**
 * Retrieve recent EXP audit history for transparency
 */
export async function getRecentExpEvents(userId: string, limit: number = 30): Promise<LocalExpEvent[]> {
  try {
    const events = await db.expEvents.where('userId').equals(userId).reverse().sortBy('createdAt');
    if (events.length > 0) {
      return events.slice(0, limit);
    }

    // Seed default starter history if empty so the user immediately understands the mechanic
    const nowMs = Date.now();
    const starterEvents: LocalExpEvent[] = [
      {
        id: crypto.randomUUID(),
        userId,
        amount: EXP_RULES.DAILY_LOGIN,
        reason: 'Daily Check-in & Mindful Login',
        categoryTag: 'STREAK',
        createdAt: new Date(nowMs - 3600000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        userId,
        amount: 20,
        reason: 'Initial Account Setup & First Intent',
        categoryTag: 'MINDFUL_SPEND',
        createdAt: new Date(nowMs - 7200000).toISOString(),
      },
    ];

    for (const ev of starterEvents) {
      await db.expEvents.add(ev);
    }
    return starterEvents;
  } catch (err) {
    console.warn('Error fetching exp events:', err);
    return [];
  }
}

/**
 * Retrieve Grace Day Shield status and recharge progress
 */
export async function getShieldStatus(userId: string): Promise<{
  activeShields: number;
  maxShields: number;
  currentStreak: number;
  longestStreak: number;
  daysUntilNextShield: number;
  canRecharge: boolean;
}> {
  const user = await db.users.get(userId);
  const activeShields = user?.graceDays ?? 2;
  const currentStreak = user?.currentStreak ?? 0;
  const longestStreak = user?.longestStreak ?? currentStreak;

  // 1 shield earned every 7-day streak milestone up to 2
  const progressInWeek = currentStreak % 7;
  const daysUntilNextShield = activeShields >= 2 ? 0 : (7 - progressInWeek);
  const canRecharge = activeShields < 2 && daysUntilNextShield === 0 && currentStreak >= 7;

  return {
    activeShields,
    maxShields: 2,
    currentStreak,
    longestStreak,
    daysUntilNextShield,
    canRecharge,
  };
}


/**
 * Add a prize or treat to the user's Reward Inventory
 */
export async function addRewardToInventory(
  userId: string,
  reward: {
    rewardType: LocalReward['rewardType'];
    title: string;
    description: string;
    icon: string;
    rewardValue?: string | null;
  }
): Promise<LocalReward> {
  const newReward: LocalReward = {
    id: crypto.randomUUID(),
    userId,
    rewardType: reward.rewardType,
    title: reward.title,
    description: reward.description,
    icon: reward.icon,
    rewardValue: reward.rewardValue,
    status: 'UNCLAIMED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'pending',
  };

  await db.rewards.add(newReward);

  // Auto-enqueue for cloud synchronization
  await db.syncQueue.add({
    id: crypto.randomUUID(),
    entityType: 'transaction', // generic sync queue entity
    entityId: newReward.id,
    action: 'create',
    payload: newReward,
    attempts: 0,
    createdAt: new Date().toISOString(),
  });

  return newReward;
}

/**
 * Claim or redeem an item from the Reward Inventory
 */
export async function claimRewardInInventory(rewardId: string): Promise<LocalReward | null> {
  const reward = await db.rewards.get(rewardId);
  if (!reward) return null;

  const updated: LocalReward = {
    ...reward,
    status: 'REDEEMED',
    claimedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'pending',
  };

  await db.rewards.put(updated);
  return updated;
}

/**
 * Consume one Spinner Ticket
 */
export async function consumeSpinnerTicket(userId: string): Promise<boolean> {
  const user = await db.users.get(userId);
  if (!user || (user.spinnerTickets ?? 0) <= 0) return false;

  await db.users.update(userId, {
    spinnerTickets: Math.max(0, (user.spinnerTickets ?? 1) - 1),
  });
  return true;
}

/**
 * Add Spinner Tickets
 */
export async function addSpinnerTickets(userId: string, count: number = 1): Promise<number> {
  const user = await db.users.get(userId);
  if (!user) return count;

  const newCount = (user.spinnerTickets ?? 0) + count;
  await db.users.update(userId, {
    spinnerTickets: newCount,
  });
  return newCount;
}

/**
 * Add a Grace Day Shield
 */
export async function addGraceDayShield(userId: string, count: number = 1): Promise<number> {
  const user = await db.users.get(userId);
  if (!user) return count;

  const newShields = (user.graceDays ?? 0) + count;
  await db.users.update(userId, {
    graceDays: newShields,
  });
  return newShields;
}

/**
 * Set user active theme and dynamically inject into HTML document root
 */
export async function setUserActiveTheme(userId: string, themeId: string): Promise<void> {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', themeId);
    try {
      localStorage.setItem('app_theme', themeId);
    } catch {
      // safe fallback
    }
  }

  await db.users.update(userId, {
    activeTheme: themeId,
  });
}

/* =========================================================================
 * PHASE 4: THE COLLECTION VAULT (Client-side Canvas Compression & Offline Blob Sync)
 * ========================================================================= */

/**
 * Compress an image file using an HTML5 canvas element to reduce storage footprint
 * and ensure zero-latency offline storage in IndexedDB before Vercel Blob syncing.
 */
export async function compressImageViaCanvas(
  file: File | Blob,
  maxWidth: number = 1000,
  maxHeight: number = 1000,
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // fallback to original base64
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use image/webp when supported, with JPEG fallback
        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData.startsWith('data:image/webp')) {
            resolve(webpData);
            return;
          }
        } catch {
          // fallback to jpeg
        }
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Add a new item to The Collection Vault
 */
export async function createLocalVaultItem(params: {
  userId: string;
  name: string;
  purchasePrice: number;
  category: string;
  photoUrl: string;
  blobKey?: string | null;
  notes?: string;
  acquisitionDate?: string;
  estimatedUses?: number | null;
  currentUses?: number;
}): Promise<LocalVaultItem> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const uses = params.currentUses ?? 1;
  const price = Math.abs(params.purchasePrice);
  const costPerUse = uses > 0 ? Number((price / uses).toFixed(2)) : price;

  const newItem: LocalVaultItem = {
    id,
    userId: params.userId,
    name: params.name.trim(),
    purchasePrice: price,
    category: params.category || 'General',
    photoUrl: params.photoUrl,
    blobKey: params.blobKey || null,
    notes: params.notes?.trim() || undefined,
    acquisitionDate: params.acquisitionDate || now,
    estimatedUses: params.estimatedUses ?? 100,
    currentUses: uses,
    costPerUse,
    syncStatus: 'pending',
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction('rw', db.vaultItems, db.syncQueue, async () => {
    await db.vaultItems.put(newItem);
    await db.syncQueue.add({
      id: crypto.randomUUID(),
      entityType: 'vault_item' as any,
      entityId: id,
      action: 'create',
      payload: newItem,
      attempts: 0,
      createdAt: now,
    });
  });

  // Award EXP for intentional asset tracking
  try {
    await awardUserExp(params.userId, 20, 'Logged Collection Vault item');
  } catch {
    // non-fatal
  }

  return newItem;
}

/**
 * Increment the usage counter for an item in The Collection Vault (lowers cost-per-use)
 */
export async function incrementVaultItemUses(itemId: string): Promise<LocalVaultItem | null> {
  const item = await db.vaultItems.get(itemId);
  if (!item || item.isDeleted) return null;

  const newUses = (item.currentUses || 0) + 1;
  const newCostPerUse = newUses > 0 ? Number((item.purchasePrice / newUses).toFixed(2)) : item.purchasePrice;
  const now = new Date().toISOString();

  const updated: LocalVaultItem = {
    ...item,
    currentUses: newUses,
    costPerUse: newCostPerUse,
    updatedAt: now,
    syncStatus: 'pending',
  };

  await db.transaction('rw', db.vaultItems, db.syncQueue, async () => {
    await db.vaultItems.put(updated);
    await db.syncQueue.add({
      id: crypto.randomUUID(),
      entityType: 'vault_item' as any,
      entityId: itemId,
      action: 'update',
      payload: updated,
      attempts: 0,
      createdAt: now,
    });
  });

  return updated;
}

/**
 * Tombstone soft-delete an item from The Collection Vault
 */
export async function deleteLocalVaultItem(itemId: string): Promise<void> {
  const item = await db.vaultItems.get(itemId);
  if (!item) return;

  const now = new Date().toISOString();
  await db.transaction('rw', db.vaultItems, db.syncQueue, async () => {
    await db.vaultItems.update(itemId, {
      isDeleted: true,
      updatedAt: now,
      syncStatus: 'pending_delete',
    });

    await db.syncQueue.add({
      id: crypto.randomUUID(),
      entityType: 'vault_item' as any,
      entityId: itemId,
      action: 'delete',
      payload: { id: itemId, userId: item.userId },
      attempts: 0,
      createdAt: now,
    });
  });
}

/**
 * Query all non-deleted vault items for a user
 */
export async function getUserVaultItems(userId: string): Promise<LocalVaultItem[]> {
  const items = await db.vaultItems.where('userId').equals(userId).toArray();
  return items.filter((i) => !i.isDeleted).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* =========================================================================
 * PHASE 4: TIMELINE FUNDS (Relational Sinking Funds with Progress Tracking)
 * ========================================================================= */

/**
 * Create a new date-bound sinking fund
 */
export async function createLocalTimelineFund(params: {
  userId: string;
  title: string;
  description?: string;
  icon?: string;
  targetAmount: number;
  targetDate: string; // ISO 8601
  categoryTag?: string;
}): Promise<LocalTimelineFund> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const newFund: LocalTimelineFund = {
    id,
    userId: params.userId,
    title: params.title.trim(),
    description: params.description?.trim() || undefined,
    icon: params.icon || '🎯',
    targetAmount: Math.abs(params.targetAmount),
    currentAmount: 0,
    targetDate: params.targetDate,
    categoryTag: params.categoryTag || 'Goal',
    isCompleted: false,
    syncStatus: 'pending',
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction('rw', db.timelineFunds, db.syncQueue, async () => {
    await db.timelineFunds.put(newFund);
    await db.syncQueue.add({
      id: crypto.randomUUID(),
      entityType: 'timeline_fund' as any,
      entityId: id,
      action: 'create',
      payload: newFund,
      attempts: 0,
      createdAt: now,
    });
  });

  // Award EXP for planning sinking funds
  try {
    await awardUserExp(params.userId, 25, 'Created Timeline Sinking Fund');
  } catch {
    // non-fatal
  }

  return newFund;
}

/**
 * Allocate/Contribute money into a timeline sinking fund
 */
export async function allocateToTimelineFund(params: {
  fundId: string;
  userId: string;
  amount: number;
  source?: 'DIRECT' | 'COMFORT_FUND' | 'TRANSACTION';
  note?: string;
}): Promise<{ fund: LocalTimelineFund; allocation: LocalTimelineAllocation }> {
  const fund = await db.timelineFunds.get(params.fundId);
  if (!fund || fund.isDeleted) {
    throw new Error('Timeline Fund not found');
  }

  const amount = Math.abs(params.amount);
  const newCurrentAmount = Number((fund.currentAmount + amount).toFixed(2));
  const isCompleted = newCurrentAmount >= fund.targetAmount;
  const now = new Date().toISOString();
  const allocationId = crypto.randomUUID();

  const allocation: LocalTimelineAllocation = {
    id: allocationId,
    fundId: params.fundId,
    amount,
    source: params.source || 'DIRECT',
    note: params.note?.trim() || undefined,
    allocatedAt: now,
  };

  const updatedFund: LocalTimelineFund = {
    ...fund,
    currentAmount: newCurrentAmount,
    isCompleted,
    updatedAt: now,
    syncStatus: 'pending',
  };

  await db.transaction('rw', db.timelineFunds, db.timelineAllocations, db.syncQueue, async () => {
    await db.timelineFunds.put(updatedFund);
    await db.timelineAllocations.put(allocation);
    await db.syncQueue.add({
      id: crypto.randomUUID(),
      entityType: 'timeline_fund' as any,
      entityId: fund.id,
      action: 'update',
      payload: updatedFund,
      attempts: 0,
      createdAt: now,
    });
  });

  // Award EXP for allocating to a sinking fund
  try {
    const expGain = isCompleted ? 75 : 15;
    const reason = isCompleted ? 'Completed Timeline Sinking Fund!' : 'Allocated to Sinking Fund';
    await awardUserExp(params.userId, expGain, reason);
  } catch {
    // non-fatal
  }

  return { fund: updatedFund, allocation };
}

/**
 * Query all active timeline funds for a user
 */
export async function getUserTimelineFunds(userId: string): Promise<LocalTimelineFund[]> {
  const funds = await db.timelineFunds.where('userId').equals(userId).toArray();
  return funds.filter((f) => !f.isDeleted).sort((a, b) => a.targetDate.localeCompare(b.targetDate));
}

/**
 * Soft delete a timeline fund
 */
export async function deleteLocalTimelineFund(fundId: string): Promise<void> {
  const fund = await db.timelineFunds.get(fundId);
  if (!fund) return;

  const now = new Date().toISOString();
  await db.transaction('rw', db.timelineFunds, db.syncQueue, async () => {
    await db.timelineFunds.update(fundId, {
      isDeleted: true,
      updatedAt: now,
      syncStatus: 'pending_delete',
    });

    await db.syncQueue.add({
      id: crypto.randomUUID(),
      entityType: 'timeline_fund' as any,
      entityId: fundId,
      action: 'delete',
      payload: { id: fundId, userId: fund.userId },
      attempts: 0,
      createdAt: now,
    });
  });
}

/* =========================================================================
 * PHASE 4: ACCOUNTABILITY MASCOT CONFIGURATION
 * ========================================================================= */

/**
 * Update user's accountability mascot name and/or avatar image
 */
export async function updateUserMascot(
  userId: string,
  mascotName: string,
  avatarUrl?: string | null
): Promise<void> {
  const user = await db.users.get(userId);
  if (!user) return;

  const updateData: Partial<LocalUser> = {
    mascotName: mascotName.trim() || 'Mochi',
  };

  if (avatarUrl !== undefined) {
    updateData.mascotAvatarUrl = avatarUrl;
  }

  await db.users.update(userId, updateData);
}

/**
 * Export all local tables to a serialized JSON string for backup
 */
export async function exportLocalDatabaseToJson(): Promise<string> {
  const [users, categories, transactions, rewards, vaultItems, timelineFunds, timelineAllocations] =
    await Promise.all([
      db.users.toArray(),
      db.categories.toArray(),
      db.transactions.toArray(),
      db.rewards.toArray(),
      db.vaultItems.toArray(),
      db.timelineFunds.toArray(),
      db.timelineAllocations.toArray(),
    ]);

  const backupData = {
    version: 5,
    exportedAt: new Date().toISOString(),
    users,
    categories,
    transactions,
    rewards,
    vaultItems,
    timelineFunds,
    timelineAllocations,
  };

  return JSON.stringify(backupData, null, 2);
}

/**
 * Update user's accountability mascot personality
 */
export async function updateUserMascotPersonality(
  userId: string,
  personality: MascotPersonality
): Promise<void> {
  const user = await db.users.get(userId);
  if (!user) return;

  await db.users.update(userId, {
    mascotPersonality: personality,
  });
}

export interface EmotionalSpendingInsightItem {
  mood: EmotionalMood | 'UNTAGGED';
  label: string;
  emoji: string;
  color: string;
  totalSpent: number;
  transactionCount: number;
  percentage: number;
}

export interface EmotionalSpendingSummary {
  items: EmotionalSpendingInsightItem[];
  totalTrackedExpenses: number;
  totalTaggedExpenses: number;
  dominantMood: EmotionalMood | null;
  dominantMoodPercentage: number;
  topSpendingMood: EmotionalMood | null;
  topSpendingAmount: number;
  behavioralTakeaway: string;
}

export const EMOTIONAL_MOOD_CONFIG: Record<
  EmotionalMood,
  { label: string; emoji: string; color: string; cue: string }
> = {
  BORED: {
    label: 'Boredom',
    emoji: '🥱',
    color: '#94a3b8',
    cue: 'Scrolling or filling empty time with purchases',
  },
  STRESSED: {
    label: 'Stress Relief',
    emoji: '😫',
    color: '#f87171',
    cue: 'Seeking quick dopamine during high-pressure days',
  },
  CELEBRATING: {
    label: 'Celebration',
    emoji: '🥳',
    color: '#fbbf24',
    cue: 'Rewarding personal victories and social highs',
  },
  FOMO: {
    label: 'Social FOMO',
    emoji: '📱',
    color: '#c084fc',
    cue: 'Urge sparked by peers or influencer feeds',
  },
  TREAT_MYSELF: {
    label: 'Treat Myself',
    emoji: '💆',
    color: '#f472b6',
    cue: 'Intentional pampering and personal rejuvenation',
  },
  CALM: {
    label: 'Calm & Grounded',
    emoji: '🧘',
    color: '#34d399',
    cue: 'Clear-headed, planned, and fully aligned spend',
  },
};

/**
 * Calculate emotional spending correlations and behavioral insights
 */
export async function calculateEmotionalSpendingInsights(
  userId: string
): Promise<EmotionalSpendingSummary> {
  const txs = await db.transactions
    .where('userId')
    .equals(userId)
    .filter((t) => !t.isDeleted && t.type === 'EXPENSE' && t.queueStatus !== 'REJECTED')
    .toArray();

  let totalTrackedExpenses = 0;
  let totalTaggedExpenses = 0;

  const moodTotals: Record<string, { total: number; count: number }> = {
    BORED: { total: 0, count: 0 },
    STRESSED: { total: 0, count: 0 },
    CELEBRATING: { total: 0, count: 0 },
    FOMO: { total: 0, count: 0 },
    TREAT_MYSELF: { total: 0, count: 0 },
    CALM: { total: 0, count: 0 },
    UNTAGGED: { total: 0, count: 0 },
  };

  for (const tx of txs) {
    totalTrackedExpenses += tx.amount;
    const moodKey = tx.emotionalMood ? tx.emotionalMood : 'UNTAGGED';
    if (tx.emotionalMood) {
      totalTaggedExpenses += tx.amount;
    }
    if (moodTotals[moodKey]) {
      moodTotals[moodKey].total += tx.amount;
      moodTotals[moodKey].count += 1;
    }
  }

  const items: EmotionalSpendingInsightItem[] = (
    Object.keys(EMOTIONAL_MOOD_CONFIG) as EmotionalMood[]
  ).map((mood) => {
    const data = moodTotals[mood] || { total: 0, count: 0 };
    const percentage =
      totalTrackedExpenses > 0 ? (data.total / totalTrackedExpenses) * 100 : 0;
    return {
      mood,
      label: EMOTIONAL_MOOD_CONFIG[mood].label,
      emoji: EMOTIONAL_MOOD_CONFIG[mood].emoji,
      color: EMOTIONAL_MOOD_CONFIG[mood].color,
      totalSpent: data.total,
      transactionCount: data.count,
      percentage: Math.round(percentage),
    };
  });

  // Sort by total spent descending
  items.sort((a, b) => b.totalSpent - a.totalSpent);

  // Identify dominant mood by frequency and by amount
  let dominantMood: EmotionalMood | null = null;
  let maxCount = 0;
  let topSpendingMood: EmotionalMood | null = null;
  let topSpendingAmount = 0;

  for (const item of items) {
    if (item.transactionCount > maxCount) {
      maxCount = item.transactionCount;
      dominantMood = item.mood as EmotionalMood;
    }
    if (item.totalSpent > topSpendingAmount) {
      topSpendingAmount = item.totalSpent;
      topSpendingMood = item.mood as EmotionalMood;
    }
  }

  const dominantItem = items.find((i) => i.mood === dominantMood);
  const dominantMoodPercentage = dominantItem ? dominantItem.percentage : 0;

  // Generate encouraging, behavioral takeaway
  let behavioralTakeaway = 'Log emotional tags on transactions to uncover subconscious spending triggers.';
  if (dominantMood === 'BORED' && dominantMoodPercentage > 15) {
    behavioralTakeaway = `${dominantMoodPercentage}% of your spending happens when feeling bored. Try queuing these in The Cooling-Off Queue first!`;
  } else if (dominantMood === 'STRESSED' && dominantMoodPercentage > 15) {
    behavioralTakeaway = `Stress triggers ${dominantMoodPercentage}% of purchases. When feeling overwhelmed, consider using the Comfort Fund allowance or asking your mascot for a 3-breath pause.`;
  } else if (dominantMood === 'FOMO' && dominantMoodPercentage > 15) {
    behavioralTakeaway = `Social FOMO drove ${dominantMoodPercentage}% of spending. Remember: what others showcase is curated, while your financial freedom is permanent.`;
  } else if (dominantMood === 'CALM') {
    behavioralTakeaway = 'You make the majority of your purchases with a calm, grounded mindset. Outstanding financial discipline!';
  } else if (dominantMood === 'CELEBRATING') {
    behavioralTakeaway = 'Celebratory moments are your main spend driver. Enjoy victories guilt-free while letting automated sinking funds handle the rest!';
  } else if (dominantMood === 'TREAT_MYSELF') {
    behavioralTakeaway = 'Mindful self-care is healthy. Aligning treats with earned spinner tickets keeps spending celebratory and bounded.';
  }

  return {
    items,
    totalTrackedExpenses,
    totalTaggedExpenses,
    dominantMood,
    dominantMoodPercentage,
    topSpendingMood,
    topSpendingAmount,
    behavioralTakeaway,
  };
}


