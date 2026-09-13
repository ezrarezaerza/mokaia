"use client";

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDefaultCategories, createLocalTransaction } from './lib/db';
import { AuthService } from './lib/auth';
import { syncEngine, type SyncEngineStatus } from './lib/syncEngine';
import type { LocalUser, LocalTransaction } from './types';
import { CurrencyProvider } from './context/CurrencyContext';
import { LanguageProvider } from './context/LanguageContext';

// Components
import { DashboardHeader } from './components/DashboardHeader';
import { SettingsModal } from './components/SettingsModal';
import { MetricsOverview } from './components/MetricsOverview';
import { TransactionList } from './components/TransactionList';
import { QuickAddBottomSheet } from './components/QuickAddBottomSheet';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { FAB } from './components/FAB';
import { AuthModal } from './components/AuthModal';
import { OfflineBanner } from './components/OfflineBanner';
import { CoolingOffQueue } from './components/CoolingOffQueue';
import { ComfortFundCard } from './components/ComfortFundCard';
import { CostPerUseVisualizerModal } from './components/CostPerUseVisualizerModal';
import { ProgressionBanner } from './components/ProgressionBanner';
import { RewardSpinner } from './components/RewardSpinner';
import { RewardWalletModal } from './components/RewardWalletModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { LevelUpCelebrationModal } from './components/LevelUpCelebrationModal';
import { CollectionVault } from './components/CollectionVault';
import { TimelineFunds } from './components/TimelineFunds';
import { AccountabilityMascot } from './components/AccountabilityMascot';
import { MilestoneShareModal } from './components/MilestoneShareModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { DebtCommandCenter } from './components/DebtCommandCenter';
import {
  checkAndUpdateStreak,
  setUserActiveTheme,
  acknowledgeUserLevelCelebration,
  seedDemoDebtsIfEmpty,
} from './lib/db';
import { seedIndonesianDemoData } from './lib/seedDemoData';
import type { LocalTimelineFund, LocalVaultItem, MascotEvaluationInput, LocalDebt } from './types';
import {
  Sparkles,
  Tag,
  Clock,
  HeartHandshake,
  Calculator,
  LayoutDashboard,
  Ticket,
  Package,
  Target,
  Flame,
  ArrowRight,
  CreditCard,
} from 'lucide-react';

// Helper to retrieve and initialize acknowledged celebrated level to prevent modal loops on reload
function getStoredCelebratedLevel(userId?: string, currentLevel: number = 1, userRecordLevel?: number): number {
  if (!userId || typeof window === 'undefined') return currentLevel;
  try {
    const stored = localStorage.getItem(`mokaia_celebrated_level_${userId}`);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return Math.max(parsed, userRecordLevel ?? 0);
      }
    }
  } catch {
    // fallback
  }

  // If userRecordLevel exists, prioritize it
  if (userRecordLevel && userRecordLevel > 0) {
    try {
      localStorage.setItem(`mokaia_celebrated_level_${userId}`, String(userRecordLevel));
    } catch {}
    return userRecordLevel;
  }

  // If this is an existing user loaded for the first time with this fix,
  // record their current level as already celebrated so it never loops on refresh!
  try {
    localStorage.setItem(`mokaia_celebrated_level_${userId}`, String(currentLevel));
  } catch {}
  return currentLevel;
}

export default function App() {
  // Session & User - Synchronously read from offline cache to prevent flash of null user
  const [user, setUser] = useState<LocalUser | null>(() => AuthService.getCachedSession().user);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // View Navigation (Phase 2, Phase 3, Phase 4, Phase 5)
  const [activeTab, setActiveTab] = useState<'ledger' | 'cooling_off' | 'comfort_fund' | 'spinner' | 'wallet' | 'vault' | 'timeline' | 'debts'>('ledger');
  const [isCostPerUseModalOpen, setIsCostPerUseModalOpen] = useState(false);

  // Phase 3 Modal States & Persistent Level-Up State
  const [isSpinnerModalOpen, setIsSpinnerModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Initialize celebrated level tracking from persistent storage
  const initialCelebratedLevel = user?.id
    ? getStoredCelebratedLevel(user.id, user.level ?? 1, user.lastCelebratedLevel)
    : 1;
  const celebratedLevelRef = React.useRef<number>(initialCelebratedLevel);
  const [celebratedLevel, setCelebratedLevel] = useState<number>(initialCelebratedLevel);
  const [isLevelUpModalOpen, setIsLevelUpModalOpen] = useState(false);
  const [streakNotice, setStreakNotice] = useState<string | null>(null);

  // Phase 4: Milestone Share Card Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalType, setShareModalType] = useState<'STREAK' | 'IMPULSE_RESISTED' | 'RANK_UP' | 'FUND_COMPLETED' | 'VAULT_ITEM' | 'DEBT_CONQUERED'>('STREAK');
  const [shareExtraData, setShareExtraData] = useState<{
    fund?: LocalTimelineFund;
    vaultItem?: LocalVaultItem;
    debt?: LocalDebt;
    savedAmount?: number;
    streak?: number;
  }>({});

  // Sync Engine State
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus>({
    isOnline: true,
    isSimulatedOffline: false,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    lastError: null,
  });

  // Modal / Bottom Sheet States
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<LocalTransaction | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // 1. Initialize session from offline cache & trigger pull hydration
  useEffect(() => {
    const session = AuthService.getCachedSession();
    if (session.user) {
      setUser(session.user);
      seedDefaultCategories(session.user.id).then(async () => {
        // Seed rich, localized Indonesian demo data (debts, vault, funds, transactions)
        await seedIndonesianDemoData(session.user.id).catch(() => {});
        // Bi-Directional Hydration: Pull latest remote updates from Postgres
        syncEngine.sync().catch(() => {});
      });
    } else {
      setIsAuthModalOpen(true);
    }

    // Subscribe to Sync Engine
    const unsubscribe = syncEngine.subscribe((status) => {
      setSyncStatus(status);
    });

    // PWA Launcher Shortcuts handling (?action=quick-add | queue | spinner)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action === 'quick-add') {
        setIsQuickAddOpen(true);
      } else if (action === 'queue') {
        setActiveTab('cooling_off');
      } else if (action === 'spinner') {
        setActiveTab('spinner');
      }

      // Clean URL parameter without reloading to maintain clean address
      if (action) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
    }

    return () => unsubscribe();
  }, []);

  // 2. Reactive Live Queries from Dexie.js (Optimistic UI - Zero Latency)
  // Active transactions (excluding soft tombstones)
  const rawTransactions = useLiveQuery(
    async () => {
      if (!user) return [];
      const txs = await db.transactions
        .where('userId')
        .equals(user.id)
        .reverse()
        .sortBy('date');
      return (txs || []).filter((t) => !t.isDeleted);
    },
    [user?.id],
    []
  );
  const transactions = rawTransactions || [];

  // Pending queue tracking (including pending creates, updates, and pending tombstones)
  const rawPending = useLiveQuery(
    async () => {
      if (!user) return [];
      return await db.transactions
        .where('userId')
        .equals(user.id)
        .filter((tx) => tx.syncStatus === 'pending' || tx.syncStatus === 'pending_delete')
        .toArray();
    },
    [user?.id],
    []
  );
  const pendingTransactions = rawPending || [];

  // Categories query
  const rawCategories = useLiveQuery(
    async () => {
      if (!user) return [];
      return await db.categories
        .where('userId')
        .equals(user.id)
        .toArray();
    },
    [user?.id],
    []
  );
  const categories = rawCategories || [];

  // Debts & Liabilities query (Phase 5)
  const rawDebts = useLiveQuery(
    async () => {
      if (!user) return [];
      const list = await db.debts
        .where('userId')
        .equals(user.id)
        .toArray();
      return (list || []).filter((d) => !d.isDeleted);
    },
    [user?.id],
    []
  );
  const debts = rawDebts || [];

  // Reactive User Profile (reflects Comfort Fund unlock state, balance & allowance in Dexie)
  const liveUser = useLiveQuery(
    async () => {
      if (!user) return null;
      const dbUser = await db.users.get(user.id);
      return dbUser || user;
    },
    [user?.id],
    user
  );

  const currentUser = liveUser || user;

  // Phase 3: Active Theme Synchronization
  useEffect(() => {
    const theme = currentUser?.activeTheme || 'cyber_slate';
    document.documentElement.setAttribute('data-theme', theme);
  }, [currentUser?.activeTheme]);

  // Phase 3: Timezone-Aware Calendar Streak Evaluation
  useEffect(() => {
    if (!currentUser?.id) return;
    checkAndUpdateStreak(currentUser.id)
      .then((res) => {
        if (res.shieldConsumed) {
          setStreakNotice(`🛡️ Grace Day Shield Consumed! Your ${res.newStreak}-day streak was preserved.`);
        } else if (res.isConsecutiveDay) {
          setStreakNotice(`🔥 Streak Continued! You've logged in ${res.newStreak} days in a row.`);
        }
      })
      .catch(() => {});
  }, [currentUser?.id]);

  // Keep celebratedLevelRef synchronized when user changes or liveUser loads from Dexie
  useEffect(() => {
    if (!currentUser?.id) return;
    const stored = getStoredCelebratedLevel(
      currentUser.id,
      currentUser.level ?? 1,
      currentUser.lastCelebratedLevel
    );
    if (stored > celebratedLevelRef.current) {
      celebratedLevelRef.current = stored;
      setCelebratedLevel(stored);
    }
  }, [currentUser?.id, currentUser?.lastCelebratedLevel]);

  // Phase 3: Dynamic Level-Up Detection (Triggers ONLY upon genuine upward level progression)
  useEffect(() => {
    if (!currentUser?.id || !currentUser?.level) return;

    if (currentUser.level > celebratedLevelRef.current) {
      const newLvl = currentUser.level;
      celebratedLevelRef.current = newLvl;
      setCelebratedLevel(newLvl);
      setIsLevelUpModalOpen(true);
      // Immediately acknowledge to persistent storage so subsequent reloads never repeat it
      acknowledgeUserLevelCelebration(currentUser.id, newLvl);
    }
  }, [currentUser?.id, currentUser?.level]);

  // Handlers for Level-Up Celebration Modal actions
  const handleCloseCelebration = () => {
    if (currentUser?.id) {
      acknowledgeUserLevelCelebration(currentUser.id, celebratedLevel);
    }
    setIsLevelUpModalOpen(false);
  };

  const handleOpenThemesFromCelebration = () => {
    if (currentUser?.id) {
      acknowledgeUserLevelCelebration(currentUser.id, celebratedLevel);
    }
    setIsLevelUpModalOpen(false);
    setIsThemeModalOpen(true);
  };

  const handleOpenSpinnerFromCelebration = () => {
    if (currentUser?.id) {
      acknowledgeUserLevelCelebration(currentUser.id, celebratedLevel);
    }
    setIsLevelUpModalOpen(false);
    setActiveTab('spinner');
  };

  // Handlers
  const handleAuthSuccess = (authenticatedUser: LocalUser) => {
    setUser(authenticatedUser);
    const stored = getStoredCelebratedLevel(
      authenticatedUser.id,
      authenticatedUser.level ?? 1,
      authenticatedUser.lastCelebratedLevel
    );
    celebratedLevelRef.current = stored;
    setCelebratedLevel(stored);
    setIsLevelUpModalOpen(false);
    setIsAuthModalOpen(false);
    seedDefaultCategories(authenticatedUser.id).then(async () => {
      await seedIndonesianDemoData(authenticatedUser.id).catch(() => {});
      syncEngine.sync().catch(() => {});
    });
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setUser(null);
    celebratedLevelRef.current = 1;
    setIsLevelUpModalOpen(false);
    setIsAuthModalOpen(true);
  };

  const handleTriggerSync = async () => {
    await syncEngine.sync();
  };

  const handleToggleSimulatedOffline = (simulated: boolean) => {
    syncEngine.setSimulatedOffline(simulated);
  };

  const handleOpenCreate = () => {
    setTransactionToEdit(null);
    setIsQuickAddOpen(true);
  };

  const handleEditTransaction = (tx: LocalTransaction) => {
    setTransactionToEdit(tx);
    setIsQuickAddOpen(true);
  };

  // Seed rich Indonesian demo data across all features
  const handleSeedDemoData = async () => {
    if (!user) return;
    await seedIndonesianDemoData(user.id, true);
    await syncEngine.sync().catch(() => {});
  };

  return (
    <LanguageProvider activeUserId={(currentUser || user)?.id}>
      <CurrencyProvider activeUserId={(currentUser || user)?.id}>
        <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col font-sans pb-[calc(max(1.5rem,env(safe-area-inset-bottom))+5rem)] sm:pb-24 selection:bg-blue-500/30 overflow-x-hidden">
        {/* Offline Alert Banner */}
      <OfflineBanner
        isOffline={!syncStatus.isOnline}
        isSimulated={syncStatus.isSimulatedOffline}
        pendingCount={syncStatus.pendingCount}
      />

      {/* Main Header */}
      <DashboardHeader
        user={currentUser || user}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* PWA Non-Intrusive Install Banner */}
      <PWAInstallBanner onOpenSettings={() => setIsSettingsModalOpen(true)} />

      {/* Dashboard Single Center Layout (Phase B - Option 2) */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-4 pb-28 sm:py-6">
        <main className="w-full space-y-6">
          {/* Phase 3: Live Progression & Ranks HUD Banner */}
          {user && (
            <ProgressionBanner
              user={currentUser || user}
              onOpenSpinner={() => setActiveTab('spinner')}
              onOpenWallet={() => setIsWalletModalOpen(true)}
              onOpenThemes={() => setIsThemeModalOpen(true)}
            />
          )}

          {/* Phase 4: Accountability Mascot Component (Dynamic Psychological State) */}
          {user && (
            <AccountabilityMascot
              user={currentUser || user}
              metrics={{
                currentStreak: currentUser?.currentStreak ?? 0,
                graceDaysRemaining: currentUser?.graceDays ?? 1,
                coolingOffPendingCount: transactions.filter((t) => t.queueStatus === 'LOCKED').length,
                coolingOffRejectedCount: transactions.filter(
                  (t) => t.queueStatus === 'CANCELLED' || t.queueStatus === 'REJECTED'
                ).length,
                coolingOffApprovedCount: transactions.filter((t) => t.queueStatus === 'PURCHASED').length,
                comfortFundRemaining: currentUser?.comfortFundRemaining ?? 50.0,
                comfortFundAllowance: currentUser?.comfortFundAllowance ?? 50.0,
                monthlyExpense: transactions
                  .filter((t) => t.type === 'EXPENSE' && t.queueStatus !== 'LOCKED' && !t.isDeleted)
                  .reduce((sum, t) => sum + t.amount, 0),
                burnRatePercentage: 45,
              }}
              onOpenCoolingOff={() => setActiveTab('cooling_off')}
              onOpenComfortFund={() => setActiveTab('comfort_fund')}
              onOpenShareCard={() => {
                setShareModalType('IMPULSE_RESISTED');
                setShareExtraData({});
                setIsShareModalOpen(true);
              }}
            />
          )}

          {/* Timezone-Aware Daily Streak Notice */}
          {streakNotice && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-slate-900 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200 shadow-sm">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400 shrink-0" />
                <span>{streakNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setStreakNotice(null)}
                className="text-[11px] font-semibold text-slate-400 hover:text-white px-2 py-0.5 rounded-lg hover:bg-slate-800 transition shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Top View Selector Tabs (Desktop / Tablet only; mobile uses bottom dock) */}
          <div className="hidden sm:flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 overflow-x-auto scrollbar-none touch-scroll-x">
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`flex-1 min-w-[105px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Transactions</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('vault')}
              className={`flex-1 min-w-[115px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'vault'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                  : 'text-indigo-300/80 hover:text-indigo-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Vault</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 min-w-[115px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'timeline'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-950'
                  : 'text-sky-300/80 hover:text-sky-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Timeline</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cooling_off')}
              className={`flex-1 min-w-[115px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'cooling_off'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/50'
                  : 'text-amber-300/80 hover:text-amber-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Cooling-Off</span>
              {transactions.filter((t) => t.queueStatus === 'LOCKED').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('comfort_fund')}
              className={`flex-1 min-w-[115px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'comfort_fund'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-emerald-300/80 hover:text-emerald-200'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Comfort Fund</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('spinner')}
              className={`flex-1 min-w-[115px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'spinner'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-950/50'
                  : 'text-amber-400/90 hover:text-amber-200'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Spinner ({currentUser?.spinnerTickets ?? 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('debts')}
              className={`flex-1 min-w-[115px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'debts'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                  : 'text-purple-300/80 hover:text-purple-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Debts</span>
              {debts.filter((d) => d.status === 'ACTIVE').length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-purple-400/30 text-purple-200 font-mono text-[10px]">
                  {debts.filter((d) => d.status === 'ACTIVE').length}
                </span>
              )}
            </button>
          </div>

          {/* Mindful Financial Health Strip */}
          <div className="px-4 py-2.5 rounded-2xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span>
                <strong className="text-white">Mindful Money:</strong> Zero-guilt spending with active impulse guardrails
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Active Guardrails
              </span>
            </div>
          </div>

          {/* Conditional View Rendering */}
          {activeTab === 'vault' && user && (
            <div className="space-y-4">
              <CollectionVault
                user={currentUser || user}
                onOpenShareCard={(vaultItem) => {
                  setShareModalType('VAULT_ITEM');
                  setShareExtraData({ vaultItem });
                  setIsShareModalOpen(true);
                }}
              />
            </div>
          )}

          {activeTab === 'timeline' && user && (
            <div className="space-y-4">
              <TimelineFunds
                user={currentUser || user}
                onOpenShareCard={(fund) => {
                  setShareModalType('FUND_COMPLETED');
                  setShareExtraData({ fund });
                  setIsShareModalOpen(true);
                }}
              />
            </div>
          )}

          {activeTab === 'spinner' && user && (
            <div className="space-y-4">
              <RewardSpinner
                user={currentUser || user}
                onOpenWallet={() => setIsWalletModalOpen(true)}
              />
            </div>
          )}

          {activeTab === 'cooling_off' && user && (
            <div className="space-y-4">
              <CoolingOffQueue
                userId={user.id}
                transactions={transactions}
                categories={categories}
                mascotName={currentUser?.mascotName || user.mascotName || 'Mochi'}
                mascotEmoji={currentUser?.mascotAvatarUrl ? undefined : '🐱'}
                mascotPersonality={currentUser?.mascotPersonality || user.mascotPersonality || 'zen'}
                onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                onAddImpulse={() => setIsQuickAddOpen(true)}
                onOpenSpinner={() => setActiveTab('spinner')}
              />
            </div>
          )}

          {activeTab === 'comfort_fund' && user && (
            <div className="space-y-4">
              <ComfortFundCard
                user={currentUser || user}
                onLogComfortPurchase={() => {
                  setIsQuickAddOpen(true);
                }}
              />
            </div>
          )}

          {activeTab === 'debts' && user && (
            <div className="space-y-4">
              <DebtCommandCenter
                user={currentUser || user}
                debts={debts}
                categories={categories}
                onRefreshDebts={async () => {
                  // Dexie useLiveQuery automatically updates reactively
                }}
                onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                onOpenShareCard={(debt) => {
                  setShareModalType('DEBT_CONQUERED');
                  setShareExtraData({ debt });
                  setIsShareModalOpen(true);
                }}
                onOpenSpinner={() => setActiveTab('spinner')}
              />
            </div>
          )}

          {activeTab === 'ledger' && (
            <div className="space-y-6">
              {/* Financial Metrics & Dexie Local Aggregations */}
              {user && (
                <MetricsOverview
                  userId={user.id}
                  transactions={transactions}
                  categories={categories}
                  pendingSyncCount={syncStatus.pendingCount}
                  monthlyBudget={currentUser?.monthlyBudget ?? 2500}
                  spinnerTickets={currentUser?.spinnerTickets ?? 0}
                  mascotName={currentUser?.mascotName || user.mascotName || 'Mochi'}
                  onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                  onOpenSpinner={() => setActiveTab('spinner')}
                />
              )}

              {/* Demo Data Seeder (If transactions are empty) */}
              {transactions.length === 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs mb-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Quick Setup</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Populate initial sample records to explore cash flow trends, burn rate velocity, and mindful spending tags.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSeedDemoData}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-blue-950"
                  >
                    <span>Seed Demo Data</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Transaction History & Live Feed */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white tracking-tight uppercase">
                    Recent Activity
                  </h2>
                  <span className="text-[10px] font-mono font-semibold text-blue-400 uppercase tracking-wider">
                    {transactions.filter((t) => t.queueStatus !== 'LOCKED').length} Active Records
                  </span>
                </div>

                <TransactionList
                  transactions={transactions.filter((t) => t.queueStatus !== 'LOCKED')}
                  categories={categories}
                  onEditTransaction={handleEditTransaction}
                />
              </section>
            </div>
          )}
        </main>
      </div>

      {/* Mobile-First Bottom Navigation Dock */}
      {user && (
        <MobileBottomNav
          activeTab={activeTab}
          onChangeTab={(tab) => setActiveTab(tab)}
          onOpenCreate={handleOpenCreate}
          coolingOffCount={transactions.filter((t) => t.queueStatus === 'LOCKED').length}
          spinnerTickets={currentUser?.spinnerTickets ?? 0}
        />
      )}

      {/* Floating Action Button (FAB) for < 3s Frictionless Logging */}
      {user && (
        <FAB onClick={handleOpenCreate} />
      )}

      {/* Quick Add / Edit Bottom Sheet */}
      {user && (
        <QuickAddBottomSheet
          isOpen={isQuickAddOpen}
          onClose={() => {
            setIsQuickAddOpen(false);
            setTransactionToEdit(null);
          }}
          userId={user.id}
          categories={categories}
          transactionToEdit={transactionToEdit}
          comfortFundRemaining={currentUser?.comfortFundRemaining ?? 50.0}
          comfortFundUnlocked={currentUser?.comfortFundUnlocked ?? false}
          onUnlockComfortFund={async () => {
            if (user) {
              await db.users.update(user.id, { comfortFundUnlocked: true });
            }
          }}
        />
      )}

      {/* Standalone Cost-Per-Use Visualizer Modal */}
      <CostPerUseVisualizerModal
        isOpen={isCostPerUseModalOpen}
        onClose={() => setIsCostPerUseModalOpen(false)}
        initialAmount={249.99}
        initialDescription="AirPods Max / Ergonomic Chair"
        onApplyCalculation={(_cpu, _uses) => {
          setIsCostPerUseModalOpen(false);
          setIsQuickAddOpen(true);
        }}
        onSendToCoolingOff={async (coolingHours, cpu, uses, itemPrice, itemDesc) => {
          if (!user) return;
          const defaultCat = categories.find((c) => !c.isDeleted) || { id: 'default' };
          const nowUtc = new Date().toISOString();
          const unlockTime = new Date(Date.now() + coolingHours * 3600 * 1000).toISOString();
          await createLocalTransaction({
            userId: user.id,
            categoryId: defaultCat.id,
            amount: itemPrice ?? 249.99,
            type: 'EXPENSE',
            date: nowUtc,
            description: itemDesc || 'Prospective Impulse Buy',
            queueStatus: 'LOCKED',
            lockedUntil: unlockTime,
            costPerUse: cpu,
            estimatedUses: uses,
            mindfulTag: 'WANT',
          });
          setIsCostPerUseModalOpen(false);
          setActiveTab('cooling_off');
        }}
      />

      {/* Category Manager Modal */}
      {user && (
        <CategoryManagerModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          userId={user.id}
          categories={categories}
        />
      )}

      {/* Auth Modal (Offline & Online Credentials) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        isOffline={!syncStatus.isOnline}
        onSuccess={handleAuthSuccess}
      />

      {/* Phase 3: The Reward Wallet Modal */}
      <RewardWalletModal
        isOpen={isWalletModalOpen}
        user={currentUser || user}
        onClose={() => setIsWalletModalOpen(false)}
        onOpenSpinner={() => {
          setIsWalletModalOpen(false);
          setActiveTab('spinner');
        }}
      />

      {/* Phase 3: Unlockable Themes Modal */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        user={currentUser || user}
        onClose={() => setIsThemeModalOpen(false)}
      />

      {/* Phase 3: Level-Up Celebration Modal */}
      <LevelUpCelebrationModal
        isOpen={isLevelUpModalOpen}
        newLevel={celebratedLevel}
        onClose={handleCloseCelebration}
        onOpenThemes={handleOpenThemesFromCelebration}
        onOpenSpinner={handleOpenSpinnerFromCelebration}
      />

      {/* Dedicated Settings & Cloud Sync Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        user={currentUser || user}
        syncStatus={syncStatus}
        onTriggerSync={handleTriggerSync}
        onToggleSimulatedOffline={handleToggleSimulatedOffline}
        onOpenCategories={() => setIsCategoryModalOpen(true)}
        onOpenCostPerUse={() => setIsCostPerUseModalOpen(true)}
        onOpenShareCard={() => {
          setShareModalType('STREAK');
          setShareExtraData({});
          setIsShareModalOpen(true);
        }}
        onOpenThemes={() => setIsThemeModalOpen(true)}
        onLogout={handleLogout}
        transactionsCount={transactions.length}
      />

      {/* Phase 4: Milestone Share Card Generator Modal (html-to-image) */}
      {(currentUser || user) && (
        <MilestoneShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          user={currentUser || user}
          defaultType={shareModalType}
          extraData={shareExtraData}
        />
      )}
      </div>
    </CurrencyProvider>
  </LanguageProvider>
);
}
