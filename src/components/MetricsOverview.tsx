"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  PieChart,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  Activity,
  Smile,
  HeartHandshake,
  Lightbulb,
} from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  getDate,
  parseISO,
  format,
} from 'date-fns';
import type {
  LocalCategory,
  LocalTransaction,
  CategoryBreakdownItem,
  MonthlyBurnRateStats,
  EmotionalMood,
} from '../types';
import {
  calculateEmotionalSpendingInsights,
  type EmotionalSpendingSummary,
  EMOTIONAL_MOOD_CONFIG,
} from '../lib/db';
import { CumulativeBurnRateChart } from './analytics/CumulativeBurnRateChart';
import { SafeDailyAllowanceCard } from './analytics/SafeDailyAllowanceCard';
import { EmotionalDeepDiveView } from './analytics/EmotionalDeepDiveView';
import { useCurrency } from '../context/CurrencyContext';
import { useTranslation } from '../context/LanguageContext';

interface MetricsOverviewProps {
  userId: string;
  transactions: LocalTransaction[];
  categories: LocalCategory[];
  pendingSyncCount?: number;
  monthlyBudget?: number;
  spinnerTickets?: number;
  mascotName?: string;
  onOpenQuickAdd?: () => void;
  onOpenSpinner?: () => void;
  onOpenMascotChat?: () => void;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  userId,
  transactions = [],
  categories = [],
  pendingSyncCount = 0,
  monthlyBudget = 2500,
  spinnerTickets = 0,
  mascotName = 'Mochi',
  onOpenQuickAdd,
  onOpenSpinner,
  onOpenMascotChat,
}) => {
  const { format: formatMoney, symbol } = useCurrency();
  const { t, language } = useTranslation();
  const [showFullBreakdown, setShowFullBreakdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'BURN_RATE' | 'EMOTIONAL' | 'CATEGORIES'>('BURN_RATE');
  const [isBalanceMasked, setIsBalanceMasked] = useState(false);
  const [emotionalSummary, setEmotionalSummary] = useState<EmotionalSpendingSummary | null>(null);

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  // Filter out deleted transactions
  const activeTxs = safeTransactions.filter((tx) => !tx.isDeleted);

  // Compute Emotional Insights dynamically
  useEffect(() => {
    let isMounted = true;
    calculateEmotionalSpendingInsights(userId)
      .then((res) => {
        if (isMounted) setEmotionalSummary(res);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [userId, activeTxs]);

  // Compute Local Aggregations synchronously using active dataset
  const { totalIncome, totalExpenses, netBalance } = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const tx of activeTxs) {
      // In the cooling-off queue or pending review, exclude from finalized active balance
      if (tx.queueStatus === 'LOCKED' || tx.queueStatus === 'REJECTED') continue;

      if (tx.type === 'INCOME') {
        income += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        expense += tx.amount;
      }
    }

    return {
      totalIncome: income,
      totalExpenses: expense,
      netBalance: income - expense,
    };
  }, [activeTxs]);

  // Compute Category breakdown with memoization
  const categoryBreakdown: CategoryBreakdownItem[] = useMemo(() => {
    const catMap = new Map<string, LocalCategory>();
    for (const c of safeCategories) {
      if (!c.isDeleted) {
        catMap.set(c.id, c);
      }
    }

    const categoryTotals = new Map<
      string,
      { total: number; count: number; cat: LocalCategory }
    >();

    let totalExpense = 0;

    for (const tx of activeTxs) {
      if (
        tx.type !== 'EXPENSE' ||
        tx.queueStatus === 'LOCKED' ||
        tx.queueStatus === 'REJECTED'
      )
        continue;
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

    return breakdown.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [activeTxs, safeCategories, userId]);

  // Compute Monthly Burn Rate & Velocity
  const burnRateStats: MonthlyBurnRateStats = useMemo(() => {
    const targetDate = new Date();
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

    for (const tx of activeTxs) {
      if (
        tx.type !== 'EXPENSE' ||
        tx.queueStatus === 'LOCKED' ||
        tx.queueStatus === 'REJECTED'
      )
        continue;

      try {
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
      } catch {
        // Safe fallback for irregular date formats
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
  }, [activeTxs]);

  const formatCurrency = (val: number) => {
    if (isBalanceMasked) return '••••••';
    return formatMoney(val);
  };

  const netFlow = totalIncome - totalExpenses;
  const isNetPositive = netFlow >= 0;

  return (
    <div className="space-y-4">
      {/* 1. Primary Hero Balance Card (Fintech Obsidian Aesthetic) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        id="primary-hero-balance-card"
        className="relative overflow-hidden bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl"
      >
        {/* Subtle Ambient Radial Lighting & Top Highlight Glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header */}
        <div className="relative z-10 flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Wallet className="w-4 h-4" />
            </div>
            <p className="text-slate-300 text-xs font-mono uppercase tracking-wider font-bold">
              {t('dashboard.balance')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Privacy balance mask toggle */}
            <button
              type="button"
              onClick={() => setIsBalanceMasked(!isBalanceMasked)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
              title={isBalanceMasked ? 'Show Balance' : 'Hide Balance'}
              aria-label={isBalanceMasked ? 'Show Balance' : 'Hide Balance'}
            >
              {isBalanceMasked ? (
                <EyeOff className="w-4 h-4 text-slate-400" />
              ) : (
                <Eye className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Active Ledger Status Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[10px] font-mono text-slate-300 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t('dashboard.activeLedger')}</span>
            </div>
          </div>
        </div>

        {/* Big Crisp Typography Balance */}
        <div className="relative z-10 my-4">
          <h3 className="text-3xl sm:text-5xl font-black tracking-tight text-white font-mono">
            {formatCurrency(netBalance)}
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1.5">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isNetPositive ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
            <span>
              {isNetPositive ? t('dashboard.healthySurplus') : t('dashboard.deficitDetected')}
            </span>
          </p>
        </div>

        {/* Sub-metrics Grid (Structured 4-Card Slot System) */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80">
          {/* 1. Total Inflow */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/60 transition">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                <ArrowDownLeft className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-mono tracking-wider font-semibold">
                {t('dashboard.income')}
              </span>
            </div>
            <p className="text-base sm:text-lg font-bold text-slate-100 font-mono">
              {formatCurrency(totalIncome)}
            </p>
            <span className="text-[10px] text-emerald-400/80 font-medium mt-0.5 block">
              {t('dashboard.incomeSubtitle')}
            </span>
          </div>

          {/* 2. Total Outflow */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/60 transition">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="p-1 rounded-lg bg-rose-500/10 text-rose-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-mono tracking-wider font-semibold">
                {t('dashboard.expense')}
              </span>
            </div>
            <p className="text-base sm:text-lg font-bold text-slate-100 font-mono">
              {formatCurrency(totalExpenses)}
            </p>
            <span className="text-[10px] text-rose-400/80 font-medium mt-0.5 block">
              {t('dashboard.expenseSubtitle')}
            </span>
          </div>

          {/* 3. Daily Burn Rate */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/60 transition">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="p-1 rounded-lg bg-amber-500/10 text-amber-400">
                <Flame className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-mono tracking-wider font-semibold">
                {t('dashboard.dailyBurn')}
              </span>
            </div>
            <p className="text-base sm:text-lg font-bold text-slate-100 font-mono">
              {formatCurrency(burnRateStats.dailyBurnRate)}
              <span className="text-[10px] font-normal text-slate-400 font-sans ml-0.5">/{language === 'id' ? 'hr' : 'd'}</span>
            </p>
            <span className="text-[10px] text-amber-400/80 font-medium mt-0.5 block">
              {t('dashboard.monthlyPace')}
            </span>
          </div>

          {/* 4. Net Flow */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/60 transition">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div
                className={`p-1 rounded-lg ${
                  isNetPositive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-rose-500/10 text-rose-400'
                }`}
              >
                {isNetPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-mono tracking-wider font-semibold">
                {t('dashboard.netCashFlow')}
              </span>
            </div>
            <p
              className={`text-base sm:text-lg font-bold font-mono ${
                isNetPositive ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {isNetPositive ? '+' : ''}
              {formatCurrency(netFlow)}
            </p>
            <span
              className={`text-[10px] font-medium mt-0.5 block ${
                isNetPositive ? 'text-emerald-400/80' : 'text-rose-400/80'
              }`}
            >
              {isNetPositive ? t('dashboard.netSurplus') : t('dashboard.netDeficit')}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 2. Spending Insights & Velocity Section */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-slate-200 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400">
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-200">
              {language === 'id' ? 'Kecepatan & Wawasan Belanja' : 'Spending Velocity & Insights'}
            </span>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('BURN_RATE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'BURN_RATE'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>{language === 'id' ? 'Bakar & Ritme' : 'Burn & Pacing'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('EMOTIONAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'EMOTIONAL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smile className="w-3.5 h-3.5 text-pink-400" />
              <span>{language === 'id' ? 'Analisis Emosional' : 'Emotional Deep Dive'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CATEGORIES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'CATEGORIES'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PieChart className="w-3.5 h-3.5 text-blue-400" />
              <span>{language === 'id' ? 'Tag Gaya Hidup' : 'Lifestyle Tags'} ({categoryBreakdown.length})</span>
            </button>
          </div>
        </div>

        {activeTab === 'BURN_RATE' ? (
          <div className="mt-4 space-y-4">
            {/* Phase 3.1: Safe Daily Allowance Card */}
            <SafeDailyAllowanceCard
              transactions={activeTxs}
              monthlyTargetBudget={monthlyBudget}
              currency={symbol}
              isMasked={isBalanceMasked}
              onOpenQuickAdd={onOpenQuickAdd}
            />

            {/* Phase 3.1: Cumulative Burn-Rate & Pacing Area Chart */}
            <CumulativeBurnRateChart
              transactions={activeTxs}
              monthlyBudget={monthlyBudget}
              currency={symbol}
              isMasked={isBalanceMasked}
            />

            {/* Collapsible Month Velocity Context */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowFullBreakdown(!showFullBreakdown)}
                className="w-full py-2 px-3 rounded-2xl bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/40 text-slate-300 text-xs font-bold flex items-center justify-between transition cursor-pointer"
              >
                <span>Mindful Intent Ratio Strip & Month Baseline</span>
                {showFullBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showFullBreakdown && (
                <div className="mt-3 space-y-3 pt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-blue-300 font-bold">🛡️ NEED</span>
                        <span className="text-[10px] font-mono text-blue-400 font-bold">
                          {burnRateStats.totalMonthlyExpense > 0
                            ? `${Math.round((burnRateStats.mindfulBreakdown.need / burnRateStats.totalMonthlyExpense) * 100)}%`
                            : '0%'}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-white mt-1 block font-mono">
                        {formatCurrency(burnRateStats.mindfulBreakdown.need)}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-indigo-300 font-bold">✨ WANT</span>
                        <span className="text-[10px] font-mono text-indigo-400 font-bold">
                          {burnRateStats.totalMonthlyExpense > 0
                            ? `${Math.round((burnRateStats.mindfulBreakdown.want / burnRateStats.totalMonthlyExpense) * 100)}%`
                            : '0%'}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-white mt-1 block font-mono">
                        {formatCurrency(burnRateStats.mindfulBreakdown.want)}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-emerald-300 font-bold">🌱 SAVING</span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          {burnRateStats.totalMonthlyExpense > 0
                            ? `${Math.round((burnRateStats.mindfulBreakdown.saving / burnRateStats.totalMonthlyExpense) * 100)}%`
                            : '0%'}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-white mt-1 block font-mono">
                        {formatCurrency(burnRateStats.mindfulBreakdown.saving)}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-purple-300 font-bold">📈 INVEST</span>
                        <span className="text-[10px] font-mono text-purple-400 font-bold">
                          {burnRateStats.totalMonthlyExpense > 0
                            ? `${Math.round((burnRateStats.mindfulBreakdown.investment / burnRateStats.totalMonthlyExpense) * 100)}%`
                            : '0%'}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-white mt-1 block font-mono">
                        {formatCurrency(burnRateStats.mindfulBreakdown.investment)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'EMOTIONAL' ? (
          /* Phase 3.2: Behavioral & Emotional Spending Deep Dive */
          <div className="mt-4">
            <EmotionalDeepDiveView
              transactions={activeTxs}
              currency={symbol}
              isMasked={isBalanceMasked}
              mascotName={mascotName}
              onOpenMascotChat={onOpenMascotChat}
            />
          </div>
        ) : (
          /* Custom Lifestyle Tags Breakdown */
          <div className="mt-4 space-y-3">
            {categoryBreakdown.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No expense category records logged yet.
              </div>
            ) : (
              categoryBreakdown.slice(0, showFullBreakdown ? undefined : 6).map((cat) => (
                <div key={cat.categoryId} className="space-y-1.5 p-2.5 rounded-xl hover:bg-slate-800/40 transition">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cat.categoryIcon}</span>
                      <span className="font-semibold text-slate-200">{cat.categoryName}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        ({cat.transactionCount} entries)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 font-mono">
                        {formatCurrency(cat.totalAmount)}
                      </span>
                      <span className="font-mono text-[10px] text-blue-400 w-10 text-right font-bold">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.categoryColor || '#3b82f6',
                      }}
                    />
                  </div>
                </div>
              ))
            )}

            {categoryBreakdown.length > 6 && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowFullBreakdown(!showFullBreakdown)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>{showFullBreakdown ? 'Show Less' : `View All ${categoryBreakdown.length} Lifestyle Tags`}</span>
                  {showFullBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
