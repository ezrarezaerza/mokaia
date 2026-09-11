"use client";

import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Compass, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { isSameDay, parseISO, endOfMonth, differenceInDays } from 'date-fns';
import type { LocalTransaction } from '../../types';

interface SafeDailyAllowanceCardProps {
  transactions?: LocalTransaction[];
  monthlyIncome?: number;
  monthlyTargetBudget?: number;
  currency?: string;
  isMasked?: boolean;
  onOpenQuickAdd?: () => void;
}

export const SafeDailyAllowanceCard: React.FC<SafeDailyAllowanceCardProps> = ({
  transactions = [],
  monthlyTargetBudget = 2500,
  currency = '$',
  isMasked = false,
  onOpenQuickAdd,
}) => {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const now = new Date();
  const daysRemainingInMonth = Math.max(1, differenceInDays(endOfMonth(now), now) + 1);

  // Month active expenses
  const activeExpenses = safeTransactions.filter(
    (t) => !t.isDeleted && t.type === 'EXPENSE' && t.queueStatus !== 'LOCKED' && t.queueStatus !== 'REJECTED'
  );

  const totalSpentThisMonth = activeExpenses.reduce((acc, t) => acc + Number(t.amount), 0);
  const remainingBudget = Math.max(0, monthlyTargetBudget - totalSpentThisMonth);

  // Safe daily allowance for remaining days
  const safeDailyBudget = Math.round((remainingBudget / daysRemainingInMonth) * 100) / 100;

  // Today's spend so far
  const todayExpenses = activeExpenses.filter((t) => {
    try {
      return isSameDay(parseISO(t.date), now);
    } catch {
      return false;
    }
  });
  const todaySpent = todayExpenses.reduce((acc, t) => acc + Number(t.amount), 0);
  const todayRemaining = Math.max(0, safeDailyBudget - todaySpent);
  const percentageUsed = safeDailyBudget > 0 ? Math.min(100, (todaySpent / safeDailyBudget) * 100) : 100;

  const formatCurrency = (val: number) => {
    if (isMasked) return '••••••';
    return `${currency}${val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const isOverToday = todaySpent > safeDailyBudget && safeDailyBudget > 0;

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-slate-100 shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Safe Daily Spending Allowance
            </h4>
            <span className="text-[11px] text-slate-400">
              {daysRemainingInMonth} days remaining this month
            </span>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 ${
            isOverToday
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
          }`}
        >
          {isOverToday ? (
            <>
              <ShieldAlert className="w-3 h-3" />
              <span>Pacing Adjusted</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3" />
              <span>Safe Zone</span>
            </>
          )}
        </span>
      </div>

      {/* Main Gauge / Progress */}
      <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2.5">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">
              Today's Remaining Cushion
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">
              {formatCurrency(todayRemaining)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">
              Daily Target Cap
            </span>
            <span className="text-sm font-bold font-mono text-emerald-400">
              {formatCurrency(safeDailyBudget)}/day
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800 relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentageUsed}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full rounded-full transition-colors ${
              isOverToday
                ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                : 'bg-gradient-to-r from-emerald-500 to-teal-400'
            }`}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Logged today: {formatCurrency(todaySpent)}</span>
          <span>{Math.round(percentageUsed)}% of daily allowance</span>
        </div>
      </div>

      {/* Mindful Action Hint */}
      <div className="flex items-center justify-between gap-3 text-xs text-slate-400 pt-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">
            {isOverToday
              ? "Tomorrow's daily allowance will dynamically adjust to keep your month-end goal intact."
              : "Any unspent allowance today rolls over into your sinking funds and comfort buffer!"}
          </span>
        </div>

        {onOpenQuickAdd && (
          <button
            type="button"
            onClick={onOpenQuickAdd}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold shrink-0 cursor-pointer"
          >
            + Log Spend
          </button>
        )}
      </div>
    </div>
  );
};
